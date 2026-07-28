import { query, withTxn } from '../_lib/db.js'
import { sendJson, methodGuard, readBody } from '../_lib/http.js'
import { requireAdmin, getUserTeamIds } from '../_lib/auth.js'
import * as S from '../_lib/serialize.js'

export default async function handler(req, res) {
  if (methodGuard(req, res, ['GET', 'PUT', 'DELETE'])) return
  if (!requireAdmin(req, res)) return
  try {
    if (req.method === 'GET') {
      const { rows } = await query('SELECT * FROM users ORDER BY id')
      const ut = await query('SELECT user_id, team_id FROM user_teams')
      const byUser = new Map()
      for (const row of ut.rows) {
        const k = row.user_id
        if (!byUser.has(k)) byUser.set(k, [])
        byUser.get(k).push(row.team_id)
      }
      return sendJson(res, 200, rows.map((r) => S.user(r, byUser.get(r.id), true)))
    }
    const body = await readBody(req)
    if (req.method === 'PUT') {
      const id = Number(body.id)
      await withTxn(async (client) => {
        if (body.role !== undefined) await client.query('UPDATE users SET role=$2 WHERE id=$1', [id, body.role])
        if (body.status !== undefined) await client.query('UPDATE users SET status=$2 WHERE id=$1', [id, body.status])
        if (Array.isArray(body.teamIds)) {
          await client.query('DELETE FROM user_teams WHERE user_id=$1', [id])
          for (const t of body.teamIds) {
            await client.query('INSERT INTO user_teams (user_id, team_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [id, Number(t)])
          }
        }
      })
      const { rows } = await query('SELECT * FROM users WHERE id=$1', [id])
      if (rows.length === 0) return sendJson(res, 404, { error: 'Not found.' })
      return sendJson(res, 200, S.user(rows[0], await getUserTeamIds(id), true))
    }
    if (req.method === 'DELETE') {
      await query('DELETE FROM users WHERE id=$1', [Number(body.id)])
      return sendJson(res, 200, { ok: true })
    }
  } catch (err) {
    console.error('admin/users error', err)
    sendJson(res, 500, { error: 'Server error' })
  }
}
