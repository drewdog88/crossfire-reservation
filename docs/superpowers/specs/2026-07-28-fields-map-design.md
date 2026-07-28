# Fields Map Feature — Design Specification

**Author:** drewdog88  
**Date:** 2026-07-28  
**Status:** Draft  

---

## Overview

Add an interactive map view showing all practice-field **locations** (not individual fields) as pins on an OpenStreetMap tile layer. Each location that has latitude/longitude coordinates displays a marker; clicking the marker opens a popup with location name, city, and field count. Locations without coordinates are listed in a side panel as "Not mapped yet." Access is restricted to signed-in users (coaches and admins).

**Goal:** Give users geographic context for field locations, making it easier to understand proximity to home/work and plan travel for practices.

---

## Schema Changes

The `locations` table currently has `id`, `name`, `city` (all `NOT NULL` except city which is nullable). We add three new nullable columns to support geocoding:

```sql
ALTER TABLE locations
  ADD COLUMN address text,
  ADD COLUMN lat double precision,
  ADD COLUMN lon double precision;
```

**Updated CREATE TABLE** (full definition for `schema.sql`):

```sql
CREATE TABLE IF NOT EXISTS locations (
  id      serial PRIMARY KEY,
  name    text NOT NULL,
  city    text,
  address text,
  lat     double precision,
  lon     double precision
);
```

- `address` — free-form text address (e.g., "17500 NE 76th St, Redmond, WA 98052"). Optional, used for geocoding.
- `lat`, `lon` — WGS84 coordinates. `NULL` when not geocoded or geocoding failed. A location with `NULL` lat/lon does not appear on the map.

No indexes are needed initially (locations table is small, ~10-20 rows).

---

## Geocoding Approach

Geocoding happens **admin-side** via the admin Locations form, using the **Nominatim** (OpenStreetMap) HTTP API. Geocoding is a one-time operation at data-entry/edit time — **not** on every page load.

### Admin Form Changes (api/admin/locations.js + frontend Admin panel)

**Current flow:** Admin can create/edit a location with `name` and `city`.

**New flow:**

1. **Form fields** (all text inputs, all optional except name):
   - Name (required)
   - City
   - Address (new — e.g., "17500 NE 76th St, Redmond, WA 98052")
   - Latitude (new — read-only or manual-entry fallback)
   - Longitude (new — read-only or manual-entry fallback)

2. **Geocode button** (appears when address is non-empty):
   - Label: "Geocode Address"
   - On click: send `address` to a new admin endpoint `/api/admin/geocode-address` (or inline in the locations handler), which:
     - Calls `https://nominatim.openstreetmap.org/search?format=json&q={encodeURIComponent(address)}&limit=1`
     - Parses the first result's `lat`/`lon` fields
     - Returns `{ lat, lon }` or `{ error }` if no results or network failure
   - On success: populate the lat/lon form fields (user can still manually tweak if needed)
   - On error: show a dismissible error message (e.g., "Address not found. Try a more specific address or enter coordinates manually.")

3. **Manual entry fallback:** If Nominatim fails or returns wrong coordinates, admin can paste lat/lon from Google Maps or another source.

4. **Save:** POST/PUT includes all 5 fields (`name`, `city`, `address`, `lat`, `lon`). Lat/lon are stored as `double precision` (numeric types). Nulls are allowed — a location without coordinates simply won't appear on the map.

### Nominatim Usage Policy

- **Rate limit:** 1 request/second for OSM Nominatim (free tier). The app's admin usage (geocoding ~10-20 locations total, infrequent edits) is well within this.
- **User-Agent:** All requests must include a `User-Agent` header identifying the app (e.g., `User-Agent: crossfire-reservation/1.0 (contact: coach@example.com)`). Hardcode a sensible default in the geocode endpoint.
- **No caching required** for this use case (geocoding is admin-only, one-time per location).

**Implementation note:** The geocode endpoint can be a new `api/admin/geocode-address.js` file or a `GET /api/admin/locations/geocode?address=...` route in the existing `locations.js`. Either way, it's admin-gated (requireAdmin).

---

## Backend Changes

### api/_lib/serialize.js

Update the `location` serializer to include the new fields:

```js
export function location(r) {
  return {
    id: String(r.id),
    name: r.name,
    city: r.city ?? null,
    address: r.address ?? null,
    lat: r.lat ?? null,
    lon: r.lon ?? null,
  }
}
```

### api/admin/locations.js

**GET** (unchanged except serialize includes new fields via updated `S.location`).

**POST:**
```js
const { rows } = await query(
  'INSERT INTO locations (name, city, address, lat, lon) VALUES ($1,$2,$3,$4,$5) RETURNING *',
  [body.name, body.city ?? null, body.address ?? null, body.lat ?? null, body.lon ?? null]
)
```

**PUT:**
```js
const { rows } = await query(
  'UPDATE locations SET name=$2, city=$3, address=$4, lat=$5, lon=$6 WHERE id=$1 RETURNING *',
  [Number(body.id), body.name, body.city ?? null, body.address ?? null, body.lat ?? null, body.lon ?? null]
)
```

