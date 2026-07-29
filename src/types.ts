export type Gender = 'Boys' | 'Girls'
export type Level = 'A' | 'B' | 'C' | 'D'
// A field's surface is optional: coaches/admins may leave it unset ("Unknown").
export type FieldType = 'Turf' | 'Grass'
export type Surface = FieldType | null
export type UserRole = 'admin' | 'coach'
export type View = 'schedule' | 'reserve' | 'myfields' | 'map' | 'admin'
export type AdminTab = 'teams' | 'locations' | 'fields' | 'slots' | 'users'

export interface Team {
  id: string
  gender: Gender
  birthYear: number
  level: string
  coachName?: string | null
}

export interface Location {
  id: string
  name: string
  city: string
  address: string | null
  lat: number | null
  lon: number | null
}

export interface Field {
  id: string
  locationId: string
  name: string
  type: Surface // null = surface unknown / not specified
}

export interface SlotConfig {
  id: string
  fieldId: string
  date: string // YYYY-MM-DD
  startTime: string // HH:MM (24h)
  endTime: string // HH:MM (24h)
  maxTeams: number
  reservedTeamIds: string[]
}

export type UserStatus = 'pending' | 'active'

export interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  role: UserRole
  teamIds: string[]
  status?: UserStatus
}

export function teamLabel(team: Team): string {
  const yy = String(team.birthYear).slice(-2).padStart(2, '0')
  return `${team.gender === 'Boys' ? 'B' : 'G'}${yy}-${team.level}`
}

// Formats a 24h "HH:MM" time to a display string like "5:30 pm"
export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  if (Number.isNaN(h)) return hhmm
  const period = h >= 12 ? 'pm' : 'am'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return m === 0 ? `${hour12} ${period}` : `${hour12}:${String(m).padStart(2, '0')} ${period}`
}

// "5:30 pm – 7:00 pm"
export function timeRangeLabel(start: string, end: string): string {
  return `${formatTime(start)} – ${formatTime(end)}`
}

export function dateToStr(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function getWeekDates(weekOffset: number): Date[] {
  const today = new Date()
  const dow = today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1) + weekOffset * 7)
  monday.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

export function weekRangeLabel(dates: Date[]): string {
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${fmt(dates[0])} – ${fmt(dates[6])}`
}

export function formatDisplayDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
