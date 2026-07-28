<div align="center">

<img src="https://raw.githubusercontent.com/drewdog88/crossfire-reservation/main/public/assets/crossfire-select-logo.png" alt="Crossfire Select" width="320" />

# Crossfire Select — Field Manager

### Weekly practice-field reservations for Crossfire Select soccer teams

**Coaches book spots. Admins run the club. One database is the truth.**

<br />

[![Architecture](https://img.shields.io/badge/🏛_Architecture-B01717?style=for-the-badge&logoColor=white)](Architecture)
[![How It Works](https://img.shields.io/badge/⚙_How_It_Works-0a1628?style=for-the-badge&logoColor=white)](How-It-Works)
[![Reservation Rules](https://img.shields.io/badge/📋_Rules-1f9e5a?style=for-the-badge&logoColor=black)](Reservation-Rules)
[![API](https://img.shields.io/badge/🔌_API-0a1628?style=for-the-badge&logoColor=white)](API)
[![Roadmap](https://img.shields.io/badge/🗺_Roadmap-B01717?style=for-the-badge&logoColor=white)](Roadmap)

<br />

[![React](https://img.shields.io/badge/React_19-20232A?style=flat-square&logo=react&logoColor=61DAFB)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite_8-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat-square&logo=vercel&logoColor=white)](https://vercel.com)
[![Neon](https://img.shields.io/badge/Neon-00E599?style=flat-square&logo=neon&logoColor=black)](https://neon.tech)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org)

**[🌐 Live app](https://crossfire-reservation.vercel.app)** · **[📦 Repository](https://github.com/drewdog88/crossfire-reservation)**

</div>

---

> **Why this exists.** A club has more teams than field-hours. Coaches used to
> chase a shared spreadsheet or a group text to grab a practice slot, and nothing
> stopped two teams from claiming the same field at the same time. This app makes
> the week's field capacity visible to everyone and lets the **database** — not a
> group chat — decide who got the spot, enforcing the club's fairness rules on
> every booking.

Welcome to the engineering wiki. It explains *what the app is, what problem it
solves, and how it works* — enough for a club admin to run it and a developer to
extend it.

## What it delivers

| | Capability | How |
|---|---|---|
| 📅 | **A shared weekly schedule** | Every field, every time window, live capacity — visible without signing in |
| ⚽ | **Self-serve coach booking** | Coaches reserve and cancel spots for their own teams |
| ⚖️ | **Fair-play enforced in the DB** | Capacity, one-team-per-spot, ≤2 days/week, no same-day overlap — all server-side, in one transaction |
| 🔧 | **A club admin panel** | Manage teams, locations, fields, slots, and users; override any booking |
| 👥 | **Approved-coach onboarding** | New coaches self-register as *pending*; an admin approves and assigns teams |
| 🗄️ | **One source of truth** | Neon Postgres — no localStorage, no fallback store |

## What is it?

A mobile-first web app with two audiences sharing one database:

1. A **public schedule** anyone can browse — the week's fields, time windows, and
   how full each spot is.
2. A **signed-in experience** where **coaches** reserve/cancel for their teams and
   **admins** manage the whole club and override any booking.

Behind both sits a small set of **Vercel serverless functions** and a **Neon
Postgres** database that is the single source of truth for teams, fields, slots,
reservations, and users.

## What problem does it solve?

The earlier version of this app kept everything in the browser's `localStorage`.
That is fine for a demo but has no shared truth: every device saw its own copy,
and two coaches could "reserve" the same spot because nothing coordinated them.

This rebuild makes bookings **real and shared**:

| Problem before | How this app solves it |
|---|---|
| Each browser had its own private data | One Neon Postgres database, read by everyone |
| Two teams could grab the same spot | Bookings run in a `SELECT … FOR UPDATE` transaction that re-checks every rule |
| Anyone could edit anything | JWT sessions + roles: coaches touch only their teams, admins manage all |
| No onboarding | Coaches register (pending) → admin approves & assigns teams |
| Rules lived in client code | Rules live on the server, so the client can't bypass them |

## Where to go next

- **[Architecture](Architecture)** — the moving parts and how a request flows
- **[How It Works](How-It-Works)** — the three user journeys, step by step
- **[Reservation Rules](Reservation-Rules)** — the exact fairness logic
- **[API Reference](API)** · **[Database Reference](Database)** — build on it
- **[Deployment](Deployment)** · **[Operations](Operations)** — run it
