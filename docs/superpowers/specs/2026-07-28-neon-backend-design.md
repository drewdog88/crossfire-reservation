# Design: Neon Postgres backend for Crossfire Select Field Manager

**Date:** 2026-07-28
**Status:** Approved for planning
**Author:** Andrew Brill (with Claude Code)

## Problem

The app currently stores all state in browser `localStorage` (six slices: teams,
locations, fields, slots, users, currentUser). Nothing is shared — every visitor
has their own private copy — and all reservation rules are enforced client-side.
This cannot support real, multi-coach use: reservations must be shared, durable,
and race-safe.

This project moves the source of truth to **Neon Postgres**, served through
**Vercel serverless functions**, mirroring the proven stack of the sibling
`ewa-website-revamp` project (same owner, same Neon + Vercel + public-repo model).

## Goals

- Single shared source of truth in Neon Postgres. **No fallback** — no
  localStorage store, no SQLite, no in-memory data. If `DATABASE_URL` is missing
  the API fails loud at startup; it never silently degrades to a local store.
- Reservation rules enforced **server-side, transactionally**, backed by DB
  constraints (safe under concurrent booking).
- Season-scoped data (a full 30-week season already exists in the source sheet).
- Coach accounts via self-register + admin approval; coaches own multiple teams.
- A new fast, searchable "My Upcoming Reservations" list — in addition to the
  existing visual views, which are kept.
- Seed the database with real data migrated from the "60 acres 2025" spreadsheet
  (best-effort).

## Non-goals (deferred)

- Automated encrypted backups (age + GitHub Actions restore drill) — separate
  follow-up spec, reusing the canonical ewa Neon backup pattern.
- Richer field graphics, real field photos, drag-and-drop reservation — future
  iterations. Schema/API are kept general enough not to block these, but none is
  built now (YAGNI).
- Multi-location beyond what the data needs (the source sheet is one location,
  but the schema supports many).

## Approach

**Approach A (chosen): mirror the ewa stack.** Plain `api/*.js` Vercel serverless
functions (Node ESM) with a thin `api/_lib/` (Neon HTTP client, bcrypt, JWT-cookie
auth). Hand-written SQL, no ORM, no new framework.

Rejected alternatives:
- **B — Next.js + Prisma:** a full app rewrite and heavy new deps for no gain at
  this scale; diverges from the owner's established pattern.
- **C — Supabase:** new vendor; the owner is standardized on Neon + Vercel and the
  deferred backup story reuses the Neon age-encryption drill.

### The critical change

Reservation rules move from the browser into the server, inside a transaction, and
the flat `reservedTeamIds: string[]` array becomes a relational `reservations`
table with a unique constraint. This is what makes concurrent booking safe (two
coaches racing for the last spot) and makes the cross-cutting search trivial.

## Architecture

One Vercel project, same shape as ewa:

```
crossfire-reservation/
  src/                    # React SPA — App.tsx split into a data/API layer + per-view files
  api/
    _lib/
      db.js               # Neon HTTP client bound to DATABASE_URL
      http.js             # json(), methodGuard(), readBody()
      auth.js             # bcrypt verify; JWT cookie sign/verify; requireAuth / requireAdmin
    auth/  login.js  logout.js  me.js  register.js
    seasons.js            # GET public list; admin CRUD
    schedule.js           # GET public — day-by-day schedule for a season + week
    reservations.js       # POST / DELETE — book / cancel (transactional, rule-enforced)
    reservations/search.js# GET — flat filterable list (team / field-location / coach)
    admin/  teams.js  locations.js  fields.js  slots.js  users.js
  scripts/
    schema.sql            # full DDL
    apply-schema.mjs      # apply DDL to a Neon branch
    import-sheet.mjs      # parse the 30 sheet tabs -> seed.json (run once, offline)
    seed.mjs              # apply seed.json + one seeded admin
  vercel.json             # present (framework: vite, outputDirectory: dist)
```

