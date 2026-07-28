# crossfire-reservation

**Crossfire Select Field Manager** — a weekly practice-field reservation app for
Crossfire Select soccer teams. React 19 + Vite 8 + Tailwind CSS v4 frontend,
Vercel serverless API functions, and a Neon Postgres database as the single
source of truth (no localStorage/fallback store).

> Originally scaffolded in Figma Make; the Figma-specific build plugins and
> `.figma/` config have been removed. It is now a plain Vite app.

## Development Server

A Vite development server is **already running** on `$PORT` (default 8443). You
don't need to start it manually. `npm run build` type-checks and produces the
production bundle in `dist/`.

- Hot reload: Changes to source files are reflected immediately.
- The frontend talks to the live Neon DB through the `/api/*` functions, so a
  local `vite preview` build cannot load data without those functions running.

## Project Structure

This is the canonical project structure. Start with task-relevant files below.
Only follow imports or inspect other files when required.

**Frontend**
- `src/main.tsx` — React entrypoint; imports `src/index.css` and mounts `src/App.tsx` into `#root`
- `src/App.tsx` — the entire UI (schedule, reserve, my-fields, admin, auth modal). Primary starting point for UI work
- `src/api.ts` — typed `fetch` wrapper for the `/api/*` endpoints (uses `credentials: 'include'`)
- `src/types.ts` — shared types (`Team`, `Location`, `Field`, `SlotConfig`, `User`) and date/label helpers
- `src/index.css` — global CSS + Tailwind v4 import + `@theme` design tokens (the light-theme palette lives here)
- `index.html` — Vite HTML shell; `<head>` (title, favicon, OG tags) is hardcoded here
- `vite.config.ts` — React + Tailwind v4 plugins and the `@` → `src` alias

**Backend (Vercel serverless, ESM `export default async function handler(req, res)`)**
- `api/bootstrap.js` — GET public catalog: `{teams, locations, fields, slots}`
- `api/reservations.js` — POST/DELETE a reservation; all fairness rules enforced in a `FOR UPDATE` transaction
- `api/auth/{register,login,logout,me}.js` — bcrypt + JWT-in-HttpOnly-cookie auth
- `api/admin/{teams,locations,fields,slots,users}.js` — admin CRUD (requires admin session)
- `api/_lib/{db,http,auth,serialize}.js` — Neon pool, request helpers, auth/session, row→JSON serializers
- `scripts/schema.sql` — Postgres schema (single source of truth)
- `vercel.json` — Vite framework preset; region `pdx1`

## Dependencies

- Runtime: React 19, React DOM 19; `@neondatabase/serverless`, `bcryptjs`, `jsonwebtoken`, `pg` (API)
- Styling: Tailwind CSS v4 via the `@tailwindcss/vite` plugin
- Build tooling: Vite 8, TypeScript 5.7, `@vitejs/plugin-react`
- Formatting: oxfmt

## Styling

Tailwind CSS v4 through the `@tailwindcss/vite` plugin. `src/index.css` imports
Tailwind with `@import 'tailwindcss';` and defines the design tokens in an
`@theme` block. The app uses a **light theme**: the `navy-*` token scale is
repurposed as a neutral slate ramp (high numbers = light surfaces, low numbers =
dark text), and `cf-green` is darkened for contrast on white. To adjust the
palette, edit the `@theme` tokens — most components consume `bg-navy-*` /
`text-navy-*` / `text-cf-green` utilities rather than hardcoded colors.

No Tailwind config file or PostCSS config is needed.

## Secrets & environment

Public repo — **never commit secrets.** `DATABASE_URL` and `JWT_SECRET` live in
Vercel env vars and in a gitignored `.env.local`. Passwords are stored bcrypt-hashed.
