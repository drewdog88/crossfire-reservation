import { useState, useEffect } from 'react'
import type { ReactNode, FormEvent } from 'react'
import {
  type Team, type Location, type Field, type SlotConfig, type User,
  type View, type AdminTab, type Gender, type FieldType, type UserRole,
  teamLabel, dateToStr, getWeekDates, weekRangeLabel, formatDisplayDate, timeRangeLabel,
} from './types'
import * as api from './api'

// ─── Shared UI ───────────────────────────────────────────────────────────────

function Chip({ children, color = 'green' }: { children: ReactNode; color?: 'green' | 'amber' | 'red' | 'navy' | 'blue' }) {
  const cls = {
    green: 'bg-cf-green/12 text-cf-green border-cf-green/30',
    amber: 'bg-amber-500/15 text-amber-700 border-amber-500/40',
    red:   'bg-red-500/12 text-red-700 border-red-500/40',
    navy:  'bg-navy-700 text-navy-300 border-navy-600',
    blue:  'bg-blue-500/12 text-blue-700 border-blue-500/40',
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
    danger:    'bg-red-500/12 text-red-700 border border-red-500/40 hover:bg-red-500/20 active:scale-95',
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
const IconTrash = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4"><path d="M3 6h18M19 6l-1 14H6L5 6M9 6V4h6v2" /></svg>
const IconEdit  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
const IconUser  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-5 h-5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>

// ─── Week Navigator ───────────────────────────────────────────────────────────

function WeekNav({ weekOffset, onChange }: { weekOffset: number; onChange: (o: number) => void }) {
  const dates = getWeekDates(weekOffset)
  return (
    <div className="flex items-center gap-2 px-4 py-3 bg-navy-800 sticky top-0 z-20 border-b border-navy-700">
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

// Sort slots by date, then start time, then field name — used by every schedule view
function compareSlots(fieldMap: Record<string, Field>) {
  return (a: SlotConfig, b: SlotConfig) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date)
    if (a.startTime !== b.startTime) return a.startTime.localeCompare(b.startTime)
    return (fieldMap[a.fieldId]?.name ?? '').localeCompare(fieldMap[b.fieldId]?.name ?? '')
  }
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
        <div className="flex items-center gap-2.5 border border-dashed border-white/60 rounded-lg px-5 py-2 transition-all duration-150 group hover:border-white hover:bg-white/15">
          <svg className="w-4 h-4 text-white/85 group-hover:text-white transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path d="M12 5v14M5 12h14" />
          </svg>
          <span className="font-display font-700 text-sm tracking-widest uppercase text-white/85 group-hover:text-white transition-colors">
            Reserve
          </span>
        </div>
      ) : (
        <span className="font-display font-600 text-xs tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.72)' }}>
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
  const open = Math.max(0, slot.maxTeams - filled)
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
    <div className="rounded-2xl overflow-hidden shadow-lg" style={{ border: '1px solid #e2e8f0' }}>
      {/* Header */}
      <div className="px-4 py-3 flex items-start justify-between gap-2" style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-display text-xl font-800 tracking-wide text-navy-100">{field.name}</span>
            <span className={`text-[10px] font-display font-700 px-2 py-0.5 rounded uppercase tracking-wider ${
              field.type === 'Turf'
                ? 'bg-blue-500/12 text-blue-700 border border-blue-500/40'
                : 'bg-emerald-500/12 text-emerald-700 border border-emerald-500/40'
            }`}>{field.type}</span>
          </div>
          <p className="text-xs font-medium mt-0.5" style={{ color: '#64748b' }}>
            {location?.name} · {location?.city}
          </p>
          <p className="text-xs font-display font-600 tracking-wide mt-0.5 text-cf-green">
            {timeRangeLabel(slot.startTime, slot.endTime)}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          {open === 0
            ? <div className="font-display text-xs font-800 tracking-widest text-red-600">FULL</div>
            : open === 1
            ? <div className="font-display text-xs font-800 tracking-widest text-amber-600">1 OPEN</div>
            : <div className="font-display text-xs font-800 tracking-widest text-cf-green">{open} OPEN</div>
          }
          <div className="font-display text-xs font-500 mt-0.5" style={{ color: '#94a3b8' }}>
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
          style={{ background: '#ffffff', borderTop: '1px solid #e2e8f0' }}
        >
          {myReservation ? (
            <>
              <span className="text-xs text-cf-green font-medium">
                {selectedTeamId && teamMap[selectedTeamId]
                  ? `${teamLabel(teamMap[selectedTeamId])} · reserved`
                  : 'Reserved'}
              </span>
              <Btn variant="danger" size="sm" onClick={() => onCancel?.(slot.id, selectedTeamId!)}>
                Cancel
              </Btn>
            </>
          ) : dayBooked ? (
            <span className="text-xs text-amber-700">Already booked a field on this day</span>
          ) : weekFull ? (
            <span className="text-xs text-red-700">Week limit reached (max 2 per week)</span>
          ) : open === 0 ? (
            <span className="text-xs text-red-700">All slots taken for this day</span>
          ) : (
            <span className="text-xs" style={{ color: '#64748b' }}>
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
    .sort(compareSlots(fieldMap))

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
  slots: SlotConfig[]; onReserve: (slotId: string, teamId: string) => Promise<string | null>;
  onCancel: (slotId: string, teamId: string) => Promise<string | null>;
}) {
  const [fieldType, setFieldType] = useState<FieldType>('Turf')
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const weekDates = getWeekDates(weekOffset)
  const weekDateSet = new Set(weekDates.map(dateToStr))
  const teamMap = Object.fromEntries(teams.map(t => [t.id, t]))
  const fieldMap = Object.fromEntries(fields.map(f => [f.id, f]))
  const locationMap = Object.fromEntries(locations.map(l => [l.id, l]))
  // Admins may reserve on behalf of any team (the server authorizes this);
  // coaches are limited to the teams assigned to them.
  const reservableTeams = (currentUser.role === 'admin'
    ? [...teams].sort((a, b) => teamLabel(a).localeCompare(teamLabel(b)))
    : currentUser.teamIds.map(id => teamMap[id]).filter(Boolean) as Team[])

  const [selectedTeamId, setSelectedTeamId] = useState(reservableTeams[0]?.id ?? '')

  const weekReservations = slots.filter(s => weekDateSet.has(s.date) && s.reservedTeamIds.includes(selectedTeamId))
  const reservedDates = new Set(weekReservations.map(s => s.date))
  const myTeamIds = new Set(currentUser.teamIds)

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  async function handleReserve(slotId: string) {
    const err = await onReserve(slotId, selectedTeamId)
    if (err) showToast(err, false)
    else showToast('Spot reserved! 🎉', true)
  }

  async function handleCancel(slotId: string, teamId: string) {
    const err = await onCancel(slotId, teamId)
    if (err) showToast(err, false)
    else showToast('Reservation cancelled.', true)
  }

  const weekSlots = slots
    .filter(s => weekDateSet.has(s.date) && fieldMap[s.fieldId]?.type === fieldType)
    .sort(compareSlots(fieldMap))

  const byDate: Record<string, SlotConfig[]> = {}
  weekSlots.forEach(s => { if (!byDate[s.date]) byDate[s.date] = []; byDate[s.date].push(s) })

  if (reservableTeams.length === 0) {
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
        {reservableTeams.length > 1 && (
          <div>
            <label className="text-[10px] text-navy-500 font-display font-700 uppercase tracking-widest mb-1.5 block">
              {currentUser.role === 'admin' ? 'Reserving for (admin — any team)' : 'Reserving for'}
            </label>
            <div className="flex gap-2 flex-wrap">
              {reservableTeams.map(t => (
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

        <div className={`px-3 py-2 rounded-lg text-xs font-medium ${
          weekReservations.length >= 2 ? 'bg-red-500/10 text-red-700 border border-red-500/30' : 'bg-navy-800 text-navy-400 border border-navy-700'
        }`}>
          <div className="flex items-center gap-2">
            <span className="font-display font-700">{selectedTeamId ? teamLabel(teamMap[selectedTeamId]!) : ''}</span>
            <span>·</span>
            <span><strong>{weekReservations.length}</strong>/2 reservations this week</span>
            {weekReservations.length >= 2 && <span className="text-red-700">— weekly limit reached (max 2, on different days)</span>}
          </div>
          {weekReservations.length > 0 && (
            <ul className="mt-1.5 space-y-0.5">
              {[...weekReservations].sort(compareSlots(fieldMap)).map(s => {
                const f = fieldMap[s.fieldId]
                return (
                  <li key={s.id} className="flex items-center gap-1.5 text-navy-300">
                    <span className="text-cf-green">•</span>
                    <span>{formatDisplayDate(s.date)}</span>
                    <span className="text-navy-500">·</span>
                    <span>{f?.name ?? 'Field'} ({f?.type})</span>
                    <span className="text-navy-500">·</span>
                    <span>{timeRangeLabel(s.startTime, s.endTime)}</span>
                  </li>
                )
              })}
            </ul>
          )}
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
  slots: SlotConfig[]; onCancel: (slotId: string, teamId: string) => Promise<string | null>;
}) {
  const weekDates = getWeekDates(weekOffset)
  const weekDateSet = new Set(weekDates.map(dateToStr))
  const fieldMap = Object.fromEntries(fields.map(f => [f.id, f]))
  const locationMap = Object.fromEntries(locations.map(l => [l.id, l]))
  const teamMap = Object.fromEntries(teams.map(t => [t.id, t]))
  const isAdmin = currentUser.role === 'admin'
  const myTeamIds = new Set(currentUser.teamIds)
  const [busyKey, setBusyKey] = useState<string | null>(null)

  // Flatten to one row per reservation (slot × team). Admins see every team's
  // bookings for the week; coaches see only their assigned teams'.
  const rows = slots
    .filter(s => weekDateSet.has(s.date) && fieldMap[s.fieldId])
    .sort(compareSlots(fieldMap))
    .flatMap(slot =>
      slot.reservedTeamIds
        .filter(teamId => isAdmin || myTeamIds.has(teamId))
        .map(teamId => ({ slot, teamId })),
    )

  async function cancel(slotId: string, teamId: string) {
    const key = `${slotId}:${teamId}`
    if (!confirm('Cancel this reservation?')) return
    setBusyKey(key)
    try { await onCancel(slotId, teamId) } finally { setBusyKey(null) }
  }

  return (
    <div className="pb-24">
      <WeekNav weekOffset={weekOffset} onChange={onWeekChange} />
      <div className="px-4 pt-3">
        <SectionTitle>{isAdmin ? 'All Reservations' : 'My Reservations'}</SectionTitle>
        {rows.length === 0 ? (
          <EmptyState
            icon="🗓"
            message={isAdmin
              ? 'No teams have reserved a field this week yet.'
              : 'No field reservations for this week. Go to Reserve to book a spot.'}
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-navy-700 bg-navy-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-navy-500 border-b border-navy-700">
                  <th className="px-3 py-2 font-display font-700">Day</th>
                  <th className="px-3 py-2 font-display font-700">Time</th>
                  <th className="px-3 py-2 font-display font-700">Field</th>
                  <th className="px-3 py-2 font-display font-700">Location</th>
                  <th className="px-3 py-2 font-display font-700">Team</th>
                  <th className="px-3 py-2 font-display font-700 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ slot, teamId }) => {
                  const f = fieldMap[slot.fieldId]!
                  const loc = locationMap[f.locationId]
                  const team = teamMap[teamId]
                  const key = `${slot.id}:${teamId}`
                  return (
                    <tr key={key} className="border-b border-navy-700/60 last:border-0">
                      <td className="px-3 py-2.5 text-navy-200 whitespace-nowrap">{formatDisplayDate(slot.date)}</td>
                      <td className="px-3 py-2.5 text-navy-300 whitespace-nowrap">{timeRangeLabel(slot.startTime, slot.endTime)}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className="text-navy-100 font-display font-600">{f.name}</span>
                        <span className="ml-1.5 text-[10px] uppercase tracking-wide text-navy-500">{f.type}</span>
                      </td>
                      <td className="px-3 py-2.5 text-navy-300 whitespace-nowrap">{loc?.name ?? '—'}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className="font-display font-700 text-cf-green">{team ? teamLabel(team) : teamId}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right whitespace-nowrap">
                        <Btn variant="danger" size="sm" disabled={busyKey === key} onClick={() => cancel(slot.id, teamId)}>
                          {busyKey === key ? '…' : 'Cancel'}
                        </Btn>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Admin View ───────────────────────────────────────────────────────────────

function AdminView({
  teams, locations, fields, slots, users, refresh, weekOffset, onWeekChange,
}: {
  teams: Team[]; locations: Location[]; fields: Field[];
  slots: SlotConfig[]; users: User[]; refresh: () => Promise<void>;
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
  const pending = users.filter(u => u.status === 'pending').length

  return (
    <div className="pb-24">
      <div className="sticky top-0 z-20 bg-navy-900 border-b border-navy-700">
        <div className="flex overflow-x-auto px-2 py-2 gap-1">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`relative flex-shrink-0 px-4 py-1.5 rounded-lg font-display font-700 text-sm tracking-wide transition-all whitespace-nowrap ${
                tab === t.id ? 'bg-cf-green text-navy-950' : 'text-navy-400 hover:text-navy-200 hover:bg-navy-700'
              }`}>
              {t.label}
              {t.id === 'users' && pending > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-navy-950 text-[10px] font-800">{pending}</span>
              )}
            </button>
          ))}
        </div>
      </div>
      <div className="px-4 pt-4">
        {tab === 'teams'     && <AdminTeams teams={teams} refresh={refresh} />}
        {tab === 'locations' && <AdminLocations locations={locations} refresh={refresh} />}
        {tab === 'fields'    && <AdminFields fields={fields} locations={locations} refresh={refresh} />}
        {tab === 'slots'     && <AdminSlots slots={slots} fields={fields} locations={locations} weekOffset={weekOffset} onWeekChange={onWeekChange} teams={teams} refresh={refresh} />}
        {tab === 'users'     && <AdminUsers users={users} teams={teams} refresh={refresh} />}
      </div>
    </div>
  )
}

// Surface a failed admin mutation without a fragile inline toast — a plain alert is enough for MVP.
function reportError(err: unknown) {
  alert(err instanceof Error ? err.message : 'Something went wrong.')
}

function AdminTeams({ teams, refresh }: { teams: Team[]; refresh: () => Promise<void> }) {
  const [form, setForm] = useState<{ gender: Gender; birthYear?: number; level: string; coachName: string }>({ gender: 'Boys', level: 'A', coachName: '' })
  const [editId, setEditId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!form.gender || !form.birthYear || !form.level) return
    setBusy(true)
    try {
      const body = { gender: form.gender, birthYear: form.birthYear, level: form.level, coachName: form.coachName.trim() || null }
      if (editId) await api.adminUpdate('teams', { id: editId, ...body })
      else await api.adminCreate('teams', body)
      await refresh()
      setEditId(null)
      setForm({ gender: 'Boys', level: 'A', coachName: '' })
    } catch (err) { reportError(err) } finally { setBusy(false) }
  }

  function startEdit(t: Team) { setEditId(t.id); setForm({ gender: t.gender, birthYear: t.birthYear, level: t.level, coachName: t.coachName ?? '' }) }
  async function onDelete(id: string) {
    if (!confirm('Delete this team? Its reservations will be removed.')) return
    try { await api.adminDelete('teams', id); await refresh() } catch (err) { reportError(err) }
  }

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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-navy-400 mb-1 block">Level</label>
              <input placeholder="e.g. A, B, 8th Graders" value={form.level} onChange={e => setForm(p => ({ ...p, level: e.target.value }))} required />
            </div>
            <div>
              <label className="text-xs text-navy-400 mb-1 block">Coach (optional)</label>
              <input placeholder="e.g. Nancy" value={form.coachName} onChange={e => setForm(p => ({ ...p, coachName: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2">
            <Btn type="submit" variant="primary" size="sm" disabled={busy}>{editId ? 'Update' : 'Add Team'}</Btn>
            {editId && <Btn variant="ghost" size="sm" onClick={() => { setEditId(null); setForm({ gender: 'Boys', level: 'A', coachName: '' }) }}>Cancel</Btn>}
          </div>
        </form>
      </Card>
      <div className="space-y-2">
        {[...teams].sort((a, b) => teamLabel(a).localeCompare(teamLabel(b))).map(t => (
          <div key={t.id} className="flex items-center justify-between bg-navy-800 rounded-lg px-4 py-3 border border-navy-700/50">
            <div>
              <span className="font-display text-base font-700 text-navy-100">{teamLabel(t)}</span>
              {t.coachName && <span className="text-xs text-navy-400 ml-2">Coach {t.coachName}</span>}
            </div>
            <div className="flex gap-2">
              <button onClick={() => startEdit(t)} className="text-navy-400 hover:text-navy-100 p-1.5 rounded hover:bg-navy-700 transition-colors"><IconEdit /></button>
              <button onClick={() => onDelete(t.id)} className="text-navy-400 hover:text-red-400 p-1.5 rounded hover:bg-navy-700 transition-colors"><IconTrash /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AdminLocations({ locations, refresh }: { locations: Location[]; refresh: () => Promise<void> }) {
  const [form, setForm] = useState({ name: '', city: '' })
  const [editId, setEditId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setBusy(true)
    try {
      const body = { name: form.name.trim(), city: form.city.trim() || null }
      if (editId) await api.adminUpdate('locations', { id: editId, ...body })
      else await api.adminCreate('locations', body)
      await refresh()
      setEditId(null)
      setForm({ name: '', city: '' })
    } catch (err) { reportError(err) } finally { setBusy(false) }
  }

  function startEdit(l: Location) { setEditId(l.id); setForm({ name: l.name, city: l.city ?? '' }) }
  async function onDelete(id: string) {
    if (!confirm('Delete this location? Its fields and slots will be removed.')) return
    try { await api.adminDelete('locations', id); await refresh() } catch (err) { reportError(err) }
  }

  return (
    <div className="space-y-4">
      <SectionTitle>Manage Locations</SectionTitle>
      <Card className="p-4">
        <h4 className="font-display text-base font-600 text-navy-200 mb-3">{editId ? 'Edit Location' : 'Add Location'}</h4>
        <form onSubmit={save} className="space-y-3">
          <div>
            <label className="text-xs text-navy-400 mb-1 block">Name</label>
            <input placeholder="e.g. 60 Acres" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
          </div>
          <div>
            <label className="text-xs text-navy-400 mb-1 block">City</label>
            <input placeholder="e.g. Redmond, WA" value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} />
          </div>
          <div className="flex gap-2">
            <Btn type="submit" variant="primary" size="sm" disabled={busy}>{editId ? 'Update' : 'Add Location'}</Btn>
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
              <button onClick={() => onDelete(l.id)} className="text-navy-400 hover:text-red-400 p-1.5 rounded hover:bg-navy-700 transition-colors"><IconTrash /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AdminFields({ fields, locations, refresh }: { fields: Field[]; locations: Location[]; refresh: () => Promise<void> }) {
  const [form, setForm] = useState({ locationId: locations[0]?.id ?? '', name: '', type: 'Turf' as FieldType })
  const [editId, setEditId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.locationId) return
    setBusy(true)
    try {
      const body = { locationId: form.locationId, name: form.name.trim(), type: form.type }
      if (editId) await api.adminUpdate('fields', { id: editId, ...body })
      else await api.adminCreate('fields', body)
      await refresh()
      setEditId(null)
      setForm({ locationId: locations[0]?.id ?? '', name: '', type: 'Turf' })
    } catch (err) { reportError(err) } finally { setBusy(false) }
  }

  function startEdit(f: Field) { setEditId(f.id); setForm({ locationId: f.locationId, name: f.name, type: f.type }) }
  async function onDelete(id: string) {
    if (!confirm('Delete this field? Its slots will be removed.')) return
    try { await api.adminDelete('fields', id); await refresh() } catch (err) { reportError(err) }
  }

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
            <Btn type="submit" variant="primary" size="sm" disabled={busy}>{editId ? 'Update' : 'Add Field'}</Btn>
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
                <button onClick={() => onDelete(f.id)} className="text-navy-400 hover:text-red-400 p-1.5 rounded hover:bg-navy-700 transition-colors"><IconTrash /></button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AdminSlots({
  slots, fields, locations, weekOffset, onWeekChange, teams, refresh,
}: {
  slots: SlotConfig[]; fields: Field[]; locations: Location[];
  weekOffset: number; onWeekChange: (o: number) => void;
  teams: Team[]; refresh: () => Promise<void>;
}) {
  const [form, setForm] = useState({ fieldId: fields[0]?.id ?? '', date: '', startTime: '17:30', endTime: '19:00', maxTeams: 4 })

  const weekDates = getWeekDates(weekOffset)
  const weekDateSet = new Set(weekDates.map(dateToStr))
  const fieldMap = Object.fromEntries(fields.map(f => [f.id, f]))
  const locationMap = Object.fromEntries(locations.map(l => [l.id, l]))
  const teamMap = Object.fromEntries(teams.map(t => [t.id, t]))

  const weekSlots = slots
    .filter(s => weekDateSet.has(s.date) && fieldMap[s.fieldId])
    .sort(compareSlots(fieldMap))

  async function addSlot(e: FormEvent) {
    e.preventDefault()
    if (!form.fieldId || !form.date || !form.startTime || !form.endTime) return
    if (form.endTime <= form.startTime) { alert('End time must be after start time.'); return }
    const dup = slots.find(s => s.fieldId === form.fieldId && s.date === form.date && s.startTime === form.startTime)
    if (dup) { alert('A slot for this field, date, and start time already exists.'); return }
    try {
      await api.adminCreate('slots', { fieldId: form.fieldId, date: form.date, startTime: form.startTime, endTime: form.endTime, maxTeams: form.maxTeams })
      await refresh()
      setForm(p => ({ ...p, date: '' }))
    } catch (err) { reportError(err) }
  }

  async function delSlot(id: string) {
    if (!confirm('Delete this slot? Its reservations will be removed.')) return
    try { await api.adminDelete('slots', id); await refresh() } catch (err) { reportError(err) }
  }

  async function updateMax(slot: SlotConfig, val: number) {
    // Floor cannot drop below teams already reserved, or the schedule views crash on a negative "open" count
    const floor = Math.max(1, slot.reservedTeamIds.length)
    const maxTeams = Math.max(floor, Math.min(8, val))
    if (maxTeams === slot.maxTeams) return
    try {
      await api.adminUpdate('slots', { id: slot.id, fieldId: slot.fieldId, date: slot.date, startTime: slot.startTime, endTime: slot.endTime, maxTeams })
      await refresh()
    } catch (err) { reportError(err) }
  }

  // Admin overrides go through the reservations endpoint (admins may act on any team).
  async function removeTeam(slotId: string, teamId: string) {
    try { await api.cancel(slotId, teamId); await refresh() } catch (err) { reportError(err) }
  }
  async function addTeam(slotId: string, teamId: string) {
    try { await api.reserve(slotId, teamId); await refresh() } catch (err) { reportError(err) }
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
            <div>
              <label className="text-xs text-navy-400 mb-1 block">Start Time</label>
              <input type="time" value={form.startTime} onChange={e => setForm(p => ({ ...p, startTime: e.target.value }))} required />
            </div>
            <div>
              <label className="text-xs text-navy-400 mb-1 block">End Time</label>
              <input type="time" value={form.endTime} onChange={e => setForm(p => ({ ...p, endTime: e.target.value }))} required />
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
                    <p className="text-xs text-navy-400 mt-0.5">{formatDisplayDate(slot.date)} · {timeRangeLabel(slot.startTime, slot.endTime)}</p>
                  </div>
                  <button onClick={() => delSlot(slot.id)} className="text-navy-500 hover:text-red-400 p-1.5 rounded hover:bg-navy-700 transition-colors flex-shrink-0"><IconTrash /></button>
                </div>
                <div className="px-4 py-3 space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-navy-400 w-20 flex-shrink-0">Max Teams:</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateMax(slot, slot.maxTeams - 1)}
                        className="w-7 h-7 rounded bg-navy-700 text-navy-200 flex items-center justify-center hover:bg-navy-600 transition-colors font-bold">−</button>
                      <span className="font-display font-700 text-navy-100 w-4 text-center">{slot.maxTeams}</span>
                      <button onClick={() => updateMax(slot, slot.maxTeams + 1)}
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

function AdminUsers({ users, teams, refresh }: { users: User[]; teams: Team[]; refresh: () => Promise<void> }) {
  const [editId, setEditId] = useState<string | null>(null)
  const [draftTeamIds, setDraftTeamIds] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const teamMap = Object.fromEntries(teams.map(t => [t.id, t]))

  const pending = users.filter(u => u.status === 'pending')
  const active = users.filter(u => u.status !== 'pending')

  async function approve(u: User) {
    try { await api.adminUpdate('users', { id: u.id, status: 'active' }); await refresh() } catch (err) { reportError(err) }
  }
  async function setRole(u: User, role: UserRole) {
    try { await api.adminUpdate('users', { id: u.id, role }); await refresh() } catch (err) { reportError(err) }
  }
  async function del(id: string) {
    if (!confirm('Delete this user?')) return
    try { await api.adminDelete('users', id); await refresh() } catch (err) { reportError(err) }
  }
  function startEdit(u: User) { setEditId(u.id); setDraftTeamIds(u.teamIds) }
  function toggleTeam(id: string) { setDraftTeamIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]) }
  async function saveTeams(u: User) {
    setBusy(true)
    try { await api.adminUpdate('users', { id: u.id, teamIds: draftTeamIds }); await refresh(); setEditId(null) }
    catch (err) { reportError(err) } finally { setBusy(false) }
  }

  function UserCard({ u }: { u: User }) {
    const editing = editId === u.id
    return (
      <div className="bg-navy-800 rounded-lg px-4 py-3 border border-navy-700/50">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-display font-600 text-navy-100">{u.firstName} {u.lastName}</p>
            <p className="text-xs text-navy-400 truncate">{u.email}</p>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {u.status === 'pending' && <Chip color="amber">pending</Chip>}
              <Chip color={u.role === 'admin' ? 'amber' : 'navy'}>{u.role}</Chip>
              {u.teamIds.map(tid => { const t = teamMap[tid]; return t ? <Chip key={tid} color="green">{teamLabel(t)}</Chip> : null })}
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {u.status === 'pending'
              ? <Btn variant="primary" size="sm" onClick={() => approve(u)}>Approve</Btn>
              : <button onClick={() => startEdit(u)} className="text-navy-400 hover:text-navy-100 p-1.5 rounded hover:bg-navy-700 transition-colors" title="Assign teams"><IconEdit /></button>}
            <button onClick={() => del(u.id)} className="text-navy-400 hover:text-red-400 p-1.5 rounded hover:bg-navy-700 transition-colors"><IconTrash /></button>
          </div>
        </div>
        {editing && (
          <div className="mt-3 pt-3 border-t border-navy-700/50 space-y-3">
            <div>
              <label className="text-xs text-navy-400 mb-1 block">Role</label>
              <select value={u.role} onChange={e => setRole(u, e.target.value as UserRole)}>
                <option value="coach">Coach</option><option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-navy-400 mb-1.5 block">Assigned Teams</label>
              <div className="flex flex-wrap gap-1.5">
                {[...teams].sort((a,b) => teamLabel(a).localeCompare(teamLabel(b))).map(t => (
                  <button key={t.id} type="button" onClick={() => toggleTeam(t.id)}
                    className={`px-2.5 py-1 rounded text-xs font-display font-700 transition-all ${
                      draftTeamIds.includes(t.id) ? 'bg-cf-green text-navy-950' : 'bg-navy-700 text-navy-300 hover:bg-navy-600'
                    }`}>
                    {teamLabel(t)}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Btn variant="primary" size="sm" disabled={busy} onClick={() => saveTeams(u)}>Save Teams</Btn>
              <Btn variant="ghost" size="sm" onClick={() => setEditId(null)}>Done</Btn>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {pending.length > 0 && (
        <div className="space-y-2">
          <SectionTitle>Pending Approval</SectionTitle>
          {pending.map(u => <UserCard key={u.id} u={u} />)}
        </div>
      )}
      <div className="space-y-2">
        <SectionTitle>Users</SectionTitle>
        {active.length === 0
          ? <EmptyState icon="👤" message="No active users yet." />
          : active.map(u => <UserCard key={u.id} u={u} />)}
      </div>
    </div>
  )
}

// ─── Auth Modal ───────────────────────────────────────────────────────────────

function AuthModal({ onClose, onLogin }: {
  onClose: () => void; onLogin: (u: User) => void;
}) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleLogin(e: FormEvent) {
    e.preventDefault()
    setError(''); setBusy(true)
    try {
      const user = await api.login(email, password)
      onLogin(user); onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid email or password')
    } finally { setBusy(false) }
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault()
    setError(''); setNotice(''); setBusy(true)
    try {
      await api.register(firstName, lastName, email, password)
      setMode('login')
      setNotice('Account created. An admin must approve it before you can sign in.')
      setPassword('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create account')
    } finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/65 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-navy-800 w-full max-w-md rounded-t-2xl sm:rounded-2xl border border-navy-600/50 shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-navy-700">
          <h2 className="font-display text-xl font-800 tracking-wide text-navy-100">{mode === 'login' ? 'Sign In' : 'Create Account'}</h2>
          <button onClick={onClose} className="text-navy-400 hover:text-navy-100 transition-colors p-1 rounded hover:bg-navy-700"><IconX /></button>
        </div>

        <div className="flex mx-6 mt-4 mb-2 bg-navy-900 rounded-lg p-1">
          {(['login', 'register'] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setError(''); setNotice('') }}
              className={`flex-1 py-1.5 rounded-md font-display font-700 text-sm tracking-wide transition-all ${
                mode === m ? 'bg-cf-green text-navy-950' : 'text-navy-400 hover:text-navy-200'
              }`}>
              {m === 'login' ? 'Sign In' : 'Register'}
            </button>
          ))}
        </div>

        <div className="px-6 pb-6 overflow-y-auto max-h-[80vh]">
          {error && <p className="text-red-700 text-sm bg-red-500/10 rounded-lg px-3 py-2 mt-3 mb-1">{error}</p>}
          {notice && <p className="text-cf-green text-sm bg-cf-green/10 rounded-lg px-3 py-2 mt-3 mb-1">{notice}</p>}

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-3 mt-3">
              <div><label className="text-xs text-navy-400 mb-1 block">Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required /></div>
              <div><label className="text-xs text-navy-400 mb-1 block">Password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required /></div>
              <Btn type="submit" variant="primary" size="lg" className="w-full mt-1" disabled={busy}>{busy ? 'Signing in…' : 'Sign In'}</Btn>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-3 mt-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-navy-400 mb-1 block">First Name</label><input value={firstName} onChange={e => setFirstName(e.target.value)} required /></div>
                <div><label className="text-xs text-navy-400 mb-1 block">Last Name</label><input value={lastName} onChange={e => setLastName(e.target.value)} required /></div>
              </div>
              <div><label className="text-xs text-navy-400 mb-1 block">Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></div>
              <div><label className="text-xs text-navy-400 mb-1 block">Password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} required /></div>
              <p className="text-xs text-navy-500">New coach accounts need admin approval before first sign-in. Your teams are assigned by an admin.</p>
              <Btn type="submit" variant="primary" size="lg" className="w-full" disabled={busy}>{busy ? 'Creating…' : 'Create Account'}</Btn>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [teams,       setTeams]       = useState<Team[]>([])
  const [locations,   setLocations]   = useState<Location[]>([])
  const [fields,      setFields]      = useState<Field[]>([])
  const [slots,       setSlots]       = useState<SlotConfig[]>([])
  const [users,       setUsers]       = useState<User[]>([])
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [view,        setView]        = useState<View>('schedule')
  const [weekOffset,  setWeekOffset]  = useState(1)
  const [showAuth,    setShowAuth]    = useState(false)
  const [loading,     setLoading]     = useState(true)

  // Pull the public catalog (teams/locations/fields/slots) and the current session.
  async function loadBootstrap() {
    const data = await api.bootstrap()
    setTeams(data.teams)
    setLocations(data.locations)
    setFields(data.fields)
    setSlots(data.slots)
  }

  // Admin views need the full user list; only fetch it when signed in as admin.
  async function loadUsers() {
    try { setUsers(await api.adminList<User>('users')) } catch { /* non-admin: ignore */ }
  }

  useEffect(() => {
    (async () => {
      try {
        const [, u] = await Promise.all([loadBootstrap(), api.me()])
        setCurrentUser(u)
        if (u?.role === 'admin') await loadUsers()
      } catch (err) {
        reportError(err)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  async function refreshAdmin() {
    await loadBootstrap()
    await loadUsers()
  }

  async function handleLogin(u: User) {
    setCurrentUser(u)
    // Team assignments/roles may have changed since bootstrap; re-pull the catalog and (if admin) users.
    await loadBootstrap()
    if (u.role === 'admin') await loadUsers()
  }

  async function handleLogout() {
    try { await api.logout() } catch { /* ignore */ }
    setCurrentUser(null)
    setUsers([])
    setView('schedule')
  }

  async function handleReserve(slotId: string, teamId: string): Promise<string | null> {
    try {
      const slot = await api.reserve(slotId, teamId)
      setSlots(prev => prev.map(s => s.id === slotId ? slot : s))
      return null
    } catch (err) {
      return err instanceof Error ? err.message : 'Could not reserve this slot.'
    }
  }

  async function handleCancel(slotId: string, teamId: string): Promise<string | null> {
    try {
      const slot = await api.cancel(slotId, teamId)
      setSlots(prev => prev.map(s => s.id === slotId ? slot : s))
      return null
    } catch (err) {
      return err instanceof Error ? err.message : 'Could not cancel this reservation.'
    }
  }

  const isAdmin = currentUser?.role === 'admin'
  const isCoach = !!currentUser

  const navItems: { id: View; label: string; icon: ReactNode }[] = [
    { id: 'schedule', label: 'Schedule',  icon: <IconCalendar /> },
    { id: 'reserve',  label: 'Reserve',   icon: <IconField /> },
    { id: 'myfields', label: 'My Fields', icon: <IconClipboard /> },
    ...(isAdmin ? [{ id: 'admin' as View, label: 'Admin', icon: <IconSettings /> }] : []),
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-900 flex flex-col items-center justify-center gap-3">
        <img src="/assets/crossfire-select-logo.png" alt="Crossfire Select" className="h-12 w-auto animate-pulse" />
        <p className="text-navy-500 text-sm font-display tracking-wide">Loading…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-navy-900 flex flex-col max-w-2xl mx-auto">
      {/* Header */}
      <header className="sticky top-0 z-30 h-[60px] bg-navy-950 border-b border-navy-700/80 flex items-center px-4 gap-3 shadow-lg">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <img src="/assets/crossfire-select-logo.png" alt="Crossfire Select" className="h-8 w-auto flex-shrink-0" />
          <span className="font-display text-[9px] font-600 tracking-widest text-cf-green leading-none uppercase hidden sm:inline">Field Manager</span>
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
          <AdminView teams={teams} locations={locations} fields={fields} slots={slots} users={users} refresh={refreshAdmin} weekOffset={weekOffset} onWeekChange={setWeekOffset} />
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
        <AuthModal onClose={() => setShowAuth(false)} onLogin={handleLogin} />
      )}
    </div>
  )
}
