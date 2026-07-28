import { useState, useEffect } from 'react'
import type { ReactNode, FormEvent } from 'react'
import {
  type Team, type Location, type Field, type SlotConfig, type User,
  type View, type AdminTab, type Gender, type Level, type FieldType, type UserRole,
  teamLabel, dateToStr, getWeekDates, weekRangeLabel, formatDisplayDate,
} from './types'

// ─── Seed Data ──────────────────────────────────────────────────────────────

const SEED_TEAMS: Team[] = [
  { id: 't1',  gender: 'Boys',  birthYear: 2011, level: 'A' },
  { id: 't2',  gender: 'Boys',  birthYear: 2012, level: 'A' },
  { id: 't3',  gender: 'Boys',  birthYear: 2012, level: 'B' },
  { id: 't4',  gender: 'Boys',  birthYear: 2013, level: 'A' },
  { id: 't5',  gender: 'Boys',  birthYear: 2013, level: 'B' },
  { id: 't6',  gender: 'Boys',  birthYear: 2014, level: 'A' },
  { id: 't7',  gender: 'Girls', birthYear: 2011, level: 'A' },
  { id: 't8',  gender: 'Girls', birthYear: 2012, level: 'A' },
  { id: 't9',  gender: 'Girls', birthYear: 2012, level: 'B' },
  { id: 't10', gender: 'Girls', birthYear: 2013, level: 'A' },
  { id: 't11', gender: 'Girls', birthYear: 2013, level: 'B' },
  { id: 't12', gender: 'Boys',  birthYear: 2014, level: 'B' },
]

const SEED_LOCATIONS: Location[] = [
  { id: 'l1', name: 'Marymoor Park',           city: 'Redmond, WA' },
  { id: 'l2', name: 'Starfire Sports Complex', city: 'Tukwila, WA' },
  { id: 'l3', name: 'Kent Memorial Park',      city: 'Kent, WA' },
  { id: 'l4', name: 'Bellevue Youth Soccer',   city: 'Bellevue, WA' },
]

const SEED_FIELDS: Field[] = [
  { id: 'f1', locationId: 'l1', name: 'Field 1',      type: 'Turf' },
  { id: 'f2', locationId: 'l1', name: 'Field 2',      type: 'Turf' },
  { id: 'f3', locationId: 'l1', name: 'Field 3',      type: 'Grass' },
  { id: 'f4', locationId: 'l2', name: 'Field A',      type: 'Turf' },
  { id: 'f5', locationId: 'l2', name: 'Field B',      type: 'Grass' },
  { id: 'f6', locationId: 'l3', name: 'Main Field',   type: 'Grass' },
  { id: 'f7', locationId: 'l4', name: 'North Field',  type: 'Turf' },
  { id: 'f8', locationId: 'l4', name: 'South Field',  type: 'Grass' },
]

function buildSeedSlots(): SlotConfig[] {
  const today = new Date()
  const dow = today.getDay()
  const mon = new Date(today)
  mon.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1) + 7)
  mon.setHours(0, 0, 0, 0)
  const d = (offset: number) => {
    const x = new Date(mon); x.setDate(mon.getDate() + offset); return dateToStr(x)
  }
  return [
    { id: 's1',  fieldId: 'f1', date: d(0), maxTeams: 4, reservedTeamIds: ['t2','t7'] },
    { id: 's2',  fieldId: 'f1', date: d(2), maxTeams: 4, reservedTeamIds: ['t1'] },
    { id: 's3',  fieldId: 'f1', date: d(5), maxTeams: 6, reservedTeamIds: ['t8','t9','t3'] },
    { id: 's4',  fieldId: 'f2', date: d(1), maxTeams: 6, reservedTeamIds: ['t4','t5'] },
    { id: 's5',  fieldId: 'f2', date: d(4), maxTeams: 6, reservedTeamIds: ['t1','t2','t3','t7','t8','t10'] },
    { id: 's6',  fieldId: 'f2', date: d(5), maxTeams: 4, reservedTeamIds: [] },
    { id: 's7',  fieldId: 'f3', date: d(0), maxTeams: 3, reservedTeamIds: ['t11'] },
    { id: 's8',  fieldId: 'f3', date: d(3), maxTeams: 3, reservedTeamIds: [] },
    { id: 's9',  fieldId: 'f3', date: d(5), maxTeams: 3, reservedTeamIds: ['t6','t12'] },
    { id: 's10', fieldId: 'f4', date: d(0), maxTeams: 5, reservedTeamIds: ['t10'] },
    { id: 's11', fieldId: 'f4', date: d(2), maxTeams: 5, reservedTeamIds: [] },
    { id: 's12', fieldId: 'f4', date: d(4), maxTeams: 8, reservedTeamIds: ['t4','t6'] },
    { id: 's13', fieldId: 'f5', date: d(1), maxTeams: 4, reservedTeamIds: [] },
    { id: 's14', fieldId: 'f5', date: d(5), maxTeams: 4, reservedTeamIds: ['t5'] },
    { id: 's15', fieldId: 'f6', date: d(3), maxTeams: 6, reservedTeamIds: ['t7','t8'] },
    { id: 's16', fieldId: 'f6', date: d(5), maxTeams: 6, reservedTeamIds: ['t9','t11','t12'] },
    { id: 's17', fieldId: 'f7', date: d(0), maxTeams: 8, reservedTeamIds: ['t2','t3'] },
    { id: 's18', fieldId: 'f7', date: d(2), maxTeams: 8, reservedTeamIds: [] },
    { id: 's19', fieldId: 'f7', date: d(4), maxTeams: 8, reservedTeamIds: [] },
    { id: 's20', fieldId: 'f7', date: d(6), maxTeams: 8, reservedTeamIds: ['t1'] },
    { id: 's21', fieldId: 'f8', date: d(1), maxTeams: 4, reservedTeamIds: [] },
    { id: 's22', fieldId: 'f8', date: d(5), maxTeams: 4, reservedTeamIds: ['t10','t11'] },
  ]
}

const SEED_USERS: User[] = [
  { id: 'u1', firstName: 'Hugo',   lastName: 'Martinez',  email: 'hugo@crossfireselect.com',  password: 'admin123', role: 'admin', teamIds: [] },
  { id: 'u2', firstName: 'Meghan', lastName: 'Thompson',  email: 'meghan@crossfireselect.com', password: 'admin123', role: 'admin', teamIds: [] },
  { id: 'u3', firstName: 'Sean',   lastName: 'Patterson', email: 'sean@crossfireselect.com',  password: 'coach123', role: 'coach', teamIds: ['t3'] },
  { id: 'u4', firstName: 'Maria',  lastName: 'Chen',      email: 'maria@crossfireselect.com', password: 'coach123', role: 'coach', teamIds: ['t8','t9'] },
  { id: 'u5', firstName: 'David',  lastName: 'Kim',       email: 'david@crossfireselect.com', password: 'coach123', role: 'coach', teamIds: ['t2'] },
]

// ─── Local Storage ───────────────────────────────────────────────────────────

function load<T>(key: string, fallback: T): T {
  try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : fallback } catch { return fallback }
}
function save(key: string, val: unknown) {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch {}
}

// ─── Shared UI ───────────────────────────────────────────────────────────────

