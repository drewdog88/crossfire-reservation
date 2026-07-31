// One-off: create/reset an ACTIVE demo coach for iOS build-and-drive testing.
// Mirrors scripts/seed.mjs connection + hashing. Reads NEW_DATABASE_URL from .env.local.
// Idempotent: upserts the user to active and (re)assigns up to two existing teams.
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

const url = process.env.NEW_DATABASE_URL || process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL
if (!url) throw new Error('No database URL set (NEW_DATABASE_URL / DATABASE_URL_UNPOOLED / DATABASE_URL)')

const EMAIL = (process.env.DEMO_USER_EMAIL || 'demo@crossfire.com').toLowerCase()
const PASSWORD = process.env.DEMO_USER_PASSWORD || 'DEMO123#'

const client = new pg.Client({ connectionString: url })
await client.connect()

const hash = await bcrypt.hash(PASSWORD, 12)
const res = await client.query(
  `INSERT INTO users (email, password_hash, first_name, last_name, role, status)
   VALUES ($1, $2, 'Demo', 'Coach', 'coach', 'active')
   ON CONFLICT (email) DO UPDATE
     SET password_hash = EXCLUDED.password_hash, role = 'coach', status = 'active'
   RETURNING id`,
  [EMAIL, hash],
)
const userId = res.rows[0].id

// Assign up to two existing teams so the Reserve flow has something to work with.
const teams = await client.query('SELECT id FROM teams ORDER BY id LIMIT 2')
for (const row of teams.rows) {
  await client.query(
    'INSERT INTO user_teams (user_id, team_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [userId, row.id],
  )
}

console.log(`demo coach ready: ${EMAIL} (id ${userId}, active, ${teams.rowCount} team(s) assigned)`)
await client.end()
