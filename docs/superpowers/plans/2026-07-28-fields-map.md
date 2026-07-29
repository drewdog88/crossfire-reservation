# Fields Map Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a signed-in-only "Fields Map" view that plots each practice-field location as a Leaflet/OSM marker, with admin-side Nominatim geocoding to populate coordinates.

**Architecture:** Three nullable columns (`address`, `lat`, `lon`) are added to `locations`. The admin Locations form gains address + lat/lon inputs and a "Geocode Address" button that calls a new admin-gated `/api/admin/geocode-address` endpoint (server-side Nominatim proxy, so the OSM User-Agent policy is honored and no CORS issue arises). The frontend adds a `map` view rendering `react-leaflet` markers for locations with coordinates and a side panel listing unmapped ones.

**Tech Stack:** React 19, Vite 8, TypeScript 5.7, Tailwind v4, `leaflet` 1.9.4 + `react-leaflet` 5.0, Vercel serverless (Node fetch), Neon Postgres.

## Global Constraints

- Public repo — **never commit secrets**; `DATABASE_URL`/`JWT_SECRET` stay in `.env.local` (gitignored) + Vercel env. Copied verbatim from AGENTS.md.
- DB is the single source of truth — **no localStorage/in-memory/SQLite fallback**.
- Personal git identity `drewdog88 <138076767+drewdog88@users.noreply.github.com>`; commits end with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- All ids are serialized as **strings** across the API boundary (see `serialize.js`).
- Serverless functions are ESM `export default async function handler(req, res)`.
- Light theme; components consume `bg-navy-*` / `text-navy-*` / `text-cf-green` tokens, not hardcoded colors.
- `react-leaflet` 5 requires React 19 (satisfied).
- Nominatim policy: max 1 req/sec, mandatory identifying `User-Agent`. Admin-only, low volume — within policy.

## File Structure

- `scripts/schema.sql` — add `address`, `lat`, `lon` to the `locations` CREATE TABLE (source of truth).
- `api/_lib/serialize.js` — `location()` returns the three new fields.
- `api/admin/locations.js` — POST/PUT accept the three new fields.
- `api/admin/geocode-address.js` — **new** admin-gated Nominatim proxy.
- `src/types.ts` — extend `Location`, add `'map'` to `View`.
- `src/api.ts` — add `geocodeAddress()` helper.
- `src/App.tsx` — `IconMap`, nav item, `MapView` component, marker-icon fix, `leaflet/dist/leaflet.css` import, admin form fields + geocode button.
- `package.json` — add leaflet deps.
- Live Neon DB — one-time `ALTER TABLE` migration (run via a throwaway node script, then delete it).

Note: `MapView` lives inline in `App.tsx` to match the existing convention (every view component is already inline in this 1742-line file; introducing a separate module here would break the established pattern).

---

### Task 1: Schema + serializer + admin CRUD for coordinates

**Files:**
- Modify: `scripts/schema.sql:23-27`
- Modify: `api/_lib/serialize.js:17-19`
- Modify: `api/admin/locations.js:15-23`
- Live Neon DB: apply `ALTER TABLE`

**Interfaces:**
- Produces: `S.location(r)` now returns `{ id, name, city, address, lat, lon }` (address string|null; lat/lon number|null). `POST/PUT /api/admin/locations` accept `address`, `lat`, `lon` in the body.

- [ ] **Step 1: Update `scripts/schema.sql`** — replace the `locations` table definition (lines 23-27):

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

- [ ] **Step 2: Migrate the live DB.** Create `scripts/_migrate-map.mjs` (temporary), reusing the `.env.local` parser + `pg.Client` pattern from `scripts/import-sheet.mjs:22-30,122-123`:

```js
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import pg from 'pg'
const __dirname = dirname(fileURLToPath(import.meta.url))
for (const line of readFileSync(join(__dirname, '..', '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}
const url = process.env.NEW_DATABASE_URL || process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL
const c = new pg.Client({ connectionString: url })
await c.connect()
await c.query(`ALTER TABLE locations
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lon double precision`)
const { rows } = await c.query('SELECT column_name FROM information_schema.columns WHERE table_name=$1 ORDER BY ordinal_position', ['locations'])
console.log('locations columns:', rows.map(r => r.column_name).join(', '))
await c.end()
```

- [ ] **Step 3: Run the migration**

