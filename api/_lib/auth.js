import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { query } from './db.js'
import { sendJson } from './http.js'

const COOKIE = 'cf_session'
const MAX_AGE = 60 * 60 * 24 * 7 // 7 days

function secret() {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not set')
  return process.env.JWT_SECRET
}

export function hashPassword(pw) {
  return bcrypt.hash(pw, 12)
}
export function verifyPassword(pw, hash) {
  return bcrypt.compare(pw, hash)
}

export function signSession(user) {
  return jwt.sign({ sub: String(user.id), role: user.role }, secret(), { expiresIn: '7d' })
}

export function sessionCookie(token) {
  return `${COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${MAX_AGE}`
}
export function clearCookie() {
  return `${COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`
}

export function getSession(req) {
  const cookie = req.headers.cookie || ''
  const match = cookie.split(';').map((c) => c.trim()).find((c) => c.startsWith(COOKIE + '='))
  if (!match) return null
  const token = match.slice(COOKIE.length + 1)
  try {
    const payload = jwt.verify(token, secret())
    return { userId: Number(payload.sub), role: payload.role }
  } catch {
    return null
  }
}

export function requireAuth(req, res) {
  const session = getSession(req)
  if (!session) {
    sendJson(res, 401, { error: 'Not signed in.' })
    return null
  }
  return session
}

export function requireAdmin(req, res) {
  const session = getSession(req)
  if (!session) {
    sendJson(res, 401, { error: 'Not signed in.' })
    return null
  }
  if (session.role !== 'admin') {
    sendJson(res, 403, { error: 'Admin only.' })
    return null
  }
  return session
}

export async function getUserTeamIds(userId) {
  const { rows } = await query('SELECT team_id FROM user_teams WHERE user_id = $1', [userId])
  return rows.map((r) => r.team_id)
}
