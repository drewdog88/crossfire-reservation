// Deterministically parse the raw grid dumps in scripts/raw-tabs/*.txt (one file
// per weekly tab, each the verbatim `read_sheet_values` text output) into
// scripts/sheet-bookings.json. This replaces hand-transcription: the grid is
// regular, so we walk it with code.
//
// Grid model (observed): the sheet lays out a week as 5 day-columns grouped at
// spreadsheet columns 0,3,6,9,12 (Mon,Tue,Wed,Thu,Fri). A row with ONLY column 0
// populated (and not a Field/Time/number/day) names the current LOCATION and
// applies to every day-column below it until the next location row. Under each
// day-column, blocks stack vertically as: a `Field N` row, then a time row, then
// numbered rows (`1`,`2`,...) whose neighbor cell (col+1) holds the team text.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rawDir = join(__dirname, 'raw-tabs')
const tabDates = JSON.parse(readFileSync(join(__dirname, 'tab-dates.json'), 'utf8'))

const DAY_COLS = { 0: 'Monday', 3: 'Tuesday', 6: 'Wednesday', 9: 'Thursday', 12: 'Friday' }
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const timeRe = /\d{1,2}(:\d{2})?\s*(am|pm)?\s*[-–—]\s*\d{1,2}(:\d{2})?\s*(am|pm)?/i
const fieldRe = /^field\b/i
const numRe = /^\d{1,2}$/

// Parse one `Row N: [ 'a', 'b', '', ... ]` line into { n, cells: [...] }.
function parseRow(line) {
  const m = line.match(/^Row\s+(\d+):\s*\[(.*)\]\s*$/)
  if (!m) return null
  const cells = []
  for (const mm of m[2].matchAll(/'((?:[^'\\]|\\.)*)'/g)) {
    cells.push(mm[1].replace(/\\'/g, "'").replace(/\\\\/g, '\\'))
  }
  return { n: Number(m[1]), cells }
}

// "G12 C (Nancy) " -> { teamCode: "G12 C", coach: "Nancy" }; opponent/notes after
// the coach paren are dropped. Text before the first "(" is the team code token.
function splitTeam(raw) {
  const s = String(raw).trim()
  const paren = s.match(/\(([^)]*)\)?/) // tolerate a missing closing paren
  const coach = paren ? paren[1].trim() : null
  const code = (paren ? s.slice(0, paren.index) : s).trim().replace(/\s+/g, ' ')
  return { teamCode: code || null, coach: coach || null }
}

function looksLikeLocation(cells) {
  // Only column 0 populated across the day-column anchors, and it's plain text.
  if (!cells[0] || !cells[0].trim()) return false
  for (const c of [1, 2, 3, 6, 9, 12]) if ((cells[c] || '').trim()) return false
  const v = cells[0].trim()
  if (fieldRe.test(v) || timeRe.test(v) || numRe.test(v)) return false
  if (DAY_NAMES.includes(v)) return false
  return true
}

const bookings = []
const extractedTabs = []
const failedTabs = []
const locSet = new Set()
const unresolvedDates = []

const files = readdirSync(rawDir).filter((f) => f.endsWith('.txt')).sort()
for (const file of files) {
  const text = readFileSync(join(rawDir, file), 'utf8')
  const lines = text.split('\n')
  const tabLine = lines.find((l) => l.startsWith('TAB:'))
  if (!tabLine) { failedTabs.push({ tab: file, reason: 'no TAB: header' }); continue }
  const tab = tabLine.slice(4).trim()
  const dates = tabDates[tab]
  if (!dates) { failedTabs.push({ tab, reason: 'no date mapping' }); continue }
  extractedTabs.push(tab)

  let curLoc = null
  const field = {} // colGroup -> current field name
  const time = {}  // colGroup -> current time string
  const before = bookings.length

  for (const line of lines) {
    const row = parseRow(line)
    if (!row) continue
    const cells = row.cells
    if (looksLikeLocation(cells)) {
      curLoc = cells[0].trim()
      locSet.add(curLoc)
      for (const k of Object.keys(field)) delete field[k]
      for (const k of Object.keys(time)) delete time[k]
      continue
    }
    for (const cgStr of Object.keys(DAY_COLS)) {
      const cg = Number(cgStr)
      const v = (cells[cg] || '').trim()
      if (!v) continue
      if (fieldRe.test(v)) { field[cg] = v; time[cg] = null; continue }
      if (timeRe.test(v)) { time[cg] = v; continue }
      if (numRe.test(v)) {
        const teamRaw = (cells[cg + 1] || '').trim()
        if (!teamRaw) continue // empty numbered slot
        const { teamCode, coach } = splitTeam(teamRaw)
        const day = DAY_COLS[cg]
        const date = dates[day] || null
        if (!date) unresolvedDates.push({ tab, day })
        bookings.push({
          tab, date, dayOfWeek: day,
          location: curLoc, field: field[cg] || null, time: time[cg] || null,
          teamRaw, teamCode, coach,
        })
      }
    }
  }
  if (bookings.length === before) failedTabs.push({ tab, reason: 'parsed 0 bookings' })
}

const out = { extractedTabs, failedTabs, bookings }
writeFileSync(join(__dirname, 'sheet-bookings.json'), JSON.stringify(out, null, 2))

// Diagnostics to stderr so the JSON stays clean.
const byLoc = {}
for (const b of bookings) byLoc[b.location] = (byLoc[b.location] || 0) + 1
const codes = new Set(bookings.map((b) => b.teamCode).filter(Boolean))
console.error(`tabs parsed: ${extractedTabs.length}, failed: ${failedTabs.length}`)
console.error(`bookings: ${bookings.length}`)
console.error(`distinct locations (${locSet.size}):`, [...locSet])
console.error('bookings per location:', byLoc)
console.error(`distinct team codes: ${codes.size}`)
if (failedTabs.length) console.error('failedTabs:', failedTabs)
if (unresolvedDates.length) console.error('unresolved dates:', unresolvedDates.slice(0, 10))
