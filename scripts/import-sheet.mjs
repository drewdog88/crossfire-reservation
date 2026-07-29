// Re-import the FULL multi-location dataset from the "60 acres 2025" Google
// Sheet, replacing the incomplete single-location seed. The original scaffold
// (scripts/seed.mjs) only ever created one location ("60 Acres"); the sheet
// actually spans 9 locations across a full season. This rebuilds the catalog
// (locations, fields, teams) and best-effort imports the real bookings that
// satisfy the app's fairness rules, logging every row it must skip.
//
// Input: scripts/sheet-bookings.json  (produced by the sheet-extraction step;
//   see its shape below). Reads NEW_DATABASE_URL (unpooled) from .env.local.
//
// PRESERVES: users + their password hashes. Coach accounts are re-linked to the
//   rebuilt teams by matching users.first_name to teams.coach_name. Nothing in
//   the sheet contains passwords, so accounts are never wiped.
//
// Idempotent-enough: it wipes and rebuilds the catalog every run, so re-running
// yields the same end state (team/field/slot ids will differ run-to-run).
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import pg from 'pg'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = join(__dirname, '..', '.env.local')
for (const line of readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}

const url = process.env.NEW_DATABASE_URL || process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL
if (!url) throw new Error('NEW_DATABASE_URL / DATABASE_URL not set')

const data = JSON.parse(readFileSync(join(__dirname, 'sheet-bookings.json'), 'utf8'))
const bookings = data.bookings || []
// Some venues (Redmond Ridge, Juanita, Lake Washington, Grasslawn, etc.) list
// practices as a bare numbered list with NO "Field N" label row. Give those a
// single default field so their bookings aren't dropped; the numbered teams all
// share that field's time slot (slots hold up to 8 teams).
for (const b of bookings) if (!b.field) b.field = 'Field 1'
console.log(`loaded ${bookings.length} raw bookings (${(data.extractedTabs || []).length} tabs, ${(data.failedTabs || []).length} failed)`)

// ── Location canonicalization ──────────────────────────────────────────────
// Locations are DISCOVERED from the sheet (see canonLocation), not hardcoded, so
// nothing is dropped if the sheet has a spelling we didn't anticipate. This table
// only supplies verified city/coords for the ones we could confirm; a discovered
// location absent here still gets created, just with null city/coords. We never
// fabricate an address/coord we haven't verified.
const LOCATION_META = {
  'Marymoor':      { city: 'Redmond, WA',   lat: 47.65998, lon: -122.11197 },
  'Perrigo Park':  { city: 'Redmond, WA',   lat: 47.68277, lon: -122.08452 },
  'Eastlake High School community field': { city: 'Sammamish, WA', lat: 47.61325, lon: -122.02949 },
  '60 Acres':      { city: 'Redmond, WA',   lat: 47.70611, lon: -122.13944 },
  'Redmond Ridge': { city: 'Redmond, WA' },
  '132nd sq park': {},
  'Lake Washington High School': { city: 'Kirkland, WA' },
  'Juanita High School':         { city: 'Kirkland, WA' },
  'Grasslawn Park':              { city: 'Redmond, WA' },
}
// Collapse the many spellings in the sheet to a canonical display name. Unknown
// spellings pass through cleaned-up (title-ish) rather than being dropped.
function canonLocation(raw) {
  if (!raw) return null
  const s = String(raw).trim().toLowerCase()
  if (s.startsWith('marymoor')) return 'Marymoor'
  if (s.startsWith('perrigo')) return 'Perrigo Park'
  if (s.includes('eastlake')) return 'Eastlake High School community field'
  if (s.startsWith('60 acres') || s === '60acres' || s.includes('60 acre')) return '60 Acres'
  if (s.includes('redmond ridge')) return 'Redmond Ridge'
  if (s.includes('132')) return '132nd sq park'
  if (s.includes('inglewood')) return 'Inglewood Middle School'
  if (s.includes('lake washington')) return 'Lake Washington High School'
  if (s.includes('juanita')) return 'Juanita High School'
  if (s.includes('grasslawn')) return 'Grasslawn Park'
  return String(raw).trim() // keep unknown location as-is rather than dropping it
}

// ── Team parsing ───────────────────────────────────────────────────────────
// "B14 D" / "G12 C" / "B06/07 A" → {gender, birthYear, level, key}. Non
// age-group tokens (XF, NPSL, blanks) return null and are skipped.
function parseTeam(rawCode) {
  if (!rawCode) return null
  const m = String(rawCode).trim().match(/^([BG])\s*0?(\d{2})(?:\s*\/\s*\d{2})?\s*(.*)$/i)
  if (!m) return null
  const gender = m[1].toUpperCase() === 'B' ? 'Boys' : 'Girls'
  const yy = Number(m[2])
  const birthYear = 2000 + yy
  const level = (m[3] || '').trim().replace(/\s+/g, ' ') || '—'
  return { gender, birthYear, level, key: `${gender}|${birthYear}|${level}` }
}