function Chip({ children, color = 'green' }: { children: ReactNode; color?: 'green' | 'amber' | 'red' | 'navy' | 'blue' }) {
  const cls = {
    green: 'bg-cf-green/20 text-cf-green border-cf-green/30',
    amber: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    red:   'bg-red-500/20 text-red-400 border-red-500/30',
    navy:  'bg-navy-600/60 text-navy-200 border-navy-500/40',
    blue:  'bg-blue-500/20 text-blue-300 border-blue-500/30',
  }[color]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border font-display tracking-wide ${cls}`}>
      {children}
    </span>
  )
}

function Btn({ children, onClick, variant = 'primary', size = 'md', disabled, type = 'button', className = '' }: {
  children: ReactNode; onClick?: () => void; variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg'; disabled?: boolean; type?: 'button' | 'submit'; className?: string
}) {
  const base = 'inline-flex items-center justify-center font-display font-600 tracking-wide rounded-lg transition-all duration-150 cursor-pointer select-none'
  const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2.5 text-base', lg: 'px-6 py-3 text-lg' }
  const variants = {
    primary:   'bg-cf-green text-navy-950 hover:bg-cf-green-dark active:scale-95',
    secondary: 'bg-navy-700 text-navy-100 border border-navy-600 hover:bg-navy-600 active:scale-95',
    ghost:     'text-navy-300 hover:text-navy-100 hover:bg-navy-700/50 active:scale-95',
    danger:    'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 active:scale-95',
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`${base} ${sizes[size]} ${variants[variant]} ${disabled ? 'opacity-40 cursor-not-allowed' : ''} ${className}`}>
      {children}
    </button>
  )
}

function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`bg-navy-800 rounded-xl border border-navy-600/50 ${className}`}>{children}</div>
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="font-display text-xl font-700 tracking-wide text-navy-100 mb-3">{children}</h2>
}

function EmptyState({ icon, message }: { icon: string; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <span className="text-4xl">{icon}</span>
      <p className="text-navy-300 text-sm text-center max-w-xs">{message}</p>
    </div>
  )
}

function OccupancyBar({ filled, max }: { filled: number; max: number }) {
  const pct = max > 0 ? Math.min(filled / max, 1) : 0
  const color = pct === 1 ? '#ef4444' : pct >= 0.5 ? '#f59e0b' : '#22c55e'
  return (
    <div className="h-1.5 bg-navy-600 rounded-full overflow-hidden w-full">
      <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct * 100}%`, backgroundColor: color }} />
    </div>
  )
}

// ─── Icons ───────────────────────────────────────────────────────────────────

const IconCalendar = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-5 h-5">
    <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
)
const IconField = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-5 h-5">
    <rect x="2" y="5" width="20" height="14" rx="1" />
    <path d="M12 5v14M2 12h20M6 9v6M18 9v6" />
  </svg>
)
const IconClipboard = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-5 h-5">
    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
    <rect x="9" y="3" width="6" height="4" rx="1" />
    <path d="M9 12h6M9 16h4" />
  </svg>
)
const IconSettings = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-5 h-5">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
)
const IconChevronLeft  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-5 h-5"><path d="M15 18l-6-6 6-6" /></svg>
const IconChevronRight = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-5 h-5"><path d="M9 18l6-6-6-6" /></svg>
const IconX     = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}    className="w-5 h-5"><path d="M18 6L6 18M6 6l12 12" /></svg>
const IconPlus  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}    className="w-4 h-4"><path d="M12 5v14M5 12h14" /></svg>
const IconTrash = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4"><path d="M3 6h18M19 6l-1 14H6L5 6M9 6V4h6v2" /></svg>
const IconEdit  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
const IconUser  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-5 h-5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>

// ─── Week Navigator ───────────────────────────────────────────────────────────

function WeekNav({ weekOffset, onChange }: { weekOffset: number; onChange: (o: number) => void }) {
  const dates = getWeekDates(weekOffset)
  return (
    <div className="flex items-center gap-2 px-4 py-3 bg-navy-800 sticky top-[60px] z-20 border-b border-navy-700">
      <button onClick={() => onChange(weekOffset - 1)}
        className="p-1.5 rounded-lg hover:bg-navy-700 text-navy-300 hover:text-navy-100 transition-colors">
        <IconChevronLeft />
      </button>
      <div className="flex-1 text-center">
        <span className="font-display text-base font-600 tracking-wide text-navy-100">{weekRangeLabel(dates)}</span>
        {weekOffset === 0 && <span className="ml-2 text-xs text-cf-green font-medium">This Week</span>}
        {weekOffset === 1 && <span className="ml-2 text-xs text-cf-amber font-medium">Next Week</span>}
        {weekOffset < 0  && <span className="ml-2 text-xs text-navy-400 font-medium">Past</span>}
      </div>
      <button onClick={() => onChange(weekOffset + 1)}
        className="p-1.5 rounded-lg hover:bg-navy-700 text-navy-300 hover:text-navy-100 transition-colors">
        <IconChevronRight />
      </button>
    </div>
  )
}

function FieldTypeToggle({ value, onChange }: { value: FieldType; onChange: (v: FieldType) => void }) {
  return (
    <div className="flex gap-2 px-4 pt-3 pb-1">
      {(['Turf', 'Grass'] as FieldType[]).map(t => (
        <button key={t} onClick={() => onChange(t)}
          className={`flex-1 py-2 rounded-lg font-display text-base font-600 tracking-wide transition-all duration-150 ${
            value === t ? 'bg-cf-green text-navy-950' : 'bg-navy-700 text-navy-300 hover:bg-navy-600 hover:text-navy-100'
          }`}>
          {t === 'Turf' ? '🏟 Turf' : '🌿 Grass'}
        </button>
      ))}
    </div>
  )
}

// ─── Field Pitch Visual ───────────────────────────────────────────────────────

const GRASS: Record<FieldType, [string, string]> = {
  Turf:  ['#14402c', '#1a5037'],
  Grass: ['#1a5220', '#205e27'],
}

function sectionH(maxTeams: number) {
  if (maxTeams <= 2) return 92
  if (maxTeams <= 3) return 84
  if (maxTeams <= 4) return 72
  if (maxTeams <= 6) return 62
  return 54
}

function formatDayHeader(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}

// Chalk dashes between sections — actual field divider lines
function ChalkDivider() {
  return (
    <div style={{
      height: 2,
      flexShrink: 0,
      background: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.55) 0px, rgba(255,255,255,0.55) 16px, transparent 16px, transparent 30px)',
      margin: '0 16px',
    }} />
  )
}

// Subtle field markings SVG overlay
function FieldMarkingsSVG({ totalH, fieldType }: { totalH: number; fieldType: FieldType }) {
  const cx = '50%'
  const cy = totalH / 2
  const r = Math.min(totalH * 0.22, 50)
  return (
    <svg
      aria-hidden
      style={{ position: 'absolute', inset: 0, width: '100%', height: totalH, opacity: fieldType === 'Turf' ? 0.06 : 0.065, pointerEvents: 'none' }}
      preserveAspectRatio="none"
    >
      {/* Center circle */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="white" strokeWidth={1.5} />
      <circle cx={cx} cy={cy} r={2.5} fill="white" />
      {/* Halfway line */}
      <line x1="0" y1={cy} x2="100%" y2={cy} stroke="white" strokeWidth={1} />
      {/* Top penalty arc */}
      <path d={`M 30% ${totalH * 0.18} Q 50% ${totalH * 0.28} 70% ${totalH * 0.18}`} fill="none" stroke="white" strokeWidth={1} />
      {/* Bottom penalty arc */}
      <path d={`M 30% ${totalH * 0.82} Q 50% ${totalH * 0.72} 70% ${totalH * 0.82}`} fill="none" stroke="white" strokeWidth={1} />
    </svg>
  )
}

// One horizontal strip of the field
function FieldLane({
  team, totalSections, isMyTeam, mode, canAct, onAct,
}: {
  team: Team | null; totalSections: number; isMyTeam: boolean;
  mode: 'view' | 'reserve'; canAct: boolean; onAct?: () => void;
}) {
  const h = sectionH(totalSections)
  const interactive = mode === 'reserve' && !team && canAct

  if (team) {
    return (
      <div
        className="relative flex items-center select-none"
        style={{
          height: h,
          background: isMyTeam
            ? 'linear-gradient(100deg, rgba(34,197,94,0.32) 0%, rgba(34,197,94,0.10) 100%)'
            : 'rgba(0,0,0,0.36)',
        }}
      >
        {/* Side pins */}
        <div className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.25)' }} />
        <div className="absolute right-0 top-3 bottom-3 w-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.25)' }} />

        <div className="flex items-center justify-between w-full px-5">
          <span
            className="font-display font-800 tracking-widest drop-shadow-lg"
            style={{
              fontSize: h >= 72 ? '1.5rem' : '1.25rem',
              color: isMyTeam ? '#bbf7d0' : 'rgba(255,255,255,0.95)',
              letterSpacing: '0.1em',
            }}
          >
            {teamLabel(team)}
          </span>
          {isMyTeam && (
            <span className="text-[10px] font-display font-700 tracking-widest uppercase text-cf-green bg-cf-green/20 border border-cf-green/40 px-2 py-0.5 rounded">
              YOURS
            </span>
          )}
        </div>
      </div>
    )
  }

  // Empty lane
  return (
    <div
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={interactive ? onAct : undefined}
      onKeyDown={interactive ? e => e.key === 'Enter' && onAct?.() : undefined}
      className={`relative flex items-center justify-center transition-all duration-150 ${
        interactive ? 'cursor-pointer hover:bg-white/10 active:bg-cf-green/15' : ''
      }`}
      style={{ height: h }}
    >
      <div className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
      <div className="absolute right-0 top-3 bottom-3 w-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />

      {interactive ? (
        <div className="flex items-center gap-2.5 border border-dashed border-white/35 rounded-lg px-5 py-2 transition-all duration-150 group hover:border-cf-green/60 hover:bg-cf-green/8">
          <svg className="w-4 h-4 text-white/50 group-hover:text-cf-green transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path d="M12 5v14M5 12h14" />
          </svg>
          <span className="font-display font-700 text-sm tracking-widest uppercase text-white/50 group-hover:text-cf-green transition-colors">
            Reserve
          </span>
        </div>
      ) : (
        <span className="font-display font-500 text-xs tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.2)' }}>
          Available
        </span>
      )}
    </div>
  )
}

