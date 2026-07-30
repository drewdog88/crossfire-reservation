import "leaflet/dist/leaflet.css"
import L from "leaflet"
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png"
import markerIcon from "leaflet/dist/images/marker-icon.png"
import markerShadow from "leaflet/dist/images/marker-shadow.png"
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet"

// Vite bundles Leaflet's marker images to hashed URLs; rebind the defaults so
// markers render instead of 404ing on Leaflet's built-in relative paths.
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

import { useState, useEffect, useMemo, useRef } from "react"
import type { ReactNode, FormEvent } from "react"
import {
  type Team,
  type Location,
  type Field,
  type SlotConfig,
  type User,
  type View,
  type AdminTab,
  type Gender,
  type FieldType,
  type Surface,
  type UserRole,
  teamLabel,
  dateToStr,
  getWeekDates,
  weekRangeLabel,
  formatDisplayDate,
  timeRangeLabel,
} from "./types"
import * as api from "./api"

// ─── Shared UI ───────────────────────────────────────────────────────────────

function Chip({
  children,
  color = "green",
}: {
  children: ReactNode
  color?: "green" | "amber" | "red" | "navy" | "blue" | "gray"
}) {
  const cls = {
    green: "bg-cf-green/12 text-cf-green border-cf-green/30",
    amber: "bg-amber-500/15 text-amber-700 border-amber-500/40",
    red: "bg-red-500/12 text-red-700 border-red-500/40",
    navy: "bg-navy-700 text-navy-300 border-navy-600",
    blue: "bg-blue-500/12 text-blue-700 border-blue-500/40",
    gray: "bg-slate-500/12 text-slate-600 border-slate-400/40",
  }[color]
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border font-display tracking-wide ${cls}`}
    >
      {children}
    </span>
  )
}

function Btn({
  children,
  onClick,
  variant = "primary",
  size = "md",
  disabled,
  type = "button",
  className = "",
}: {
  children: ReactNode
  onClick?: () => void
  variant?: "primary" | "secondary" | "ghost" | "danger"
  size?: "sm" | "md" | "lg"
  disabled?: boolean
  type?: "button" | "submit"
  className?: string
}) {
  const base =
    "inline-flex items-center justify-center font-display font-600 tracking-wide rounded-lg transition-all duration-150 cursor-pointer select-none"
  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2.5 text-base",
    lg: "px-6 py-3 text-lg",
  }
  const variants = {
    primary: "bg-cf-green text-navy-950 hover:bg-cf-green-dark active:scale-95",
    secondary:
      "bg-navy-700 text-navy-100 border border-navy-600 hover:bg-navy-600 active:scale-95",
    ghost:
      "text-navy-300 hover:text-navy-100 hover:bg-navy-700/50 active:scale-95",
    danger:
      "bg-red-500/12 text-red-700 border border-red-500/40 hover:bg-red-500/20 active:scale-95",
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${sizes[size]} ${variants[variant]} ${
        disabled ? "opacity-40 cursor-not-allowed" : ""
      } ${className}`}
    >
      {children}
    </button>
  )
}

function Card({
  children,
  className = "",
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`bg-navy-800 rounded-xl border border-navy-600/50 ${className}`}
    >
      {children}
    </div>
  )
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="font-display text-xl font-700 tracking-wide text-navy-100 mb-3">
      {children}
    </h2>
  )
}

function EmptyState({ icon, message }: { icon: string message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <span className="text-4xl">{icon}</span>
      <p className="text-navy-300 text-sm text-center max-w-xs">{message}</p>
    </div>
  )
}

function OccupancyBar({ filled, max }: { filled: number max: number }) {
  const pct = max > 0 ? Math.min(filled / max, 1) : 0
  const color = pct === 1 ? "#ef4444" : pct >= 0.5 ? "#f59e0b" : "#22c55e"
  return (
    <div className="h-1.5 bg-navy-600 rounded-full overflow-hidden w-full">
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{ width: `${pct * 100}%`, backgroundColor: color }}
      />
    </div>
  )
}

// ─── Icons ───────────────────────────────────────────────────────────────────

const IconCalendar = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    className="w-5 h-5"
  >
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
)
const IconField = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    className="w-5 h-5"
  >
    <rect x="2" y="5" width="20" height="14" rx="1" />
    <path d="M12 5v14M2 12h20M6 9v6M18 9v6" />
  </svg>
)
const IconClipboard = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    className="w-5 h-5"
  >
    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
    <rect x="9" y="3" width="6" height="4" rx="1" />
    <path d="M9 12h6M9 16h4" />
  </svg>
)
const IconSettings = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    className="w-5 h-5"
  >
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
)
const IconChevronLeft = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.5}
    className="w-5 h-5"
  >
    <path d="M15 18l-6-6 6-6" />
  </svg>
)
const IconChevronRight = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.5}
    className="w-5 h-5"
  >
    <path d="M9 18l6-6-6-6" />
  </svg>
)
const IconX = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    className="w-5 h-5"
  >
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
)
const IconTrash = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    className="w-4 h-4"
  >
    <path d="M3 6h18M19 6l-1 14H6L5 6M9 6V4h6v2" />
  </svg>
)
const IconEdit = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    className="w-4 h-4"
  >
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
)
const IconUser = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    className="w-5 h-5"
  >
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
)
const IconMap = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    className="w-5 h-5"
  >
    <path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
)
// Small pin sized to sit inline with a line of text (the field→map link).
const IconMapPin = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    className="w-3 h-3 flex-shrink-0"
  >
    <path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
)
const IconSearch = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    className="w-4 h-4"
  >
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.35-4.35" />
  </svg>
)

// ─── Week Navigator ───────────────────────────────────────────────────────────

function WeekNav({
  weekOffset,
  onChange,
}: {
  weekOffset: number
  onChange: (o: number) => void
}) {
  const dates = getWeekDates(weekOffset)
  return (
    <div className="flex items-center gap-2 px-4 py-3 bg-navy-800 sticky top-0 z-20 border-b border-navy-700">
      <button
        onClick={() => onChange(weekOffset - 1)}
        className="p-1.5 rounded-lg hover:bg-navy-700 text-navy-300 hover:text-navy-100 transition-colors"
      >
        <IconChevronLeft />
      </button>
      <div className="flex-1 text-center">
        <span className="font-display text-base font-600 tracking-wide text-navy-100">
          {weekRangeLabel(dates)}
        </span>
        {weekOffset === 0 && (
          <span className="ml-2 text-xs text-cf-green font-medium">
            This Week
          </span>
        )}
        {weekOffset === 1 && (
          <span className="ml-2 text-xs text-cf-amber font-medium">
            Next Week
          </span>
        )}
        {weekOffset < 0 && (
          <span className="ml-2 text-xs text-navy-400 font-medium">Past</span>
        )}
      </div>
      <button
        onClick={() => onChange(weekOffset + 1)}
        className="p-1.5 rounded-lg hover:bg-navy-700 text-navy-300 hover:text-navy-100 transition-colors"
      >
        <IconChevronRight />
      </button>
    </div>
  )
}

// Filter the schedule/reserve views by location. 'all' shows every location.
// Surface (Turf/Grass) is intentionally not a filter — it's informational only.
function LocationFilter({
  locations,
  value,
  onChange,
}: {
  locations: Location[]
  value: string
  onChange: (v: string) => void
}) {
  const pill = (active: boolean) =>
    `px-3 py-1.5 rounded-lg font-display text-sm font-600 tracking-wide whitespace-nowrap transition-all duration-150 ${
      active
        ? "bg-cf-green text-navy-950"
        : "bg-navy-700 text-navy-300 hover:bg-navy-600 hover:text-navy-100"
    }`
  return (
    <div className="flex gap-2 px-4 pt-3 pb-1 overflow-x-auto no-scrollbar">
      <button onClick={() => onChange("all")} className={pill(value === "all")}>
        All fields
      </button>
      {locations.map((l) => (
        <button
          key={l.id}
          onClick={() => onChange(l.id)}
          className={pill(value === l.id)}
        >
          {l.name}
        </button>
      ))}
    </div>
  )
}

// ─── Field Pitch Visual ───────────────────────────────────────────────────────

const GRASS: Record<FieldType, [string, string]> = {
  Turf: ["#14402c", "#1a5037"],
  Grass: ["#1a5220", "#205e27"],
}
// Surface may be unset; fall back to the neutral grass palette for the visual.
function grassColors(type: Surface): [string, string] {
  return type ? GRASS[type] : ["#1a5220", "#205e27"]
}
// Display label for an optional surface.
function surfaceLabel(type: Surface): string {
  return type ?? "Unknown"
}

// Height of the whole landscape pitch. A little taller when more teams share it
// so rotated column labels have room to breathe.
function pitchH(maxTeams: number) {
  if (maxTeams <= 2) return 150
  if (maxTeams <= 4) return 168
  return 184
}

// Sort slots by date, then start time, then field name — used by every schedule view
function compareSlots(fieldMap: Record<string, Field>) {
  return (a: SlotConfig, b: SlotConfig) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date)
    if (a.startTime !== b.startTime)
      return a.startTime.localeCompare(b.startTime)
    return (fieldMap[a.fieldId]?.name ?? "").localeCompare(
      fieldMap[b.fieldId]?.name ?? "",
    )
  }
}

function formatDayHeader(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  })
}

// Subtle field markings SVG overlay — landscape pitch: vertical halfway line,
// center circle, and penalty arcs bulging in from the left/right goal ends.
function FieldMarkingsSVG({
  totalH,
  fieldType,
}: {
  totalH: number
  fieldType: Surface
}) {
  const cy = totalH / 2
  const r = Math.min(totalH * 0.28, 48)
  return (
    <svg
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: totalH,
        opacity: fieldType === "Turf" ? 0.06 : 0.065,
        pointerEvents: "none",
      }}
      preserveAspectRatio="none"
    >
      {/* Halfway line (vertical) */}
      <line x1="50%" y1="0" x2="50%" y2={totalH} stroke="white" strokeWidth={1} />
      {/* Center circle */}
      <circle
        cx="50%"
        cy={cy}
        r={r}
        fill="none"
        stroke="white"
        strokeWidth={1.5}
      />
      <circle cx="50%" cy={cy} r={2.5} fill="white" />
      {/* Left penalty arc */}
      <path
        d={`M 14% ${cy - r} Q 26% ${cy} 14% ${cy + r}`}
        fill="none"
        stroke="white"
        strokeWidth={1}
      />
      {/* Right penalty arc */}
      <path
        d={`M 86% ${cy - r} Q 74% ${cy} 86% ${cy + r}`}
        fill="none"
        stroke="white"
        strokeWidth={1}
      />
    </svg>
  )
}

