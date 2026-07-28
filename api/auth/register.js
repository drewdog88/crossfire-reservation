import { query } from '../_lib/db.js'
import { sendJson, methodGuard, readBody } from '../_lib/http.js'
import { hashPassword } from '../_lib/auth.js'

export default async function handler(req, res) {
  if (methodGuard(req, res, ['POST'])) return
  try {
    const { firstName, lastName, email, password } = await readBody(req)
    if (!email || !password) return sendJson(res, 400, { error: 'Email and password are required.' })
    const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()])
    if (existing.rowCount > 0) return sendJson(res, 409, { error: 'An account with that email already exists.' })
    const hash = await hashPassword(password)
    await query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, status)
       VALUES ($1, $2, $3, $4, 'coach', 'pending')`,
      [email.toLowerCase(), hash, firstName ?? '', lastName ?? ''],
    )
    sendJson(res, 201, { ok: true })
  } catch (err) {
    console.error('register error', err)
    sendJson(res, 500, { error: 'Server error' })
  }
}
