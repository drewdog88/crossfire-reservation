import { query } from '../_lib/db.js'
import { sendJson, methodGuard, readBody } from '../_lib/http.js'
import { requireAdmin } from '../_lib/auth.js'
import * as S from '../_lib/serialize.js'

export default async function handler(req, res) {
  if (methodGuard(req, res, ['GET', 'POST', 'PUT', 'DELETE'])) return
  if (!requireAdmin(req, res)) return
  try {
    if (req.method === 'GET') {
      const { rows } = await query('SELECT * FROM locations ORDER BY id')
      return sendJson(res, 200, rows.map(S.location))
    }
    const body = await readBody(req)
    if (req.method === 'POST') {
      const { rows } = await query(
        'INSERT INTO locations (name, city, address, lat, lon) VALUES ($1,$2,$3,$4,$5) RETURNING *',
        [body.name, body.city ?? null, body.address ?? null, body.lat ?? null, body.lon ?? null],
      )
      return sendJson(res, 200, S.location(rows[0]))
    }
    if (req.method === 'PUT') {
      const { rows } = await query(
        'UPDATE locations SET name=$2, city=$3, address=$4, lat=$5, lon=$6 WHERE id=$1 RETURNING *',
        [Number(body.id), body.name, body.city ?? null, body.address ?? null, body.lat ?? null, body.lon ?? null],
      )
      if (rows.length === 0) return sendJson(res, 404, { error: 'Not found.' })
      return sendJson(res, 200, S.location(rows[0]))
    }
    if (req.method === 'DELETE') {
      await query('DELETE FROM locations WHERE id=$1', [Number(body.id)])
      return sendJson(res, 200, { ok: true })
    }
  } catch (err) {
    console.error('admin/locations error', err)
    sendJson(res, 500, { error: 'Server error' })
  }
}
