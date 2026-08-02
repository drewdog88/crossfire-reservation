// Apply a single migration SQL file to Neon using the direct (unpooled) connection.
// Usage: node scripts/apply-migration.mjs scripts/migrations/001-indexes.sql
// Reads NEW_DATABASE_URL (unpooled) from .env.local, matching apply-schema.mjs.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import pg from 'pg'

const __dirname = dirname(fileURLToPath(import.meta.url))

// tiny .env.local loader (no dep)
const envPath = join(__dirname, '..', '.env.local')
for (const line of readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}

const url = process.env.NEW_DATABASE_URL || process.env.DATABASE_URL_UNPOOLED
if (!url) throw new Error('NEW_DATABASE_URL not set')

const file = process.argv[2]
if (!file) throw new Error('usage: node scripts/apply-migration.mjs <path-to.sql>')

const sql = readFileSync(resolve(file), 'utf8')
const client = new pg.Client({ connectionString: url })
await client.connect()
await client.query(sql)
console.log(`migration applied: ${file}`)
await client.end()
