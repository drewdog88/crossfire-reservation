# Crossfire Select Field Manager

Weekly field reservation manager for Crossfire Select soccer teams. Coaches
reserve practice spots on club fields; admins manage teams, locations, fields,
time slots, and users.

## Stack

- **React 19** + **TypeScript** + **Vite 8**
- **Tailwind CSS v4** (via `@tailwindcss/vite`, no config file — theme lives in `src/index.css`)
- **Vercel serverless functions** (`api/*`) over a **Neon Postgres** database as the
  single source of truth — no `localStorage`, no fallback store
- A native **SwiftUI iOS client** (`ios/`) signs against the same API

## Local development

```bash
npm install
npm run dev      # Vite dev server
npm run build    # production build to dist/
npm run preview  # preview the production build
```

## Data model

`Team → Location → Field (Turf/Grass) → SlotConfig` (per-day, time-bounded field
capacity with reserved team IDs).

**Reservation rules:** one team per spot; max two reservations per week on
different days; 1–8 configurable spots per slot.

**Roles:** `admin` (full management) and `coach` (reserve for own teams). The
weekly schedule view is public/unauthenticated.

**Team selection:** the "Reserving for" control is a single dropdown whose
options are grouped by gender and birth year (via native `<optgroup>` on web
and a nested `Menu` on iOS). Teams are addressed by **birth year**, matching
US youth-soccer registration — not a computed age. This scales cleanly to a
full club roster without the old wrapping-chip cascade.

**Performance:** query-shape indexes live in `scripts/migrations/` and are
applied with `node scripts/apply-migration.mjs <file>`. They back the fixed
lookups in `api/*.js` (e.g. `reservations.team_id`, `slots.date`) and keep the
DB off a sequential-scan cliff as bookings accumulate.

## Deployment

Deployed on **Vercel** as a single project, auto-deploying from `main`:

- Push to `main` → production deploy
- Push to any other branch → isolated preview deploy

Build config lives in [`vercel.json`](./vercel.json) (`framework: vite`,
`outputDirectory: dist`).
