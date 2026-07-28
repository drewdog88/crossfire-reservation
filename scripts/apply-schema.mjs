// Apply schema.sql to Neon using the direct (unpooled) connection.
// Reads NEW_DATABASE_URL (unpooled) from .env.local.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
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

const sql = readFileSync(join(__dirname, 'schema.sql'), 'utf8')
const client = new pg.Client({ connectionString: url })
await client.connect()
await client.query(sql)
console.log('schema applied')
await client.end()