// The complete field card for one SlotConfig
function FieldPitchCard({
  slot, field, location, teams, mode, myTeamIds, reservedDates, weekFull,
  onReserve, onCancel, selectedTeamId,
}: {
  slot: SlotConfig; field: Field; location: Location | undefined;
  teams: Team[]; mode: 'view' | 'reserve'; myTeamIds?: Set<string>;
  reservedDates?: Set<string>; weekFull?: boolean;
  onReserve?: (slotId: string) => void;
  onCancel?: (slotId: string, teamId: string) => void;
  selectedTeamId?: string;
}) {
  const teamMap = Object.fromEntries(teams.map(t => [t.id, t]))
  const filled = slot.reservedTeamIds.length
  const open = slot.maxTeams - filled
  const h = sectionH(slot.maxTeams)
  const totalH = h * slot.maxTeams + Math.max(0, slot.maxTeams - 1) * 2
  const [g1, g2] = GRASS[field.type]

  const myReservation = selectedTeamId ? slot.reservedTeamIds.includes(selectedTeamId) : false
  const dayBooked = selectedTeamId && reservedDates ? (!myReservation && reservedDates.has(slot.date)) : false
  const canAct = !myReservation && !dayBooked && !weekFull && open > 0

  // Build lane entries: filled slots first, then nulls for open spots
  const lanes = [
    ...slot.reservedTeamIds.map(id => ({ teamId: id, team: teamMap[id] ?? null })),
    ...Array(open).fill(null).map(() => ({ teamId: null, team: null })),
  ]

  return (
    <div className="rounded-2xl overflow-hidden shadow-2xl" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
      {/* Header */}
      <div className="px-4 py-3 flex items-start justify-between gap-2" style={{ background: '#0d1f36', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-display text-xl font-800 tracking-wide text-white">{field.name}</span>
            <span className={`text-[10px] font-display font-700 px-2 py-0.5 rounded uppercase tracking-wider ${
              field.type === 'Turf'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
            }`}>{field.type}</span>
          </div>
          <p className="text-xs font-medium mt-0.5" style={{ color: 'rgba(148,163,184,0.8)' }}>
            {location?.name} · {location?.city}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          {open === 0
            ? <div className="font-display text-xs font-800 tracking-widest text-red-400">FULL</div>
            : open === 1
            ? <div className="font-display text-xs font-800 tracking-widest text-amber-400">1 OPEN</div>
            : <div className="font-display text-xs font-800 tracking-widest text-cf-green">{open} OPEN</div>
          }
          <div className="font-display text-xs font-500 mt-0.5" style={{ color: 'rgba(148,163,184,0.6)' }}>
            {filled}/{slot.maxTeams} spots
          </div>
          {myReservation && (
            <div className="text-[10px] text-cf-green font-display font-700 tracking-wide mt-0.5">✓ RESERVED</div>
          )}
        </div>
      </div>

      {/* Grass field */}
      <div
        className="relative"
        style={{
          height: totalH,
          background: `repeating-linear-gradient(180deg, ${g1} 0px, ${g1} 24px, ${g2} 24px, ${g2} 48px)`,
        }}
      >
        <FieldMarkingsSVG totalH={totalH} fieldType={field.type} />

        {/* Top touchline */}
        <div className="absolute top-0 left-4 right-4" style={{ height: 1.5, background: 'rgba(255,255,255,0.28)' }} />
        {/* Bottom touchline */}
        <div className="absolute bottom-0 left-4 right-4" style={{ height: 1.5, background: 'rgba(255,255,255,0.28)' }} />

        <div className="relative z-10">
          {lanes.map((lane, i) => (
            <div key={i}>
              {i > 0 && <ChalkDivider />}
              <FieldLane
                team={lane.team}
                totalSections={slot.maxTeams}
                isMyTeam={!!(lane.teamId && myTeamIds?.has(lane.teamId))}
                mode={mode}
                canAct={canAct}
                onAct={onReserve ? () => onReserve(slot.id) : undefined}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      {mode === 'reserve' && (
        <div
          className="px-4 py-2.5 flex items-center justify-between"
          style={{ background: '#0d1f36', borderTop: '1px solid rgba(255,255,255,0.07)' }}
        >
          {myReservation ? (
            <>
              <span className="text-xs text-cf-green font-medium">Your team has this slot</span>
              <Btn variant="danger" size="sm" onClick={() => onCancel?.(slot.id, selectedTeamId!)}>
                Cancel
              </Btn>
            </>
          ) : dayBooked ? (
            <span className="text-xs text-amber-400">Already booked a field on this day</span>
          ) : weekFull ? (
            <span className="text-xs text-red-400">Week limit reached (max 2 per week)</span>
          ) : open === 0 ? (
            <span className="text-xs text-red-400">All slots taken for this day</span>
          ) : (
            <span className="text-xs" style={{ color: 'rgba(100,130,160,0.9)' }}>
              Tap an open section to claim your spot
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// Day header with flanking rules
function DayHeader({ dateStr }: { dateStr: string }) {
  return (
    <div className="flex items-center gap-3 pt-4 pb-1">
      <div className="h-px flex-1 bg-navy-700" />
      <span className="font-display text-xs font-700 tracking-widest uppercase text-navy-500">
        {formatDayHeader(dateStr)}
      </span>
      <div className="h-px flex-1 bg-navy-700" />
    </div>
  )
}

// ─── Schedule View ────────────────────────────────────────────────────────────

function ScheduleView({
  weekOffset, onWeekChange, teams, locations, fields, slots,
}: {
  weekOffset: number; onWeekChange: (o: number) => void;
  teams: Team[]; locations: Location[]; fields: Field[]; slots: SlotConfig[];
}) {
  const [fieldType, setFieldType] = useState<FieldType>('Turf')

  const weekDates = getWeekDates(weekOffset)
  const weekDateSet = new Set(weekDates.map(dateToStr))

  const fieldMap = Object.fromEntries(fields.map(f => [f.id, f]))
  const locationMap = Object.fromEntries(locations.map(l => [l.id, l]))

  const weekSlots = slots
    .filter(s => weekDateSet.has(s.date) && fieldMap[s.fieldId]?.type === fieldType)
    .sort((a, b) => a.date !== b.date ? a.date.localeCompare(b.date) : (fieldMap[a.fieldId]?.name ?? '').localeCompare(fieldMap[b.fieldId]?.name ?? ''))

  const byDate: Record<string, SlotConfig[]> = {}
  weekSlots.forEach(s => { if (!byDate[s.date]) byDate[s.date] = []; byDate[s.date].push(s) })

  return (
    <div className="pb-24">
      <WeekNav weekOffset={weekOffset} onChange={onWeekChange} />
      <FieldTypeToggle value={fieldType} onChange={setFieldType} />

      <div className="px-4 space-y-4">
        {Object.keys(byDate).length === 0 ? (
          <EmptyState icon="📋" message={`No ${fieldType.toLowerCase()} fields configured for this week. Check back or try a different week.`} />
        ) : (
          Object.entries(byDate).map(([date, dateSlots]) => (
            <div key={date}>
              <DayHeader dateStr={date} />
              <div className="space-y-4">
                {dateSlots.map(slot => (
                  <FieldPitchCard
                    key={slot.id}
                    slot={slot}
                    field={fieldMap[slot.fieldId]!}
                    location={locationMap[fieldMap[slot.fieldId]?.locationId ?? '']}
                    teams={teams}
                    mode="view"
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ─── Reserve View ─────────────────────────────────────────────────────────────

function ReserveView({
  weekOffset, onWeekChange, currentUser, teams, locations, fields, slots, onReserve, onCancel,
}: {
  weekOffset: number; onWeekChange: (o: number) => void;
  currentUser: User; teams: Team[]; locations: Location[]; fields: Field[];
  slots: SlotConfig[]; onReserve: (slotId: string, teamId: string) => string | null;
  onCancel: (slotId: string, teamId: string) => void;
}) {
  const [fieldType, setFieldType] = useState<FieldType>('Turf')
  const [selectedTeamId, setSelectedTeamId] = useState(currentUser.teamIds[0] ?? '')
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const weekDates = getWeekDates(weekOffset)
  const weekDateSet = new Set(weekDates.map(dateToStr))
  const teamMap = Object.fromEntries(teams.map(t => [t.id, t]))
  const fieldMap = Object.fromEntries(fields.map(f => [f.id, f]))
  const locationMap = Object.fromEntries(locations.map(l => [l.id, l]))
  const coachTeams = currentUser.teamIds.map(id => teamMap[id]).filter(Boolean) as Team[]

  const weekReservations = slots.filter(s => weekDateSet.has(s.date) && s.reservedTeamIds.includes(selectedTeamId))
  const reservedDates = new Set(weekReservations.map(s => s.date))
  const myTeamIds = new Set(currentUser.teamIds)

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  function handleReserve(slotId: string) {
    const err = onReserve(slotId, selectedTeamId)
    if (err) showToast(err, false)
    else showToast('Spot reserved! 🎉', true)
  }

  function handleCancel(slotId: string, teamId: string) {
    onCancel(slotId, teamId)
    showToast('Reservation cancelled.', true)
  }

  const weekSlots = slots
    .filter(s => weekDateSet.has(s.date) && fieldMap[s.fieldId]?.type === fieldType)
    .sort((a, b) => a.date !== b.date ? a.date.localeCompare(b.date) : (fieldMap[a.fieldId]?.name ?? '').localeCompare(fieldMap[b.fieldId]?.name ?? ''))

  const byDate: Record<string, SlotConfig[]> = {}
  weekSlots.forEach(s => { if (!byDate[s.date]) byDate[s.date] = []; byDate[s.date].push(s) })

  if (coachTeams.length === 0) {
    return (
      <div className="pb-24">
        <WeekNav weekOffset={weekOffset} onChange={onWeekChange} />
        <EmptyState icon="⚽" message="You have no teams assigned. Contact an admin to be assigned to a team." />
      </div>
    )
  }

  return (
    <div className="pb-24">
      <WeekNav weekOffset={weekOffset} onChange={onWeekChange} />

      {toast && (
        <div className={`fixed top-[120px] left-4 right-4 z-50 rounded-xl px-4 py-3 text-sm font-medium shadow-2xl transition-all ${
          toast.ok ? 'bg-cf-green text-navy-950' : 'bg-red-500 text-white'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Controls strip */}
      <div className="px-4 pt-3 pb-2 space-y-2">
        {coachTeams.length > 1 && (
          <div>
            <label className="text-[10px] text-navy-500 font-display font-700 uppercase tracking-widest mb-1.5 block">Reserving for</label>
            <div className="flex gap-2 flex-wrap">
              {coachTeams.map(t => (
                <button key={t.id} onClick={() => setSelectedTeamId(t.id)}
                  className={`px-3 py-1.5 rounded-lg font-display font-700 text-sm tracking-wide transition-all ${
                    selectedTeamId === t.id ? 'bg-cf-green text-navy-950' : 'bg-navy-700 text-navy-300 hover:bg-navy-600'
                  }`}>
                  {teamLabel(t)}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${
          weekReservations.length >= 2 ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-navy-800 text-navy-400 border border-navy-700'
        }`}>
          <span className="font-display font-700">{selectedTeamId ? teamLabel(teamMap[selectedTeamId]!) : ''}</span>
          <span>·</span>
          <span><strong>{weekReservations.length}</strong>/2 reservations this week</span>
          {weekReservations.length >= 2 && <span className="text-red-400">— quota reached</span>}
        </div>
      </div>

      <FieldTypeToggle value={fieldType} onChange={setFieldType} />

      <div className="px-4 space-y-4">
        {Object.keys(byDate).length === 0 ? (
          <EmptyState icon="📋" message={`No ${fieldType.toLowerCase()} fields available this week.`} />
        ) : (
          Object.entries(byDate).map(([date, dateSlots]) => (
            <div key={date}>
              <DayHeader dateStr={date} />
              <div className="space-y-4">
                {dateSlots.map(slot => (
                  <FieldPitchCard
                    key={slot.id}
                    slot={slot}
                    field={fieldMap[slot.fieldId]!}
                    location={locationMap[fieldMap[slot.fieldId]?.locationId ?? '']}
                    teams={teams}
                    mode="reserve"
                    myTeamIds={myTeamIds}
                    reservedDates={reservedDates}
                    weekFull={weekReservations.length >= 2}
                    selectedTeamId={selectedTeamId}
                    onReserve={handleReserve}
                    onCancel={handleCancel}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ─── My Fields View ───────────────────────────────────────────────────────────

function MyFieldsView({
  weekOffset, onWeekChange, currentUser, teams, fields, locations, slots, onCancel,
}: {
  weekOffset: number; onWeekChange: (o: number) => void;
  currentUser: User; teams: Team[]; fields: Field[]; locations: Location[];
  slots: SlotConfig[]; onCancel: (slotId: string, teamId: string) => void;
}) {
  const weekDates = getWeekDates(weekOffset)
  const weekDateSet = new Set(weekDates.map(dateToStr))
  const fieldMap = Object.fromEntries(fields.map(f => [f.id, f]))
  const locationMap = Object.fromEntries(locations.map(l => [l.id, l]))
  const myTeamIds = new Set(currentUser.teamIds)

  const mySlots = slots
    .filter(s => weekDateSet.has(s.date) && s.reservedTeamIds.some(id => myTeamIds.has(id)))
    .sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div className="pb-24">
      <WeekNav weekOffset={weekOffset} onChange={onWeekChange} />
      <div className="px-4 pt-3">
        <SectionTitle>My Reservations</SectionTitle>
        {mySlots.length === 0 ? (
          <EmptyState icon="🗓" message="No field reservations for this week. Go to Reserve to book a spot." />
        ) : (
          <div className="space-y-4">
            {mySlots.map(slot => (
              <FieldPitchCard
                key={slot.id}
                slot={slot}
                field={fieldMap[slot.fieldId]!}
                location={locationMap[fieldMap[slot.fieldId]?.locationId ?? '']}
                teams={teams}
                mode="reserve"
                myTeamIds={myTeamIds}
                selectedTeamId={currentUser.teamIds.find(id => slot.reservedTeamIds.includes(id))}
                onCancel={onCancel}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Admin View ───────────────────────────────────────────────────────────────

function AdminView({
  teams, setTeams, locations, setLocations, fields, setFields,
  slots, setSlots, users, setUsers, weekOffset, onWeekChange,
}: {
  teams: Team[]; setTeams: (t: Team[]) => void;
  locations: Location[]; setLocations: (l: Location[]) => void;
  fields: Field[]; setFields: (f: Field[]) => void;
  slots: SlotConfig[]; setSlots: (s: SlotConfig[]) => void;
  users: User[]; setUsers: (u: User[]) => void;
  weekOffset: number; onWeekChange: (o: number) => void;
}) {
  const [tab, setTab] = useState<AdminTab>('teams')
  const tabs: { id: AdminTab; label: string }[] = [
    { id: 'teams',     label: 'Teams' },
    { id: 'locations', label: 'Locations' },
    { id: 'fields',    label: 'Fields' },
    { id: 'slots',     label: 'Slots' },
    { id: 'users',     label: 'Users' },
  ]
  return (
    <div className="pb-24">
      <div className="sticky top-[60px] z-20 bg-navy-900 border-b border-navy-700">
        <div className="flex overflow-x-auto px-2 py-2 gap-1">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-lg font-display font-700 text-sm tracking-wide transition-all whitespace-nowrap ${
                tab === t.id ? 'bg-cf-green text-navy-950' : 'text-navy-400 hover:text-navy-200 hover:bg-navy-700'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="px-4 pt-4">
        {tab === 'teams'     && <AdminTeams teams={teams} setTeams={setTeams} />}
        {tab === 'locations' && <AdminLocations locations={locations} setLocations={setLocations} />}
        {tab === 'fields'    && <AdminFields fields={fields} setFields={setFields} locations={locations} />}
        {tab === 'slots'     && <AdminSlots slots={slots} setSlots={setSlots} fields={fields} locations={locations} weekOffset={weekOffset} onWeekChange={onWeekChange} teams={teams} />}
        {tab === 'users'     && <AdminUsers users={users} setUsers={setUsers} teams={teams} />}
      </div>
    </div>
  )
}

function uid() { return Math.random().toString(36).slice(2, 10) }

function AdminTeams({ teams, setTeams }: { teams: Team[]; setTeams: (t: Team[]) => void }) {
  const [form, setForm] = useState<Partial<Team>>({ gender: 'Boys', level: 'A' })
  const [editId, setEditId] = useState<string | null>(null)

  function save(e: FormEvent) {
    e.preventDefault()
    if (!form.gender || !form.birthYear || !form.level) return
    if (editId) {
      setTeams(teams.map(t => t.id === editId ? { ...t, ...form } as Team : t))
      setEditId(null)
    } else {
      setTeams([...teams, { id: uid(), gender: form.gender!, birthYear: form.birthYear!, level: form.level! }])
    }
    setForm({ gender: 'Boys', level: 'A' })
  }

  function startEdit(t: Team) { setEditId(t.id); setForm(t) }
  function del(id: string) { setTeams(teams.filter(t => t.id !== id)) }

  return (
    <div className="space-y-4">
      <SectionTitle>Manage Teams</SectionTitle>
      <Card className="p-4">
        <h4 className="font-display text-base font-600 text-navy-200 mb-3">{editId ? 'Edit Team' : 'Add Team'}</h4>
        <form onSubmit={save} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-navy-400 mb-1 block">Gender</label>
              <select value={form.gender} onChange={e => setForm(p => ({ ...p, gender: e.target.value as Gender }))}>
                <option>Boys</option><option>Girls</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-navy-400 mb-1 block">Birth Year</label>
              <input type="number" min={2005} max={2020} placeholder="e.g. 2012" value={form.birthYear ?? ''}
                onChange={e => setForm(p => ({ ...p, birthYear: Number(e.target.value) }))} required />
            </div>
          </div>
          <div>
            <label className="text-xs text-navy-400 mb-1 block">Level</label>
            <select value={form.level} onChange={e => setForm(p => ({ ...p, level: e.target.value as Level }))}>
              {(['A','B','C','D'] as Level[]).map(l => <option key={l}>{l}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <Btn type="submit" variant="primary" size="sm">{editId ? 'Update' : 'Add Team'}</Btn>
            {editId && <Btn variant="ghost" size="sm" onClick={() => { setEditId(null); setForm({ gender: 'Boys', level: 'A' }) }}>Cancel</Btn>}
          </div>
        </form>
      </Card>
      <div className="space-y-2">
        {teams.sort((a, b) => teamLabel(a).localeCompare(teamLabel(b))).map(t => (
          <div key={t.id} className="flex items-center justify-between bg-navy-800 rounded-lg px-4 py-3 border border-navy-700/50">
            <span className="font-display text-base font-700 text-navy-100">{teamLabel(t)}</span>
            <div className="flex gap-2">
              <button onClick={() => startEdit(t)} className="text-navy-400 hover:text-navy-100 p-1.5 rounded hover:bg-navy-700 transition-colors"><IconEdit /></button>
              <button onClick={() => del(t.id)} className="text-navy-400 hover:text-red-400 p-1.5 rounded hover:bg-navy-700 transition-colors"><IconTrash /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AdminLocations({ locations, setLocations }: { locations: Location[]; setLocations: (l: Location[]) => void }) {
  const [form, setForm] = useState({ name: '', city: '' })
  const [editId, setEditId] = useState<string | null>(null)

  function save(e: FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    if (editId) {
      setLocations(locations.map(l => l.id === editId ? { ...l, ...form } : l))
      setEditId(null)
    } else {
      setLocations([...locations, { id: uid(), name: form.name.trim(), city: form.city.trim() }])
    }
    setForm({ name: '', city: '' })
  }

  function startEdit(l: Location) { setEditId(l.id); setForm({ name: l.name, city: l.city }) }
  function del(id: string) { setLocations(locations.filter(l => l.id !== id)) }

  return (
    <div className="space-y-4">
      <SectionTitle>Manage Locations</SectionTitle>
      <Card className="p-4">
        <h4 className="font-display text-base font-600 text-navy-200 mb-3">{editId ? 'Edit Location' : 'Add Location'}</h4>
        <form onSubmit={save} className="space-y-3">
          <div>
            <label className="text-xs text-navy-400 mb-1 block">Name</label>
            <input placeholder="e.g. Marymoor Park" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
          </div>
          <div>
            <label className="text-xs text-navy-400 mb-1 block">City</label>
            <input placeholder="e.g. Redmond, WA" value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} />
          </div>
          <div className="flex gap-2">
            <Btn type="submit" variant="primary" size="sm">{editId ? 'Update' : 'Add Location'}</Btn>
            {editId && <Btn variant="ghost" size="sm" onClick={() => { setEditId(null); setForm({ name: '', city: '' }) }}>Cancel</Btn>}
          </div>
        </form>
      </Card>
      <div className="space-y-2">
        {locations.map(l => (
          <div key={l.id} className="flex items-center justify-between bg-navy-800 rounded-lg px-4 py-3 border border-navy-700/50">
            <div>
              <p className="font-display font-600 text-navy-100">{l.name}</p>
              <p className="text-xs text-navy-400">{l.city}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => startEdit(l)} className="text-navy-400 hover:text-navy-100 p-1.5 rounded hover:bg-navy-700 transition-colors"><IconEdit /></button>
              <button onClick={() => del(l.id)} className="text-navy-400 hover:text-red-400 p-1.5 rounded hover:bg-navy-700 transition-colors"><IconTrash /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AdminFields({ fields, setFields, locations }: { fields: Field[]; setFields: (f: Field[]) => void; locations: Location[] }) {
  const [form, setForm] = useState({ locationId: locations[0]?.id ?? '', name: '', type: 'Turf' as FieldType })
  const [editId, setEditId] = useState<string | null>(null)

  function save(e: FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.locationId) return
    if (editId) {
      setFields(fields.map(f => f.id === editId ? { ...f, ...form, name: form.name.trim() } : f))
      setEditId(null)
    } else {
      setFields([...fields, { id: uid(), locationId: form.locationId, name: form.name.trim(), type: form.type }])
    }
    setForm({ locationId: locations[0]?.id ?? '', name: '', type: 'Turf' })
  }

  function startEdit(f: Field) { setEditId(f.id); setForm({ locationId: f.locationId, name: f.name, type: f.type }) }
  function del(id: string) { setFields(fields.filter(f => f.id !== id)) }

  const locationMap = Object.fromEntries(locations.map(l => [l.id, l]))

  return (
    <div className="space-y-4">
      <SectionTitle>Manage Fields</SectionTitle>
      <Card className="p-4">
        <h4 className="font-display text-base font-600 text-navy-200 mb-3">{editId ? 'Edit Field' : 'Add Field'}</h4>
        <form onSubmit={save} className="space-y-3">
          <div>
            <label className="text-xs text-navy-400 mb-1 block">Location</label>
            <select value={form.locationId} onChange={e => setForm(p => ({ ...p, locationId: e.target.value }))}>
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-navy-400 mb-1 block">Field Name</label>
              <input placeholder="e.g. Field 4" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
            </div>
            <div>
              <label className="text-xs text-navy-400 mb-1 block">Surface</label>
              <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as FieldType }))}>
                <option>Turf</option><option>Grass</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <Btn type="submit" variant="primary" size="sm">{editId ? 'Update' : 'Add Field'}</Btn>
            {editId && <Btn variant="ghost" size="sm" onClick={() => { setEditId(null); setForm({ locationId: locations[0]?.id ?? '', name: '', type: 'Turf' }) }}>Cancel</Btn>}
          </div>
        </form>
      </Card>
      <div className="space-y-2">
        {fields.map(f => {
          const loc = locationMap[f.locationId]
          return (
            <div key={f.id} className="flex items-center justify-between bg-navy-800 rounded-lg px-4 py-3 border border-navy-700/50">
              <div>
                <p className="font-display font-600 text-navy-100">{f.name}</p>
                <p className="text-xs text-navy-400 flex items-center gap-1.5">{loc?.name} <Chip color={f.type === 'Turf' ? 'blue' : 'green'}>{f.type}</Chip></p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => startEdit(f)} className="text-navy-400 hover:text-navy-100 p-1.5 rounded hover:bg-navy-700 transition-colors"><IconEdit /></button>
                <button onClick={() => del(f.id)} className="text-navy-400 hover:text-red-400 p-1.5 rounded hover:bg-navy-700 transition-colors"><IconTrash /></button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AdminSlots({
  slots, setSlots, fields, locations, weekOffset, onWeekChange, teams,
}: {
  slots: SlotConfig[]; setSlots: (s: SlotConfig[]) => void;
  fields: Field[]; locations: Location[];
  weekOffset: number; onWeekChange: (o: number) => void;
  teams: Team[];
}) {
  const [form, setForm] = useState({ fieldId: fields[0]?.id ?? '', date: '', maxTeams: 4 })

  const weekDates = getWeekDates(weekOffset)
  const weekDateSet = new Set(weekDates.map(dateToStr))
  const fieldMap = Object.fromEntries(fields.map(f => [f.id, f]))
  const locationMap = Object.fromEntries(locations.map(l => [l.id, l]))
  const teamMap = Object.fromEntries(teams.map(t => [t.id, t]))

  const weekSlots = slots
    .filter(s => weekDateSet.has(s.date))
    .sort((a, b) => a.date !== b.date ? a.date.localeCompare(b.date) : (fieldMap[a.fieldId]?.name ?? '').localeCompare(fieldMap[b.fieldId]?.name ?? ''))

  function addSlot(e: FormEvent) {
    e.preventDefault()
    if (!form.fieldId || !form.date) return
    const dup = slots.find(s => s.fieldId === form.fieldId && s.date === form.date)
    if (dup) { alert('A slot for this field and date already exists.'); return }
    setSlots([...slots, { id: uid(), fieldId: form.fieldId, date: form.date, maxTeams: form.maxTeams, reservedTeamIds: [] }])
    setForm(p => ({ ...p, date: '' }))
  }

  function delSlot(id: string) { setSlots(slots.filter(s => s.id !== id)) }

  function updateMax(slotId: string, val: number) {
    setSlots(slots.map(s => s.id === slotId ? { ...s, maxTeams: Math.max(1, Math.min(8, val)) } : s))
  }

  function removeTeam(slotId: string, teamId: string) {
    setSlots(slots.map(s => s.id === slotId ? { ...s, reservedTeamIds: s.reservedTeamIds.filter(id => id !== teamId) } : s))
  }

  function addTeam(slotId: string, teamId: string) {
    const slot = slots.find(s => s.id === slotId)
    if (!slot || slot.reservedTeamIds.includes(teamId) || slot.reservedTeamIds.length >= slot.maxTeams) return
    setSlots(slots.map(s => s.id === slotId ? { ...s, reservedTeamIds: [...s.reservedTeamIds, teamId] } : s))
  }

  return (
    <div className="space-y-4">
      <SectionTitle>Weekly Slots</SectionTitle>
      <WeekNav weekOffset={weekOffset} onChange={onWeekChange} />

      <Card className="p-4">
        <h4 className="font-display text-base font-600 text-navy-200 mb-3">Add Slot</h4>
        <form onSubmit={addSlot} className="space-y-3">
          <div>
            <label className="text-xs text-navy-400 mb-1 block">Field</label>
            <select value={form.fieldId} onChange={e => setForm(p => ({ ...p, fieldId: e.target.value }))}>
              {fields.map(f => {
                const loc = locationMap[f.locationId]
                return <option key={f.id} value={f.id}>{loc?.name} — {f.name} ({f.type})</option>
              })}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-navy-400 mb-1 block">Date</label>
              <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} required />
            </div>
            <div>
              <label className="text-xs text-navy-400 mb-1 block">Max Teams (1–8)</label>
              <input type="number" min={1} max={8} value={form.maxTeams} onChange={e => setForm(p => ({ ...p, maxTeams: Number(e.target.value) }))} />
            </div>
          </div>
          <Btn type="submit" variant="primary" size="sm">Add Slot</Btn>
        </form>
      </Card>

      {weekSlots.length === 0 ? (
        <EmptyState icon="📅" message="No slots configured for this week. Add slots above." />
      ) : (
        <div className="space-y-3">
          {weekSlots.map(slot => {
            const field = fieldMap[slot.fieldId]
            const loc = field ? locationMap[field.locationId] : null
            const avail = teams.filter(t => !slot.reservedTeamIds.includes(t.id))
            return (
              <Card key={slot.id} className="overflow-hidden">
                <div className="px-4 py-3 border-b border-navy-700/50 flex items-start justify-between gap-2">
                  <div>
                    <p className="font-display font-700 text-navy-100">{loc?.name} · {field?.name}</p>
                    <p className="text-xs text-navy-400 mt-0.5">{formatDisplayDate(slot.date)}</p>
                  </div>
                  <button onClick={() => delSlot(slot.id)} className="text-navy-500 hover:text-red-400 p-1.5 rounded hover:bg-navy-700 transition-colors flex-shrink-0"><IconTrash /></button>
                </div>
                <div className="px-4 py-3 space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-navy-400 w-20 flex-shrink-0">Max Teams:</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateMax(slot.id, slot.maxTeams - 1)}
                        className="w-7 h-7 rounded bg-navy-700 text-navy-200 flex items-center justify-center hover:bg-navy-600 transition-colors font-bold">−</button>
                      <span className="font-display font-700 text-navy-100 w-4 text-center">{slot.maxTeams}</span>
                      <button onClick={() => updateMax(slot.id, slot.maxTeams + 1)}
                        className="w-7 h-7 rounded bg-navy-700 text-navy-200 flex items-center justify-center hover:bg-navy-600 transition-colors font-bold">+</button>
                    </div>
                    <div className="flex-1">
                      <OccupancyBar filled={slot.reservedTeamIds.length} max={slot.maxTeams} />
                    </div>
                    <span className="text-xs text-navy-400 flex-shrink-0">{slot.reservedTeamIds.length}/{slot.maxTeams}</span>
                  </div>

                  {slot.reservedTeamIds.length > 0 && (
                    <div>
                      <p className="text-xs text-navy-500 mb-1.5">Reserved</p>
                      <div className="flex flex-wrap gap-1.5">
                        {slot.reservedTeamIds.map(tid => {
                          const t = teamMap[tid]
                          return t ? (
                            <span key={tid} className="flex items-center gap-1 text-xs bg-navy-700 text-navy-200 pl-2 pr-1 py-0.5 rounded">
                              {teamLabel(t)}
                              <button onClick={() => removeTeam(slot.id, tid)} className="ml-0.5 text-navy-400 hover:text-red-400 transition-colors"><IconX /></button>
                            </span>
                          ) : null
                        })}
                      </div>
                    </div>
                  )}

                  {slot.reservedTeamIds.length < slot.maxTeams && avail.length > 0 && (
                    <div className="flex gap-2">
                      <select id={`add-${slot.id}`} className="text-sm py-1.5 flex-1" defaultValue="">
                        <option value="" disabled>Add team override…</option>
                        {avail.map(t => <option key={t.id} value={t.id}>{teamLabel(t)}</option>)}
                      </select>
                      <Btn variant="secondary" size="sm" onClick={() => {
                        const sel = document.getElementById(`add-${slot.id}`) as HTMLSelectElement
                        if (sel?.value) { addTeam(slot.id, sel.value); sel.value = '' }
                      }}>Add</Btn>
                    </div>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function AdminUsers({ users, setUsers, teams }: { users: User[]; setUsers: (u: User[]) => void; teams: Team[] }) {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', role: 'coach' as UserRole, teamIds: [] as string[] })
  const [editId, setEditId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  function save(e: FormEvent) {
    e.preventDefault()
    if (!form.email.trim() || !form.firstName.trim()) return
    if (editId) {
      setUsers(users.map(u => u.id === editId ? { ...u, ...form } : u))
      setEditId(null)
    } else {
      if (!form.password.trim()) return
      setUsers([...users, { id: uid(), ...form }])
      setShowAdd(false)
    }
    setForm({ firstName: '', lastName: '', email: '', password: '', role: 'coach', teamIds: [] })
  }

  function startEdit(u: User) {
    setEditId(u.id)
    setForm({ firstName: u.firstName, lastName: u.lastName, email: u.email, password: u.password, role: u.role, teamIds: u.teamIds })
    setShowAdd(true)
  }

  function del(id: string) { setUsers(users.filter(u => u.id !== id)) }
  function toggleTeam(id: string) { setForm(p => ({ ...p, teamIds: p.teamIds.includes(id) ? p.teamIds.filter(x => x !== id) : [...p.teamIds, id] })) }
  const teamMap = Object.fromEntries(teams.map(t => [t.id, t]))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SectionTitle>Manage Users</SectionTitle>
        {!showAdd && <Btn variant="primary" size="sm" onClick={() => setShowAdd(true)}><IconPlus />&nbsp;Add User</Btn>}
      </div>
      {showAdd && (
        <Card className="p-4">
          <h4 className="font-display text-base font-600 text-navy-200 mb-3">{editId ? 'Edit User' : 'Add User'}</h4>
          <form onSubmit={save} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-navy-400 mb-1 block">First Name</label><input value={form.firstName} onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))} required /></div>
              <div><label className="text-xs text-navy-400 mb-1 block">Last Name</label><input value={form.lastName} onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))} /></div>
            </div>
            <div><label className="text-xs text-navy-400 mb-1 block">Email</label><input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required /></div>
            <div><label className="text-xs text-navy-400 mb-1 block">Password {editId && '(leave blank to keep)'}</label><input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required={!editId} /></div>
            <div><label className="text-xs text-navy-400 mb-1 block">Role</label>
              <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value as UserRole }))}>
                <option value="coach">Coach</option><option value="admin">Admin</option>
              </select>
            </div>
            {form.role === 'coach' && (
              <div>
                <label className="text-xs text-navy-400 mb-1.5 block">Assigned Teams</label>
                <div className="flex flex-wrap gap-1.5">
                  {teams.sort((a,b) => teamLabel(a).localeCompare(teamLabel(b))).map(t => (
                    <button key={t.id} type="button" onClick={() => toggleTeam(t.id)}
                      className={`px-2.5 py-1 rounded text-xs font-display font-700 transition-all ${
                        form.teamIds.includes(t.id) ? 'bg-cf-green text-navy-950' : 'bg-navy-700 text-navy-300 hover:bg-navy-600'
                      }`}>
                      {teamLabel(t)}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <Btn type="submit" variant="primary" size="sm">{editId ? 'Update' : 'Add User'}</Btn>
              <Btn variant="ghost" size="sm" onClick={() => { setEditId(null); setShowAdd(false); setForm({ firstName: '', lastName: '', email: '', password: '', role: 'coach', teamIds: [] }) }}>Cancel</Btn>
            </div>
          </form>
        </Card>
      )}
      <div className="space-y-2">
        {users.map(u => (
          <div key={u.id} className="bg-navy-800 rounded-lg px-4 py-3 border border-navy-700/50">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-display font-600 text-navy-100">{u.firstName} {u.lastName}</p>
                <p className="text-xs text-navy-400 truncate">{u.email}</p>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  <Chip color={u.role === 'admin' ? 'amber' : 'navy'}>{u.role}</Chip>
                  {u.teamIds.map(tid => { const t = teamMap[tid]; return t ? <Chip key={tid} color="green">{teamLabel(t)}</Chip> : null })}
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => startEdit(u)} className="text-navy-400 hover:text-navy-100 p-1.5 rounded hover:bg-navy-700 transition-colors"><IconEdit /></button>
                <button onClick={() => del(u.id)} className="text-navy-400 hover:text-red-400 p-1.5 rounded hover:bg-navy-700 transition-colors"><IconTrash /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Auth Modal ───────────────────────────────────────────────────────────────

function AuthModal({ onClose, onLogin, users, setUsers, teams }: {
  onClose: () => void; onLogin: (u: User) => void;
  users: User[]; setUsers: (u: User[]) => void; teams: Team[];
}) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [teamIds, setTeamIds] = useState<string[]>([])
  const [error, setError] = useState('')

  function handleLogin(e: FormEvent) {
    e.preventDefault()
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password)
    if (!user) { setError('Invalid email or password'); return }
    onLogin(user); onClose()
  }

  function handleRegister(e: FormEvent) {
    e.preventDefault()
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) { setError('Email already in use'); return }
    const u: User = { id: uid(), firstName, lastName, email, password, role: 'coach', teamIds }
    setUsers([...users, u]); onLogin(u); onClose()
  }

  function toggleTeam(id: string) { setTeamIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]) }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/65 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-navy-800 w-full max-w-md rounded-t-2xl sm:rounded-2xl border border-navy-600/50 shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-navy-700">
          <h2 className="font-display text-xl font-800 tracking-wide text-white">{mode === 'login' ? 'Sign In' : 'Create Account'}</h2>
          <button onClick={onClose} className="text-navy-400 hover:text-navy-100 transition-colors p-1 rounded hover:bg-navy-700"><IconX /></button>
        </div>

        <div className="flex mx-6 mt-4 mb-2 bg-navy-900 rounded-lg p-1">
          {(['login', 'register'] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setError('') }}
              className={`flex-1 py-1.5 rounded-md font-display font-700 text-sm tracking-wide transition-all ${
                mode === m ? 'bg-cf-green text-navy-950' : 'text-navy-400 hover:text-navy-200'
              }`}>
              {m === 'login' ? 'Sign In' : 'Register'}
            </button>
          ))}
        </div>

        <div className="px-6 pb-6 overflow-y-auto max-h-[80vh]">
          {error && <p className="text-red-400 text-sm bg-red-500/10 rounded-lg px-3 py-2 mt-3 mb-1">{error}</p>}

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-3 mt-3">
              <div><label className="text-xs text-navy-400 mb-1 block">Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required /></div>
              <div><label className="text-xs text-navy-400 mb-1 block">Password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required /></div>
              <p className="text-xs text-navy-500">Demo: hugo@crossfireselect.com / admin123 · sean@crossfireselect.com / coach123</p>
              <Btn type="submit" variant="primary" size="lg" className="w-full mt-1">Sign In</Btn>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-3 mt-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-navy-400 mb-1 block">First Name</label><input value={firstName} onChange={e => setFirstName(e.target.value)} required /></div>
                <div><label className="text-xs text-navy-400 mb-1 block">Last Name</label><input value={lastName} onChange={e => setLastName(e.target.value)} required /></div>
              </div>
              <div><label className="text-xs text-navy-400 mb-1 block">Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></div>
              <div><label className="text-xs text-navy-400 mb-1 block">Password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} required /></div>
              <div>
                <label className="text-xs text-navy-400 mb-1.5 block">Your Team(s)</label>
                <div className="flex flex-wrap gap-1.5">
                  {teams.sort((a,b) => teamLabel(a).localeCompare(teamLabel(b))).map(t => (
                    <button key={t.id} type="button" onClick={() => toggleTeam(t.id)}
                      className={`px-2.5 py-1 rounded text-xs font-display font-700 transition-all ${
                        teamIds.includes(t.id) ? 'bg-cf-green text-navy-950' : 'bg-navy-700 text-navy-300 hover:bg-navy-600'
                      }`}>
                      {teamLabel(t)}
                    </button>
                  ))}
                </div>
              </div>
              <Btn type="submit" variant="primary" size="lg" className="w-full">Create Account</Btn>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [teams,       setTeams]       = useState<Team[]>(() => load('cf_teams', SEED_TEAMS))
  const [locations,   setLocations]   = useState<Location[]>(() => load('cf_locations', SEED_LOCATIONS))
  const [fields,      setFields]      = useState<Field[]>(() => load('cf_fields', SEED_FIELDS))
  const [slots,       setSlots]       = useState<SlotConfig[]>(() => load('cf_slots', buildSeedSlots()))
  const [users,       setUsers]       = useState<User[]>(() => load('cf_users', SEED_USERS))
  const [currentUser, setCurrentUser] = useState<User | null>(() => load('cf_currentUser', null))
  const [view,        setView]        = useState<View>('schedule')
  const [weekOffset,  setWeekOffset]  = useState(1)
  const [showAuth,    setShowAuth]    = useState(false)

  useEffect(() => { save('cf_teams',       teams)       }, [teams])
  useEffect(() => { save('cf_locations',   locations)   }, [locations])
  useEffect(() => { save('cf_fields',      fields)      }, [fields])
  useEffect(() => { save('cf_slots',       slots)       }, [slots])
  useEffect(() => { save('cf_users',       users)       }, [users])
  useEffect(() => { save('cf_currentUser', currentUser) }, [currentUser])

  function handleLogin(u: User) { setCurrentUser(u) }
  function handleLogout() { setCurrentUser(null); setView('schedule') }

  function handleReserve(slotId: string, teamId: string): string | null {
    const slot = slots.find(s => s.id === slotId)
    if (!slot) return 'Slot not found'
    if (slot.reservedTeamIds.includes(teamId)) return 'Already reserved'
    if (slot.reservedTeamIds.length >= slot.maxTeams) return 'This field is full'
    const weekDates = getWeekDates(weekOffset)
    const weekDateSet = new Set(weekDates.map(dateToStr))
    const sameDaySlots = slots.filter(s => s.id !== slotId && s.date === slot.date && weekDateSet.has(s.date) && s.reservedTeamIds.includes(teamId))
    if (sameDaySlots.length > 0) return 'Team already reserved a field on this day'
    const weekCount = slots.filter(s => weekDateSet.has(s.date) && s.reservedTeamIds.includes(teamId)).length
    if (weekCount >= 2) return 'Team already has 2 reservations this week'
    setSlots(prev => prev.map(s => s.id === slotId ? { ...s, reservedTeamIds: [...s.reservedTeamIds, teamId] } : s))
    return null
  }

  function handleCancel(slotId: string, teamId: string) {
    setSlots(prev => prev.map(s => s.id === slotId ? { ...s, reservedTeamIds: s.reservedTeamIds.filter(id => id !== teamId) } : s))
  }

  const isAdmin = currentUser?.role === 'admin'
  const isCoach = !!currentUser

  const navItems: { id: View; label: string; icon: ReactNode }[] = [
    { id: 'schedule', label: 'Schedule',  icon: <IconCalendar /> },
    { id: 'reserve',  label: 'Reserve',   icon: <IconField /> },
    { id: 'myfields', label: 'My Fields', icon: <IconClipboard /> },
    ...(isAdmin ? [{ id: 'admin' as View, label: 'Admin', icon: <IconSettings /> }] : []),
  ]

  return (
    <div className="min-h-screen bg-navy-900 flex flex-col max-w-2xl mx-auto">
      {/* Header */}
      <header className="sticky top-0 z-30 h-[60px] bg-navy-950 border-b border-navy-700/80 flex items-center px-4 gap-3 shadow-lg">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-cf-green flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
              <circle cx="12" cy="12" r="9" stroke="#0a1628" strokeWidth="1.5" />
              <path d="M12 3C12 3 9 7 9 12s3 9 3 9M12 3c0 0 3 4 3 9s-3 9-3 9M3 12h18M5 7.5C7 9 9.5 10 12 10s5-1 7-2.5M5 16.5C7 15 9.5 14 12 14s5 1 7 2.5" stroke="#0a1628" strokeWidth="1.5" />
            </svg>
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-sm font-800 tracking-widest text-white leading-none uppercase">Crossfire Select</h1>
            <p className="font-display text-[9px] font-600 tracking-widest text-cf-green leading-none uppercase">Field Manager</p>
          </div>
        </div>

        {currentUser ? (
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs text-navy-200 font-medium leading-tight">{currentUser.firstName} {currentUser.lastName}</span>
              <span className="text-[10px] text-cf-green uppercase tracking-wide">{currentUser.role}</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-navy-700 border border-navy-600 flex items-center justify-center text-navy-200">
              <IconUser />
            </div>
            <button onClick={handleLogout} className="text-navy-400 hover:text-navy-100 text-xs font-medium px-2 py-1.5 rounded hover:bg-navy-800 transition-colors">
              Sign out
            </button>
          </div>
        ) : (
          <Btn variant="primary" size="sm" onClick={() => setShowAuth(true)}>Sign In</Btn>
        )}
      </header>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {view === 'schedule' && (
          <ScheduleView weekOffset={weekOffset} onWeekChange={setWeekOffset} teams={teams} locations={locations} fields={fields} slots={slots} />
        )}
        {view === 'reserve' && isCoach ? (
          <ReserveView weekOffset={weekOffset} onWeekChange={setWeekOffset} currentUser={currentUser!} teams={teams} locations={locations} fields={fields} slots={slots} onReserve={handleReserve} onCancel={handleCancel} />
        ) : view === 'reserve' && (
          <div className="pb-24 flex flex-col items-center gap-4 pt-16 px-4">
            <div className="w-16 h-16 rounded-2xl bg-navy-700 flex items-center justify-center text-3xl">⚽</div>
            <p className="text-navy-300 text-center">Sign in to reserve field slots for your team.</p>
            <Btn variant="primary" onClick={() => setShowAuth(true)}>Sign In</Btn>
          </div>
        )}
        {view === 'myfields' && isCoach ? (
          <MyFieldsView weekOffset={weekOffset} onWeekChange={setWeekOffset} currentUser={currentUser!} teams={teams} fields={fields} locations={locations} slots={slots} onCancel={handleCancel} />
        ) : view === 'myfields' && (
          <div className="flex flex-col items-center gap-4 pt-16 px-4">
            <p className="text-navy-300 text-center">Sign in to view your reservations.</p>
            <Btn variant="primary" onClick={() => setShowAuth(true)}>Sign In</Btn>
          </div>
        )}
        {view === 'admin' && isAdmin && (
          <AdminView teams={teams} setTeams={setTeams} locations={locations} setLocations={setLocations} fields={fields} setFields={setFields} slots={slots} setSlots={setSlots} users={users} setUsers={setUsers} weekOffset={weekOffset} onWeekChange={setWeekOffset} />
        )}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-2xl mx-auto h-[60px] bg-navy-950 border-t border-navy-700/80 flex z-30">
        {navItems.map(item => {
          const active = view === item.id
          return (
            <button key={item.id}
              onClick={() => {
                if ((item.id === 'reserve' || item.id === 'myfields') && !isCoach) { setShowAuth(true); return }
                setView(item.id)
              }}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-all relative ${
                active ? 'text-cf-green' : 'text-navy-500 hover:text-navy-300'
              }`}>
              <span className={`transition-transform duration-150 ${active ? 'scale-110' : ''}`}>{item.icon}</span>
              <span className={`text-[10px] font-display font-700 tracking-wider uppercase ${active ? 'text-cf-green' : ''}`}>{item.label}</span>
              {active && <span className="absolute bottom-0 inset-x-1/4 h-0.5 bg-cf-green rounded-full" />}
            </button>
          )
        })}
      </nav>

      {showAuth && (
        <AuthModal onClose={() => setShowAuth(false)} onLogin={handleLogin} users={users} setUsers={setUsers} teams={teams} />
      )}
    </div>
  )
}