// ── Time parsing ───────────────────────────────────────────────────────────
// "5:30-7:00pm", "5:30 pm - 7:00 pm", "4 pm - 5:30 pm", "7:00 - 8:30 PM" →
// { start:"HH:MM", end:"HH:MM" } in 24h, or null. Evening practices: a token
// with no am/pm inherits the other token's meridiem, defaulting to pm.
function parseTime(raw) {
  if (!raw) return null
  const s = String(raw).toLowerCase().replace(/\s+/g, ' ').trim()
  const parts = s.split(/[-–—]/)
  if (parts.length !== 2) return null
  const tok = (t) => {
    const m = t.trim().match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/)
    if (!m) return null
    return { h: Number(m[1]), min: m[2] ? Number(m[2]) : 0, mer: m[3] || null }
  }
  const a = tok(parts[0]); const b = tok(parts[1])
  if (!a || !b) return null
  const mer = a.mer || b.mer || 'pm'
  const to24 = (t) => {
    let h = t.h
    const m = t.mer || mer
    if (m === 'pm' && h < 12) h += 12
    if (m === 'am' && h === 12) h = 0
    return `${String(h).padStart(2, '0')}:${String(t.min).padStart(2, '0')}`
  }
  const start = to24(a); const end = to24(b)
  if (!/^\d\d:\d\d$/.test(start) || !/^\d\d:\d\d$/.test(end)) return null
  return { start, end }
}

// Monday (YYYY-MM-DD) of the week containing an ISO date.
function weekMonday(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  const dow = dt.getUTCDay()
  dt.setUTCDate(dt.getUTCDate() - (dow === 0 ? 6 : dow - 1))
  return dt.toISOString().slice(0, 10)
}