### api/admin/geocode-address.js (new)

```js
import { sendJson, methodGuard, readBody } from '../_lib/http.js'
import { requireAdmin } from '../_lib/auth.js'

export default async function handler(req, res) {
  if (methodGuard(req, res, ['POST'])) return
  if (!requireAdmin(req, res)) return
  const body = await readBody(req)
  const { address } = body
  if (!address || typeof address !== 'string') {
    return sendJson(res, 400, { error: 'Missing address' })
  }
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'crossfire-reservation/1.0 (coach@crossfireselect.com)' }
    })
    const results = await resp.json()
    if (!Array.isArray(results) || results.length === 0) {
      return sendJson(res, 404, { error: 'Address not found' })
    }
    const { lat, lon } = results[0]
    return sendJson(res, 200, { lat: parseFloat(lat), lon: parseFloat(lon) })
  } catch (err) {
    console.error('geocode error', err)
    return sendJson(res, 500, { error: 'Geocoding failed' })
  }
}
```

---

## Frontend Changes

### src/types.ts

Update the `Location` interface:

```ts
export interface Location {
  id: string
  name: string
  city: string
  address: string | null
  lat: number | null
  lon: number | null
}
```

Also add a new `View` option:

```ts
export type View = 'schedule' | 'reserve' | 'myfields' | 'map' | 'admin'
```

### src/api.ts

Add a geocode helper (used by the admin form):

```ts
export async function geocodeAddress(address: string): Promise<{ lat: number; lon: number }> {
  return req<{ lat: number; lon: number }>('/admin/geocode-address', {
    method: 'POST',
    body: JSON.stringify({ address }),
  })
}
```

### src/App.tsx

#### Nav bar

Add a new nav item between "My Fields" and "Admin":

```tsx
const navItems = [
  { id: 'schedule', label: 'Schedule', icon: <IconCalendar /> },
  { id: 'reserve', label: 'Reserve', icon: <IconField /> },
  { id: 'myfields', label: 'My Fields', icon: <IconClipboard /> },
  { id: 'map', label: 'Fields Map', icon: <IconMap /> },  // NEW
  { id: 'admin', label: 'Admin', icon: <IconSettings />, adminOnly: true },
]
```

(Add a new `IconMap` component using an inline SVG — a simple location pin or map icon from the existing icon pattern.)

#### Map view component

A new `MapView` component (inline in App.tsx or extracted if desired) that:

1. **Filters locations** with non-null lat/lon → these get markers.
2. **MapContainer** (react-leaflet):
   - `center={[47.67, -122.12]}` (Redmond, WA — central to Crossfire Select)
   - `zoom={10}` (shows ~20-mile radius)
   - `style={{ height: '100%', width: '100%' }}`
3. **TileLayer**: OpenStreetMap tiles (`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`, attribution required per OSM policy).
4. **Marker + Popup** for each mapped location:
   - Marker at `[location.lat, location.lon]`
   - Popup content:
     ```
     <strong>{location.name}</strong>
     {location.city && <div className="text-sm text-navy-400">{location.city}</div>}
     <div className="text-xs text-navy-500 mt-1">{fieldCount} field(s)</div>
     ```
     where `fieldCount = fields.filter(f => f.locationId === location.id).length`
5. **Side panel** (unmapped locations):
   - Shows locations with `lat === null || lon === null`
   - Styled as a fixed overlay (e.g., top-right corner, `bg-navy-800 border border-navy-600 rounded-xl shadow-xl p-4 max-w-xs`) or a docked left rail.
   - Content:
     ```
     <h3 className="font-display text-sm font-600 mb-2">Not mapped yet</h3>
     <ul className="text-xs text-navy-300 space-y-1">
       {unmappedLocations.map(l => <li key={l.id}>{l.name}</li>)}
     </ul>
     ```
   - If no unmapped locations, hide the panel.

#### Access gating

The map view is only visible to signed-in users. The existing App.tsx already tracks `user` state (from `api.me()`) and shows/hides views based on role (e.g., admin panel is `isAdmin` only). The map view is **not** admin-only — any signed-in user (coach or admin) can see it.

**Logic:**
```tsx
{view === 'map' && user && (
  <MapView locations={bootstrap.locations} fields={bootstrap.fields} />
)}
{view === 'map' && !user && (
  <EmptyState icon="🗺️" message="Sign in to view the fields map." />
)}
```

(The existing App.tsx already has a pattern for `isCoach` vs anonymous — reuse that for the map view.)

#### Admin Locations form

Add three new fields to the location create/edit modal:

- **Address** (text input, optional)
- **Latitude** (number input, read-only by default or manual-entry)
- **Longitude** (number input, read-only by default or manual-entry)
- **Geocode button** (visible when address is non-empty):
  - On click: `const { lat, lon } = await api.geocodeAddress(address)` → populate lat/lon fields
  - Error handling: show an inline error message below the button (e.g., `<p className="text-red-500 text-xs mt-1">{error}</p>`)

---

## Dependencies

Add to `package.json`:

```json
"leaflet": "^1.9.4",
"react-leaflet": "^5.0.0",
"@types/leaflet": "^1.9.14"
```

