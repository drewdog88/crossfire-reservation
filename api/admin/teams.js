import { query } from '../_lib/db.js'
import { sendJson, methodGuard, readBody } from '../_lib/http.js'
import { requireAdmin } from '../_lib/auth.js'
import * as S from '../_lib/serialize.js'

export default async function handler(req, res) {
  if (methodGuard(req, res, ['GET', 'POST', 'PUT', 'DELETE'])) return
  if (!requireAdmin(req, res)) return
  try {
    if (req.method === 'GET') {
      const { rows } = await query('SELECT * FROM teams ORDER BY id')
      return sendJson(res, 200, rows.map(S.team))
    }
    const body = await readBody(req)
    if (req.method === 'POST') {
      const { rows } = await query(
        'INSERT INTO teams (gender, birth_year, level, coach_name) VALUES ($1,$2,$3,$4) RETURNING *',
        [body.gender, Number(body.birthYear), body.level, body.coachName ?? null],
      )
      return sendJson(res, 200, S.team(rows[0]))
    }
    if (req.method === 'PUT') {
      const { rows } = await query(
        'UPDATE teams SET gender=$2, birth_year=$3, level=$4, coach_name=$5 WHERE id=$1 RETURNING *',
        [Number(body.id), body.gender, Number(body.birthYear), body.level, body.coachName ?? null],
      )
      if (rows.length === 0) return sendJson(res, 404, { error: 'Not found.' })
      return sendJson(res, 200, S.team(rows[0]))
    }
    if (req.method === 'DELETE') {
      await query('DELETE FROM teams WHERE id=$1', [Number(body.id)])
      return sendJson(res, 200, { ok: true })
    }
  } catch (err) {
    console.error('admin/teams error', err)
    sendJson(res, 500, { error: 'Server error' })
  }
}