Run: `node scripts/_migrate-map.mjs 2>&1 | grep -v "SECURITY WARNING\|next major\|To prepare\|If you want\|uselibpqcompat\|See https\|trace-warnings\|sslmode"`
Expected: `locations columns: id, name, city, address, lat, lon`

- [ ] **Step 4: Delete the throwaway migration script**

Run: `rm scripts/_migrate-map.mjs`

- [ ] **Step 5: Update `api/_lib/serialize.js`** — replace the `location` function (lines 17-19):

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

- [ ] **Step 6: Update `api/admin/locations.js`** — replace the POST and PUT blocks (lines 15-23):

```js
    if (req.method === 'POST') {
      const { rows } = await query(
        'INSERT INTO locations (name, city, address, lat, lon) VALUES ($1,$2,$3,$4,$5) RETURNING *',
        [body.name, body.city ?? null, body.address ?? null, body.lat ?? null, body.lon ?? null],
      )
      return sendJson(res, 200, S.location(rows[0]))
    }
    if (req.method === 'PUT') {
      const { rows } = await query(
        'UPDATE locations SET name=$2, city=$3, address=$4, lat=$5, lon=$6 WHERE id=$1 RETURNING *',
        [Number(body.id), body.name, body.city ?? null, body.address ?? null, body.lat ?? null, body.lon ?? null],
      )
      if (rows.length === 0) return sendJson(res, 404, { error: 'Not found.' })
      return sendJson(res, 200, S.location(rows[0]))
    }
```

- [ ] **Step 7: Verify the bootstrap still serves locations with the new fields**

Run: `node scripts/print-locations.mjs 2>/dev/null || echo "use ad-hoc query"` — or run an inline node query selecting `id,name,city,address,lat,lon FROM locations LIMIT 1`.
Expected: query succeeds; existing rows show `address/lat/lon` as `null`.

- [ ] **Step 8: Commit**

```bash
git add scripts/schema.sql api/_lib/serialize.js api/admin/locations.js
git commit -m "Add address/lat/lon columns to locations (schema, serializer, admin CRUD)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Geocode endpoint

**Files:**
- Create: `api/admin/geocode-address.js`

**Interfaces:**
- Consumes: `sendJson`, `methodGuard`, `readBody` from `../_lib/http.js`; `requireAdmin` from `../_lib/auth.js` (same imports `api/admin/locations.js` uses).
- Produces: `POST /api/admin/geocode-address` with body `{ address: string }` → `200 { lat: number, lon: number }` | `400 { error }` | `404 { error }` | `500 { error }`.

- [ ] **Step 1: Create `api/admin/geocode-address.js`**

```js
import { sendJson, methodGuard, readBody } from '../_lib/http.js'
import { requireAdmin } from '../_lib/auth.js'

// Server-side Nominatim proxy so the OSM User-Agent policy is honored and the
// browser never hits Nominatim cross-origin. Admin-gated; geocoding is a
// one-time operation performed when an admin saves a location's address.
export default async function handler(req, res) {
  if (methodGuard(req, res, ['POST'])) return
  if (!requireAdmin(req, res)) return
  const body = await readBody(req)
  const address = body?.address
  if (!address || typeof address !== 'string') {
    return sendJson(res, 400, { error: 'Missing address' })
  }
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'crossfire-reservation/1.0 (coach@crossfireselect.com)' },
    })
    const results = await resp.json()
    if (!Array.isArray(results) || results.length === 0) {
      return sendJson(res, 404, { error: 'Address not found' })
    }
    return sendJson(res, 200, { lat: parseFloat(results[0].lat), lon: parseFloat(results[0].lon) })
  } catch (err) {
    console.error('geocode error', err)
    return sendJson(res, 500, { error: 'Geocoding failed' })
  }
}
```

- [ ] **Step 2: Type-check**

Run: `npm run build`
Expected: build succeeds (endpoint is plain JS; this confirms nothing else broke).

- [ ] **Step 3: Commit**

```bash
git add api/admin/geocode-address.js
git commit -m "Add admin-gated Nominatim geocode endpoint

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Leaflet dependency + types + api helper

**Files:**
- Modify: `package.json:12-19`
- Modify: `src/types.ts:7,18-22`
- Modify: `src/api.ts` (append helper after line 98)