**Data flow:** SPA `fetch`es `/api/*`, which talk to Neon. Public reads (schedule,
seasons) need no auth; coach actions need a session cookie; admin routes require
`role='admin'`. The SPA no longer owns data; `localStorage` keeps only UI
preferences (e.g. selected season).

## Database schema (Neon Postgres)

Conventions follow ewa: `serial` PKs, `timestamptz`, `updated_at` triggers,
soft-delete via flags where useful, cascade FKs, money-free.

| Table | Key columns | Notes |
|---|---|---|
| `seasons` | `id`, `name`, `is_active bool`, `starts_on date`, `ends_on date` | e.g. "60 Acres 2025–26". One active at a time. |
| `teams` | `id`, `season_id -> seasons`, `gender`, `birth_year int`, `level text`, `coach_name text`, `label text` | `level` free-text ('A'–'D', '8th Graders', …); `coach_name` parsed from parens; season-scoped. |
| `locations` | `id`, `name`, `city` | e.g. Marymoor / 60 Acres, Redmond WA. |
| `fields` | `id`, `location_id -> locations`, `name`, `type` ('Turf'/'Grass') | |
| `slots` | `id`, `season_id -> seasons`, `field_id -> fields`, `date`, `start_time`, `end_time`, `max_teams int` | **UNIQUE (field_id, date, start_time).** |
| `reservations` | `id`, `slot_id -> slots`, `team_id -> teams`, `created_by -> users`, `created_at` | **UNIQUE (slot_id, team_id).** One row per booking; replaces `reservedTeamIds[]`. |
| `users` | `id`, `email UNIQUE`, `password_hash`, `first_name`, `last_name`, `role` ('admin'/'coach'), `status` ('pending'/'active'), `created_at` | bcrypt only, never plaintext. `pending` until an admin approves. |
| `user_teams` | `user_id -> users`, `team_id -> teams`, PK (both) | Many-to-many: a coach owns multiple teams; not locked to one. |

FKs cascade to prevent dangling references (deleting a team removes its
reservations and user_teams links; deleting a field/slot removes its
reservations), matching the cascade-delete behavior already in the current admin
UI.

## Reservation rules (server-side, in one transaction)

Scope matters — most limits are keyed on the **team**, not the coach:

| Rule | Scope | Enforcement |
|---|---|---|
| Capacity — a slot holds at most `max_teams` | slot | `COUNT(reservations for slot) < max_teams` inside the txn |
| One team per spot | slot | UNIQUE (slot_id, team_id) |
| ≤ 2 reservations per week, on different days | **team** | Count that team's reservations in the season-week before insert; reject a 3rd or a second same-day booking |
| No two overlapping-time bookings same day | **team** | Reject if the team already holds a slot whose time window overlaps on that date |
| A coach may only book/cancel for their own teams | **coach** | `team_id` must be in the actor's `user_teams` |
| An admin may book/cancel for **any** team | **admin** | `role='admin'` skips the own-team check only — all other rules below still apply |

Because quotas are per-team, a coach who owns B14 D and G12 C can book up to 2 for
**each** in the same week (independent quotas) — the coach is never limited to a
single team.

### Admin authority

An admin has full authority across the tool: they manage every structural entity
(seasons, teams — including names/levels/coach assignment, locations, fields,
slots, users) and they can **act on any team's reservations** — assign a team to a
field/slot (book), reassign, or cancel — regardless of which teams they own. The
own-team ownership check is the **only** rule waived for admins. The reservation
rules themselves (slot capacity, one-team-per-spot, ≤ 2 per week on different days,
no overlapping-time bookings) **apply equally to admin actions** — an admin cannot
force a booking that breaks them. This keeps the schedule internally consistent and
prevents a mistaken admin action from corrupting the data. `POST`/`DELETE
/api/reservations` therefore accept any `team_id` when the actor is an admin, but
run the same transactional rule checks; `created_by` records the acting admin.

