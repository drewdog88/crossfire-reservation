# iOS ↔ Web Parity Audit

**Purpose:** the single checklist that drives the iOS port and prevents the
parity gap AFROTC hit. Every row is a ticked checkbox verified by build-and-drive
in the simulator. A screen is "done" only when all its rows are ticked.

**Source of truth:** reconciled from a full three-way sweep of the live code on
2026-07-30 — coach-facing views, admin console, and the `api/` contract. Every
verbatim label/string and every `file:line` below was read from source, not
recalled. Where a detail is easy to miss, it is called out explicitly.

**Legend:** `[ ]` not started · `[~]` built, not verified · `[x]` verified in
simulator against the web behavior.

**Structure:** **Tier 1** (whole screens must exist) · **Tier 2** (sub-features,
states, exact labels within a screen — where AFROTC leaked) · **Accepted
platform differences** (intentional, not gaps).

---

## Tier 1 — Screens / surfaces

- [ ] App shell: header (logo, name+role, Sign out), bottom `TabView`, loading splash
- [ ] Auth sheet (Sign In / Register)
- [ ] Team Finder (search, on all non-admin tabs)
- [ ] Schedule
- [ ] Reserve
- [ ] My Fields
- [ ] Fields Map
- [ ] Admin — Teams
- [ ] Admin — Locations
- [ ] Admin — Fields
- [ ] Admin — Slots
- [ ] Admin — Users

---

## Tier 2 — Sub-features by screen

### App shell (`App.tsx:3396-3737`)
- [x] Loading splash: logo + "Loading…" until `bootstrap()` + `me()` resolve
- [~] Header shows `{firstName} {lastName}` + lowercased role, avatar, **Sign out** button (signed in)
- [x] Header shows **Sign In** button (signed out)
- [x] Bottom tab order: **Schedule, Reserve, My Fields, Fields Map** (+ **Admin** only when `role == admin`)
- [x] Active tab tinted `cf-green`, icon scaled, underline bar
- [x] Tapping **Reserve** or **My Fields** while signed out opens the auth sheet (does NOT switch tab); Schedule + Fields Map are public
- [x] Signed-out Reserve placeholder: "Sign in to reserve field slots for your team." + Sign In
- [x] Signed-out My Fields placeholder: "Sign in to view your reservations." + Sign In
- [ ] Shared week state (`weekOffset`, **default 1 = Next Week**) persists across Schedule/Reserve/My Fields/Admin-Slots
- [~] Sign out clears user + user list, resets to Schedule

### Auth sheet (`AuthModal`, `App.tsx:2936-3140`)
- [x] Bottom sheet on mobile / centered on desktop; backdrop tap closes
- [x] Segmented toggle: "Sign In" / "Register"; switching clears error + notice
- [x] Sign In: email (`required`, "you@example.com"), password (`required`); button "Sign In" → "Signing in…"
- [x] Sign In failure fallback text: "Invalid email or password"
- [x] Register: First Name + Last Name (both `required`), email, password; **no team selection**
- [x] Register helper text: "New coach accounts need admin approval before first sign-in. Your teams are assigned by an admin."
- [x] Register button "Create Account" → "Creating…"
- [~] On register success: switch to login mode, clear password, green notice **"Account created. An admin must approve it before you can sign in."**
- [x] Register failure fallback: "Could not create account"
- [x] Error banner (red) / notice banner (green) above form
- [x] **Sign Out** (AFROTC miss — explicit line item; lives in the header, see shell)
- [~] Login of a `pending` account surfaces server 403 "Your account is awaiting admin approval."

### Team Finder (`TeamFinder`, `App.tsx:3233-3394`)
- [ ] Search box, placeholder "Find your team or coach (e.g. B14 D, Rafael)"
- [ ] Clear (X) button when query non-empty
- [ ] **Results compute only at ≥2 chars**; space-separated words are ANDed
- [ ] Matches: team label, coach name, gender, 4-digit year, AND **2-digit year shorthand** ("14")
- [ ] Searches **all weeks** (not week-filtered); sorted **date DESC then start-time DESC** (newest first)
- [ ] Count footer: "{N} practice" / "{N} practices" (singular/plural)
- [ ] Empty state: "No practices found for "{query}"." (curly quotes, raw query)
- [ ] Row: date · time range · location · field · right-aligned team label + "(coach)" if present

### Schedule (`ScheduleView`, `App.tsx:848-929`)
- [x] WeekNav (prev/next, range label, This Week/Next Week/Past tags, **no min/max**)
- [x] Location filter chips ("All fields" + one per location); default "all"
- [~] Field pitch cards per slot, grouped by date with DayHeader
- [x] Empty state: "No fields scheduled for this week. Try a different week or location."
- [~] Field pitch card location line → Fields Map link (only when lat+lon exist)