**Interfaces:**
- Consumes: nothing new.
- Produces: `Location` interface has `address: string | null; lat: number | null; lon: number | null`. `View` includes `'map'`. `api.geocodeAddress(address: string): Promise<{ lat: number; lon: number }>`.

- [ ] **Step 1: Install leaflet deps**

Run: `npm install leaflet@^1.9.4 react-leaflet@^5.0.0 && npm install -D @types/leaflet@^1.9.14`
Expected: three packages added; `package.json` dependencies include `leaflet`, `react-leaflet`; devDeps include `@types/leaflet`.

- [ ] **Step 2: Extend the `Location` interface in `src/types.ts`** — replace lines 18-22:

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

- [ ] **Step 3: Add `'map'` to the `View` type in `src/types.ts`** — replace line 7:

```ts
export type View = 'schedule' | 'reserve' | 'myfields' | 'map' | 'admin'
```

- [ ] **Step 4: Add `geocodeAddress` to `src/api.ts`** — append after line 98 (after `adminDelete`):

```ts
export function geocodeAddress(address: string): Promise<{ lat: number; lon: number }> {
  return req<{ lat: number; lon: number }>('/admin/geocode-address', {
    method: 'POST',
    body: JSON.stringify({ address }),
  })
}
```

- [ ] **Step 5: Type-check**

Run: `npm run build`
Expected: build succeeds; TypeScript accepts the widened `Location` type (existing `l.city` usages unaffected; `address/lat/lon` are additive).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/types.ts src/api.ts
git commit -m "Add leaflet deps, Location coords fields, map View, geocodeAddress helper

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: MapView component + nav + leaflet CSS + marker-icon fix

**Files:**
- Modify: `src/App.tsx` (imports at top; add `IconMap` near line 107; add `MapView` component before the root `App`; add nav item at line 1646-1651; add view render at line 1711)

**Interfaces:**
- Consumes: `Location`/`Field` types (imported already at `src/App.tsx:4`), `EmptyState` (line 56), `Card`, `bootstrap.locations`/`bootstrap.fields` already passed into the render as `locations`/`fields`.
- Produces: a `MapView({ locations, fields }: { locations: Location[]; fields: Field[] })` component and a reachable `map` nav entry for signed-in users.

- [ ] **Step 1: Add leaflet CSS + marker-icon fix imports at the very top of `src/App.tsx`.**

Leaflet's default marker icon URLs break under Vite bundling (they resolve to 404). Import the images so Vite fingerprints them and rebind Leaflet's icon defaults. Add these imports **above** the existing first import line:

```ts
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'

// Vite bundles Leaflet's marker images to hashed URLs; rebind the defaults so
// markers render instead of 404ing on Leaflet's built-in relative paths.
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow })
```

- [ ] **Step 2: Add an `IconMap` component after `IconUser` (line 106)** in the Icons section:

```tsx
const IconMap = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-5 h-5">
    <path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
)
```

- [ ] **Step 3: Add the `MapView` component.** Place it immediately before the root `App` component (search for the `function App(` / `export default function App` declaration; insert above it). Full component:

```tsx
// Signed-in-only geographic view of practice-field locations. Locations with
// lat/lon get a marker + popup (name, city, field count); those without are
// listed in a "Not mapped yet" panel. Centered on Redmond, WA (Crossfire hub).
function MapView({ locations, fields }: { locations: Location[]; fields: Field[] }) {
  const mapped = locations.filter(l => l.lat != null && l.lon != null)
  const unmapped = locations.filter(l => l.lat == null || l.lon == null)
  const fieldCount = (locId: string) => fields.filter(f => f.locationId === locId).length

  if (locations.length === 0) {
    return <EmptyState icon="🗺️" message="No locations have been added yet. Admins can create them in the Admin panel." />
  }

  return (
    <div className="relative h-[calc(100vh-120px)]">
      <MapContainer center={[47.67, -122.12]} zoom={10} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {mapped.map(l => (
          <Marker key={l.id} position={[l.lat as number, l.lon as number]}>
            <Popup>
              <strong>{l.name}</strong>
              {l.city && <div className="text-xs text-navy-500">{l.city}</div>}
              <div className="text-xs text-navy-500 mt-1">{fieldCount(l.id)} field(s)</div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      {unmapped.length > 0 && (
        <div className="absolute top-3 right-3 z-[1000] bg-navy-800 border border-navy-600 rounded-xl shadow-xl p-4 max-w-[12rem]">
          <h3 className="font-display text-sm font-600 text-navy-100 mb-2">Not mapped yet</h3>
          <ul className="text-xs text-navy-300 space-y-1">
            {unmapped.map(l => <li key={l.id}>{l.name}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}
```

