import { query } from '../_lib/db.js'
import { sendJson, methodGuard, readBody } from '../_lib/http.js'
import { requireAdmin } from '../_lib/auth.js'
import * as S from '../_lib/serialize.js'

export default async function handler(req, res) {
  if (methodGuard(req, res, ['GET', 'POST', 'PUT', 'DELETE'])) return
  if (!requireAdmin(req, res)) return
  try {
    if (req.method === 'GET') {
      const { rows } = await query('SELECT * FROM fields ORDER BY id')
      return sendJson(res, 200, rows.map(S.field))
    }
    const body = await readBody(req)
    // Surface is optional; anything other than Turf/Grass becomes NULL (unknown).
    const surface = body.type === 'Turf' || body.type === 'Grass' ? body.type : null
    if (req.method === 'POST') {
      const { rows } = await query('INSERT INTO fields (location_id, name, type) VALUES ($1,$2,$3) RETURNING *', [Number(body.locationId), body.name, surface])
      return sendJson(res, 200, S.field(rows[0]))
    }
    if (req.method === 'PUT') {
      const { rows } = await query('UPDATE fields SET location_id=$2, name=$3, type=$4 WHERE id=$1 RETURNING *', [Number(body.id), Number(body.locationId), body.name, surface])
      if (rows.length === 0) return sendJson(res, 404, { error: 'Not found.' })
      return sendJson(res, 200, S.field(rows[0]))
    }
    if (req.method === 'DELETE') {
      await query('DELETE FROM fields WHERE id=$1', [Number(body.id)])
      return sendJson(res, 200, { ok: true })
    }
  } catch (err) {
    console.error('admin/fields error', err)
    sendJson(res, 500, { error: 'Server error' })
  }
}
