import { query, withTxn } from './_lib/db.js'
import { sendJson, methodGuard, readBody } from './_lib/http.js'
import { requireAuth, getUserTeamIds } from './_lib/auth.js'
import * as S from './_lib/serialize.js'

// Monday-based week key (YYYY-MM-DD of that week's Monday) for a 'YYYY-MM-DD' date.
function weekMonday(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  const dow = dt.getUTCDay() // 0=Sun
  const diff = dow === 0 ? 6 : dow - 1
  dt.setUTCDate(dt.getUTCDate() - diff)
  return dt.toISOString().slice(0, 10)
}
function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + n)
  return dt.toISOString().slice(0, 10)
}
function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd
}

async function reservedTeamIds(client, slotId) {
  const { rows } = await client.query('SELECT team_id FROM reservations WHERE slot_id = $1', [slotId])
  return rows.map((r) => r.team_id)
}

export default async function handler(req, res) {
  if (methodGuard(req, res, ['POST', 'DELETE'])) return
  const session = requireAuth(req, res)
  if (!session) return
  try {
    const { slotId, teamId } = await readBody(req)
    if (!slotId || !teamId) return sendJson(res, 400, { error: 'slotId and teamId are required.' })
    const sid = Number(slotId)
    const tid = Number(teamId)

    // Authorization: coaches may only act on their own teams; admins on any team.
    if (session.role !== 'admin') {
      const owned = await getUserTeamIds(session.userId)
      if (!owned.includes(tid)) return sendJson(res, 403, { error: 'You can only manage your own teams.' })
    }

    if (req.method === 'DELETE') {
      const result = await query('DELETE FROM reservations WHERE slot_id = $1 AND team_id = $2', [sid, tid])
      if (result.rowCount === 0) return sendJson(res, 404, { error: 'Reservation not found.' })
      const { rows: srows } = await query('SELECT * FROM slots WHERE id = $1', [sid])
      const ids = await reservedTeamIds({ query }, sid)
      return sendJson(res, 200, { slot: S.slot(srows[0], ids) })
    }

    // POST — book, with all rules enforced inside a transaction.
    const out = await withTxn(async (client) => {
      const { rows: srows } = await client.query('SELECT * FROM slots WHERE id = $1 FOR UPDATE', [sid])
      const slot = srows[0]
      if (!slot) return { status: 404, body: { error: 'Slot not found.' } }
      const dateStr = S.toDateStr(slot.date)

      // Existing reservations for this slot.
      const slotCount = await client.query('SELECT COUNT(*)::int AS n FROM reservations WHERE slot_id = $1', [sid])
      if (slotCount.rows[0].n >= slot.max_teams) return { status: 400, body: { error: 'This slot is full.' } }

      const dup = await client.query('SELECT 1 FROM reservations WHERE slot_id = $1 AND team_id = $2', [sid, tid])
      if (dup.rowCount > 0) return { status: 400, body: { error: 'This team already has this spot.' } }

      // This team's other reservations in the same Mon–Sun week (with slot date/time).
      const monday = weekMonday(dateStr)
      const sunday = addDays(monday, 6)
      const wk = await client.query(
        `SELECT s.date::text AS date, s.start_time, s.end_time
           FROM reservations r JOIN slots s ON s.id = r.slot_id
          WHERE r.team_id = $1 AND s.date >= $2 AND s.date <= $3`,
        [tid, monday, sunday],
      )
      const others = wk.rows.map((r) => ({ date: r.date.slice(0, 10), start: r.start_time, end: r.end_time }))

      const sameDay = others.filter((o) => o.date === dateStr)
      if (sameDay.length > 0) {
        // overlapping time same day?
        for (const o of sameDay) {
          if (overlaps(slot.start_time, slot.end_time, o.start, o.end)) {
            return { status: 400, body: { error: 'This team has an overlapping booking that day.' } }
          }
        }
        return { status: 400, body: { error: 'This team is already booked that day.' } }
      }
      const distinctDays = new Set(others.map((o) => o.date))
      if (distinctDays.size >= 2) {
        return { status: 400, body: { error: 'This team already has 2 reservations this week.' } }
      }

      await client.query(
        'INSERT INTO reservations (slot_id, team_id, created_by) VALUES ($1, $2, $3)',
        [sid, tid, session.userId],
      )
      const ids = await reservedTeamIds(client, sid)
      return { status: 200, body: { slot: S.slot(slot, ids) } }
    })

    return sendJson(res, out.status, out.body)
  } catch (err) {
    console.error('reservations error', err)
    sendJson(res, 500, { error: 'Server error' })
  }
}
