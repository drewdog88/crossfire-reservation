import { query } from '../_lib/db.js'
import { sendJson, methodGuard, readBody } from '../_lib/http.js'
import { verifyPassword, signSession, sessionCookie, getUserTeamIds } from '../_lib/auth.js'
import * as S from '../_lib/serialize.js'

export default async function handler(req, res) {
  if (methodGuard(req, res, ['POST'])) return
  try {
    const { email, password } = await readBody(req)
    if (!email || !password) return sendJson(res, 400, { error: 'Email and password are required.' })
    const { rows } = await query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()])
    const row = rows[0]
    if (!row || !(await verifyPassword(password, row.password_hash))) {
      return sendJson(res, 401, { error: 'Incorrect email or password.' })
    }
    if (row.status === 'pending') {
      return sendJson(res, 403, { error: 'Your account is awaiting admin approval.' })
    }
    const teamIds = await getUserTeamIds(row.id)
    res.setHeader('Set-Cookie', sessionCookie(signSession(row)))
    sendJson(res, 200, { user: S.user(row, teamIds, false) })
  } catch (err) {
    console.error('login error', err)
    sendJson(res, 500, { error: 'Server error' })
  }
}