const client = new pg.Client({ connectionString: url })
await client.connect()
try {
  await client.query('BEGIN')

  // Live DB may still have the old NOT NULL on fields.type; make surface optional.
  await client.query('ALTER TABLE fields ALTER COLUMN type DROP NOT NULL')

  // Wipe the catalog + schedule. user_teams cascades off teams; we re-link below.
  // users are preserved (password hashes live only here).
  await client.query('DELETE FROM reservations')
  await client.query('DELETE FROM slots')
  await client.query('DELETE FROM fields')
  await client.query('DELETE FROM user_teams')
  await client.query('DELETE FROM teams')
  await client.query('DELETE FROM locations')

  // 1) Locations — every canonical location that appears in any booking.
  const discovered = new Set()
  for (const b of bookings) {
    const loc = canonLocation(b.location)
    if (loc) discovered.add(loc)
  }
  const locId = {}
  for (const name of [...discovered].sort()) {
    const meta = LOCATION_META[name] || {}
    const r = await client.query('INSERT INTO locations (name, city) VALUES ($1,$2) RETURNING id', [name, meta.city ?? null])
    locId[name] = r.rows[0].id
  }
  console.log(`locations discovered from sheet (${discovered.size}):`, [...discovered].sort().join(' | '))

  // 2) Fields — distinct (canonLocation, field name) seen across all bookings.
  const fieldId = {} // `${loc}||${field}` -> id
  const seenFields = new Set()
  for (const b of bookings) {
    const loc = canonLocation(b.location)
    if (!loc || !b.field) continue
    const key = `${loc}||${b.field}`
    if (seenFields.has(key)) continue
    seenFields.add(key)
    const r = await client.query(
      'INSERT INTO fields (location_id, name, type) VALUES ($1,$2,NULL) RETURNING id',
      [locId[loc], String(b.field).trim()],
    )
    fieldId[key] = r.rows[0].id
  }

  // 3) Teams — distinct parsed teams; coach_name = most-common coach for it.
  const coachTally = {} // teamKey -> {coach: count}
  for (const b of bookings) {
    const t = parseTeam(b.teamCode)
    if (!t || !b.coach) continue
    ;(coachTally[t.key] ||= {})[b.coach] = (coachTally[t.key]?.[b.coach] || 0) + 1
  }
  const teamId = {} // teamKey -> id
  const skippedTeams = new Set()
  for (const b of bookings) {
    const t = parseTeam(b.teamCode)
    if (!t) { if (b.teamCode) skippedTeams.add(b.teamCode); continue }
    if (teamId[t.key]) continue
    const tally = coachTally[t.key] || {}
    const coach = Object.keys(tally).sort((x, y) => tally[y] - tally[x])[0] || null
    const r = await client.query(
      'INSERT INTO teams (gender, birth_year, level, coach_name) VALUES ($1,$2,$3,$4) RETURNING id',
      [t.gender, t.birthYear, t.level, coach],
    )
    teamId[t.key] = r.rows[0].id
  }

  // 4) Slots — distinct (field, date, start). Only bookings with a real date +
  //    parseable time can become slots.
  const slotId = {} // `${fieldId}|${date}|${start}` -> id
  for (const b of bookings) {
    const loc = canonLocation(b.location)
    if (!loc || !b.field || !b.date) continue
    const fk = fieldId[`${loc}||${b.field}`]
    if (!fk) continue
    const tm = parseTime(b.time)
    if (!tm) continue
    const key = `${fk}|${b.date}|${tm.start}`
    if (slotId[key]) continue
    const r = await client.query(
      `INSERT INTO slots (field_id, date, start_time, end_time, max_teams)
       VALUES ($1,$2,$3,$4,8)
       ON CONFLICT (field_id, date, start_time) DO UPDATE SET end_time = EXCLUDED.end_time
       RETURNING id`,
      [fk, b.date, tm.start, tm.end],
    )
    slotId[key] = r.rows[0].id
  }

  // Re-link coach accounts (preserved users) to rebuilt teams by first name.
  const { rows: coachUsers } = await client.query(
    "SELECT id, first_name, email, role FROM users WHERE role IN ('coach','admin')",
  )
  const userByFirst = {}
  for (const u of coachUsers) if (u.first_name) userByFirst[u.first_name.trim().toLowerCase()] = u.id
  const adminRow = coachUsers.find((u) => u.role === 'admin')
  const adminId = adminRow?.id ?? null

  const { rows: teamRows } = await client.query('SELECT id, coach_name FROM teams')
  let linked = 0
  for (const tr of teamRows) {
    const uid = tr.coach_name ? userByFirst[tr.coach_name.trim().toLowerCase()] : null
    if (uid) {
      await client.query('INSERT INTO user_teams (user_id, team_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [uid, tr.id])
      linked++
    }
  }

  // 5) Reservations — best effort, in chronological order, enforcing the same
  //    fairness rules the API does: one team per (slot), <=8 teams per slot,
  //    <=2 distinct days per team per Mon–Sun week, no same-day double-book.
  const withDate = bookings
    .map((b) => {
      const loc = canonLocation(b.location)
      const t = parseTeam(b.teamCode)
      const tm = b.time ? parseTime(b.time) : null
      const fk = loc && b.field ? fieldId[`${loc}||${b.field}`] : null
      const sid = fk && b.date && tm ? slotId[`${fk}|${b.date}|${tm.start}`] : null
      return { b, loc, t, tid: t ? teamId[t.key] : null, sid, date: b.date }
    })
    .filter((x) => x.sid && x.tid && x.date)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))

  const slotFill = {}                 // sid -> count
  const teamWeekDays = {}             // `${tid}|${monday}` -> Set(dates)
  const placed = new Set()            // `${sid}|${tid}` de-dup
  const skips = { dup: 0, sameDay: 0, twoPerWeek: 0, slotFull: 0 }
  let inserted = 0

  for (const x of withDate) {
    const pk = `${x.sid}|${x.tid}`
    if (placed.has(pk)) { skips.dup++; continue }
    if ((slotFill[x.sid] || 0) >= 8) { skips.slotFull++; continue }
    const wk = weekMonday(x.date)
    const key = `${x.tid}|${wk}`
    const days = (teamWeekDays[key] ||= new Set())
    if (days.has(x.date)) { skips.sameDay++; continue }
    if (days.size >= 2) { skips.twoPerWeek++; continue }

    await client.query(
      'INSERT INTO reservations (slot_id, team_id, created_by) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
      [x.sid, x.tid, adminId],
    )
    placed.add(pk)
    slotFill[x.sid] = (slotFill[x.sid] || 0) + 1
    days.add(x.date)
    inserted++
  }

  await client.query('COMMIT')

  const counts = {}
  for (const tbl of ['locations', 'fields', 'teams', 'slots', 'reservations']) {
    const r = await client.query(`SELECT COUNT(*)::int n FROM ${tbl}`)
    counts[tbl] = r.rows[0].n
  }
  console.log('\n=== IMPORT COMPLETE ===')
  console.log('counts:', counts)
  console.log('coach/admin accounts linked to teams:', linked)
  console.log('reservations inserted:', inserted)
  console.log('reservations skipped:', skips)
  if (skippedTeams.size) console.log('non-age-group team tokens skipped:', [...skippedTeams].join(', '))
} catch (err) {
  await client.query('ROLLBACK')
  console.error('IMPORT FAILED — rolled back:', err)
  process.exitCode = 1
} finally {
  await client.end()
}
