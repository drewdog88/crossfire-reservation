// Convert DB rows into the JSON shapes the client expects. All ids are strings.

export function toDateStr(v) {
  if (v == null) return null
  if (typeof v === 'string') return v.slice(0, 10)
  // pg returns a Date for `date` columns
  const d = v instanceof Date ? v : new Date(v)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function team(r) {
  return { id: String(r.id), gender: r.gender, birthYear: r.birth_year, level: r.level, coachName: r.coach_name ?? null }
}
export function location(r) {
  return { id: String(r.id), name: r.name, city: r.city ?? null }
}
export function field(r) {
  // type is null when the surface is unknown / unspecified.
  return { id: String(r.id), locationId: String(r.location_id), name: r.name, type: r.type ?? null }
}
export function slot(r, reservedTeamIds) {
  return {
    id: String(r.id),
    fieldId: String(r.field_id),
    date: toDateStr(r.date),
    startTime: r.start_time,
    endTime: r.end_time,
    maxTeams: r.max_teams,
    reservedTeamIds: (reservedTeamIds || []).map(String),
  }
}
export function user(r, teamIds, includeStatus) {
  const u = {
    id: String(r.id),
    firstName: r.first_name ?? '',
    lastName: r.last_name ?? '',
    email: r.email,
    role: r.role,
    teamIds: (teamIds || []).map(String),
  }
  if (includeStatus) u.status = r.status
  return u
}