// One vertical column of the field — teams share the pitch as side-by-side
// sections (cone-marked strips), so labels rotate to read up the column when
// space is tight. `narrow` is true once the columns get thin (>3 sections).
function FieldColumn({
  team,
  isMyTeam,
  narrow,
  mode,
  canAct,
  onAct,
}: {
  team: Team | null
  isMyTeam: boolean
  narrow: boolean
  mode: "view" | "reserve"
  canAct: boolean
  onAct?: () => void
}) {
  const interactive = mode === "reserve" && !team && canAct

  if (team) {
    return (
      <div
        className="relative flex-1 flex items-center justify-center select-none min-w-0"
        style={{
          background: isMyTeam
            ? "linear-gradient(160deg, rgba(34,197,94,0.32) 0%, rgba(34,197,94,0.10) 100%)"
            : "rgba(0,0,0,0.36)",
        }}
      >
        <div
          className="flex flex-col items-center gap-2 px-2"
          style={
            narrow
              ? { writingMode: "vertical-rl", transform: "rotate(180deg)" }
              : undefined
          }
        >
          <span
            className="font-display font-800 drop-shadow-lg text-center leading-tight"
            style={{
              fontSize: narrow ? "1.05rem" : "1.35rem",
              color: isMyTeam ? "#bbf7d0" : "rgba(255,255,255,0.95)",
              letterSpacing: "0.08em",
            }}
          >
            {teamLabel(team)}
          </span>
          {isMyTeam && (
            <span className="text-[10px] font-display font-700 tracking-widest uppercase text-cf-green bg-cf-green/20 border border-cf-green/40 px-2 py-0.5 rounded whitespace-nowrap">
              YOURS
            </span>
          )}
        </div>
      </div>
    )
  }

  // Empty column
  return (
    <div
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={interactive ? onAct : undefined}
      onKeyDown={
        interactive ? (e) => e.key === "Enter" && onAct?.() : undefined
      }
      className={`relative flex-1 flex items-center justify-center min-w-0 transition-all duration-150 ${
        interactive
          ? "cursor-pointer hover:bg-white/10 active:bg-cf-green/15"
          : ""
      }`}
    >
      {interactive ? (
        <div
          className="flex items-center gap-2 border border-dashed border-white/60 rounded-lg px-3 py-2 transition-all duration-150 group hover:border-white hover:bg-white/15"
          style={
            narrow
              ? { writingMode: "vertical-rl", transform: "rotate(180deg)" }
              : undefined
          }
        >
          <svg
            className="w-4 h-4 shrink-0 text-white/85 group-hover:text-white transition-colors"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          <span className="font-display font-700 text-sm tracking-widest uppercase text-white/85 group-hover:text-white transition-colors whitespace-nowrap">
            Reserve
          </span>
        </div>
      ) : (
        <span
          className="font-display font-600 text-xs tracking-widest uppercase whitespace-nowrap"
          style={
            narrow
              ? {
                  color: "rgba(255,255,255,0.72)",
                  writingMode: "vertical-rl",
                  transform: "rotate(180deg)",
                }
              : { color: "rgba(255,255,255,0.72)" }
          }
        >
          Available
        </span>
      )}
    </div>
  )
}

