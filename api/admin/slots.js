import { query } from '../_lib/db.js'
import { sendJson, methodGuard, readBody } from '../_lib/http.js'
import { requireAdmin } from '../_lib/auth.js'
import * as S from '../_lib/serialize.js'

async function slotWithReservations(id) {
  const { rows } = await query('SELECT * FROM slots WHERE id = $1', [id])
  if (rows.length === 0) return null
  const r = await query('SELECT team_id FROM reservations WHERE slot_id = $1', [id])
  return S.slot(rows[0], r.rows.map((x) => x.team_id))
}

export default async function handler(req, res) {
  if (methodGuard(req, res, ['GET', 'POST', 'PUT', 'DELETE'])) return
  if (!requireAdmin(req, res)) return
  try {
    if (req.method === 'GET') {
      const { rows } = await query('SELECT * FROM slots ORDER BY date, start_time, id')
      const r = await query('SELECT slot_id, team_id FROM reservations')
      const bySlot = new Map()
      for (const row of r.rows) {
        const k = String(row.slot_id)
        if (!bySlot.has(k)) bySlot.set(k, [])
        bySlot.get(k).push(row.team_id)
      }
      return sendJson(res, 200, rows.map((row) => S.slot(row, bySlot.get(String(row.id)))))
    }
    const body = await readBody(req)
    if (req.method === 'POST') {
      const { rows } = await query(
        'INSERT INTO slots (field_id, date, start_time, end_time, max_teams) VALUES ($1,$2,$3,$4,$5) RETURNING id',
        [Number(body.fieldId), body.date, body.startTime, body.endTime, Number(body.maxTeams) || 8],
      )
      return sendJson(res, 200, await slotWithReservations(rows[0].id))
    }
    if (req.method === 'PUT') {
      const { rows } = await query(
        'UPDATE slots SET field_id=$2, date=$3, start_time=$4, end_time=$5, max_teams=$6 WHERE id=$1 RETURNING id',
        [Number(body.id), Number(body.fieldId), body.date, body.startTime, body.endTime, Number(body.maxTeams) || 8],
      )
      if (rows.length === 0) return sendJson(res, 404, { error: 'Not found.' })
      return sendJson(res, 200, await slotWithReservations(rows[0].id))
    }
    if (req.method === 'DELETE') {
      await query('DELETE FROM slots WHERE id=$1', [Number(body.id)])
      return sendJson(res, 200, { ok: true })
    }
  } catch (err) {
    console.error('admin/slots error', err)
    sendJson(res, 500, { error: 'Server error' })
  }
}
