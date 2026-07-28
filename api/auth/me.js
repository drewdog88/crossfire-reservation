import { query } from '../_lib/db.js'
import { sendJson, methodGuard } from '../_lib/http.js'
import { getSession, getUserTeamIds } from '../_lib/auth.js'
import * as S from '../_lib/serialize.js'

export default async function handler(req, res) {
  if (methodGuard(req, res, ['GET'])) return
  try {
    const session = getSession(req)
    if (!session) return sendJson(res, 401, { error: 'Not signed in.' })
    const { rows } = await query('SELECT * FROM users WHERE id = $1', [session.userId])
    const row = rows[0]
    if (!row || row.status !== 'active') return sendJson(res, 401, { error: 'Not signed in.' })
    const teamIds = await getUserTeamIds(row.id)
    sendJson(res, 200, { user: S.user(row, teamIds, false) })
  } catch (err) {
    console.error('me error', err)
    sendJson(res, 500, { error: 'Server error' })
  }
}
