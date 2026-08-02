// Reset a user's password (demo-phase convenience — no DDL, no migrations).
// Mirrors scripts/create-demo-user.mjs connection + hashing (bcrypt cost 12,
// matching api/_lib/auth.js). Reads NEW_DATABASE_URL from .env.local.
//
// Usage:
//   node scripts/reset-password.mjs <email> <new-password>
//   node scripts/reset-password.mjs admin@crossfireselect.com 'Crossfire2026!'
//
// Updates an EXISTING user only — errors if the email isn't found (a reset must
// not silently create accounts; use create-demo-user.mjs to provision one).
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

const email = (process.argv[2] || '').trim().toLowerCase()
const password = process.argv[3]
if (!email || !password) {
  console.error("usage: node scripts/reset-password.mjs <email> <new-password>")
  process.exit(1)
}

const client = new pg.Client({ connectionString: url })
await client.connect()

const hash = await bcrypt.hash(password, 12)
const res = await client.query(
  `UPDATE users SET password_hash = $2 WHERE lower(email) = $1
   RETURNING id, email, role, status`,
  [email, hash],
)

if (res.rowCount === 0) {
  console.error(`no user found with email: ${email}`)
  await client.end()
  process.exit(1)
}

const u = res.rows[0]
console.log(`password reset: ${u.email} (id ${u.id}, ${u.role}, ${u.status})`)
await client.end()