## API surface

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/auth/register` | POST | public | Coach self-signup -> creates `status='pending'` user |
| `/api/auth/login` | POST | public | bcrypt verify; sets JWT cookie; rejects `pending` with "awaiting approval" |
| `/api/auth/logout` | POST | cookie | Clears session cookie |
| `/api/auth/me` | GET | cookie | Current user + role + owned teams, else 401 |
| `/api/seasons` | GET | public | List seasons (active flagged) |
| `/api/schedule` | GET | public | Day-by-day schedule for `?seasonId=&week=` (feeds Schedule/Reserve/My Fields) |
| `/api/reservations` | POST · DELETE | coach + admin | Book / cancel — transactional, all rules enforced. Coach: own teams only. Admin: any team (own-team check waived, other rules still apply). |
| `/api/reservations/search` | GET | coach + admin | Flat filterable list: `?seasonId=&week=&teamId=&fieldId=&locationId=&coachName=` |
| `/api/admin/teams` | GET·POST·PUT·DELETE | admin | CRUD (cascade delete) |
| `/api/admin/locations` | GET·POST·PUT·DELETE | admin | CRUD (cascade delete) |
| `/api/admin/fields` | GET·POST·PUT·DELETE | admin | CRUD (cascade delete) |
| `/api/admin/slots` | GET·POST·PUT·DELETE | admin | CRUD |
| `/api/admin/users` | GET·POST·PUT·DELETE | admin | Manage users; **approve pending** (`status->active`); assign teams |

Conventions (from ewa): admin/coach routes require the session cookie
(401 otherwise); each handler declares a method allow-list (405 otherwise);
validation -> 400, not found -> 404, server -> 500 (details logged, not returned);
mutations return the refreshed list so the UI updates without a second request.

Shared `_lib`: `db.js` (Neon client), `http.js` (`json`, `methodGuard`,
`readBody`), `auth.js` (`requireAuth`, `requireAdmin`, bcrypt, JWT cookie).

## Auth & approval flow

- Passwords hashed with **bcrypt** (cost 12); plaintext never stored or logged.
- Session is a **JWT** (`{ sub, role }`, 7-day expiry) in an **HttpOnly, Secure,
  SameSite=Lax** cookie (`cf_session`), signed with `JWT_SECRET`.
- Self-register creates a `pending` user. Login is blocked for `pending` accounts
  with a clear "awaiting admin approval" message.
- The Admin -> Users tab gains a **Pending** section: approve (sets `active`) and
  assign teams. Admin management is intentionally illustrative — kept functional,
  not heavily polished.

## Views (5 flat bottom-nav items for a signed-in admin)

| View | Auth | What it is |
|---|---|---|
| **Schedule** | public | Day-by-day visual field cards (unchanged) |
| **Reserve** | coach | Book via visual field cards (unchanged) |
| **My Fields** | coach | **Kept** — visual field-card view of *your* reservations this week |
| **My Upcoming** *(new)* | coach + admin | Flat, searchable list; default upcoming week, navigable; global reach |
| **Admin** | admin | CRUD (teams/names/levels/coaches, locations, fields, slots, users) + approve pending users + book/cancel any team's reservations |

Mobile bottom nav shows all five flat items with short labels/icons.

### "My Upcoming Reservations" (new)

- Defaults to the **upcoming week**, showing your teams' reservations first, as a
  **flat list sorted date -> time -> field**.
- **Search/filter** by three independent dimensions: **Team**, **Field/Location**,
  **Coach**. Clearing the your-teams scope and picking any filter searches **all**
  reservations that week (global). Admins default to the global view.
- **Week nav retained** (default upcoming, navigable to any week).
- Each row is compact, e.g.
  `Thu Oct 30 · 5:30–7:00 pm · Field 4 (Marymoor) · B14 D (Rafael)`, with a Cancel
  action when it is a team the actor owns.
- Backed by `GET /api/reservations/search` returning a denormalized flat list
  (reservation joined to team, field, location, slot). This cross-cutting query is
  a trivial SQL JOIN now, but was effectively impossible against the old
  `reservedTeamIds[]` arrays.

## Frontend refactor

`App.tsx` (~1500 lines) is split: a `useApi`/data-fetching layer replaces the
`load`/`save` localStorage hooks, and each view (`Schedule`, `Reserve`,
`MyFields`, `MyUpcoming`, `Admin`) becomes its own file consuming fetched data.
UI and styling are unchanged. Booking is optimistic with server reconciliation —
the server is the arbiter on races, and the client rolls back on rejection.

## Spreadsheet migration (best-effort)

Source: "60 acres 2025" (Google Sheet `16QcHCVwOT7W2xSn2TxpC8T69ak_ZnucBnmnc3S2i4RY`),
**30 weekly tabs**, Oct 2025 – May 2026.

Observed structure (canonical tab "Oct 28-Nov. 1"):
- One location (Marymoor / 60 Acres), fields Field 1/4/5/6.
- Days as column-groups (Mon–Fri); each field block = field name + time range +
  numbered spots 1–8.
- Multiple time windows per field per day (e.g. Field 5 Mon 5:30–7:00 **and**
  7:00–8:30) — the exact case the flat model couldn't represent.
- Team cells: 2-digit-year label + coach in parens, e.g. `G12 C (Nancy)`,
  `B14 D (BJ)`.
- Known messy cases: two coaches (`B16 D (Adriana/Hugo)`), inline notes
  (`G13 A (David) | Emad is Coaching`), non-letter level (`G10 8th Graders`).

Plan: an **offline** `scripts/import-sheet.mjs` reads all 30 tabs via the Sheets
API and emits `seed.json` — season, location, fields, slots (date + time +
capacity from numbered rows), teams (gender/year/level/coach), and reservations
(which team occupies which numbered spot). `scripts/seed.mjs` applies `seed.json`
plus one seeded admin.

**Migration is best-effort.** The tab layout is inconsistent week to week (blocks
shift rows/columns), so parsing will not be perfect on the first pass. The parser
**fails loud and logs ambiguities** (multi-coach, inline notes, unrecognized
levels) rather than silently dropping or guessing; a review-and-fix loop on the
log is expected. Imperfect import is acceptable — no user data is at stake, and
admins can correct via the UI.

## Configuration (secrets never in the public repo)

| Variable | Where | Purpose |
|---|---|---|
| `DATABASE_URL` | Vercel env (Prod + Preview + Dev) | **Pooled** Neon connection (`-pooler` host, us-west-2) used by the app/API |
| `JWT_SECRET` | Vercel env (Prod + Preview + Dev) | Signing key for the `cf_session` JWT cookie |
| `DATABASE_URL` (pooled) + `NEW_DATABASE_URL` (direct/unpooled) | local `.env.local` (gitignored) | App uses pooled; `apply-schema.mjs` / `seed.mjs` use the direct host |
| `ADMIN_PASSWORD` | local `.env.local` (optional) | Seed admin password; if unset, `seed.mjs` generates and prints one |

Neon lives in **AWS us-west-2 (Oregon)**; Vercel functions are pinned to `pdx1`
(also us-west-2) so DB round-trips stay in-region. Only `DATABASE_URL` (pooled)
and `JWT_SECRET` go to Vercel — the `POSTGRES_*`/`PG*` aliases Neon emits are not
needed by the app. `.env*` and `.vercel` are gitignored; the live Neon
credentials never enter the public repo. GitHub Actions secrets are **not** added
now — they arrive only with the deferred backup-drill spec (which needs the
direct/unpooled URL as a repo secret).

## Testing

- Unit-test the reservation-rule logic (capacity, ≤2/week/different-days per team,
  no-overlap per team, own-team authorization) against a Neon test branch.
- Test the search endpoint's filter combinations.
- Verify `apply-schema.mjs` + `seed.mjs` run clean against a fresh branch.
- Manual smoke on a Vercel preview deploy before promoting to production.

## Rollout

1. Apply schema + seed to a Neon branch; verify locally against `.env.local`.
2. Set `DATABASE_URL` + `JWT_SECRET` in Vercel; deploy to a preview URL; smoke test.
3. Promote to production. Rollback is one-click in Vercel (code only; DB unchanged).