Note: the side panel uses `z-[1000]` because Leaflet panes sit at z-index up to ~700; a normal Tailwind `z-30` would render *under* the map.

- [ ] **Step 4: Add the nav item.** In `src/App.tsx:1646-1651`, insert the map entry after `myfields`:

```tsx
  const navItems: { id: View; label: string; icon: ReactNode }[] = [
    { id: 'schedule', label: 'Schedule',  icon: <IconCalendar /> },
    { id: 'reserve',  label: 'Reserve',   icon: <IconField /> },
    { id: 'myfields', label: 'My Fields', icon: <IconClipboard /> },
    { id: 'map',      label: 'Fields Map', icon: <IconMap /> },
    ...(isAdmin ? [{ id: 'admin' as View, label: 'Admin', icon: <IconSettings /> }] : []),
  ]
```

- [ ] **Step 5: Gate the map nav click for signed-out users.** In the nav `onClick` at `src/App.tsx:1723`, extend the sign-in gate to include `map`:

```tsx
                if ((item.id === 'reserve' || item.id === 'myfields' || item.id === 'map') && !currentUser) { setShowAuth(true); return }
```

(Reserve/MyFields gate on `!isCoach`; the map is for *any* signed-in user, so it gates on `!currentUser`. Keep the existing `reserve`/`myfields` behavior — this adds `map` as an additional condition that fires only when there's no user at all. Because a coach or admin always has a `currentUser`, the combined check is correct: signed-out users are prompted to sign in; the `!isCoach` clause still catches signed-out users for reserve/myfields as before.)

- [ ] **Step 6: Add the map view render block.** In `src/App.tsx`, after the `myfields` render block and before the `admin` block (line 1711), insert:

```tsx
        {view === 'map' && currentUser && (
          <MapView locations={locations} fields={fields} />
        )}
        {view === 'map' && !currentUser && (
          <div className="flex flex-col items-center gap-4 pt-16 px-4">
            <div className="w-16 h-16 rounded-2xl bg-navy-700 flex items-center justify-center text-3xl">🗺️</div>
            <p className="text-navy-300 text-center">Sign in to view the fields map.</p>
            <Btn variant="primary" onClick={() => setShowAuth(true)}>Sign In</Btn>
          </div>
        )}
```

- [ ] **Step 7: Type-check + build**

Run: `npm run build`
Expected: build succeeds. If TS complains that `L` is unused when tree-shaking, it is used by `mergeOptions` — ignore. If it complains about `position` tuple types, cast as shown (`l.lat as number`).

- [ ] **Step 8: Manual smoke test.** Open the running dev server, sign in, click "Fields Map".
Expected: OSM tiles render, centered on Redmond. With no coordinates yet, all 10 locations appear in the "Not mapped yet" panel. Signed out → "Sign in to view the fields map."

- [ ] **Step 9: Commit**

```bash
git add src/App.tsx
git commit -m "Add Fields Map view (react-leaflet), nav item, and marker-icon fix

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Admin Locations form — address, lat/lon, Geocode button

**Files:**
- Modify: `src/App.tsx:1058-1119` (the `AdminLocations` component)

**Interfaces:**
- Consumes: `api.geocodeAddress` (Task 3), `Location` with coords (Task 3), `reportError` (already in scope), `Btn` (in scope).
- Produces: admins can enter/edit address + lat/lon and geocode from an address.

- [ ] **Step 1: Replace the `AdminLocations` component (lines 1058-1119)** with the coordinate-aware version:

```tsx
function AdminLocations({ locations, refresh }: { locations: Location[]; refresh: () => Promise<void> }) {
  const [form, setForm] = useState({ name: '', city: '', address: '', lat: '', lon: '' })
  const [editId, setEditId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [geoBusy, setGeoBusy] = useState(false)
  const [geoErr, setGeoErr] = useState<string | null>(null)

  function resetForm() { setForm({ name: '', city: '', address: '', lat: '', lon: '' }) }

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setBusy(true)
    try {
      const body = {
        name: form.name.trim(),
        city: form.city.trim() || null,
        address: form.address.trim() || null,
        lat: form.lat.trim() === '' ? null : Number(form.lat),
        lon: form.lon.trim() === '' ? null : Number(form.lon),
      }
      if (editId) await api.adminUpdate('locations', { id: editId, ...body })
      else await api.adminCreate('locations', body)
      await refresh()
      setEditId(null)
      resetForm()
    } catch (err) { reportError(err) } finally { setBusy(false) }
  }

  async function geocode() {
    if (!form.address.trim()) return
    setGeoBusy(true)
    setGeoErr(null)
    try {
      const { lat, lon } = await api.geocodeAddress(form.address.trim())
      setForm(p => ({ ...p, lat: String(lat), lon: String(lon) }))
    } catch (err) {
      setGeoErr(err instanceof Error ? err.message : 'Geocoding failed. Enter coordinates manually.')
    } finally { setGeoBusy(false) }
  }

  function startEdit(l: Location) {
    setEditId(l.id)
    setForm({
      name: l.name,
      city: l.city ?? '',
      address: l.address ?? '',
      lat: l.lat == null ? '' : String(l.lat),
      lon: l.lon == null ? '' : String(l.lon),
    })
  }
  async function onDelete(id: string) {
    if (!confirm('Delete this location? Its fields and slots will be removed.')) return
    try { await api.adminDelete('locations', id); await refresh() } catch (err) { reportError(err) }
  }

  return (
    <div className="space-y-4">
      <SectionTitle>Manage Locations</SectionTitle>
      <Card className="p-4">
        <h4 className="font-display text-base font-600 text-navy-200 mb-3">{editId ? 'Edit Location' : 'Add Location'}</h4>
        <form onSubmit={save} className="space-y-3">
          <div>
            <label className="text-xs text-navy-400 mb-1 block">Name</label>
            <input placeholder="e.g. 60 Acres" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
          </div>
          <div>
            <label className="text-xs text-navy-400 mb-1 block">City</label>
            <input placeholder="e.g. Redmond, WA" value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-navy-400 mb-1 block">Address</label>
            <input placeholder="e.g. 17500 NE 76th St, Redmond, WA 98052" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
          </div>
          <div className="flex items-end gap-2">
            <Btn variant="ghost" size="sm" disabled={geoBusy || !form.address.trim()} onClick={geocode}>{geoBusy ? 'Geocoding…' : 'Geocode Address'}</Btn>
          </div>
          {geoErr && <p className="text-red-500 text-xs">{geoErr}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-navy-400 mb-1 block">Latitude</label>
              <input placeholder="47.7061" value={form.lat} onChange={e => setForm(p => ({ ...p, lat: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-navy-400 mb-1 block">Longitude</label>
              <input placeholder="-122.1394" value={form.lon} onChange={e => setForm(p => ({ ...p, lon: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2">
            <Btn type="submit" variant="primary" size="sm" disabled={busy}>{editId ? 'Update' : 'Add Location'}</Btn>
            {editId && <Btn variant="ghost" size="sm" onClick={() => { setEditId(null); resetForm() }}>Cancel</Btn>}
          </div>
        </form>
      </Card>
      <div className="space-y-2">
        {locations.map(l => (
          <div key={l.id} className="flex items-center justify-between bg-navy-800 rounded-lg px-4 py-3 border border-navy-700/50">
            <div>
              <p className="font-display font-600 text-navy-100">{l.name}</p>
              <p className="text-xs text-navy-400">{l.city}{l.lat != null && l.lon != null ? ' · 📍 mapped' : ''}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => startEdit(l)} className="text-navy-400 hover:text-navy-100 p-1.5 rounded hover:bg-navy-700 transition-colors"><IconEdit /></button>
              <button onClick={() => onDelete(l.id)} className="text-navy-400 hover:text-red-400 p-1.5 rounded hover:bg-navy-700 transition-colors"><IconTrash /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check + build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Manual test.** Sign in as admin → Admin → Locations → edit "60 Acres" → set Address to `17500 NE 76th St, Redmond, WA 98052` → click "Geocode Address".
Expected: Latitude ≈ 47.68, Longitude ≈ -122.14 populate. Save → the row shows "📍 mapped".

- [ ] **Step 4: Verify on the map.** Switch to Fields Map.
Expected: a marker appears at 60 Acres; clicking it shows name, city, field count. 60 Acres leaves the "Not mapped yet" panel.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "Admin Locations: address + lat/lon fields and Geocode button

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: Seed coordinates for the known locations

**Files:**
- (No repo file changes — a one-time throwaway script against the live DB.)

**Rationale:** `import-sheet.mjs`'s `LOCATION_META` already holds verified coordinates for 60 Acres, Marymoor, Perrigo Park, and Eastlake. Rather than making the admin geocode each by hand, seed those four now; the rest can be geocoded via the admin form. **Only** use coordinates already verified in `LOCATION_META` — never fabricate.

**Interfaces:** none produced (data-only).

- [ ] **Step 1: Create `scripts/_seed-coords.mjs`** (temporary), reusing the env parser + `pg.Client` pattern from `import-sheet.mjs`:

```js
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import pg from 'pg'
const __dirname = dirname(fileURLToPath(import.meta.url))
for (const line of readFileSync(join(__dirname, '..', '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}
const url = process.env.NEW_DATABASE_URL || process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL
// Verified coordinates only (from import-sheet.mjs LOCATION_META). Do not invent.
const COORDS = {
  'Marymoor':                              { lat: 47.65998, lon: -122.11197 },
  'Perrigo Park':                          { lat: 47.68277, lon: -122.08452 },
  'Eastlake High School community field':  { lat: 47.61325, lon: -122.02949 },
  '60 Acres':                              { lat: 47.70611, lon: -122.13944 },
}
const c = new pg.Client({ connectionString: url })
await c.connect()
let n = 0
for (const [name, { lat, lon }] of Object.entries(COORDS)) {
  const r = await c.query('UPDATE locations SET lat=$2, lon=$3 WHERE name=$1', [name, lat, lon])
  n += r.rowCount
  console.log(`${name}: ${r.rowCount} row(s)`)
}
console.log(`seeded ${n} locations with coordinates`)
await c.end()
```

- [ ] **Step 2: Run it**

Run: `node scripts/_seed-coords.mjs 2>&1 | grep -v "SECURITY WARNING\|next major\|To prepare\|If you want\|uselibpqcompat\|See https\|trace-warnings\|sslmode"`
Expected: each of the 4 names reports `1 row(s)`; `seeded 4 locations with coordinates`.

- [ ] **Step 3: Delete the throwaway script**

Run: `rm scripts/_seed-coords.mjs`

- [ ] **Step 4: Verify on the map.** Reload the app → Fields Map.
Expected: 4 markers (60 Acres, Marymoor, Perrigo, Eastlake); the other 6 remain in "Not mapped yet."

- [ ] **Step 5: No commit needed** (data-only change; scripts deleted). Confirm `git status` is clean of new files.

---

## Self-Review

**1. Spec coverage:** Schema change (Task 1) ✓; geocoding approach + endpoint (Task 2) ✓; serialize.js (Task 1) ✓; admin/locations.js POST/PUT (Task 1) ✓; types.ts Location + View (Task 3) ✓; api.ts geocodeAddress (Task 3) ✓; nav item + IconMap (Task 4) ✓; MapView with markers/popups/side-panel (Task 4) ✓; access gating (Task 4) ✓; admin form fields + geocode button (Task 5) ✓; leaflet deps + CSS import (Tasks 3-4) ✓; error/empty states (Task 4 EmptyState + Task 5 geoErr) ✓. Spec's future-enhancements are correctly out of scope.

**2. Deviations from spec (intentional, sound):**
- Added a **marker-icon fix** (Task 4 Step 1) — the spec omitted it, but Leaflet markers 404 under Vite without it. Required for the feature to visibly work.
- Access gate uses `!currentUser` (any signed-in user), matching the spec's "coach or admin" intent, not `!isCoach`.
- Added a `z-[1000]` note on the side panel (Leaflet panes outrank Tailwind's `z-30`).
- Added **Task 6** (seed known coordinates) so the map shows markers immediately from already-verified data, honoring "never fabricate."
- `MapView` kept inline in `App.tsx` per the file's established convention.

**3. Placeholder scan:** No TBD/TODO; every code step shows complete code.

**4. Type consistency:** `geocodeAddress` signature identical in Task 3 (definition) and Task 5 (use). `Location.lat/lon` typed `number | null` throughout; form holds them as strings and converts on save (`Number()` / `''→null`). `MapView` prop shape matches the call site.

---

## Execution Handoff

Plan saved to `docs/superpowers/plans/2026-07-28-fields-map.md`.
