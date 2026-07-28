# Crossfire Select Field Manager

Weekly field reservation manager for Crossfire Select soccer teams. Coaches
reserve practice spots on club fields; admins manage teams, locations, fields,
time slots, and users.

## Stack

- **React 19** + **TypeScript** + **Vite 8**
- **Tailwind CSS v4** (via `@tailwindcss/vite`, no config file — theme lives in `src/index.css`)
- Client-side only for now: state persists to `localStorage` (no backend/API)

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

## Deployment

Deployed on **Vercel** as a single project, auto-deploying from `main`:

- Push to `main` → production deploy
- Push to any other branch → isolated preview deploy

Build config lives in [`vercel.json`](./vercel.json) (`framework: vite`,
`outputDirectory: dist`).