### Reserve (`ReserveView`, `App.tsx:1100-1266`)
- [ ] WeekNav (shared week state)
- [ ] **Team selector hidden entirely when coach has exactly 1 team** (`reservableTeams.length > 1`)
- [ ] **Team selector — cascade** (`TeamSelector`, `App.tsx:970-1096`):
  - [ ] ≤6 teams → wrapping pill row (coach fast path)
  - [ ] >6 teams → Gender → Age → Team cascade rows
  - [ ] Gender row hidden when only one gender exists; Boys→Girls order
  - [ ] Age pills sorted ascending; Team pills sorted by label
  - [ ] Changing gender/age auto-selects first team in group (never stranded)
  - [ ] Coach name appended on label collision (`B14-D · Rafael`)
  - [ ] Label: "Reserving for (admin — any team)" (admin) / "Reserving for" (coach)
- [ ] Location filter chips
- [ ] Reserve action → toast **"Spot reserved! 🎉"** (auto-dismiss 3s)
- [ ] Cancel action → toast **"Reservation cancelled."**
- [ ] Fairness error text surfaced verbatim in a red toast
- [ ] No-teams empty state: icon ⚽ "You have no teams assigned. Contact an admin to be assigned to a team."
- [ ] Slots empty state: "No fields available this week. Try a different week or location." (distinct from Schedule's copy)

### Field pitch card (`FieldPitchCard`, `App.tsx:611-831`) — shared, signature visual
- [ ] Field name + surface badge: Turf (blue) / Grass (green) / **Unknown (gray)**
- [ ] Time range in cf-green
- [ ] Open-count badge: "FULL" (red, open=0) / "1 OPEN" (amber) / "{n} OPEN" (green); "{filled}/{maxTeams} spots"
- [ ] "✓ RESERVED" green tag when selected team is in the slot (reserve mode)
- [ ] Vertical striped pitch, height scales 150/168/184 by maxTeams; SVG markings
- [ ] Team columns first, then open lanes; dashed chalk dividers
- [ ] Occupied column: team label; **"YOURS" green badge** + green gradient for own team
- [ ] Empty interactive column (reserve, `canAct`): dashed "＋ Reserve", tappable (web also keyboard-Enter)
- [ ] Empty non-interactive column: "Available"
- [ ] **Narrow mode (>3 teams): labels rotate vertical**
- [ ] `canAct = !myReservation && !dayBooked && open>0` gating (client-side affordance only)
- [ ] Reserve-mode footer: "{team} · reserved" + danger **Cancel**; or amber "Already booked a field on this day"; or red "All slots taken for this day"; or hint "Tap an open section to claim your spot"
- [ ] View mode has NO footer

### My Fields (`MyFieldsView`, `App.tsx:1286-1588`)
- [ ] **Flat sortable table ONLY — NO pitch-visual here** (correction: earlier spec wording implied a visual view; there is none)
- [ ] WeekNav; title "My Reservations" (coach) / "All Reservations" (admin)
- [ ] Columns: [checkbox], Day, Time, Field (+surface tag), Location, Team, Actions
- [ ] Sortable headers (Day/Time/Field/Location/Team); click active col flips asc/desc; default Day asc
- [ ] Sort arrow indicator ▲/▼ on active column
- [ ] "Select all" header checkbox + per-row checkboxes; selected rows tinted green
- [ ] Bulk delete button "Delete selected ({N})" when ≥1 selected; confirm "Cancel {N} reservation(s)?"; failure alert "Some cancellations failed:\n…"
- [ ] Per-row Edit (→ Edit sheet) and Cancel (confirm "Cancel this reservation?")
- [ ] Empty state: 🗓 "No field reservations for this week. Go to Reserve to book a spot."
- [ ] Edit/Move sheet (`EditReservationModal`): team `<select>` + slot `<select>` (Day·Time·Field·Location with "(current)"/"(full)"/"· {n} open" suffix); Save disabled if unchanged; no-op save just closes

### Fields Map (`MapView`, `App.tsx:3147-3231`)
- [ ] Marker per located field (lat+lon); default region Redmond [47.67, -122.12], zoom 10
- [ ] Callout: bold name, city, "{n} field(s)" count
- [ ] Focus-on-arrival from a field link: center that location, zoom 14, auto-open popup **once**
- [ ] Total-empty state: 🗺️ "No locations have been added yet. Admins can create them in the Admin panel."
- [ ] "Not mapped yet" panel listing unmapped location names (only when any exist)

### Admin shell (`AdminView`, `App.tsx:1731-1813`)
- [ ] 5 sticky scrollable tabs: Teams, Locations, Fields, Slots, Users; default Teams
- [ ] **Users tab amber pending-count badge** when pending users > 0
- [ ] Every mutation triggers full `refreshAdmin()` (re-fetch bootstrap + users) — NOT optimistic
- [ ] All admin errors → native alert (`reportError`); **no success toasts anywhere** in admin

### Admin — Teams (`AdminTeams`, `App.tsx:1820-1997`)
- [ ] Shared top form (inline add/edit via `editId`, NOT a modal)
- [ ] Gender `<select>` (Boys/Girls); Birth Year number (min 2005 max 2020, required); Level free text (required, NOT limited to A–D); Coach optional (empty → null)
- [ ] Submit "Add Team"/"Update"; Cancel only in edit mode; header toggles
- [ ] Delete confirm: "Delete this team? Its reservations will be removed."
- [ ] List sorted by `teamLabel`; row = label + "Coach {name}" + Edit/Trash
- [ ] (Web has NO empty state for empty teams list — match: absent)

### Admin — Locations (`AdminLocations`, `App.tsx:1999-2228`)
- [ ] Fields: Name (required), City (opt→null), Address (opt→null), Latitude, Longitude
- [ ] Lat validated finite ∈ [-90,90] else alert "Latitude must be a number between -90 and 90."; Lon ∈ [-180,180]
- [ ] **Resolve Location** button (enabled when address, or name+city): calls geocode, fills lat/lon; label → "Resolving…"
- [ ] Geocode error is **inline red text** (not the global alert): "Could not resolve. Enter coordinates manually." fallback
- [ ] Delete confirm: "Delete this location? Its fields and slots will be removed."
- [ ] List in server order; row sub-line = city + "· 📍 mapped" when lat+lon set
- [ ] (No empty state — match: absent)

### Admin — Fields (`AdminFields`, `App.tsx:2230-2409`)
- [ ] Location `<select>` (defaults first location); Field Name (required); Surface `<select>` "Unknown"(null)/Turf/Grass
- [ ] Delete confirm: "Delete this field? Its slots will be removed."
- [ ] List server order; row = name + location name + colored surface chip
- [ ] (No empty state — match: absent)

### Admin — Slots (`AdminSlots`, `App.tsx:2411-2745`) — week-scoped
- [ ] WeekNav (shared week state); shows only current-week slots whose field exists, sorted by `compareSlots`
- [ ] Add form: Field `<select>` ("{location} — {field}"); Date (required); Max Teams (min 1 max 8); Start 17:30 / End 19:00 defaults
- [ ] Add validation: end>start else alert "End time must be after start time."; duplicate (field+date+start) else alert "A slot for this field, date, and start time already exists."
- [ ] Add success resets only Date (keeps field/times/max for rapid entry)
- [ ] **Slots are never edited via a form** — only max-teams stepper + overrides inline
- [ ] Per-slot card: header "{location} · {field}", "{date} · {timerange}", Trash
- [ ] Delete confirm: "Delete this slot? Its reservations will be removed."
- [ ] **Max-Teams stepper** −/+: floor = max(1, reservedCount), ceiling 8; clamps in-handler (buttons not disabled at bounds); persists full slot
- [ ] OccupancyBar (green <50% / amber ≥50% / red 100%) + "{reserved}/{max}"
- [ ] Reserved-teams override chips (shown when reservedCount>0) with X remove → `cancel` endpoint, **NO confirm**
- [ ] Add-override row (shown when reservedCount<max AND available teams exist): `<select>` "Add team override…" + Add → `reserve` endpoint (server enforces fairness)
- [ ] Empty state: 📅 "No slots configured for this week. Add slots above."

### Admin — Users (`AdminUsers`, `App.tsx:2747-2932`)
- [ ] Split into "Pending Approval" (shown only if any) + "Users" sections
- [ ] User card: name, email, status badges (amber "pending", role chip, green team chips)
- [ ] Pending user → **Approve** button → `{status:"active"}`; active user → Edit (pencil, "Assign teams")
- [ ] Expanded editor: Role `<select>` (Coach/Admin) **persists immediately on change**
- [ ] Team pills (sorted by label) staged in `draftTeamIds`; **"Save Teams"** persists; **"Done"** discards unsaved pill changes
- [ ] Delete user (Trash, all users) confirm: "Delete this user?"
- [ ] Active-empty state: 👤 "No active users yet."
- [ ] (Role change only takes effect on the user's NEXT login — JWT `role` is baked at login; note, not a client bug)

---

## API endpoints — each exercised by iOS

- [ ] `GET  /api/bootstrap` → `{teams, locations, fields, slots}` (public)
- [ ] `POST /api/auth/register` → `{ok:true}` (no cookie, pending coach)
- [ ] `POST /api/auth/login` → sets `cf_session`, returns `{user}` (no status)
- [ ] `POST /api/auth/logout` → `{ok:true}` (always)
- [ ] `GET  /api/auth/me` → `{user}` OR **401 "Not signed in."** when signed out / not active
- [ ] `POST /api/reservations` (book) → `{slot}`
- [ ] `DELETE /api/reservations` (cancel) → `{slot}`
- [ ] `PATCH /api/reservations` (move) → **`{slots:[...]}`** (note: plural, unlike book/cancel)
- [ ] `GET/POST/PUT/DELETE /api/admin/teams`
- [ ] `GET/POST/PUT/DELETE /api/admin/locations`
- [ ] `GET/POST/PUT/DELETE /api/admin/fields`
- [ ] `GET/POST/PUT/DELETE /api/admin/slots` (maxTeams defaults 8 when falsy)
- [ ] `GET/PUT/DELETE /api/admin/users` (**no POST**; GET includes `status`)
- [ ] `POST /api/admin/geocode-address` → `{lat, lon}`

---

## The 9 fairness rules — server-enforced, iOS renders the response verbatim

iOS must NOT re-implement these; surface each rejection's exact message and
mirror only the tap-target affordance. Verify each error path:

- [ ] Ownership gate (non-admin, unowned team): "You can only manage your own teams." (403)
- [ ] Required fields: "slotId and teamId are required." (400)
- [ ] Slot existence: "Slot not found." (404)
- [ ] Capacity full: "This slot is full." (400)
- [ ] Duplicate booking: "This team already has this spot." (400)
- [ ] One-per-day: "This team is already booked that day." (400)
- [ ] Two-per-week: "This team already has 2 reservations this week." (400)
- [ ] Reservation not found (cancel / move source): "Reservation not found." (404)
- [ ] Move missing new fields: "newSlotId and newTeamId are required." (400)
- [ ] Move re-validation: source deleted then dest re-booked in one txn; any dest failure rolls back the whole move (original stays intact)
- [ ] Concurrency: per-team advisory lock + per-slot FOR UPDATE + `UNIQUE(slot_id,team_id)` backstop (server-side; iOS just retries/refreshes on error)

---

## Accepted platform differences (NOT gaps)

- [x] Apple Maps (MapKit) instead of OSM/Leaflet tiles
- [x] Native `.alert` / `.confirmationDialog` instead of web `confirm()`/`alert()`
- [x] Native swipe actions where web uses inline buttons (optional; buttons also fine)
- [x] Native toast overlay instead of the web toast component (Reserve view only)
- [x] Cookie carried by `HTTPCookieStorage` (same `cf_session`, native transport)
- [x] Admin mutations may stay full-refresh (like web) OR be optimistic — web is full-refresh; optimistic is an allowed enhancement, not a gap
- [x] Keyboard-Enter activation of pitch reserve cells → plain tap on iOS (no hardware keyboard)
- [x] Missing web empty states (Teams/Locations/Fields admin lists) may be added on iOS for polish without counting as divergence
- [x] **Universal app:** the same SwiftUI screens run on iPhone AND iPad (`TARGETED_DEVICE_FAMILY = 1,2`). iPad is the same feature set on a wider canvas, not a separate layout — each screen is spot-checked on iPad Pro 11-inch (M5) as well as iPhone 17 Pro during build-and-drive.

---

## Corrections applied during this reconciliation (were wrong/missing in the first-pass audit)

1. My Fields is a **flat table only** — there is no visual "My Fields" pitch view. (spec §3 wording implied otherwise; audit now explicit)
2. Register takes **no team selection** and requires **admin approval before first login** (403 until active). (spec §3 corrected)
3. `me()` returns **401**, not `{user:null}`, when signed out. (spec §3 corrected)
4. Team selector is **hidden for single-team coaches**.
5. Move returns **`{slots:[...]}`** (plural); book/cancel return `{slot}`.
6. Admin has **no success toasts** and **no optimistic updates** (full refresh); only Slots + active-Users have empty states.
7. Team-override removal on a slot has **no confirm** (unlike all other deletes).
8. Role select in Admin-Users **persists on change**; team pills need explicit Save.
