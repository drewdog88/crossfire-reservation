# Native iOS App — Design

**Status:** Approved (design). Awaiting spec review before implementation planning.
**Date:** 2026-07-30
**Scope:** Build a native iOS client for Crossfire Select Field Manager as a
third surface in the existing `crossfire-reservation` repo, at **100% feature
parity** with the web app.

## Goal & non-goals

**Goal:** A native SwiftUI iOS app that a coach or admin can use to do
*everything* they can do on the web — signed in against the same deployed Vercel
API and Neon database, with the same fairness rules and the same visual
language.

**Non-goals:**
- No new product features beyond web parity.
- No changes to the API (`api/`) or web (`src/`) surfaces.
- No offline mode; the app requires network like the web app.
- No XCTest target initially (build-and-drive verification, matching AFROTC).

**Primary risk this design addresses:** the AFROTC iOS port missed ~100% parity
because it was a hand-mirror of the API with **no parity checklist authored up
front and no comparison mechanism** — whole screens (Admin, Sign Out),
sub-features (chip filters, result counts, distinct empty states), and
field-level details slipped. §6 is the countermeasure.

## Section 1 — Architecture & repo shape

The iOS app becomes a **third surface in the existing `crossfire-reservation`
repo**, mirroring the AFROTC "one product, multiple surfaces, one database"
shape:

```
crossfire-reservation/
  src/                 web (React) — unchanged
  api/                 Vercel serverless — unchanged, shared by both clients
  ios/                 NEW
    project.yml        XcodeGen spec (only committed project def; .xcodeproj gitignored)
    Crossfire/
      CrossfireApp.swift        @main
      Support/        Config.swift, Formatting.swift, Confirm helpers
      Networking/     APIClient.swift (actor), APIError.swift, Inputs.swift
      Models/         Codable structs mirroring api/_lib/serialize.js output
      State/          Session.swift (ObservableObject), Catalog.swift
      Theme/          Theme.swift (mirrors src/index.css tokens)
      Views/          one file per screen
      Pitch/          FieldPitchView + markings (the signature visual)
    README.md         build & simulator recipe
  docs/superpowers/specs/
    2026-07-30-native-ios-design.md      (this design)
    2026-07-30-ios-web-parity-audit.md   (the checklist — see §6)
```

- **iOS 17+**, Swift, SwiftUI, XcodeGen (already installed), Xcode 26.6. No SPM
  deps — Apple frameworks only (SwiftUI, Foundation, MapKit).
- **Vercel ignores `ios/`** (a `.vercelignore` entry) so web deploys are
  unaffected.
- Auth: **reuse the `cf_session` cookie** — `URLSession` with a persistent
  `HTTPCookieStorage` carries it across launches. No Keychain, no bearer path,
  zero API changes.
- API target: **deployed HTTPS Vercel** by default, overridable via
  `CROSSFIRE_API_BASE` env in the Run scheme. HTTPS everywhere → no ATS
  localhost exception needed.

**One deliberate improvement over AFROTC:** because auth is a cookie and the API
already returns everything via `GET /api/bootstrap`, iOS needs **no
hand-mirrored token/refresh logic at all** — a strictly smaller networking
surface, removing a whole class of the drift AFROTC hit.

## Section 2 — Networking & data models

**`APIClient` (actor)** — one file, one `URLSession` configured with
`httpCookieStorage` + `httpCookieAcceptPolicy = .always` so `cf_session` is
captured on login and replayed automatically. `JSONDecoder`/`Encoder` use
camelCase (the API already serializes camelCase per `serialize.js`, so **no
`.convertFromSnakeCase` and no CodingKeys**). Typed method per endpoint:

- Public: `bootstrap() -> Catalog`, `register(...)`, `login(...) -> User`,
  `logout()`, `me() -> User?`
- Coach/admin: `reserve(slotId:teamId:)`, `cancel(...)`, `moveReservation(...)`
- Admin: `adminList/Create/Update/Delete` for teams/locations/fields/slots/users,
  `geocodeAddress(...)`

**Errors:** decode `{error: "..."}` bodies into `APIError` so the server's
fairness messages ("This team already has 2 reservations this week.") surface
verbatim — parity of *error text*, not just the happy path.

**Models** (`Codable`, camelCase) mirror `serialize.js` exactly: `Team`,
`Location`, `Field`, `SlotConfig` (with `reservedTeamIds`), `User`. Plus
`Catalog {teams, locations, fields, slots}` for the bootstrap payload. Enums
(`Surface`, role, status) **decode defensively** (unknown → sensible fallback)
so a future API value never crashes a list. Date/time kept as `String`; a
`Formatting` helper reproduces `types.ts`'s `teamLabel`, `getWeekDates`
(Monday-anchored), `timeRangeLabel`, and week badges — **ported 1:1** since the
whole app depends on them.

## Section 3 — App structure, navigation & state

- **`Session`** (`@MainActor ObservableObject`, phases `loading / ready`): on
  launch, parallel `bootstrap()` + `me()`; holds `user` (nil = signed out) and
  the `Catalog`. Login/logout re-pull. Mirrors `App.tsx:3280-3315`.
- **`RootView`** → loading spinner, else the main shell.
- **Bottom `TabView`** matching the web's nav 1:1: **Schedule, Reserve, My
  Fields, Fields Map**, and **Admin** (only when `user.role == admin`). Tapping
  Reserve/My Fields while signed out opens the auth sheet instead of switching
  tabs — same guard as web (`App.tsx:3539-3545`).
- Shared **week state** (`weekOffset`, default 1 = Next Week) lifted into an
  `ObservableObject` so Schedule/Reserve/My Fields/Admin-Slots stay in sync,
  like the web's lifted `App` state.
