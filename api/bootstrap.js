import { query } from './_lib/db.js'
import { sendJson, methodGuard } from './_lib/http.js'
import * as S from './_lib/serialize.js'

export default async function handler(req, res) {
  if (methodGuard(req, res, ['GET'])) return
  try {
    const [teams, locations, fields, slots, reservations] = await Promise.all([
      query('SELECT * FROM teams ORDER BY id'),
      query('SELECT * FROM locations ORDER BY id'),
      query('SELECT * FROM fields ORDER BY id'),
      query('SELECT * FROM slots ORDER BY date, start_time, id'),
      query('SELECT slot_id, team_id FROM reservations'),
    ])
    const bySlot = new Map()
    for (const r of reservations.rows) {
      const key = String(r.slot_id)
      if (!bySlot.has(key)) bySlot.set(key, [])
      bySlot.get(key).push(r.team_id)
    }
    sendJson(res, 200, {
      teams: teams.rows.map(S.team),
      locations: locations.rows.map(S.location),
      fields: fields.rows.map(S.field),
      slots: slots.rows.map((row) => S.slot(row, bySlot.get(String(row.id)))),
    })
  } catch (err) {
    console.error('bootstrap error', err)
    sendJson(res, 500, { error: 'Server error' })
  }
}