// The complete field card for one SlotConfig
function FieldPitchCard({
  slot,
  field,
  location,
  teams,
  mode,
  myTeamIds,
  reservedDates,
  onReserve,
  onCancel,
  selectedTeamId,
  onShowMap,
  // Opens the Fields Map centered on this field's location. Present only when
  // the location has coordinates, so the line renders as a link.
}: {
  slot: SlotConfig
  field: Field
  location: Location | undefined
  teams: Team[]
  mode: "view" | "reserve"
  myTeamIds?: Set<string>
  reservedDates?: Set<string>
  onReserve?: (slotId: string) => void
  onCancel?: (slotId: string, teamId: string) => void
  selectedTeamId?: string
  onShowMap?: (locationId: string) => void
}) {
  const teamMap = Object.fromEntries(teams.map((t) => [t.id, t]))
  const filled = slot.reservedTeamIds.length
  const open = Math.max(0, slot.maxTeams - filled)
  const totalH = pitchH(slot.maxTeams)
  const narrow = slot.maxTeams > 3
  const [g1, g2] = grassColors(field.type)

  const myReservation = selectedTeamId
    ? slot.reservedTeamIds.includes(selectedTeamId)
    : false
  const dayBooked =
    selectedTeamId && reservedDates
      ? !myReservation && reservedDates.has(slot.date)
      : false
  const canAct = !myReservation && !dayBooked && open > 0

  // Build lane entries: filled slots first, then nulls for open spots
  const lanes = [
    ...slot.reservedTeamIds.map((id) => ({
      teamId: id,
      team: teamMap[id] ?? null,
    })),
    ...Array(open)
      .fill(null)
      .map(() => ({ teamId: null, team: null })),
  ]

  return (
    <div
      className="rounded-2xl overflow-hidden shadow-lg"
      style={{ border: "1px solid #e2e8f0" }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-start justify-between gap-2"
        style={{ background: "#ffffff", borderBottom: "1px solid #e2e8f0" }}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-display text-xl font-800 tracking-wide text-navy-100">
              {field.name}
            </span>
            <span
              className={`text-[10px] font-display font-700 px-2 py-0.5 rounded uppercase tracking-wider ${
                field.type === "Turf"
                  ? "bg-blue-500/12 text-blue-700 border border-blue-500/40"
                  : field.type === "Grass"
                    ? "bg-emerald-500/12 text-emerald-700 border border-emerald-500/40"
                    : "bg-slate-500/12 text-slate-600 border border-slate-400/40"
              }`}
            >
              {surfaceLabel(field.type)}
            </span>
          </div>
          {location &&
          onShowMap &&
          location.lat != null &&
          location.lon != null ? (
            <button
              type="button"
              onClick={() => onShowMap(location.id)}
              className="text-xs font-medium mt-0.5 text-cf-green hover:underline inline-flex items-center gap-1"
              title="View on the fields map"
            >
              <IconMapPin />
              {location.name}
              {location.city ? ` · ${location.city}` : ""}
            </button>
          ) : (
            <p
              className="text-xs font-medium mt-0.5"
              style={{ color: "#64748b" }}
            >
              {location?.name}
              {location?.city ? ` · ${location.city}` : ""}
            </p>
          )}
          <p className="text-xs font-display font-600 tracking-wide mt-0.5 text-cf-green">
            {timeRangeLabel(slot.startTime, slot.endTime)}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          {open === 0 ? (
            <div className="font-display text-xs font-800 tracking-widest text-red-600">
              FULL
            </div>
          ) : open === 1 ? (
            <div className="font-display text-xs font-800 tracking-widest text-amber-600">
              1 OPEN
            </div>
          ) : (
            <div className="font-display text-xs font-800 tracking-widest text-cf-green">
              {open} OPEN
            </div>
          )}
          <div
            className="font-display text-xs font-500 mt-0.5"
            style={{ color: "#94a3b8" }}
          >
            {filled}/{slot.maxTeams} spots
          </div>
          {myReservation && (
            <div className="text-[10px] text-cf-green font-display font-700 tracking-wide mt-0.5">
              ✓ RESERVED
            </div>
          )}
        </div>
      </div>

      {/* Grass field — landscape pitch split into vertical team columns */}
      <div
        className="relative"
        style={{
          height: totalH,
          background: `repeating-linear-gradient(90deg, ${g1} 0px, ${g1} 24px, ${g2} 24px, ${g2} 48px)`,
        }}
      >
        <FieldMarkingsSVG totalH={totalH} fieldType={field.type} />

        {/* Left goal line */}
        <div
          className="absolute left-0 top-4 bottom-4"
          style={{ width: 1.5, background: "rgba(255,255,255,0.28)" }}
        />
        {/* Right goal line */}
        <div
          className="absolute right-0 top-4 bottom-4"
          style={{ width: 1.5, background: "rgba(255,255,255,0.28)" }}
        />

        <div className="relative z-10 flex items-stretch h-full">
          {lanes.map((lane, i) => (
            <div key={i} className="flex-1 flex min-w-0">
              {i > 0 && (
                <div
                  className="w-0.5 self-stretch my-4 shrink-0"
                  style={{
                    background:
                      "repeating-linear-gradient(180deg, rgba(255,255,255,0.55) 0px, rgba(255,255,255,0.55) 16px, transparent 16px, transparent 30px)",
                  }}
                />
              )}
              <FieldColumn
                team={lane.team}
                narrow={narrow}
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
      {mode === "reserve" && (
        <div
          className="px-4 py-2.5 flex items-center justify-between"
          style={{ background: "#ffffff", borderTop: "1px solid #e2e8f0" }}
        >
          {myReservation ? (
            <>
              <span className="text-xs text-cf-green font-medium">
                {selectedTeamId && teamMap[selectedTeamId]
                  ? `${teamLabel(teamMap[selectedTeamId])} · reserved`
                  : "Reserved"}
              </span>
              <Btn
                variant="danger"
                size="sm"
                onClick={() => onCancel?.(slot.id, selectedTeamId!)}
              >
                Cancel
              </Btn>
            </>
          ) : dayBooked ? (
            <span className="text-xs text-amber-700">
              Already booked a field on this day
            </span>
          ) : open === 0 ? (
            <span className="text-xs text-red-700">
              All slots taken for this day
            </span>
          ) : (
            <span className="text-xs" style={{ color: "#64748b" }}>
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
  weekOffset,
  onWeekChange,
  teams,
  locations,
  fields,
  slots,
  onShowMap,
}: {
  weekOffset: number
  onWeekChange: (o: number) => void
  teams: Team[]
  locations: Location[]
  fields: Field[]
  slots: SlotConfig[]
  onShowMap: (locationId: string) => void
}) {
  const [locationId, setLocationId] = useState<string>("all")

  const weekDates = getWeekDates(weekOffset)
  const weekDateSet = new Set(weekDates.map(dateToStr))

  const fieldMap = Object.fromEntries(fields.map((f) => [f.id, f]))
  const locationMap = Object.fromEntries(locations.map((l) => [l.id, l]))

  const weekSlots = slots
    .filter(
      (s) =>
        weekDateSet.has(s.date) &&
        fieldMap[s.fieldId] &&
        (locationId === "all" ||
          fieldMap[s.fieldId]?.locationId === locationId),
    )
    .sort(compareSlots(fieldMap))

  const byDate: Record<string, SlotConfig[]> = {}
  weekSlots.forEach((s) => {
    if (!byDate[s.date]) byDate[s.date] = []
    byDate[s.date].push(s)
  })

  return (
    <div className="pb-24">
      <WeekNav weekOffset={weekOffset} onChange={onWeekChange} />
      <LocationFilter
        locations={locations}
        value={locationId}
        onChange={setLocationId}
      />

      <div className="px-4 space-y-4">
        {Object.keys(byDate).length === 0 ? (
          <EmptyState
            icon="📋"
            message="No fields scheduled for this week. Try a different week or location."
          />
        ) : (
          Object.entries(byDate).map(([date, dateSlots]) => (
            <div key={date}>
              <DayHeader dateStr={date} />
              <div className="space-y-4">
                {dateSlots.map((slot) => (
                  <FieldPitchCard
                    key={slot.id}
                    slot={slot}
                    field={fieldMap[slot.fieldId]!}
                    location={
                      locationMap[fieldMap[slot.fieldId]?.locationId ?? ""]
                    }
                    teams={teams}
                    mode="view"
                    onShowMap={onShowMap}
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

// ─── Team Selector ────────────────────────────────────────────────────────────

// Appends the coach name when two reservable teams share the same label, so the
// options in the final row stay distinguishable.
function disambiguatedLabel(team: Team, teams: Team[]): string {
  const label = teamLabel(team)
  const collides = teams.some((t) => t.id !== team.id && teamLabel(t) === label)
  return collides && team.coachName ? `${label} · ${team.coachName}` : label
}

// Chip that highlights green when active, matching the app's existing pill style.
function SelectorChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg font-display font-700 text-sm tracking-wide transition-all ${
        active
          ? "bg-cf-green text-navy-950"
          : "bg-navy-700 text-navy-300 hover:bg-navy-600"
      }`}
    >
      {children}
    </button>
  )
}

// Selects which team a reservation is for. A short list (coaches) renders as a
// single wrapping pill row; a large list (admin — every team) cascades
// Gender → Birth Year → Team so no option row is ever an unwieldy blob and no
// keyboard is needed. `selectedTeamId` remains the single source of truth; this
// is only a progressive way to set it.
function TeamSelector({
  teams,
  selectedTeamId,
  onSelect,
  label,
}: {
  teams: Team[]
  selectedTeamId: string
  onSelect: (id: string) => void
  label: string
}) {
  const selected = teams.find((t) => t.id === selectedTeamId) ?? null
  const useCascade = teams.length > 6

  // Genders present, in a stable Boys→Girls order.
  const genders = (["Boys", "Girls"] as Gender[]).filter((g) =>
    teams.some((t) => t.gender === g),
  )
  const activeGender = selected?.gender ?? genders[0]

  const years = Array.from(
    new Set(teams.filter((t) => t.gender === activeGender).map((t) => t.birthYear)),
  ).sort((a, b) => a - b)
  const activeYear = selected?.birthYear ?? years[0]

  const teamsForYear = teams
    .filter((t) => t.gender === activeGender && t.birthYear === activeYear)
    .sort((a, b) => teamLabel(a).localeCompare(teamLabel(b)))

  // When the gender/year changes, keep the current pick if it still fits that
  // group, otherwise fall to the first team so selectedTeamId is never stranded.
  function pickGender(g: Gender) {
    if (selected?.gender === g) return
    const firstYear = Array.from(
      new Set(teams.filter((t) => t.gender === g).map((t) => t.birthYear)),
    ).sort((a, b) => a - b)[0]
    const first = teams
      .filter((t) => t.gender === g && t.birthYear === firstYear)
      .sort((a, b) => teamLabel(a).localeCompare(teamLabel(b)))[0]
    if (first) onSelect(first.id)
  }

  function pickYear(y: number) {
    if (selected?.birthYear === y && selected?.gender === activeGender) return
    const first = teams
      .filter((t) => t.gender === activeGender && t.birthYear === y)
      .sort((a, b) => teamLabel(a).localeCompare(teamLabel(b)))[0]
    if (first) onSelect(first.id)
  }

  return (
    <div>
      <label className="text-[10px] text-navy-500 font-display font-700 uppercase tracking-widest mb-1.5 block">
        {label}
      </label>

      {!useCascade ? (
        <div className="flex gap-2 flex-wrap">
          {teams.map((t) => (
            <SelectorChip
              key={t.id}
              active={selectedTeamId === t.id}
              onClick={() => onSelect(t.id)}
            >
              {teamLabel(t)}
            </SelectorChip>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {genders.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-navy-500 font-display font-700 uppercase tracking-widest w-12 shrink-0">
                Gender
              </span>
              <div className="flex gap-2 flex-wrap">
                {genders.map((g) => (
                  <SelectorChip
                    key={g}
                    active={activeGender === g}
                    onClick={() => pickGender(g)}
                  >
                    {g}
                  </SelectorChip>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-navy-500 font-display font-700 uppercase tracking-widest w-12 shrink-0">
              Age
            </span>
            <div className="flex gap-2 flex-wrap">
              {years.map((y) => (
                <SelectorChip
                  key={y}
                  active={activeYear === y}
                  onClick={() => pickYear(y)}
                >
                  {y}
                </SelectorChip>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-navy-500 font-display font-700 uppercase tracking-widest w-12 shrink-0">
              Team
            </span>
            <div className="flex gap-2 flex-wrap">
              {teamsForYear.map((t) => (
                <SelectorChip
                  key={t.id}
                  active={selectedTeamId === t.id}
                  onClick={() => onSelect(t.id)}
                >
                  {disambiguatedLabel(t, teamsForYear)}
                </SelectorChip>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Reserve View ─────────────────────────────────────────────────────────────

function ReserveView({
  weekOffset,
  onWeekChange,
  currentUser,
  teams,
  locations,
  fields,
  slots,
  onReserve,
  onCancel,
  onShowMap,
}: {
  weekOffset: number
  onWeekChange: (o: number) => void
  currentUser: User
  teams: Team[]
  locations: Location[]
  fields: Field[]
  slots: SlotConfig[]
  onReserve: (slotId: string, teamId: string) => Promise<string | null>
  onCancel: (slotId: string, teamId: string) => Promise<string | null>
  onShowMap: (locationId: string) => void
}) {
  const [locationId, setLocationId] = useState<string>("all")
  const [toast, setToast] = useState<{ msg: string ok: boolean } | null>(null)

  const weekDates = getWeekDates(weekOffset)
  const weekDateSet = new Set(weekDates.map(dateToStr))
  const teamMap = Object.fromEntries(teams.map((t) => [t.id, t]))
  const fieldMap = Object.fromEntries(fields.map((f) => [f.id, f]))
  const locationMap = Object.fromEntries(locations.map((l) => [l.id, l]))
  // Admins may reserve on behalf of any team (the server authorizes this);
  // coaches are limited to the teams assigned to them.
  const reservableTeams =
    currentUser.role === "admin"
      ? [...teams].sort((a, b) => teamLabel(a).localeCompare(teamLabel(b)))
      : currentUser.teamIds.map((id) => teamMap[id]).filter(Boolean) as Team[]

  const [selectedTeamId, setSelectedTeamId] = useState(
    reservableTeams[0]?.id ?? "",
  )

  const weekReservations = slots.filter(
    (s) =>
      weekDateSet.has(s.date) && s.reservedTeamIds.includes(selectedTeamId),
  )
  const reservedDates = new Set(weekReservations.map((s) => s.date))
  const myTeamIds = new Set(currentUser.teamIds)

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  async function handleReserve(slotId: string) {
    const err = await onReserve(slotId, selectedTeamId)
    if (err) showToast(err, false)
    else showToast("Spot reserved! 🎉", true)
  }

  async function handleCancel(slotId: string, teamId: string) {
    const err = await onCancel(slotId, teamId)
    if (err) showToast(err, false)
    else showToast("Reservation cancelled.", true)
  }

  const weekSlots = slots
    .filter(
      (s) =>
        weekDateSet.has(s.date) &&
        fieldMap[s.fieldId] &&
        (locationId === "all" ||
          fieldMap[s.fieldId]?.locationId === locationId),
    )
    .sort(compareSlots(fieldMap))

  const byDate: Record<string, SlotConfig[]> = {}
  weekSlots.forEach((s) => {
    if (!byDate[s.date]) byDate[s.date] = []
    byDate[s.date].push(s)
  })

  if (reservableTeams.length === 0) {
    return (
      <div className="pb-24">
        <WeekNav weekOffset={weekOffset} onChange={onWeekChange} />
        <EmptyState
          icon="⚽"
          message="You have no teams assigned. Contact an admin to be assigned to a team."
        />
      </div>
    )
  }

  return (
    <div className="pb-24">
      <WeekNav weekOffset={weekOffset} onChange={onWeekChange} />

      {toast && (
        <div
          className={`fixed top-[120px] left-4 right-4 z-50 rounded-xl px-4 py-3 text-sm font-medium shadow-2xl transition-all ${
            toast.ok ? "bg-cf-green text-navy-950" : "bg-red-500 text-white"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Controls strip */}
      <div className="px-4 pt-3 pb-2 space-y-2">
        {reservableTeams.length > 1 && (
          <TeamSelector
            teams={reservableTeams}
            selectedTeamId={selectedTeamId}
            onSelect={setSelectedTeamId}
            label={
              currentUser.role === "admin"
                ? "Reserving for (admin — any team)"
                : "Reserving for"
            }
          />
        )}
      </div>

      <LocationFilter
        locations={locations}
        value={locationId}
        onChange={setLocationId}
      />

      <div className="px-4 space-y-4">
        {Object.keys(byDate).length === 0 ? (
          <EmptyState
            icon="📋"
            message="No fields available this week. Try a different week or location."
          />
        ) : (
          Object.entries(byDate).map(([date, dateSlots]) => (
            <div key={date}>
              <DayHeader dateStr={date} />
              <div className="space-y-4">
                {dateSlots.map((slot) => (
                  <FieldPitchCard
                    key={slot.id}
                    slot={slot}
                    field={fieldMap[slot.fieldId]!}
                    location={
                      locationMap[fieldMap[slot.fieldId]?.locationId ?? ""]
                    }
                    teams={teams}
                    mode="reserve"
                    myTeamIds={myTeamIds}
                    reservedDates={reservedDates}
                    selectedTeamId={selectedTeamId}
                    onReserve={handleReserve}
                    onCancel={handleCancel}
                    onShowMap={onShowMap}
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

type SortKey = "day" | "time" | "field" | "location" | "team"
type SortDir = "asc" | "desc"

// One flattened reservation row plus the pre-computed values every column sorts on.
interface ResRow {
  key: string
  slot: SlotConfig
  teamId: string
  day: string // YYYY-MM-DD (sorts chronologically as a string)
  time: string // HH:MM start
  field: string
  fieldType: Surface
  location: string
  team: string // display label
}

function MyFieldsView({
  weekOffset,
  onWeekChange,
  currentUser,
  teams,
  fields,
  locations,
  slots,
  onCancel,
  onMove,
}: {
  weekOffset: number
  onWeekChange: (o: number) => void
  currentUser: User
  teams: Team[]
  fields: Field[]
  locations: Location[]
  slots: SlotConfig[]
  onCancel: (slotId: string, teamId: string) => Promise<string | null>
  onMove: (
    slotId: string,
    teamId: string,
    newSlotId: string,
    newTeamId: string,
  ) => Promise<string | null>
}) {
  const weekDates = getWeekDates(weekOffset)
  const weekDateSet = new Set(weekDates.map(dateToStr))
  const fieldMap = Object.fromEntries(fields.map((f) => [f.id, f]))
  const locationMap = Object.fromEntries(locations.map((l) => [l.id, l]))
  const teamMap = Object.fromEntries(teams.map((t) => [t.id, t]))
  const isAdmin = currentUser.role === "admin"
  const myTeamIds = new Set(currentUser.teamIds)

  const [sortKey, setSortKey] = useState<SortKey>("day")
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState<ResRow | null>(null)

  // Teams this user may reserve for (admins: all; coaches: their own).
  const reservableTeams = (
    isAdmin ? teams : teams.filter((t) => myTeamIds.has(t.id))
  )
    .slice()
    .sort((a, b) => teamLabel(a).localeCompare(teamLabel(b)))

  // Flatten to one row per reservation (slot × team). Admins see every team's
  // bookings for the week; coaches see only their assigned teams'.
  const rows: ResRow[] = slots
    .filter((s) => weekDateSet.has(s.date) && fieldMap[s.fieldId])
    .flatMap((slot) =>
      slot.reservedTeamIds
        .filter((teamId) => isAdmin || myTeamIds.has(teamId))
        .map((teamId) => {
          const f = fieldMap[slot.fieldId]!
          const team = teamMap[teamId]
          return {
            key: `${slot.id}:${teamId}`,
            slot,
            teamId,
            day: slot.date,
            time: slot.startTime,
            field: f.name,
            fieldType: f.type,
            location: locationMap[f.locationId]?.name ?? "",
            team: team ? teamLabel(team) : teamId,
          }
        }),
    )

  // Sort by the active column; date/time always break ties for stable ordering.
  const sorted = rows.slice().sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1
    const primary =
      sortKey === "day"
        ? a.day.localeCompare(b.day) || a.time.localeCompare(b.time)
        : sortKey === "time"
          ? a.time.localeCompare(b.time) || a.day.localeCompare(b.day)
          : sortKey === "field"
            ? a.field.localeCompare(b.field)
            : sortKey === "location"
              ? a.location.localeCompare(b.location)
              : a.team.localeCompare(b.team)
    if (primary !== 0) return primary * dir
    // Tie-break deterministically so equal-key rows never jitter between renders.
    return (
      (a.day.localeCompare(b.day) ||
        a.time.localeCompare(b.time) ||
        a.key.localeCompare(b.key)) * dir
    )
  })

  const visibleKeys = sorted.map((r) => r.key)
  const allSelected =
    visibleKeys.length > 0 && visibleKeys.every((k) => selected.has(k))
  const selectedRows = sorted.filter((r) => selected.has(r.key))

  function toggleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    else {
      setSortKey(key)
      setSortDir("asc")
    }
  }
  function toggleRow(key: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }
  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(visibleKeys))
  }

  async function cancelOne(slotId: string, teamId: string) {
    if (!confirm("Cancel this reservation?")) return
    setBusy(true)
    try {
      const err = await onCancel(slotId, teamId)
      if (err) alert(err)
      else
        setSelected((prev) => {
          const next = new Set(prev)
          next.delete(`${slotId}:${teamId}`)
          return next
        })
    } finally {
      setBusy(false)
    }
  }

  async function bulkDelete() {
    if (selectedRows.length === 0) return
    if (
      !confirm(
        `Cancel ${selectedRows.length} reservation${
          selectedRows.length === 1 ? "" : "s"
        }?`,
      )
    )
      return
    setBusy(true)
    const failures: string[] = []
    try {
      for (const r of selectedRows) {
        const err = await onCancel(r.slot.id, r.teamId)
        if (err) failures.push(`${r.team}: ${err}`)
      }
    } finally {
      setBusy(false)
    }
    setSelected(new Set())
    if (failures.length > 0)
      alert(`Some cancellations failed:\n${failures.join("\n")}`)
  }

  const th =
    "px-3 py-2 font-display font-700 select-none cursor-pointer hover:text-navy-200"
  const arrow = (key: SortKey) =>
    sortKey === key ? (sortDir === "asc" ? " ▲" : " ▼") : ""

  return (
    <div className="pb-24">
      <WeekNav weekOffset={weekOffset} onChange={onWeekChange} />
      <div className="px-4 pt-3">
        <div className="flex items-center justify-between gap-3 mb-3">
          <SectionTitle>
            {isAdmin ? "All Reservations" : "My Reservations"}
          </SectionTitle>
          {selectedRows.length > 0 && (
            <Btn
              variant="danger"
              size="sm"
              disabled={busy}
              onClick={bulkDelete}
            >
              {busy ? "…" : `Delete selected (${selectedRows.length})`}
            </Btn>
          )}
        </div>
        {sorted.length === 0 ? (
          <EmptyState
            icon="🗓"
            message={
              isAdmin
                ? "No teams have reserved a field this week yet."
                : "No field reservations for this week. Go to Reserve to book a spot."
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-navy-700 bg-navy-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-navy-500 border-b border-navy-700">
                  <th className="px-3 py-2 w-8">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      aria-label="Select all"
                    />
                  </th>
                  <th className={th} onClick={() => toggleSort("day")}>
                    Day{arrow("day")}
                  </th>
                  <th className={th} onClick={() => toggleSort("time")}>
                    Time{arrow("time")}
                  </th>
                  <th className={th} onClick={() => toggleSort("field")}>
                    Field{arrow("field")}
                  </th>
                  <th className={th} onClick={() => toggleSort("location")}>
                    Location{arrow("location")}
                  </th>
                  <th className={th} onClick={() => toggleSort("team")}>
                    Team{arrow("team")}
                  </th>
                  <th className="px-3 py-2 font-display font-700 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r) => (
                  <tr
                    key={r.key}
                    className={`border-b border-navy-700/60 last:border-0 ${
                      selected.has(r.key) ? "bg-cf-green/5" : ""
                    }`}
                  >
                    <td className="px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={selected.has(r.key)}
                        onChange={() => toggleRow(r.key)}
                        aria-label={`Select ${r.team}`}
                      />
                    </td>
                    <td className="px-3 py-2.5 text-navy-200 whitespace-nowrap">
                      {formatDisplayDate(r.slot.date)}
                    </td>
                    <td className="px-3 py-2.5 text-navy-300 whitespace-nowrap">
                      {timeRangeLabel(r.slot.startTime, r.slot.endTime)}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className="text-navy-100 font-display font-600">
                        {r.field}
                      </span>
                      <span className="ml-1.5 text-[10px] uppercase tracking-wide text-navy-500">
                        {surfaceLabel(r.fieldType)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-navy-300 whitespace-nowrap">
                      {r.location || "—"}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className="font-display font-700 text-cf-green">
                        {r.team}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">
                      <div className="inline-flex gap-1.5">
                        <Btn
                          variant="secondary"
                          size="sm"
                          disabled={busy}
                          onClick={() => setEditing(r)}
                        >
                          Edit
                        </Btn>
                        <Btn
                          variant="danger"
                          size="sm"
                          disabled={busy}
                          onClick={() => cancelOne(r.slot.id, r.teamId)}
                        >
                          Cancel
                        </Btn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {editing && (
        <EditReservationModal
          row={editing}
          teams={reservableTeams}
          fields={fields}
          locations={locations}
          slots={slots}
          onMove={onMove}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

// Modal to move a reservation to a different team and/or slot. The slot select
// carries day/time/field/location together (a slot IS that combination), so
// changing it reschedules across any of those dimensions at once. All fairness
// rules are re-checked server-side; failures surface inline.
function EditReservationModal({
  row,
  teams,
  fields,
  locations,
  slots,
  onMove,
  onClose,
}: {
  row: ResRow
  teams: Team[]
  fields: Field[]
  locations: Location[]
  slots: SlotConfig[]
  onMove: (
    slotId: string,
    teamId: string,
    newSlotId: string,
    newTeamId: string,
  ) => Promise<string | null>
  onClose: () => void
}) {
  const fieldMap = Object.fromEntries(fields.map((f) => [f.id, f]))
  const locationMap = Object.fromEntries(locations.map((l) => [l.id, l]))
  const [teamId, setTeamId] = useState(row.teamId)
  const [slotId, setSlotId] = useState(row.slot.id)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  // Selectable slots: the current one, plus any slot with an open spot. Sorted
  // chronologically. Full slots (other than the current) are omitted since a
  // move there can't succeed anyway.
  const slotOptions = slots
    .filter((s) => fieldMap[s.fieldId])
    .filter(
      (s) => s.id === row.slot.id || s.reservedTeamIds.length < s.maxTeams,
    )
    .sort(compareSlots(fieldMap))

  function slotLabel(s: SlotConfig): string {
    const f = fieldMap[s.fieldId]!
    const loc = locationMap[f.locationId]
    const open = Math.max(0, s.maxTeams - s.reservedTeamIds.length)
    const tag =
      s.id === row.slot.id
        ? " (current)"
        : open === 0
          ? " (full)"
          : ` · ${open} open`
    return `${formatDisplayDate(s.date)} · ${timeRangeLabel(s.startTime, s.endTime)} — ${f.name}, ${loc?.name ?? "—"}${tag}`
  }

  const changed = teamId !== row.teamId || slotId !== row.slot.id

  async function save() {
    if (!changed) {
      onClose()
      return
    }
    setBusy(true)
    setError("")
    const err = await onMove(row.slot.id, row.teamId, slotId, teamId)
    setBusy(false)
    if (err) setError(err)
    else onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/65 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-navy-800 w-full max-w-md rounded-t-2xl sm:rounded-2xl border border-navy-600/50 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-navy-700">
          <h2 className="font-display text-xl font-800 tracking-wide text-navy-100">
            Edit Reservation
          </h2>
          <button
            onClick={onClose}
            className="text-navy-400 hover:text-navy-100 transition-colors p-1 rounded hover:bg-navy-700"
          >
            <IconX />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {error && (
            <p className="text-red-700 text-sm bg-red-500/10 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <div>
            <label className="text-xs text-navy-400 mb-1 block">Team</label>
            <select value={teamId} onChange={(e) => setTeamId(e.target.value)}>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {teamLabel(t)}
                  {t.coachName ? ` — ${t.coachName}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-navy-400 mb-1 block">
              Day · Time · Field · Location
            </label>
            <select value={slotId} onChange={(e) => setSlotId(e.target.value)}>
              {slotOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {slotLabel(s)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Btn variant="ghost" size="sm" onClick={onClose} disabled={busy}>
              Cancel
            </Btn>
            <Btn
              variant="primary"
              size="sm"
              onClick={save}
              disabled={busy || !changed}
            >
              {busy ? "Saving…" : "Save changes"}
            </Btn>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Admin View ───────────────────────────────────────────────────────────────

function AdminView({
  teams,
  locations,
  fields,
  slots,
  users,
  refresh,
  weekOffset,
  onWeekChange,
}: {
  teams: Team[]
  locations: Location[]
  fields: Field[]
  slots: SlotConfig[]
  users: User[]
  refresh: () => Promise<void>
  weekOffset: number
  onWeekChange: (o: number) => void
}) {
  const [tab, setTab] = useState<AdminTab>("teams")
  const tabs: { id: AdminTab label: string }[] = [
    { id: "teams", label: "Teams" },
    { id: "locations", label: "Locations" },
    { id: "fields", label: "Fields" },
    { id: "slots", label: "Slots" },
    { id: "users", label: "Users" },
  ]
  const pending = users.filter((u) => u.status === "pending").length

  return (
    <div className="pb-24">
      <div className="sticky top-0 z-20 bg-navy-900 border-b border-navy-700">
        <div className="flex overflow-x-auto px-2 py-2 gap-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative flex-shrink-0 px-4 py-1.5 rounded-lg font-display font-700 text-sm tracking-wide transition-all whitespace-nowrap ${
                tab === t.id
                  ? "bg-cf-green text-navy-950"
                  : "text-navy-400 hover:text-navy-200 hover:bg-navy-700"
              }`}
            >
              {t.label}
              {t.id === "users" && pending > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-navy-950 text-[10px] font-800">
                  {pending}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
      <div className="px-4 pt-4">
        {tab === "teams" && <AdminTeams teams={teams} refresh={refresh} />}
        {tab === "locations" && (
          <AdminLocations locations={locations} refresh={refresh} />
        )}
        {tab === "fields" && (
          <AdminFields
            fields={fields}
            locations={locations}
            refresh={refresh}
          />
        )}
        {tab === "slots" && (
          <AdminSlots
            slots={slots}
            fields={fields}
            locations={locations}
            weekOffset={weekOffset}
            onWeekChange={onWeekChange}
            teams={teams}
            refresh={refresh}
          />
        )}
        {tab === "users" && (
          <AdminUsers users={users} teams={teams} refresh={refresh} />
        )}
      </div>
    </div>
  )
}

// Surface a failed admin mutation without a fragile inline toast — a plain alert is enough for MVP.
function reportError(err: unknown) {
  alert(err instanceof Error ? err.message : "Something went wrong.")
}

function AdminTeams({
  teams,
  refresh,
}: {
  teams: Team[]
  refresh: () => Promise<void>
}) {
  const [form, setForm] = useState<{
    gender: Gender
    birthYear?: number
    level: string
    coachName: string
  }>({ gender: "Boys", level: "A", coachName: "" })
  const [editId, setEditId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!form.gender || !form.birthYear || !form.level) return
    setBusy(true)
    try {
      const body = {
        gender: form.gender,
        birthYear: form.birthYear,
        level: form.level,
        coachName: form.coachName.trim() || null,
      }
      if (editId) await api.adminUpdate("teams", { id: editId, ...body })
      else await api.adminCreate("teams", body)
      await refresh()
      setEditId(null)
      setForm({ gender: "Boys", level: "A", coachName: "" })
    } catch (err) {
      reportError(err)
    } finally {
      setBusy(false)
    }
  }

  function startEdit(t: Team) {
    setEditId(t.id)
    setForm({
      gender: t.gender,
      birthYear: t.birthYear,
      level: t.level,
      coachName: t.coachName ?? "",
    })
  }
  async function onDelete(id: string) {
    if (!confirm("Delete this team? Its reservations will be removed.")) return
    try {
      await api.adminDelete("teams", id)
      await refresh()
    } catch (err) {
      reportError(err)
    }
  }

  return (
    <div className="space-y-4">
      <SectionTitle>Manage Teams</SectionTitle>
      <Card className="p-4">
        <h4 className="font-display text-base font-600 text-navy-200 mb-3">
          {editId ? "Edit Team" : "Add Team"}
        </h4>
        <form onSubmit={save} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-navy-400 mb-1 block">Gender</label>
              <select
                value={form.gender}
                onChange={(e) =>
                  setForm((p) => ({ ...p, gender: e.target.value as Gender }))
                }
              >
                <option>Boys</option>
                <option>Girls</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-navy-400 mb-1 block">
                Birth Year
              </label>
              <input
                type="number"
                min={2005}
                max={2020}
                placeholder="e.g. 2012"
                value={form.birthYear ?? ""}
                onChange={(e) =>
                  setForm((p) => ({ ...p, birthYear: Number(e.target.value) }))
                }
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-navy-400 mb-1 block">Level</label>
              <input
                placeholder="e.g. A, B, 8th Graders"
                value={form.level}
                onChange={(e) =>
                  setForm((p) => ({ ...p, level: e.target.value }))
                }
                required
              />
            </div>
            <div>
              <label className="text-xs text-navy-400 mb-1 block">
                Coach (optional)
              </label>
              <input
                placeholder="e.g. Nancy"
                value={form.coachName}
                onChange={(e) =>
                  setForm((p) => ({ ...p, coachName: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Btn type="submit" variant="primary" size="sm" disabled={busy}>
              {editId ? "Update" : "Add Team"}
            </Btn>
            {editId && (
              <Btn
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditId(null)
                  setForm({ gender: "Boys", level: "A", coachName: "" })
                }}
              >
                Cancel
              </Btn>
            )}
          </div>
        </form>
      </Card>
      <div className="space-y-2">
        {[...teams]
          .sort((a, b) => teamLabel(a).localeCompare(teamLabel(b)))
          .map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between bg-navy-800 rounded-lg px-4 py-3 border border-navy-700/50"
            >
              <div>
                <span className="font-display text-base font-700 text-navy-100">
                  {teamLabel(t)}
                </span>
                {t.coachName && (
                  <span className="text-xs text-navy-400 ml-2">
                    Coach {t.coachName}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => startEdit(t)}
                  className="text-navy-400 hover:text-navy-100 p-1.5 rounded hover:bg-navy-700 transition-colors"
                >
                  <IconEdit />
                </button>
                <button
                  onClick={() => onDelete(t.id)}
                  className="text-navy-400 hover:text-red-400 p-1.5 rounded hover:bg-navy-700 transition-colors"
                >
                  <IconTrash />
                </button>
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}

function AdminLocations({
  locations,
  refresh,
}: {
  locations: Location[]
  refresh: () => Promise<void>
}) {
  const [form, setForm] = useState({
    name: "",
    city: "",
    address: "",
    lat: "",
    lon: "",
  })
  const [editId, setEditId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [geoBusy, setGeoBusy] = useState(false)
  const [geoErr, setGeoErr] = useState<string | null>(null)

  function resetForm() {
    setForm({ name: "", city: "", address: "", lat: "", lon: "" })
  }

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    // Validate coordinates before saving: a non-numeric or out-of-range entry
    // would otherwise store NaN and silently make the location unmappable.
    const lat = form.lat.trim() === "" ? null : Number(form.lat)
    const lon = form.lon.trim() === "" ? null : Number(form.lon)
    if (lat !== null && (!Number.isFinite(lat) || lat < -90 || lat > 90)) {
      reportError(new Error("Latitude must be a number between -90 and 90."))
      return
    }
    if (lon !== null && (!Number.isFinite(lon) || lon < -180 || lon > 180)) {
      reportError(new Error("Longitude must be a number between -180 and 180."))
      return
    }
    setBusy(true)
    try {
      const body = {
        name: form.name.trim(),
        city: form.city.trim() || null,
        address: form.address.trim() || null,
        lat,
        lon,
      }
      if (editId) await api.adminUpdate("locations", { id: editId, ...body })
      else await api.adminCreate("locations", body)
      await refresh()
      setEditId(null)
      resetForm()
    } catch (err) {
      reportError(err)
    } finally {
      setBusy(false)
    }
  }

  // Resolve using the address if present, otherwise fall back to name + city.
  const canGeocode =
    form.address.trim() !== "" ||
    (form.name.trim() !== "" && form.city.trim() !== "")
  async function geocode() {
    if (!canGeocode) return
    setGeoBusy(true)
    setGeoErr(null)
    try {
      const { lat, lon } = await api.geocodeAddress({
        address: form.address.trim(),
        name: form.name.trim(),
        city: form.city.trim(),
      })
      setForm((p) => ({ ...p, lat: String(lat), lon: String(lon) }))
    } catch (err) {
      setGeoErr(
        err instanceof Error
          ? err.message
          : "Could not resolve. Enter coordinates manually.",
      )
    } finally {
      setGeoBusy(false)
    }
  }

  function startEdit(l: Location) {
    setEditId(l.id)
    setForm({
      name: l.name,
      city: l.city ?? "",
      address: l.address ?? "",
      lat: l.lat == null ? "" : String(l.lat),
      lon: l.lon == null ? "" : String(l.lon),
    })
  }
  async function onDelete(id: string) {
    if (!confirm("Delete this location? Its fields and slots will be removed."))
      return
    try {
      await api.adminDelete("locations", id)
      await refresh()
    } catch (err) {
      reportError(err)
    }
  }

  return (
    <div className="space-y-4">
      <SectionTitle>Manage Locations</SectionTitle>
      <Card className="p-4">
        <h4 className="font-display text-base font-600 text-navy-200 mb-3">
          {editId ? "Edit Location" : "Add Location"}
        </h4>
        <form onSubmit={save} className="space-y-3">
          <div>
            <label className="text-xs text-navy-400 mb-1 block">Name</label>
            <input
              placeholder="e.g. 60 Acres"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="text-xs text-navy-400 mb-1 block">City</label>
            <input
              placeholder="e.g. Redmond, WA"
              value={form.city}
              onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs text-navy-400 mb-1 block">Address</label>
            <input
              placeholder="e.g. 17500 NE 76th St, Redmond, WA 98052"
              value={form.address}
              onChange={(e) =>
                setForm((p) => ({ ...p, address: e.target.value }))
              }
            />
          </div>
          <div className="flex items-end gap-2">
            <Btn
              variant="ghost"
              size="sm"
              disabled={geoBusy || !canGeocode}
              onClick={geocode}
            >
              {geoBusy ? "Resolving…" : "Resolve Location"}
            </Btn>
          </div>
          {geoErr && <p className="text-red-500 text-xs">{geoErr}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-navy-400 mb-1 block">
                Latitude
              </label>
              <input
                placeholder="47.7061"
                value={form.lat}
                onChange={(e) =>
                  setForm((p) => ({ ...p, lat: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="text-xs text-navy-400 mb-1 block">
                Longitude
              </label>
              <input
                placeholder="-122.1394"
                value={form.lon}
                onChange={(e) =>
                  setForm((p) => ({ ...p, lon: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Btn type="submit" variant="primary" size="sm" disabled={busy}>
              {editId ? "Update" : "Add Location"}
            </Btn>
            {editId && (
              <Btn
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditId(null)
                  resetForm()
                }}
              >
                Cancel
              </Btn>
            )}
          </div>
        </form>
      </Card>
      <div className="space-y-2">
        {locations.map((l) => (
          <div
            key={l.id}
            className="flex items-center justify-between bg-navy-800 rounded-lg px-4 py-3 border border-navy-700/50"
          >
            <div>
              <p className="font-display font-600 text-navy-100">{l.name}</p>
              <p className="text-xs text-navy-400">
                {l.city}
                {l.lat != null && l.lon != null ? " · 📍 mapped" : ""}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => startEdit(l)}
                className="text-navy-400 hover:text-navy-100 p-1.5 rounded hover:bg-navy-700 transition-colors"
              >
                <IconEdit />
              </button>
              <button
                onClick={() => onDelete(l.id)}
                className="text-navy-400 hover:text-red-400 p-1.5 rounded hover:bg-navy-700 transition-colors"
              >
                <IconTrash />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AdminFields({
  fields,
  locations,
  refresh,
}: {
  fields: Field[]
  locations: Location[]
  refresh: () => Promise<void>
}) {
  const [form, setForm] = useState({
    locationId: locations[0]?.id ?? "",
    name: "",
    type: null as Surface,
  })
  const [editId, setEditId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.locationId) return
    setBusy(true)
    try {
      const body = {
        locationId: form.locationId,
        name: form.name.trim(),
        type: form.type,
      }
      if (editId) await api.adminUpdate("fields", { id: editId, ...body })
      else await api.adminCreate("fields", body)
      await refresh()
      setEditId(null)
      setForm({ locationId: locations[0]?.id ?? "", name: "", type: null })
    } catch (err) {
      reportError(err)
    } finally {
      setBusy(false)
    }
  }

  function startEdit(f: Field) {
    setEditId(f.id)
    setForm({ locationId: f.locationId, name: f.name, type: f.type })
  }
  async function onDelete(id: string) {
    if (!confirm("Delete this field? Its slots will be removed.")) return
    try {
      await api.adminDelete("fields", id)
      await refresh()
    } catch (err) {
      reportError(err)
    }
  }

  const locationMap = Object.fromEntries(locations.map((l) => [l.id, l]))

  return (
    <div className="space-y-4">
      <SectionTitle>Manage Fields</SectionTitle>
      <Card className="p-4">
        <h4 className="font-display text-base font-600 text-navy-200 mb-3">
          {editId ? "Edit Field" : "Add Field"}
        </h4>
        <form onSubmit={save} className="space-y-3">
          <div>
            <label className="text-xs text-navy-400 mb-1 block">Location</label>
            <select
              value={form.locationId}
              onChange={(e) =>
                setForm((p) => ({ ...p, locationId: e.target.value }))
              }
            >
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-navy-400 mb-1 block">
                Field Name
              </label>
              <input
                placeholder="e.g. Field 4"
                value={form.name}
                onChange={(e) =>
                  setForm((p) => ({ ...p, name: e.target.value }))
                }
                required
              />
            </div>
            <div>
              <label className="text-xs text-navy-400 mb-1 block">
                Surface
              </label>
              <select
                value={form.type ?? ""}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    type: (e.target.value || null) as Surface,
                  }))
                }
              >
                <option value="">Unknown</option>
                <option value="Turf">Turf</option>
                <option value="Grass">Grass</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <Btn type="submit" variant="primary" size="sm" disabled={busy}>
              {editId ? "Update" : "Add Field"}
            </Btn>
            {editId && (
              <Btn
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditId(null)
                  setForm({
                    locationId: locations[0]?.id ?? "",
                    name: "",
                    type: null,
                  })
                }}
              >
                Cancel
              </Btn>
            )}
          </div>
        </form>
      </Card>
      <div className="space-y-2">
        {fields.map((f) => {
          const loc = locationMap[f.locationId]
          return (
            <div
              key={f.id}
              className="flex items-center justify-between bg-navy-800 rounded-lg px-4 py-3 border border-navy-700/50"
            >
              <div>
                <p className="font-display font-600 text-navy-100">{f.name}</p>
                <p className="text-xs text-navy-400 flex items-center gap-1.5">
                  {loc?.name}{" "}
                  <Chip
                    color={
                      f.type === "Turf"
                        ? "blue"
                        : f.type === "Grass"
                          ? "green"
                          : "gray"
                    }
                  >
                    {surfaceLabel(f.type)}
                  </Chip>
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => startEdit(f)}
                  className="text-navy-400 hover:text-navy-100 p-1.5 rounded hover:bg-navy-700 transition-colors"
                >
                  <IconEdit />
                </button>
                <button
                  onClick={() => onDelete(f.id)}
                  className="text-navy-400 hover:text-red-400 p-1.5 rounded hover:bg-navy-700 transition-colors"
                >
                  <IconTrash />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AdminSlots({
  slots,
  fields,
  locations,
  weekOffset,
  onWeekChange,
  teams,
  refresh,
}: {
  slots: SlotConfig[]
  fields: Field[]
  locations: Location[]
  weekOffset: number
  onWeekChange: (o: number) => void
  teams: Team[]
  refresh: () => Promise<void>
}) {
  const [form, setForm] = useState({
    fieldId: fields[0]?.id ?? "",
    date: "",
    startTime: "17:30",
    endTime: "19:00",
    maxTeams: 4,
  })

  const weekDates = getWeekDates(weekOffset)
  const weekDateSet = new Set(weekDates.map(dateToStr))
  const fieldMap = Object.fromEntries(fields.map((f) => [f.id, f]))
  const locationMap = Object.fromEntries(locations.map((l) => [l.id, l]))
  const teamMap = Object.fromEntries(teams.map((t) => [t.id, t]))

  const weekSlots = slots
    .filter((s) => weekDateSet.has(s.date) && fieldMap[s.fieldId])
    .sort(compareSlots(fieldMap))

  async function addSlot(e: FormEvent) {
    e.preventDefault()
    if (!form.fieldId || !form.date || !form.startTime || !form.endTime) return
    if (form.endTime <= form.startTime) {
      alert("End time must be after start time.")
      return
    }
    const dup = slots.find(
      (s) =>
        s.fieldId === form.fieldId &&
        s.date === form.date &&
        s.startTime === form.startTime,
    )
    if (dup) {
      alert("A slot for this field, date, and start time already exists.")
      return
    }
    try {
      await api.adminCreate("slots", {
        fieldId: form.fieldId,
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        maxTeams: form.maxTeams,
      })
      await refresh()
      setForm((p) => ({ ...p, date: "" }))
    } catch (err) {
      reportError(err)
    }
  }

  async function delSlot(id: string) {
    if (!confirm("Delete this slot? Its reservations will be removed.")) return
    try {
      await api.adminDelete("slots", id)
      await refresh()
    } catch (err) {
      reportError(err)
    }
  }

  async function updateMax(slot: SlotConfig, val: number) {
    // Floor cannot drop below teams already reserved, or the schedule views crash on a negative "open" count
    const floor = Math.max(1, slot.reservedTeamIds.length)
    const maxTeams = Math.max(floor, Math.min(8, val))
    if (maxTeams === slot.maxTeams) return
    try {
      await api.adminUpdate("slots", {
        id: slot.id,
        fieldId: slot.fieldId,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        maxTeams,
      })
      await refresh()
    } catch (err) {
      reportError(err)
    }
  }

  // Admin overrides go through the reservations endpoint (admins may act on any team).
  async function removeTeam(slotId: string, teamId: string) {
    try {
      await api.cancel(slotId, teamId)
      await refresh()
    } catch (err) {
      reportError(err)
    }
  }
  async function addTeam(slotId: string, teamId: string) {
    try {
      await api.reserve(slotId, teamId)
      await refresh()
    } catch (err) {
      reportError(err)
    }
  }

  return (
    <div className="space-y-4">
      <SectionTitle>Weekly Slots</SectionTitle>
      <WeekNav weekOffset={weekOffset} onChange={onWeekChange} />

      <Card className="p-4">
        <h4 className="font-display text-base font-600 text-navy-200 mb-3">
          Add Slot
        </h4>
        <form onSubmit={addSlot} className="space-y-3">
          <div>
            <label className="text-xs text-navy-400 mb-1 block">Field</label>
            <select
              value={form.fieldId}
              onChange={(e) =>
                setForm((p) => ({ ...p, fieldId: e.target.value }))
              }
            >
              {fields.map((f) => {
                const loc = locationMap[f.locationId]
                return (
                  <option key={f.id} value={f.id}>
                    {loc?.name} — {f.name}
                  </option>
                )
              })}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-navy-400 mb-1 block">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) =>
                  setForm((p) => ({ ...p, date: e.target.value }))
                }
                required
              />
            </div>
            <div>
              <label className="text-xs text-navy-400 mb-1 block">
                Max Teams (1–8)
              </label>
              <input
                type="number"
                min={1}
                max={8}
                value={form.maxTeams}
                onChange={(e) =>
                  setForm((p) => ({ ...p, maxTeams: Number(e.target.value) }))
                }
              />
            </div>
            <div>
              <label className="text-xs text-navy-400 mb-1 block">
                Start Time
              </label>
              <input
                type="time"
                value={form.startTime}
                onChange={(e) =>
                  setForm((p) => ({ ...p, startTime: e.target.value }))
                }
                required
              />
            </div>
            <div>
              <label className="text-xs text-navy-400 mb-1 block">
                End Time
              </label>
              <input
                type="time"
                value={form.endTime}
                onChange={(e) =>
                  setForm((p) => ({ ...p, endTime: e.target.value }))
                }
                required
              />
            </div>
          </div>
          <Btn type="submit" variant="primary" size="sm">
            Add Slot
          </Btn>
        </form>
      </Card>

      {weekSlots.length === 0 ? (
        <EmptyState
          icon="📅"
          message="No slots configured for this week. Add slots above."
        />
      ) : (
        <div className="space-y-3">
          {weekSlots.map((slot) => {
            const field = fieldMap[slot.fieldId]
            const loc = field ? locationMap[field.locationId] : null
            const avail = teams.filter(
              (t) => !slot.reservedTeamIds.includes(t.id),
            )
            return (
              <Card key={slot.id} className="overflow-hidden">
                <div className="px-4 py-3 border-b border-navy-700/50 flex items-start justify-between gap-2">
                  <div>
                    <p className="font-display font-700 text-navy-100">
                      {loc?.name} · {field?.name}
                    </p>
                    <p className="text-xs text-navy-400 mt-0.5">
                      {formatDisplayDate(slot.date)} ·{" "}
                      {timeRangeLabel(slot.startTime, slot.endTime)}
                    </p>
                  </div>
                  <button
                    onClick={() => delSlot(slot.id)}
                    className="text-navy-500 hover:text-red-400 p-1.5 rounded hover:bg-navy-700 transition-colors flex-shrink-0"
                  >
                    <IconTrash />
                  </button>
                </div>
                <div className="px-4 py-3 space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-navy-400 w-20 flex-shrink-0">
                      Max Teams:
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateMax(slot, slot.maxTeams - 1)}
                        className="w-7 h-7 rounded bg-navy-700 text-navy-200 flex items-center justify-center hover:bg-navy-600 transition-colors font-bold"
                      >
                        −
                      </button>
                      <span className="font-display font-700 text-navy-100 w-4 text-center">
                        {slot.maxTeams}
                      </span>
                      <button
                        onClick={() => updateMax(slot, slot.maxTeams + 1)}
                        className="w-7 h-7 rounded bg-navy-700 text-navy-200 flex items-center justify-center hover:bg-navy-600 transition-colors font-bold"
                      >
                        +
                      </button>
                    </div>
                    <div className="flex-1">
                      <OccupancyBar
                        filled={slot.reservedTeamIds.length}
                        max={slot.maxTeams}
                      />
                    </div>
                    <span className="text-xs text-navy-400 flex-shrink-0">
                      {slot.reservedTeamIds.length}/{slot.maxTeams}
                    </span>
                  </div>

                  {slot.reservedTeamIds.length > 0 && (
                    <div>
                      <p className="text-xs text-navy-500 mb-1.5">Reserved</p>
                      <div className="flex flex-wrap gap-1.5">
                        {slot.reservedTeamIds.map((tid) => {
                          const t = teamMap[tid]
                          return t ? (
                            <span
                              key={tid}
                              className="flex items-center gap-1 text-xs bg-navy-700 text-navy-200 pl-2 pr-1 py-0.5 rounded"
                            >
                              {teamLabel(t)}
                              <button
                                onClick={() => removeTeam(slot.id, tid)}
                                className="ml-0.5 text-navy-400 hover:text-red-400 transition-colors"
                              >
                                <IconX />
                              </button>
                            </span>
                          ) : null
                        })}
                      </div>
                    </div>
                  )}

                  {slot.reservedTeamIds.length < slot.maxTeams &&
                    avail.length > 0 && (
                      <div className="flex gap-2">
                        <select
                          id={`add-${slot.id}`}
                          className="text-sm py-1.5 flex-1"
                          defaultValue=""
                        >
                          <option value="" disabled>
                            Add team override…
                          </option>
                          {avail.map((t) => (
                            <option key={t.id} value={t.id}>
                              {teamLabel(t)}
                            </option>
                          ))}
                        </select>
                        <Btn
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            const sel = document.getElementById(
                              `add-${slot.id}`,
                            ) as HTMLSelectElement
                            if (sel?.value) {
                              addTeam(slot.id, sel.value)
                              sel.value = ""
                            }
                          }}
                        >
                          Add
                        </Btn>
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

function AdminUsers({
  users,
  teams,
  refresh,
}: {
  users: User[]
  teams: Team[]
  refresh: () => Promise<void>
}) {
  const [editId, setEditId] = useState<string | null>(null)
  const [draftTeamIds, setDraftTeamIds] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const teamMap = Object.fromEntries(teams.map((t) => [t.id, t]))

  const pending = users.filter((u) => u.status === "pending")
  const active = users.filter((u) => u.status !== "pending")

  async function approve(u: User) {
    try {
      await api.adminUpdate("users", { id: u.id, status: "active" })
      await refresh()
    } catch (err) {
      reportError(err)
    }
  }
  async function setRole(u: User, role: UserRole) {
    try {
      await api.adminUpdate("users", { id: u.id, role })
      await refresh()
    } catch (err) {
      reportError(err)
    }
  }
  async function del(id: string) {
    if (!confirm("Delete this user?")) return
    try {
      await api.adminDelete("users", id)
      await refresh()
    } catch (err) {
      reportError(err)
    }
  }
  function startEdit(u: User) {
    setEditId(u.id)
    setDraftTeamIds(u.teamIds)
  }
  function toggleTeam(id: string) {
    setDraftTeamIds((p) =>
      p.includes(id) ? p.filter((x) => x !== id) : [...p, id],
    )
  }
  async function saveTeams(u: User) {
    setBusy(true)
    try {
      await api.adminUpdate("users", { id: u.id, teamIds: draftTeamIds })
      await refresh()
      setEditId(null)
    } catch (err) {
      reportError(err)
    } finally {
      setBusy(false)
    }
  }

  function UserCard({ u }: { u: User }) {
    const editing = editId === u.id
    return (
      <div className="bg-navy-800 rounded-lg px-4 py-3 border border-navy-700/50">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-display font-600 text-navy-100">
              {u.firstName} {u.lastName}
            </p>
            <p className="text-xs text-navy-400 truncate">{u.email}</p>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {u.status === "pending" && <Chip color="amber">pending</Chip>}
              <Chip color={u.role === "admin" ? "amber" : "navy"}>
                {u.role}
              </Chip>
              {u.teamIds.map((tid) => {
                const t = teamMap[tid]
                return t ? (
                  <Chip key={tid} color="green">
                    {teamLabel(t)}
                  </Chip>
                ) : null
              })}
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {u.status === "pending" ? (
              <Btn variant="primary" size="sm" onClick={() => approve(u)}>
                Approve
              </Btn>
            ) : (
              <button
                onClick={() => startEdit(u)}
                className="text-navy-400 hover:text-navy-100 p-1.5 rounded hover:bg-navy-700 transition-colors"
                title="Assign teams"
              >
                <IconEdit />
              </button>
            )}
            <button
              onClick={() => del(u.id)}
              className="text-navy-400 hover:text-red-400 p-1.5 rounded hover:bg-navy-700 transition-colors"
            >
              <IconTrash />
            </button>
          </div>
        </div>
        {editing && (
          <div className="mt-3 pt-3 border-t border-navy-700/50 space-y-3">
            <div>
              <label className="text-xs text-navy-400 mb-1 block">Role</label>
              <select
                value={u.role}
                onChange={(e) => setRole(u, e.target.value as UserRole)}
              >
                <option value="coach">Coach</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-navy-400 mb-1.5 block">
                Assigned Teams
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[...teams]
                  .sort((a, b) => teamLabel(a).localeCompare(teamLabel(b)))
                  .map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => toggleTeam(t.id)}
                      className={`px-2.5 py-1 rounded text-xs font-display font-700 transition-all ${
                        draftTeamIds.includes(t.id)
                          ? "bg-cf-green text-navy-950"
                          : "bg-navy-700 text-navy-300 hover:bg-navy-600"
                      }`}
                    >
                      {teamLabel(t)}
                    </button>
                  ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Btn
                variant="primary"
                size="sm"
                disabled={busy}
                onClick={() => saveTeams(u)}
              >
                Save Teams
              </Btn>
              <Btn variant="ghost" size="sm" onClick={() => setEditId(null)}>
                Done
              </Btn>
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
          {pending.map((u) => (
            <UserCard key={u.id} u={u} />
          ))}
        </div>
      )}
      <div className="space-y-2">
        <SectionTitle>Users</SectionTitle>
        {active.length === 0 ? (
          <EmptyState icon="👤" message="No active users yet." />
        ) : (
          active.map((u) => <UserCard key={u.id} u={u} />)
        )}
      </div>
    </div>
  )
}

// ─── Auth Modal ───────────────────────────────────────────────────────────────

function AuthModal({
  onClose,
  onLogin,
}: {
  onClose: () => void
  onLogin: (u: User) => void
}) {
  const [mode, setMode] = useState<"login" | "register">("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [busy, setBusy] = useState(false)

  async function handleLogin(e: FormEvent) {
    e.preventDefault()
    setError("")
    setBusy(true)
    try {
      const user = await api.login(email, password)
      onLogin(user)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid email or password")
    } finally {
      setBusy(false)
    }
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault()
    setError("")
    setNotice("")
    setBusy(true)
    try {
      await api.register(firstName, lastName, email, password)
      setMode("login")
      setNotice(
        "Account created. An admin must approve it before you can sign in.",
      )
      setPassword("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create account")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/65 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-navy-800 w-full max-w-md rounded-t-2xl sm:rounded-2xl border border-navy-600/50 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-navy-700">
          <h2 className="font-display text-xl font-800 tracking-wide text-navy-100">
            {mode === "login" ? "Sign In" : "Create Account"}
          </h2>
          <button
            onClick={onClose}
            className="text-navy-400 hover:text-navy-100 transition-colors p-1 rounded hover:bg-navy-700"
          >
            <IconX />
          </button>
        </div>

        <div className="flex mx-6 mt-4 mb-2 bg-navy-900 rounded-lg p-1">
          {(["login", "register"] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m)
                setError("")
                setNotice("")
              }}
              className={`flex-1 py-1.5 rounded-md font-display font-700 text-sm tracking-wide transition-all ${
                mode === m
                  ? "bg-cf-green text-navy-950"
                  : "text-navy-400 hover:text-navy-200"
              }`}
            >
              {m === "login" ? "Sign In" : "Register"}
            </button>
          ))}
        </div>

        <div className="px-6 pb-6 overflow-y-auto max-h-[80vh]">
          {error && (
            <p className="text-red-700 text-sm bg-red-500/10 rounded-lg px-3 py-2 mt-3 mb-1">
              {error}
            </p>
          )}
          {notice && (
            <p className="text-cf-green text-sm bg-cf-green/10 rounded-lg px-3 py-2 mt-3 mb-1">
              {notice}
            </p>
          )}

          {mode === "login" ? (
            <form onSubmit={handleLogin} className="space-y-3 mt-3">
              <div>
                <label className="text-xs text-navy-400 mb-1 block">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-navy-400 mb-1 block">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              <Btn
                type="submit"
                variant="primary"
                size="lg"
                className="w-full mt-1"
                disabled={busy}
              >
                {busy ? "Signing in…" : "Sign In"}
              </Btn>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-3 mt-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-navy-400 mb-1 block">
                    First Name
                  </label>
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs text-navy-400 mb-1 block">
                    Last Name
                  </label>
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-navy-400 mb-1 block">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-xs text-navy-400 mb-1 block">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <p className="text-xs text-navy-500">
                New coach accounts need admin approval before first sign-in.
                Your teams are assigned by an admin.
              </p>
              <Btn
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                disabled={busy}
              >
                {busy ? "Creating…" : "Create Account"}
              </Btn>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────

// Signed-in-only geographic view of practice-field locations. Locations with
// lat/lon get a marker + popup (name, city, field count); those without are
// listed in a "Not mapped yet" panel. Centered on Redmond, WA (Crossfire hub).
function MapView({
  locations,
  fields,
  focusLocationId,
  // When set (e.g. arriving from a field's "View on map" link), the map opens
  // centered and zoomed on that location with its popup already showing.
}: {
  locations: Location[]
  fields: Field[]
  focusLocationId?: string | null
}) {
  const mapped = locations.filter((l) => l.lat != null && l.lon != null)
  const unmapped = locations.filter((l) => l.lat == null || l.lon == null)
  const fieldCount = (locId: string) =>
    fields.filter((f) => f.locationId === locId).length

  const focus = focusLocationId
    ? mapped.find((l) => l.id === focusLocationId)
    : undefined

  // Open the focused location's popup exactly once when we arrive on it, rather
  // than on every re-render (an inline marker ref would re-open a popup the user
  // had dismissed after any prop-driven re-render, e.g. a data refresh).
  const markerRefs = useRef<Record<string, L.Marker | null>>({})
  useEffect(() => {
    if (focus) markerRefs.current[focus.id]?.openPopup()
  }, [focus?.id])

  if (locations.length === 0) {
    return (
      <EmptyState
        icon="🗺️"
        message="No locations have been added yet. Admins can create them in the Admin panel."
      />
    )
  }

  return (
    <div className="relative h-[calc(100vh-120px)]">
      <MapContainer
        center={
          focus ? [focus.lat as number, focus.lon as number] : [47.67, -122.12]
        }
        zoom={focus ? 14 : 10}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {mapped.map((l) => (
          <Marker
            key={l.id}
            position={[l.lat as number, l.lon as number]}
            // Register the marker so the effect above can open the focused
            // location's popup once on arrival.
            ref={(m) => {
              markerRefs.current[l.id] = m
            }}
          >
            <Popup>
              <strong>{l.name}</strong>
              {l.city && <div className="text-xs text-navy-500">{l.city}</div>}
              <div className="text-xs text-navy-500 mt-1">
                {fieldCount(l.id)} field(s)
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      {unmapped.length > 0 && (
        <div className="absolute top-3 right-3 z-[1000] bg-navy-800 border border-navy-600 rounded-xl shadow-xl p-4 max-w-[12rem]">
          <h3 className="font-display text-sm font-600 text-navy-100 mb-2">
            Not mapped yet
          </h3>
          <ul className="text-xs text-navy-300 space-y-1">
            {unmapped.map((l) => (
              <li key={l.id}>{l.name}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ─── Team Finder ──────────────────────────────────────────────────────────────
// A public search box shown on every view except Admin. Type a team code
// ("B14 D"), a coach name ("Rafael"), a gender ("boys"), or a birth year
// ("2014") and see ALL of that team's practices across every week — newest
// first. Works entirely off already-loaded catalog data; no backend call.

// A team matches a query if the query words all appear in the team's searchable
// text (label + coach + gender + year). Space-separated words are ANDed so
// "b14 d" narrows to the D-level 2014 boys, not every B14.
function teamMatches(team: Team, words: string[]): boolean {
  const hay = [
    teamLabel(team),
    team.coachName ?? "",
    team.gender,
    String(team.birthYear),
    String(team.birthYear).slice(-2),
  ]
    .join(" ")
    .toLowerCase()
  return words.every((w) => hay.includes(w))
}

function TeamFinder({
  teams,
  fields,
  locations,
  slots,
}: {
  teams: Team[]
  fields: Field[]
  locations: Location[]
  slots: SlotConfig[]
}) {
  const [query, setQuery] = useState("")
  const q = query.trim().toLowerCase()

  const teamMap = useMemo(
    () => Object.fromEntries(teams.map((t) => [t.id, t])),
    [teams],
  )
  const fieldMap = useMemo(
    () => Object.fromEntries(fields.map((f) => [f.id, f])),
    [fields],
  )
  const locationMap = useMemo(
    () => Object.fromEntries(locations.map((l) => [l.id, l])),
    [locations],
  )

  // Practices for every team whose searchable text matches the query. Each row
  // is one (slot, team) pairing, sorted date -> time descending (newest first).
  const results = useMemo(() => {
    if (q.length < 2) return []
    const words = q.split(/\s+/).filter(Boolean)
    const matchIds = new Set(
      teams.filter((t) => teamMatches(t, words)).map((t) => t.id),
    )
    if (matchIds.size === 0) return []
    const rows: {
      key: string
      date: string
      slot: SlotConfig
      team: Team
      field?: Field
    }[] = []
    for (const s of slots) {
      for (const tid of s.reservedTeamIds) {
        if (!matchIds.has(tid)) continue
        const team = teamMap[tid]
        if (!team) continue
        rows.push({
          key: `${s.id}|${tid}`,
          date: s.date,
          slot: s,
          team,
          field: fieldMap[s.fieldId],
        })
      }
    }
    rows.sort((a, b) =>
      a.date !== b.date
        ? a.date < b.date
          ? 1
          : -1
        : a.slot.startTime < b.slot.startTime
          ? 1
          : a.slot.startTime > b.slot.startTime
            ? -1
            : 0,
    )
    return rows
  }, [q, slots, teams, teamMap, fieldMap])

  return (
    <div className="px-4 pt-3 pb-1 bg-navy-900">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400">
          <IconSearch />
        </span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find your team or coach (e.g. B14 D, Rafael)"
          className="w-full pl-9 pr-9 py-2 rounded-lg bg-navy-800 border border-navy-600 text-sm text-navy-100 placeholder:text-navy-400 focus:outline-none focus:border-cf-green"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-navy-400 hover:text-navy-100"
          >
            <IconX />
          </button>
        )}
      </div>

      {q.length >= 2 && (
        <div className="mt-2 rounded-xl border border-navy-600/60 bg-navy-800 overflow-hidden">
          {results.length === 0 ? (
            <p className="px-3 py-3 text-sm text-navy-400">
              No practices found for “{query}”.
            </p>
          ) : (
            <>
              <div className="px-3 py-2 text-[11px] uppercase tracking-wider font-display font-700 text-navy-400 border-b border-navy-700">
                {results.length} practice{results.length === 1 ? "" : "s"}
              </div>
              <ul className="max-h-[60vh] overflow-y-auto divide-y divide-navy-700/70">
                {results.map((r) => {
                  const loc = r.field
                    ? locationMap[r.field.locationId]
                    : undefined
                  return (
                    <li
                      key={r.key}
                      className="px-3 py-2 text-sm flex flex-wrap items-baseline gap-x-2 gap-y-0.5"
                    >
                      <span className="font-display font-600 text-navy-100 w-28 shrink-0">
                        {formatDisplayDate(r.date)}
                      </span>
                      <span className="text-navy-300">
                        {timeRangeLabel(r.slot.startTime, r.slot.endTime)}
                      </span>
                      <span className="text-navy-400">·</span>
                      <span className="text-navy-200">
                        {loc?.name ?? "Unknown"}
                        {r.field ? ` ${r.field.name}` : ""}
                      </span>
                      <span className="text-cf-green font-medium ml-auto">
                        {teamLabel(r.team)}
                        {r.team.coachName ? ` (${r.team.coachName})` : ""}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default function App() {
  const [teams, setTeams] = useState<Team[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [fields, setFields] = useState<Field[]>([])
  const [slots, setSlots] = useState<SlotConfig[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [view, setView] = useState<View>("schedule")
  // The location a field→map link asked to focus; cleared when the user
  // navigates the map elsewhere via the nav bar.
  const [mapFocusId, setMapFocusId] = useState<string | null>(null)
  const [weekOffset, setWeekOffset] = useState(1)

  // Open the Fields Map focused on a specific location (from a field card link).
  function showLocationOnMap(locationId: string) {
    setMapFocusId(locationId)
    setView("map")
  }
  const [showAuth, setShowAuth] = useState(false)
  const [loading, setLoading] = useState(true)

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
    try {
      setUsers(await api.adminList<User>("users"))
    } catch {
      /* non-admin: ignore */
    }
  }

  useEffect(() => {
    ;(async () => {
      try {
        const [, u] = await Promise.all([loadBootstrap(), api.me()])
        setCurrentUser(u)
        if (u?.role === "admin") await loadUsers()
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
    if (u.role === "admin") await loadUsers()
  }

  async function handleLogout() {
    try {
      await api.logout()
    } catch {
      /* ignore */
    }
    setCurrentUser(null)
    setUsers([])
    setView("schedule")
  }

  async function handleReserve(
    slotId: string,
    teamId: string,
  ): Promise<string | null> {
    try {
      const slot = await api.reserve(slotId, teamId)
      setSlots((prev) => prev.map((s) => (s.id === slotId ? slot : s)))
      return null
    } catch (err) {
      return err instanceof Error ? err.message : "Could not reserve this slot."
    }
  }

  async function handleCancel(
    slotId: string,
    teamId: string,
  ): Promise<string | null> {
    try {
      const slot = await api.cancel(slotId, teamId)
      setSlots((prev) => prev.map((s) => (s.id === slotId ? slot : s)))
      return null
    } catch (err) {
      return err instanceof Error
        ? err.message
        : "Could not cancel this reservation."
    }
  }

  async function handleMove(
    slotId: string,
    teamId: string,
    newSlotId: string,
    newTeamId: string,
  ): Promise<string | null> {
    try {
      const changed = await api.moveReservation(
        slotId,
        teamId,
        newSlotId,
        newTeamId,
      )
      const byId = new Map(changed.map((s) => [s.id, s]))
      setSlots((prev) => prev.map((s) => byId.get(s.id) ?? s))
      return null
    } catch (err) {
      return err instanceof Error
        ? err.message
        : "Could not update this reservation."
    }
  }

  const isAdmin = currentUser?.role === "admin"
  const isCoach = !!currentUser

  const navItems: { id: View label: string icon: ReactNode }[] = [
    { id: "schedule", label: "Schedule", icon: <IconCalendar /> },
    { id: "reserve", label: "Reserve", icon: <IconField /> },
    { id: "myfields", label: "My Fields", icon: <IconClipboard /> },
    { id: "map", label: "Fields Map", icon: <IconMap /> },
    ...(isAdmin
      ? [{ id: "admin" as View, label: "Admin", icon: <IconSettings /> }]
      : []),
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-900 flex flex-col items-center justify-center gap-3">
        <img
          src="/assets/crossfire-select-logo.png"
          alt="Crossfire Select"
          className="h-12 w-auto animate-pulse"
        />
        <p className="text-navy-500 text-sm font-display tracking-wide">
          Loading…
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-navy-900 flex flex-col max-w-2xl mx-auto">
      {/* Header */}
      <header className="sticky top-0 z-30 h-[60px] bg-navy-950 border-b border-navy-700/80 flex items-center px-4 gap-3 shadow-lg">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <img
            src="/assets/crossfire-select-logo.png"
            alt="Crossfire Select"
            className="h-8 w-auto flex-shrink-0"
          />
          <span className="font-display text-[9px] font-600 tracking-widest text-cf-green leading-none uppercase hidden sm:inline">
            Field Manager
          </span>
        </div>

        {currentUser ? (
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs text-navy-200 font-medium leading-tight">
                {currentUser.firstName} {currentUser.lastName}
              </span>
              <span className="text-[10px] text-cf-green uppercase tracking-wide">
                {currentUser.role}
              </span>
            </div>
            <div className="w-8 h-8 rounded-full bg-navy-700 border border-navy-600 flex items-center justify-center text-navy-200">
              <IconUser />
            </div>
            <button
              onClick={handleLogout}
              className="text-navy-400 hover:text-navy-100 text-xs font-medium px-2 py-1.5 rounded hover:bg-navy-800 transition-colors"
            >
              Sign out
            </button>
          </div>
        ) : (
          <Btn variant="primary" size="sm" onClick={() => setShowAuth(true)}>
            Sign In
          </Btn>
        )}
      </header>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {view !== "admin" && (
          <TeamFinder
            teams={teams}
            fields={fields}
            locations={locations}
            slots={slots}
          />
        )}
        {view === "schedule" && (
          <ScheduleView
            weekOffset={weekOffset}
            onWeekChange={setWeekOffset}
            teams={teams}
            locations={locations}
            fields={fields}
            slots={slots}
            onShowMap={showLocationOnMap}
          />
        )}
        {view === "reserve" && isCoach ? (
          <ReserveView
            weekOffset={weekOffset}
            onWeekChange={setWeekOffset}
            currentUser={currentUser!}
            teams={teams}
            locations={locations}
            fields={fields}
            slots={slots}
            onReserve={handleReserve}
            onCancel={handleCancel}
            onShowMap={showLocationOnMap}
          />
        ) : (
          view === "reserve" && (
            <div className="pb-24 flex flex-col items-center gap-4 pt-16 px-4">
              <p className="text-navy-300 text-center">
                Sign in to reserve field slots for your team.
              </p>
              <Btn variant="primary" onClick={() => setShowAuth(true)}>
                Sign In
              </Btn>
            </div>
          )
        )}
        {view === "myfields" && isCoach ? (
          <MyFieldsView
            weekOffset={weekOffset}
            onWeekChange={setWeekOffset}
            currentUser={currentUser!}
            teams={teams}
            fields={fields}
            locations={locations}
            slots={slots}
            onCancel={handleCancel}
            onMove={handleMove}
          />
        ) : (
          view === "myfields" && (
            <div className="flex flex-col items-center gap-4 pt-16 px-4">
              <p className="text-navy-300 text-center">
                Sign in to view your reservations.
              </p>
              <Btn variant="primary" onClick={() => setShowAuth(true)}>
                Sign In
              </Btn>
            </div>
          )
        )}
        {view === "map" && (
          <MapView
            locations={locations}
            fields={fields}
            focusLocationId={mapFocusId}
          />
        )}
        {view === "admin" && isAdmin && (
          <AdminView
            teams={teams}
            locations={locations}
            fields={fields}
            slots={slots}
            users={users}
            refresh={refreshAdmin}
            weekOffset={weekOffset}
            onWeekChange={setWeekOffset}
          />
        )}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-2xl mx-auto h-[60px] bg-navy-950 border-t border-navy-700/80 flex z-30">
        {navItems.map((item) => {
          const active = view === item.id
          return (
            <button
              key={item.id}
              onClick={() => {
                // Schedule and the Fields Map are public; reserving and
                // My Fields require a signed-in coach.
                if (
                  (item.id === "reserve" || item.id === "myfields") &&
                  !currentUser
                ) {
                  setShowAuth(true)
                  return
                }
                // Tapping "Fields Map" in the nav shows the whole map, not a
                // field-specific focus, so clear any pending focus.
                if (item.id === "map") setMapFocusId(null)
                setView(item.id)
              }}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-all relative ${
                active ? "text-cf-green" : "text-navy-500 hover:text-navy-300"
              }`}
            >
              <span
                className={`transition-transform duration-150 ${
                  active ? "scale-110" : ""
                }`}
              >
                {item.icon}
              </span>
              <span
                className={`text-[10px] font-display font-700 tracking-wider uppercase ${
                  active ? "text-cf-green" : ""
                }`}
              >
                {item.label}
              </span>
              {active && (
                <span className="absolute bottom-0 inset-x-1/4 h-0.5 bg-cf-green rounded-full" />
              )}
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
