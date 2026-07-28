// Seed a working MVP dataset: one admin, one location, fields, a week of slots,
// a handful of teams (from the real 60 Acres sheet), and one active demo coach.
// Reads NEW_DATABASE_URL (unpooled) + optional ADMIN_PASSWORD from .env.local.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import pg from 'pg'
import bcrypt from 'bcryptjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = join(__dirname, '..', '.env.local')
for (const line of readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}

const url = process.env.NEW_DATABASE_URL || process.env.DATABASE_URL_UNPOOLED
if (!url) throw new Error('NEW_DATABASE_URL not set')

const ADMIN_EMAIL = 'admin@crossfireselect.com'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'crossfire-admin'
const DEMO_EMAIL = 'coach@crossfireselect.com'
const DEMO_PASSWORD = 'demo1234'

const client = new pg.Client({ connectionString: url })
await client.connect()

// Idempotent-ish: only seed if empty.
const existing = await client.query('SELECT COUNT(*)::int AS n FROM teams')
if (existing.rows[0].n > 0) {
  console.log('teams already present — skipping structural seed, ensuring admin only')
} else {
  const loc = await client.query(
    "INSERT INTO locations (name, city) VALUES ('60 Acres', 'Redmond, WA') RETURNING id",
  )
  const locId = loc.rows[0].id

  const fieldIds = {}
  for (const [name, type] of [['Field 1', 'Turf'], ['Field 4', 'Grass'], ['Field 5', 'Grass'], ['Field 6', 'Grass']]) {
    const f = await client.query('INSERT INTO fields (location_id, name, type) VALUES ($1,$2,$3) RETURNING id', [locId, name, type])
    fieldIds[name] = f.rows[0].id
  }

  const teams = [
    ['Girls', 2012, 'C', 'Nancy'],
    ['Boys', 2014, 'D', 'BJ'],
    ['Girls', 2013, 'A', 'David'],
    ['Boys', 2016, 'D', 'Adriana'],
    ['Girls', 2010, '8th Graders', 'Sam'],
    ['Boys', 2012, 'B', 'Rafael'],
  ]
  const teamIds = []
  for (const [gender, year, level, coach] of teams) {
    const t = await client.query(
      'INSERT INTO teams (gender, birth_year, level, coach_name) VALUES ($1,$2,$3,$4) RETURNING id',
      [gender, year, level, coach],
    )
    teamIds.push(t.rows[0].id)
  }

  // A week of slots starting the upcoming Monday (UTC).
  const now = new Date()
  const dow = now.getUTCDay()
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + ((8 - (dow === 0 ? 7 : dow)) % 7 || 7)))
  const dateStr = (offset) => {
    const d = new Date(monday)
    d.setUTCDate(monday.getUTCDate() + offset)
    return d.toISOString().slice(0, 10)
  }
  const windows = [['17:30', '19:00'], ['19:00', '20:30']]
  for (let day = 0; day < 5; day++) {
    for (const name of Object.keys(fieldIds)) {
      for (const [start, end] of windows) {
        await client.query(
          'INSERT INTO slots (field_id, date, start_time, end_time, max_teams) VALUES ($1,$2,$3,$4,8) ON CONFLICT DO NOTHING',
          [fieldIds[name], dateStr(day), start, end],
        )
      }
    }
  }

  // Demo coach owns the first two teams.
  const demoHash = await bcrypt.hash(DEMO_PASSWORD, 12)
  const demo = await client.query(
    `INSERT INTO users (email, password_hash, first_name, last_name, role, status)
     VALUES ($1,$2,'Demo','Coach','coach','active') RETURNING id`,
    [DEMO_EMAIL, demoHash],
  )
  await client.query('INSERT INTO user_teams (user_id, team_id) VALUES ($1,$2),($1,$3)', [demo.rows[0].id, teamIds[0], teamIds[1]])
  console.log(`seeded location, 4 fields, ${teams.length} teams, slots, demo coach (${DEMO_EMAIL} / ${DEMO_PASSWORD})`)
}

// Upsert admin.
const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 12)
await client.query(
  `INSERT INTO users (email, password_hash, first_name, last_name, role, status)
   VALUES ($1,$2,'Site','Admin','admin','active')
   ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role='admin', status='active'`,
  [ADMIN_EMAIL, adminHash],
)
console.log(`admin ready: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`)

await client.end()