- Per-screen: plain `@State` + `.task(id:)` + `.refreshable` (AFROTC's proven
  idiom). Native `.alert`/`.confirmationDialog` replace web `confirm()`/`alert()`;
  a toast overlay replaces the web toast.

**Screen inventory (drives the parity audit):** Auth sheet (Sign In/Register +
"needs admin approval" notice), Team Finder (client-side search, shown on all
non-admin tabs), Schedule, Reserve (cascade team selector — see §4a), My Fields
(sortable table + Edit sheet + bulk delete), Fields Map (MapKit), Admin (5
sub-panels: Teams, Locations, Fields, Slots incl. the max-teams stepper + team
overrides, Users incl. approve/role/team-assignment).

## Section 4 — The pitch visual & map (the two risky pieces)

- **Field pitch** (`Pitch/FieldPitchView.swift`): faithful SwiftUI rebuild of
  the vertical-columns layout — `ZStack` of a vertically-striped background
  (`LinearGradient`/repeating fill), a `Canvas` for the landscape markings
  (vertical halfway line, center circle, left/right penalty arcs at the web's
  opacities), an `HStack` of team columns with rotated labels
  (`.rotationEffect` for the `>3`-teams "narrow" case), dashed chalk dividers,
  the "Yours" green tint, and tap-to-reserve on empty columns. Signature look,
  worth 1:1.
- **Fields Map** (`Views/MapView.swift`): SwiftUI `Map` (MapKit) with a marker
  per located field, callouts showing name/city/field-count, default region
  Redmond, focus-on-arrival when opened from a field link. **Apple Maps vs OSM
  tiles is logged as an accepted platform difference** in the audit — not a gap.
- **Geocoding:** admin "Resolve Location" calls the existing
  **`/api/admin/geocode-address`** endpoint, so iOS-entered coordinates match
  web exactly (no CLGeocoder drift).

### Section 4a — Reserve team selector (cascade)

The Reserve screen's "Reserving for" selector mirrors the web redesign
(implemented in `src/App.tsx` `TeamSelector`):

- **≤6 reservable teams (coaches):** a single wrapping row of team-label pills,
  one tap. Unchanged fast path.
- **>6 teams (admin — every team):** a cascade of three labeled chip rows,
  **Gender → Age (birth year) → Team**, no keyboard needed. Each row shows only
  options that exist for the choice above it (no dead-ends). The Gender row is
  hidden when only one gender exists.
- The final Team row selects an actual team record; when two teams share a
  label, the coach name is appended (`B14-D · Rafael`) so options stay
  distinguishable.
- `selectedTeamId` is the single source of truth; the rows are a progressive way
  to set it. Changing gender/age keeps the current pick if still valid,
  otherwise falls to the first team in the new group so selection is never
  stranded.

## Section 5 — Fairness rules (the correctness core)

All 9 reservation rules stay **server-side and unchanged** — iOS never
re-implements them, it just calls `/api/reservations` and renders the server's
response/error. The client mirrors only the **UX affordances** (disable/enable
an empty column via `canAct`, `dayBooked`, `open`) exactly as `FieldPitchCard`
does at `App.tsx:645-652`, so tap targets look right, but the DB transaction
remains the single source of truth. **Zero risk of iOS and web disagreeing on
the rules.**

## Section 6 — Parity mechanism (directly addresses the miss)

Built specifically so we don't repeat AFROTC's gap. Root cause there: iOS was a
hand-mirror with **no checklist authored up front** and no automated comparison.

Countermeasures:
1. **`2026-07-30-ios-web-parity-audit.md` authored on day one**, seeded from the
   complete web inventory — every view, action, field, empty/loading state, and
   API endpoint, as ticked checkboxes. Structured **Tier 1 (whole screens)** /
   **Tier 2 (sub-features within a screen)** / **Accepted platform differences**
   (Apple Maps, native sheets/alerts, swipe actions).
2. **A "definition of done" per screen:** the screen's audit rows all ticked,
   verified by build-and-drive.
3. **Build-and-drive verification** with DEBUG launch env vars (auto-login,
   start-tab, deep-link) so each screen can be built + launched + screenshotted
   headlessly in the simulator.
4. Explicit callout of the **known-miss buckets** from AFROTC (Admin console,
   Sign Out, chip filters, result-count footers, distinct empty states,
   save-success feedback) as audit line items so they can't be forgotten.

## Section 7 — Build/emulation tooling & sequencing

**Build recipe** (documented in `ios/README.md`):
```bash
cd ios && xcodegen generate        # writes Crossfire.xcodeproj
xcodebuild -scheme Crossfire -destination 'platform=iOS Simulator,name=iPhone 17' build
xcrun simctl boot "iPhone 17"; open -a Simulator
xcrun simctl install booted <path>/Crossfire.app
xcrun simctl launch booted com.crossfireselect.fieldmanager
```
Simulator needs no signing; a physical iPhone needs your Apple Team ID filled
into `project.yml`. TestFlight later.

**Sequencing (phased, full audit up front):**
- **Phase 0:** repo scaffold — `ios/project.yml`, `Config`, `APIClient` +
  models, `Session`, `Theme`, `RootView`/`TabView`, auth sheet. Milestone: app
  builds, signs in against prod, shows an empty shell.
- **Phase 1 (coach-facing):** Schedule + pitch visual, Reserve (cascade
  selector), My Fields (+Edit/bulk), Fields Map, Team Finder. Milestone: a coach
  can do everything they can on web.
- **Phase 2 (admin):** the 5 admin panels + geocoding. Milestone: full parity,
  audit 100% ticked.

Testing: build-and-drive per screen (no XCTest target initially, matching
AFROTC), driven off the audit doc.