**CSS import** (required for Leaflet styles):

In `src/main.tsx` or `src/App.tsx` (at the top):

```ts
import 'leaflet/dist/leaflet.css'
```

This import must be **before** the app's CSS (`src/index.css`) to allow Tailwind overrides of Leaflet's default styles if needed.

---

## Styling

**Light theme, Tailwind v4:**

- Map container: 100% height/width, rounded corners if desired (map controls already handle overflow).
- Side panel (unmapped locations): `bg-navy-800 border-navy-600 text-navy-300` (matches existing Card/panel pattern).
- Popup: Leaflet's default white popup is acceptable, but can override `.leaflet-popup-content-wrapper` in `src/index.css` with:
  ```css
  .leaflet-popup-content-wrapper {
    background-color: theme('colors.navy.800');
    color: theme('colors.navy.100');
    border: 1px solid theme('colors.navy.600');
  }
  .leaflet-popup-tip {
    background-color: theme('colors.navy.800');
  }
  ```
  (Optional — default white popup is also fine for MVP.)

---

## Error & Empty States

1. **No locations at all:**
   ```tsx
   <EmptyState icon="🗺️" message="No locations have been added yet. Admins can create them in the Admin panel." />
   ```

2. **All locations unmapped:**
   - Map renders (empty) + side panel shows all locations as "Not mapped yet."

3. **Network error loading bootstrap:**
   - Handled by existing App.tsx bootstrap error state (affects all views, not map-specific).

4. **Geocoding failure:**
   - Admin sees an inline error message: "Address not found. Try a more specific address or enter coordinates manually."
   - No impact on map view (location remains unmapped until coordinates are saved).

---

## Testing

### Manual Testing

1. **Schema migration:**
   - Run the `ALTER TABLE` against the live Neon DB (via psql or Neon console).
   - Verify existing locations still load (new columns should be NULL).

2. **Admin geocoding:**
   - Edit a location, add an address (e.g., "17500 NE 76th St, Redmond, WA 98052"), click "Geocode Address."
   - Verify lat/lon populate (~47.67, -122.12 for Redmond).
   - Save → refresh map → verify marker appears.

3. **Map view (signed-in user):**
   - Navigate to "Fields Map" → verify map loads, tiles render, markers appear for geocoded locations.
   - Click a marker → verify popup shows location name, city, field count.
   - Verify unmapped locations appear in side panel (if any).

4. **Map view (anonymous):**
   - Log out → navigate to "Fields Map" → verify "Sign in to view the fields map" empty state.

5. **Manual lat/lon entry:**
   - Edit a location, clear the geocoded lat/lon, enter invalid coordinates (e.g., 200, 200) → save → verify no marker (or map centers on fallback).
   - Enter valid coordinates → verify marker appears.

6. **Edge cases:**
   - Location with no fields → popup shows "0 field(s)".
   - Address with no Nominatim match → verify error message, no crash.
   - Slow Nominatim response → verify button shows loading state (if implemented) or at least doesn't double-fire.

### Automated Testing

No automated tests required for MVP (the app has no existing test suite). If tests are added later:

- Mock `api.geocodeAddress` to return fixed lat/lon.
- Mock Leaflet/react-leaflet components (notoriously hard to unit-test — prefer manual QA).

---

## Future Enhancements (Out of Scope for MVP)

- **Geocoding on server-side batch:** Admin "Geocode all" button to geocode every location with an address but no coordinates.
- **Clustering:** If location count exceeds ~50, use Leaflet.markercluster to group nearby pins.
- **User location:** "Show my location" button to pan map to user's current position (requires browser geolocation API + HTTPS).
- **Directions link:** In popup, add a "Get Directions" link (opens Google Maps with destination set to location address).
- **Dark mode map tiles:** Switch to a dark-themed tile provider (e.g., CartoDB Dark Matter) if the app adds a dark mode.

---

## Implementation Checklist

1. [ ] Run `ALTER TABLE locations ADD COLUMN address text, ADD COLUMN lat double precision, ADD COLUMN lon double precision;` on Neon DB.
2. [ ] Update `scripts/schema.sql` with new columns.
3. [ ] Update `api/_lib/serialize.js` → `location()` to include `address`, `lat`, `lon`.
4. [ ] Update `api/admin/locations.js` → POST/PUT to accept new fields.
5. [ ] Create `api/admin/geocode-address.js` endpoint.
6. [ ] Install `leaflet`, `react-leaflet`, `@types/leaflet` (npm).
7. [ ] Import `leaflet/dist/leaflet.css` in `src/main.tsx`.
8. [ ] Update `src/types.ts` → `Location` interface + add `'map'` to `View` type.
9. [ ] Update `src/api.ts` → add `geocodeAddress()` helper.
10. [ ] Update `src/App.tsx` → add `IconMap`, nav item, `MapView` component.
11. [ ] Update Admin Locations form → add address/lat/lon fields + geocode button.
12. [ ] Manual test all flows (geocoding, map rendering, access gating, unmapped locations).
13. [ ] Deploy to Vercel → verify in production.

---

**End of Design Specification**
