# iOS ↔ Web Parity Audit

**Purpose:** the single checklist that drives the iOS port and prevents the
parity gap AFROTC hit. Every row is a ticked checkbox verified by build-and-drive
in the simulator. A screen is "done" only when all its rows are ticked.

**Legend:** `[ ]` not started · `[~]` built, not verified · `[x]` verified in
simulator against the web behavior.

**Structure:**
- **Tier 1** — whole screens must exist.
- **Tier 2** — sub-features / actions / states within a screen (this is where
  AFROTC leaked: chip filters, counts, empty states, Sign Out).
- **Accepted platform differences** — intentional, not gaps.

---

## Tier 1 — Screens

- [ ] Auth sheet (Sign In / Register)
- [ ] Team Finder (search, on all non-admin tabs)
- [ ] Schedule
- [ ] Reserve
- [ ] My Fields
- [ ] Fields Map
- [ ] Admin (container + tab bar, admin-only)

---

## Tier 2 — Sub-features by screen

### Auth sheet
- [ ] Sign In (email + password) → sets `cf_session` cookie
- [ ] Register (first/last/email/password + team selection)
- [ ] "New coaches need admin approval" notice on register
- [ ] Pending-status handling (account created but not yet active)
- [ ] Error text surfaced verbatim from API (`{error}`)
- [ ] **Sign Out** (the AFROTC miss — explicit line item)

### Team Finder
- [ ] Client-side search box
- [ ] Matches by label / gender / year / level / coach
- [ ] Result count footer
- [ ] Distinct empty state ("no teams match")

### Schedule
- [ ] Week navigation (prev/next, default = Next Week)
- [ ] Week range badge label
- [ ] Location filter (chips) — "all" default
- [ ] Field pitch cards per slot (the signature visual)
- [ ] Grouped by date
- [ ] Empty state ("no fields this week")
- [ ] Link into Fields Map from a field

### Reserve
- [ ] Week navigation (shared week state)
- [ ] **Team selector — cascade** (see §4a of design):
  - [ ] ≤6 teams → wrapping pill row (coach fast path)
  - [ ] >6 teams → Gender → Age → Team cascade rows
  - [ ] Gender row hidden when only one gender exists
  - [ ] Options in each row filtered by the choice above (no dead-ends)
  - [ ] Coach name appended on label collision (`B14-D · Rafael`)
  - [ ] Selection never stranded when gender/age changes
  - [ ] Admin label "Reserving for (admin — any team)" vs coach "Reserving for"
- [ ] Location filter
- [ ] Reserve action → success toast
- [ ] Cancel action → confirm → toast
- [ ] Fairness error text surfaced verbatim
- [ ] Empty state ("no teams assigned" for coach with none)

### My Fields
- [ ] Visual "My Fields" view
- [ ] Flat "My Upcoming Reservations" list (the added searchable list)
- [ ] Sortable columns
- [ ] Edit sheet (move reservation → re-validated server-side)
- [ ] Bulk delete / multi-select
- [ ] Empty state

### Fields Map
- [ ] Marker per located field
- [ ] Callout: name / city / field count
- [ ] Default region (Redmond)
- [ ] Focus-on-arrival when opened from a field link

### Admin — Teams
- [ ] List / create / edit / delete team
- [ ] Fields: gender, birth year, level, coach name

### Admin — Locations
- [ ] List / create / edit / delete location
- [ ] "Resolve Location" → `/api/admin/geocode-address` (shared endpoint)

### Admin — Fields
- [ ] List / create / edit / delete field
- [ ] Surface: Turf / Grass / unset

### Admin — Slots
- [ ] List / create / edit / delete slot
- [ ] Max-teams stepper
- [ ] Per-slot team overrides
- [ ] Date / start / end time

### Admin — Users
- [ ] List users
- [ ] Approve pending user
- [ ] Change role (admin/coach)
- [ ] Assign/unassign teams

---

## API endpoints — each exercised by iOS

- [ ] `GET  /api/bootstrap` — public catalog
- [ ] `POST /api/auth/register`
- [ ] `POST /api/auth/login`
- [ ] `POST /api/auth/logout`
- [ ] `GET  /api/auth/me`
- [ ] `POST /api/reservations` (reserve)
- [ ] `DELETE /api/reservations` (cancel)
- [ ] `POST /api/reservations` (move — re-validated)
- [ ] `GET/POST/PUT/DELETE /api/admin/teams`
- [ ] `GET/POST/PUT/DELETE /api/admin/locations`
- [ ] `GET/POST/PUT/DELETE /api/admin/fields`
- [ ] `GET/POST/PUT/DELETE /api/admin/slots`
- [ ] `GET/POST/PUT/DELETE /api/admin/users`
- [ ] `POST /api/admin/geocode-address`

---

## The 9 fairness rules — server-enforced, iOS renders the response

iOS must NOT re-implement these; it must surface each rejection's exact message
and mirror the tap-target affordance (enable/disable). Verify each error path:

- [ ] Max teams per slot reached
- [ ] No duplicate reservation (same team, same slot)
- [ ] One field per team per day
- [ ] Max 2 reservations per team per week
- [ ] Ownership gating (coach may only act for assigned teams)
- [ ] Admin may act for any team
- [ ] Move re-validated against all rules
- [ ] Advisory-lock / FOR UPDATE concurrency (no double-book race)
- [ ] Pending users cannot reserve

---

## Accepted platform differences (NOT gaps)

- [x] Apple Maps (MapKit) instead of OSM/Leaflet tiles
- [x] Native `.alert` / `.confirmationDialog` instead of web `confirm()`/`alert()`
- [x] Native swipe actions where web uses buttons
- [x] Native toast overlay instead of the web toast component
- [x] Cookie carried by `HTTPCookieStorage` (same `cf_session`, native transport)
