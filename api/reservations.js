import { query, withTxn } from './_lib/db.js'
import { sendJson, methodGuard, readBody } from './_lib/http.js'
import { requireAuth, getUserTeamIds } from './_lib/auth.js'
import * as S from './_lib/serialize.js'

// Carries an HTTP status + body out of a transaction so a throw both rolls the
// transaction back and maps cleanly to a response in the handler's catch block.
class HttpError extends Error {
  constructor(status, body) {
    super('http')
    this.status = status
    this.body = body
  }
}

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
async function reservedTeamIds(client, slotId) {
  const { rows } = await client.query('SELECT team_id FROM reservations WHERE slot_id = $1', [slotId])
  return rows.map((r) => r.team_id)
}

// Book team `tid` into slot `sid`, enforcing every fairness rule against the
// rows currently visible in this transaction. Returns { status, body } — the
// caller decides whether a non-200 should roll back (it must, once the caller
// has already written inside the same transaction).
async function bookInTxn(client, sid, tid, createdBy) {
  // Serialize all concurrent bookings for THIS team so the 2-per-week
  // check-then-insert below can't interleave across two different slots (the
  // per-slot FOR UPDATE alone wouldn't catch that). Released at COMMIT/ROLLBACK.
  await client.query('SELECT pg_advisory_xact_lock($1)', [tid])

  const { rows: srows } = await client.query('SELECT * FROM slots WHERE id = $1 FOR UPDATE', [sid])
  const slot = srows[0]
  if (!slot) return { status: 404, body: { error: 'Slot not found.' } }
  const dateStr = S.toDateStr(slot.date)

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

  // PRD: a team's two weekly reservations must be on different days, so any
  // existing booking that day blocks another regardless of time overlap.
  if (others.some((o) => o.date === dateStr)) {
    return { status: 400, body: { error: 'This team is already booked that day.' } }
  }
  const distinctDays = new Set(others.map((o) => o.date))
  if (distinctDays.size >= 2) {
    return { status: 400, body: { error: 'This team already has 2 reservations this week.' } }
  }

  await client.query(
    'INSERT INTO reservations (slot_id, team_id, created_by) VALUES ($1, $2, $3)',
    [sid, tid, createdBy],
  )
  const ids = await reservedTeamIds(client, sid)
  return { status: 200, body: { slot: S.slot(slot, ids) } }
}

// Serialize a slot's current state by id (used to return the vacated slot after a move).
async function slotById(client, sid) {
  const { rows } = await client.query('SELECT * FROM slots WHERE id = $1', [sid])
  if (!rows[0]) return null
  const ids = await reservedTeamIds(client, sid)
  return S.slot(rows[0], ids)
}

// Coaches may only act on their own teams; admins on any team. Throws HttpError(403) otherwise.
async function assertMayManage(session, teamId) {
  if (session.role === 'admin') return
  const owned = await getUserTeamIds(session.userId)
  if (!owned.includes(teamId)) throw new HttpError(403, { error: 'You can only manage your own teams.' })
}

export default async function handler(req, res) {
  if (methodGuard(req, res, ['POST', 'DELETE', 'PATCH'])) return
  const session = requireAuth(req, res)
  if (!session) return
  try {
    const body = await readBody(req)
    const { slotId, teamId } = body
    if (!slotId || !teamId) return sendJson(res, 400, { error: 'slotId and teamId are required.' })
    const sid = Number(slotId)
    const tid = Number(teamId)

    await assertMayManage(session, tid)

    if (req.method === 'DELETE') {
      const result = await query('DELETE FROM reservations WHERE slot_id = $1 AND team_id = $2', [sid, tid])
      if (result.rowCount === 0) return sendJson(res, 404, { error: 'Reservation not found.' })
      const { rows: srows } = await query('SELECT * FROM slots WHERE id = $1', [sid])
      const ids = await reservedTeamIds({ query }, sid)
      return sendJson(res, 200, { slot: S.slot(srows[0], ids) })
    }

    if (req.method === 'PATCH') {
      // Move an existing (slotId, teamId) reservation to (newSlotId, newTeamId),
      // re-validating every fairness rule at the destination. The delete and the
      // re-book run in one transaction; any rule failure throws → full rollback.
      const nsid = Number(body.newSlotId)
      const ntid = Number(body.newTeamId)
      if (!body.newSlotId || !body.newTeamId) {
        return sendJson(res, 400, { error: 'newSlotId and newTeamId are required.' })
      }
      // No-op move: nothing changed. Avoid needlessly resetting created_by/created_at.
      if (nsid === sid && ntid === tid) {
        const slot = await slotById({ query }, sid)
        if (!slot) return sendJson(res, 404, { error: 'Reservation not found.' })
        return sendJson(res, 200, { slots: [slot] })
      }
      await assertMayManage(session, ntid)

      const out = await withTxn(async (client) => {
        const del = await client.query('DELETE FROM reservations WHERE slot_id = $1 AND team_id = $2', [sid, tid])
        if (del.rowCount === 0) throw new HttpError(404, { error: 'Reservation not found.' })

        const booked = await bookInTxn(client, nsid, ntid, session.userId)
        if (booked.status !== 200) throw new HttpError(booked.status, booked.body)

        // Return the destination slot plus the vacated source slot (when different).
        const slots = [booked.body.slot]
        if (nsid !== sid) {
          const vacated = await slotById(client, sid)
          if (vacated) slots.push(vacated)
        }
        return { status: 200, body: { slots } }
      })
      return sendJson(res, out.status, out.body)
    }

    // POST — book, with all rules enforced inside a transaction.
    const out = await withTxn((client) => bookInTxn(client, sid, tid, session.userId))
    return sendJson(res, out.status, out.body)
  } catch (err) {
    if (err instanceof HttpError) return sendJson(res, err.status, err.body)
    console.error('reservations error', err)
    sendJson(res, 500, { error: 'Server error' })
  }
}
