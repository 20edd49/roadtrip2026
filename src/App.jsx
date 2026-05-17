import { useState, useEffect, useRef, createContext, useContext } from 'react'
import { ref, set, onValue } from 'firebase/database'
import { db } from './firebase'
import {
  DndContext, DragOverlay,
  PointerSensor, useSensor, useSensors,
  useDroppable, useDraggable,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'

// ─── Constants ────────────────────────────────────────────────────────────────

const DRIVERS = ['ezzy', 'kevin', 'henry', 'eduardo', 'stop', 'all']

const DRIVER_COLORS = {
  ezzy:     '#BA7517',
  kevin:    '#0F6E56',
  henry:    '#993C1D',
  eduardo:  '#534AB7',
  yousif:   '#0E7490',
  abob:     '#C026D3',
  stop:     '#185FA5',
  handoff:  '#9CA3AF',
  all:      '#374151',
}

const DRIVER_LABELS = {
  ezzy:     'Ezzy',
  kevin:    'Kevin',
  henry:    'Henry',
  eduardo:  'Eduardo',
  yousif:   'Yousif',
  abob:     'Abob',
  stop:     'Stop',
  all:      'All',
  handoff:  'Handoff',
}

const EXPENSE_CATEGORIES = {
  rental: { label: 'Rental', icon: '🚗' },
  gas:    { label: 'Gas',    icon: '⛽' },
  food:   { label: 'Food',   icon: '🍔' },
  snacks: { label: 'Snacks', icon: '🍿' },
  misc:   { label: 'Misc',   icon: '📦' },
}

const DAY_LABELS = {
  1: 'Day 1 · Thu May 14',
  2: 'Day 2 · Fri May 15',
  3: 'Day 3 · Sat May 16',
  4: 'Day 4 · Sun May 17',
}

const MAX_DAY = 4

// ─── Contexts ─────────────────────────────────────────────────────────────────

const EditContext = createContext(false)
const NotesContext = createContext({ notes: {}, updateNote: () => {} })

// ─── Initial data ─────────────────────────────────────────────────────────────

const M = (q) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`

const INITIAL_STOPS = [
  // Day 1
  {
    id: 'd1-1', day: 1, time: '5:00 PM',
    title: 'Ezzy departs NYC',
    description: 'Kicking off the trip — Ezzy drives NYC → Baltimore.',
    driver: 'ezzy', type: 'drive',
    mapsUrl: M('New York City NY'),
  },
  {
    id: 'd1-2', day: 1, time: '8:30 PM',
    title: "Nando's Baltimore",
    description: 'Dinner stop. Hold here for the group.',
    driver: 'stop', type: 'stop',
    mapsUrl: M("Nando's Baltimore MD"),
  },

  // Day 2
  {
    id: 'd2-1', day: 2, time: '2:30 AM',
    title: 'Kevin departs Baltimore',
    description: 'Kevin takes the overnight leg out of Baltimore.',
    driver: 'kevin', type: 'drive',
    mapsUrl: M('Baltimore MD'),
  },
  {
    id: 'd2-2', day: 2, time: '6:00 AM',
    title: 'Fuel handoff – Bristol',
    description: 'Fuel stop and driver handoff in Bristol, TN.',
    driver: 'all', type: 'handoff',
    mapsUrl: M('Bristol TN gas station'),
  },
  {
    id: 'd2-3', day: 2, time: '6:15 AM',
    title: 'Henry drives',
    description: 'Henry takes over after Bristol fuel stop.',
    driver: 'henry', type: 'drive',
    mapsUrl: '',
  },
  {
    id: 'd2-4', day: 2, time: '11:30 AM',
    title: 'In-N-Out – Lebanon, TN',
    description: 'Lunch at In-N-Out in Lebanon, TN.',
    driver: 'stop', type: 'stop',
    mapsUrl: M('In-N-Out Burger Lebanon TN'),
  },
  {
    id: 'd2-5', day: 2, time: '12:15 PM',
    title: 'Handoff – Lebanon',
    description: 'Driver handoff in Lebanon parking lot.',
    driver: 'all', type: 'handoff',
    mapsUrl: '',
  },
  {
    id: 'd2-6', day: 2, time: '12:30 PM',
    title: 'Eduardo drives – CA moment',
    description: "Eduardo's leg begins. Scenic drive through the Cumberland area.",
    driver: 'eduardo', type: 'drive',
    mapsUrl: '',
  },
  {
    id: 'd2-7', day: 2, time: '5:00 PM',
    title: "Buc-ee's",
    description: "Quick stop at Buc-ee's for snacks and fuel.",
    driver: 'stop', type: 'stop',
    mapsUrl: M("Buc-ee's Tennessee"),
  },
  {
    id: 'd2-8', day: 2, time: '6:30 PM',
    title: 'Kuwohi Hike',
    description: 'Hike up Kuwohi (Clingmans Dome) — sunset views.',
    driver: 'stop', type: 'stop',
    mapsUrl: M('Kuwohi Clingmans Dome Tennessee'),
  },
  {
    id: 'd2-9', day: 2, time: '9:00 PM',
    title: 'Cook Out – Asheville',
    description: 'Late dinner at Cook Out in Asheville, NC.',
    driver: 'stop', type: 'stop',
    mapsUrl: M('Cook Out Asheville NC'),
  },
  {
    id: 'd2-10', day: 2, time: '10:30 PM',
    title: 'Handoff – Asheville',
    description: 'Kevin takes the wheel for the final push tonight.',
    driver: 'all', type: 'handoff',
    mapsUrl: '',
  },
  {
    id: 'd2-11', day: 2, time: '10:30 PM',
    title: 'Kevin drives to Whitetop',
    description: 'Kevin drives overnight to Whitetop, VA.',
    driver: 'kevin', type: 'drive',
    mapsUrl: M('Whitetop Mountain Virginia'),
  },

  // Day 3
  {
    id: 'd3-1', day: 3, time: '1:30 AM',
    title: 'Whitetop – sleep hold',
    description: 'Arrive Whitetop. Rest before sunrise hike.',
    driver: 'stop', type: 'stop',
    mapsUrl: M('Whitetop Mountain Virginia'),
  },
  {
    id: 'd3-2', day: 3, time: '6:15 AM',
    title: 'Sunrise hike',
    description: 'Sunrise hike at Whitetop Mountain.',
    driver: 'stop', type: 'stop',
    mapsUrl: M('Whitetop Mountain Virginia hiking'),
  },
  {
    id: 'd3-3', day: 3, time: '8:00 AM',
    title: 'Handoff – Wytheville',
    description: 'Driver handoff at Wytheville, VA.',
    driver: 'all', type: 'handoff',
    mapsUrl: M('Wytheville VA'),
  },
  {
    id: 'd3-4', day: 3, time: '8:15 AM',
    title: 'Henry drives',
    description: 'Henry takes the wheel from Wytheville.',
    driver: 'henry', type: 'drive',
    mapsUrl: '',
  },
  {
    id: 'd3-5', day: 3, time: '11:00 AM',
    title: 'Sweet Donkey Coffee',
    description: 'Coffee stop at Sweet Donkey in Roanoke, VA.',
    driver: 'stop', type: 'stop',
    mapsUrl: M('Sweet Donkey Coffee Roanoke VA'),
  },
  {
    id: 'd3-6', day: 3, time: '11:30 AM',
    title: 'Henry → Shenandoah',
    description: 'Henry continues north toward Shenandoah.',
    driver: 'henry', type: 'drive',
    mapsUrl: '',
  },
  {
    id: 'd3-7', day: 3, time: '1:00 PM',
    title: 'Skyline Drive',
    description: 'Scenic cruise on Skyline Drive through Shenandoah NP.',
    driver: 'stop', type: 'stop',
    mapsUrl: M('Skyline Drive Shenandoah National Park'),
  },
  {
    id: 'd3-8', day: 3, time: '2:30 PM',
    title: 'Dark Hollow Falls',
    description: 'Short hike to Dark Hollow Falls.',
    driver: 'stop', type: 'stop',
    mapsUrl: M('Dark Hollow Falls Shenandoah'),
  },
  {
    id: 'd3-9', day: 3, time: '4:30 PM',
    title: 'Dinner – Front Royal',
    description: 'Dinner in Front Royal, VA before final push.',
    driver: 'stop', type: 'stop',
    mapsUrl: M('restaurants Front Royal VA'),
  },
  {
    id: 'd3-10', day: 3, time: '6:00 PM',
    title: 'Handoff – Front Royal',
    description: 'Eduardo takes the wheel for the final leg home.',
    driver: 'all', type: 'handoff',
    mapsUrl: M('Front Royal VA'),
  },
  {
    id: 'd3-11', day: 3, time: '6:00 PM',
    title: 'Eduardo drives – final push',
    description: 'Last leg: Front Royal → Columbia University, NYC.',
    driver: 'eduardo', type: 'drive',
    mapsUrl: '',
  },
  {
    id: 'd3-12', day: 3, time: '8:30 PM',
    title: 'Starbucks – Maryland House',
    description: 'Quick coffee stop at Maryland House rest stop.',
    driver: 'stop', type: 'stop',
    mapsUrl: M('Maryland House Rest Area I-95'),
  },
  {
    id: 'd3-13', day: 3, time: '11:30 PM',
    title: 'Arrive Columbia University',
    description: 'Home. Trip complete. 🎉',
    driver: 'stop', type: 'stop',
    mapsUrl: M('Columbia University New York NY'),
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseTimeMinutes(timeStr) {
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i)
  if (!match) return 0
  let [, h, m, period] = match
  h = parseInt(h)
  m = parseInt(m)
  if (period.toUpperCase() === 'PM' && h !== 12) h += 12
  if (period.toUpperCase() === 'AM' && h === 12) h = 0
  return h * 60 + m
}

function calcDriverStats(stops) {
  const stats = {}
  DRIVERS.forEach(d => { stats[d] = { legs: 0, minutes: 0 } })

  stops.filter(s => s.type === 'drive').forEach((leg) => {
    const driver = leg.driver
    if (!['ezzy', 'kevin', 'henry', 'eduardo'].includes(driver)) return
    stats[driver].legs++
    stats[driver].minutes += leg.driveMins || 0
  })

  return stats
}

function formatHours(minutes) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function parseToHHMM(timeStr) {
  const match = timeStr?.match(/(\d+):(\d+)\s*(AM|PM)/i)
  if (!match) return ''
  let [, h, m, period] = match
  h = parseInt(h); m = parseInt(m)
  if (period.toUpperCase() === 'PM' && h !== 12) h += 12
  if (period.toUpperCase() === 'AM' && h === 12) h = 0
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

function formatFromHHMM(hhmmStr) {
  if (!hhmmStr) return ''
  const [h, m] = hhmmStr.split(':').map(Number)
  const dh = h % 12 === 0 ? 12 : h % 12
  return `${dh}:${m.toString().padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

function addMinutesToTime(timeStr, minutes) {
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i)
  if (!match) return timeStr
  let [, h, m, period] = match
  h = parseInt(h); m = parseInt(m)
  if (period.toUpperCase() === 'PM' && h !== 12) h += 12
  if (period.toUpperCase() === 'AM' && h === 12) h = 0
  let total = ((h * 60 + m + minutes) % 1440 + 1440) % 1440
  const nh = Math.floor(total / 60)
  const nm = total % 60
  const dh = nh % 12 === 0 ? 12 : nh % 12
  return `${dh}:${nm.toString().padStart(2, '0')} ${nh >= 12 ? 'PM' : 'AM'}`
}

// Shifts a stop's time by shiftMinutes, crossing day boundaries when needed.
function applyTimeShift(stop, shiftMinutes) {
  const origMins = parseTimeMinutes(stop.time)
  const totalMins = origMins + shiftMinutes
  const dayDelta = Math.floor(totalMins / 1440)
  const newMins = ((totalMins % 1440) + 1440) % 1440
  const newDay = Math.min(Math.max(stop.day + dayDelta, 1), MAX_DAY)
  const h = Math.floor(newMins / 60)
  const m = newMins % 60
  const dh = h % 12 === 0 ? 12 : h % 12
  const newTime = `${dh}:${m.toString().padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
  return { ...stop, day: newDay, time: newTime }
}

function nextDriver(current) {
  const cycle = ['ezzy', 'kevin', 'henry', 'eduardo']
  const i = cycle.indexOf(current)
  return cycle[(i + 1) % cycle.length]
}

function uid() {
  return `stop-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function computeSettlement(balances) {
  const debtors   = Object.entries(balances).filter(([, b]) => b < -0.005).map(([n, b]) => ({ name: n, bal: b })).sort((a, b) => a.bal - b.bal)
  const creditors = Object.entries(balances).filter(([, b]) => b > 0.005).map(([n, b]) => ({ name: n, bal: b })).sort((a, b) => b.bal - a.bal)
  const transfers = []
  let i = 0, j = 0
  while (i < debtors.length && j < creditors.length) {
    const amt = Math.min(-debtors[i].bal, creditors[j].bal)
    if (amt > 0.005) transfers.push({ from: debtors[i].name, to: creditors[j].name, amount: amt })
    debtors[i].bal += amt
    creditors[j].bal -= amt
    if (Math.abs(debtors[i].bal) < 0.005) i++
    if (Math.abs(creditors[j].bal) < 0.005) j++
  }
  return transfers
}

// ─── PIN Modal ────────────────────────────────────────────────────────────────

function PinModal({ onSuccess, onClose }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  function submit(e) {
    e.preventDefault()
    if (value === '1754') {
      sessionStorage.setItem('pin_unlocked', '1')
      onSuccess()
    } else {
      setError(true)
      setValue('')
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 no-print" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-xs p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">🔒</span>
          <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-base">Enter PIN to edit</h3>
        </div>
        <p className="text-xs text-gray-400 mb-4">Changes are locked. Enter the PIN to enable editing for this session.</p>
        <form onSubmit={submit} className="space-y-3">
          <input
            ref={inputRef}
            type="password"
            inputMode="numeric"
            maxLength={4}
            placeholder="····"
            value={value}
            onChange={e => { setValue(e.target.value.replace(/\D/g, '')); setError(false) }}
            className={`w-full border rounded-lg px-3 py-3 text-center text-2xl tracking-[0.5em] font-mono outline-none focus:ring-2 transition-colors dark:bg-gray-700 dark:text-gray-100 ${
              error
                ? 'border-red-400 bg-red-50 focus:ring-red-200 dark:bg-red-900/30 dark:border-red-700'
                : 'border-gray-200 dark:border-gray-600 focus:ring-blue-200 focus:border-blue-400'
            }`}
          />
          {error && <p className="text-xs text-red-500 dark:text-red-400 text-center">Incorrect PIN. Try again.</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-200 dark:border-gray-600 rounded-lg py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
            <button type="submit" className="flex-1 bg-gray-900 dark:bg-gray-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-gray-700 dark:hover:bg-gray-500">Unlock</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── General Notes Section ───────────────────────────────────────────────────

function GeneralNotesSection({ note, onUpdate }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(note)
  const textareaRef = useRef(null)

  useEffect(() => { setDraft(note) }, [note])
  useEffect(() => { if (editing && textareaRef.current) textareaRef.current.focus() }, [editing])

  function commit() {
    setEditing(false)
    if (draft.trim() !== note) onUpdate(draft.trim())
  }

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
          📋 Trip Notes
        </span>
        {!editing && (
          <button
            onClick={() => { setDraft(note); setEditing(true) }}
            className="no-print text-xs text-gray-300 dark:text-gray-600 hover:text-amber-500 transition-colors"
            title="Edit notes"
          >
            ✎
          </button>
        )}
      </div>
      {editing ? (
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => {
            if (e.key === 'Escape') { setDraft(note); setEditing(false) }
          }}
          placeholder="General trip notes… anyone can edit"
          rows={3}
          className="w-full text-sm border border-amber-300 dark:border-amber-700 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-amber-200 resize-none bg-white dark:bg-gray-700 dark:text-gray-200 placeholder-amber-300"
        />
      ) : (
        <p
          onClick={() => { setDraft(note); setEditing(true) }}
          className={`text-sm cursor-text hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded px-1 -mx-1 py-0.5 whitespace-pre-wrap transition-colors ${note ? 'text-gray-700 dark:text-gray-300' : 'text-amber-300 italic'}`}
          title="Click to edit"
        >
          {note || 'Click to add general trip notes…'}
        </p>
      )}
    </div>
  )
}

// ─── Notes Section ────────────────────────────────────────────────────────────

function NotesSection({ stopId }) {
  const { notes, updateNote } = useContext(NotesContext)
  const noteText = notes[stopId] || ''
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(noteText)
  const textareaRef = useRef(null)

  useEffect(() => { setDraft(noteText) }, [noteText])
  useEffect(() => { if (editing && textareaRef.current) textareaRef.current.focus() }, [editing])

  function commit() {
    setEditing(false)
    if (draft.trim() !== noteText) updateNote(stopId, draft.trim())
  }

  if (!editing && !noteText) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="mt-1.5 text-xs text-gray-300 hover:text-amber-500 transition-colors no-print flex items-center gap-1"
      >
        <span>📝</span> Add note
      </button>
    )
  }

  return (
    <div className="mt-2 pt-2 border-t border-amber-100 dark:border-amber-900">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-amber-600 dark:text-amber-500 flex items-center gap-1">
          📝 Notes
        </span>
        {!editing && (
          <button
            onClick={() => { setDraft(noteText); setEditing(true) }}
            className="no-print text-xs text-gray-300 dark:text-gray-600 hover:text-amber-500 transition-colors"
            title="Edit note"
          >
            ✎
          </button>
        )}
      </div>
      {editing ? (
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => {
            if (e.key === 'Escape') { setDraft(noteText); setEditing(false) }
          }}
          placeholder="Add notes for this stop… (anyone can edit)"
          rows={2}
          className="w-full text-xs border border-amber-300 dark:border-amber-700 rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-amber-200 resize-none bg-amber-50 dark:bg-gray-700 dark:text-gray-200 placeholder-amber-300"
        />
      ) : (
        <p
          onClick={() => { setDraft(noteText); setEditing(true) }}
          className="text-xs text-gray-600 dark:text-gray-400 cursor-text hover:bg-amber-50 dark:hover:bg-gray-700 rounded px-1 -mx-1 py-0.5 whitespace-pre-wrap transition-colors"
          title="Click to edit note"
        >
          {noteText}
        </p>
      )}
    </div>
  )
}

// ─── Components ──────────────────────────────────────────────────────────────

function DriverDot({ driver, size = 10 }) {
  const color = driver === 'handoff' ? DRIVER_COLORS.handoff : (DRIVER_COLORS[driver] || '#9CA3AF')
  return (
    <span style={{ backgroundColor: color, width: size, height: size, display: 'inline-block', borderRadius: '50%', flexShrink: 0 }} />
  )
}

function DriverBadge({ driver, onClick, type }) {
  if (type === 'handoff') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border border-dashed border-gray-400 dark:border-gray-600 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-700">
        ⛽ Handoff
      </span>
    )
  }
  const color = DRIVER_COLORS[driver] || '#9CA3AF'
  const label = DRIVER_LABELS[driver] || driver
  return (
    <button
      onClick={onClick}
      title={onClick ? 'Click to change driver' : undefined}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold border-0 transition-opacity hover:opacity-80 ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
      style={{ backgroundColor: color + '22', color }}
    >
      <DriverDot driver={driver} size={8} />
      {label}
    </button>
  )
}

function EditableField({ value, onChange, multiline, className, placeholder }) {
  const canEdit = useContext(EditContext)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const fieldRef = useRef(null)

  useEffect(() => { if (editing && fieldRef.current) fieldRef.current.focus() }, [editing])

  function commit() {
    setEditing(false)
    if (draft.trim() !== value) onChange(draft.trim() || value)
  }

  if (editing) {
    const shared = {
      ref: fieldRef,
      value: draft,
      onChange: e => setDraft(e.target.value),
      onBlur: commit,
      onKeyDown: e => {
        if (e.key === 'Enter' && !multiline) { e.preventDefault(); commit() }
        if (e.key === 'Escape') { setDraft(value); setEditing(false) }
      },
      className: `w-full bg-white dark:bg-gray-700 dark:text-gray-100 border border-blue-400 rounded px-1 outline-none focus:ring-2 focus:ring-blue-300 text-sm ${className || ''}`,
    }
    return multiline
      ? <textarea {...shared} rows={2} style={{ resize: 'none' }} />
      : <input {...shared} />
  }

  return (
    <span
      onClick={() => { if (canEdit) { setDraft(value); setEditing(true) } }}
      title={canEdit ? 'Click to edit' : undefined}
      className={`rounded px-0.5 -mx-0.5 transition-colors ${canEdit ? 'cursor-text hover:bg-blue-50 dark:hover:bg-blue-900/20' : ''} ${className || ''}`}
    >
      {value || <span className="text-gray-400 italic">{placeholder}</span>}
    </span>
  )
}

function MapsLinkEditor({ mapsUrl, onChange }) {
  const canEdit = useContext(EditContext)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(mapsUrl || '')
  const inputRef = useRef(null)

  useEffect(() => { if (editing && inputRef.current) inputRef.current.focus() }, [editing])

  function commit() {
    setEditing(false)
    onChange(draft.trim())
  }

  if (editing) {
    return (
      <span className="inline-flex items-center gap-1 ml-1" onClick={e => e.stopPropagation()}>
        <input
          ref={inputRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); commit() }
            if (e.key === 'Escape') { setDraft(mapsUrl || ''); setEditing(false) }
          }}
          placeholder="Paste Google Maps URL…"
          className="border border-blue-400 rounded px-2 py-0.5 text-xs outline-none focus:ring-1 focus:ring-blue-300 w-52 sm:w-64"
        />
        {draft && (
          <button
            onMouseDown={e => { e.preventDefault(); onChange(''); setDraft(''); setEditing(false) }}
            className="text-red-400 hover:text-red-600 text-xs px-1"
            title="Remove link"
          >✕</button>
        )}
      </span>
    )
  }

  if (mapsUrl) {
    return (
      <span className="inline-flex items-center gap-0.5 ml-1">
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="text-blue-500 hover:text-blue-700 transition-colors"
          title="Open in Google Maps"
        >
          <MapPinIcon />
        </a>
        {canEdit && (
          <button
            onClick={e => { e.stopPropagation(); setDraft(mapsUrl); setEditing(true) }}
            className="no-print opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-gray-500 text-xs px-0.5"
            title="Edit maps link"
          >
            ✎
          </button>
        )}
      </span>
    )
  }

  if (!canEdit) return null

  return (
    <button
      onClick={e => { e.stopPropagation(); setDraft(''); setEditing(true) }}
      className="no-print inline-flex items-center ml-1 opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-blue-400"
      title="Add Google Maps link"
    >
      <MapPinPlusIcon />
    </button>
  )
}

function MapPinIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  )
}

function MapPinPlusIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19.914 11.105A7.298 7.298 0 0 0 20 10a8 8 0 1 0-9.45 7.873"/>
      <circle cx="12" cy="10" r="3"/>
      <path d="M17 17v5M19.5 19.5h-5"/>
    </svg>
  )
}

function TimeField({ value, onChange }) {
  const canEdit = useContext(EditContext)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef(null)

  useEffect(() => { if (editing && inputRef.current) inputRef.current.focus() }, [editing])

  function startEdit() { setDraft(parseToHHMM(value)); setEditing(true) }

  function commit() {
    setEditing(false)
    if (draft) {
      const formatted = formatFromHHMM(draft)
      if (formatted !== value) onChange(formatted)
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="time"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); commit() }
          if (e.key === 'Escape') setEditing(false)
        }}
        className="border border-blue-400 rounded px-1 text-xs font-mono outline-none focus:ring-2 focus:ring-blue-300 w-24 dark:bg-gray-700 dark:text-gray-100"
      />
    )
  }

  return (
    <span
      onClick={() => { if (canEdit) startEdit() }}
      title={canEdit ? 'Click to edit time' : undefined}
      className={`rounded px-0.5 -mx-0.5 transition-colors text-xs font-mono text-gray-400 ${canEdit ? 'cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20' : ''}`}
    >
      {value || <span className="text-gray-300 italic">--:-- --</span>}
    </span>
  )
}

function MinutesField({ value = 0, onChange }) {
  const canEdit = useContext(EditContext)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(0)
  const inputRef = useRef(null)

  useEffect(() => { if (editing && inputRef.current) inputRef.current.focus() }, [editing])

  function commit() {
    setEditing(false)
    onChange(parseInt(draft) || 0)
  }

  if (editing) {
    return (
      <span className="inline-flex items-center gap-0.5">
        <input
          ref={inputRef}
          type="number" min="0" step="5"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); commit() }
            if (e.key === 'Escape') setEditing(false)
          }}
          className="w-14 border border-blue-400 rounded px-1 py-0.5 text-xs font-mono outline-none focus:ring-1 focus:ring-blue-300"
        />
        <span className="text-xs text-gray-400">m</span>
      </span>
    )
  }

  return (
    <span
      onClick={() => { if (canEdit) { setDraft(value || 0); setEditing(true) } }}
      title={canEdit ? 'Click to edit' : undefined}
      className={`rounded px-0.5 transition-colors text-xs font-mono text-gray-500 ${canEdit ? 'cursor-pointer hover:bg-blue-50' : ''}`}
    >
      {value > 0 ? formatHours(value) : <span className="text-gray-300">—</span>}
    </span>
  )
}

function GripIcon() {
  return (
    <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
      <circle cx="3" cy="2.5" r="1.2"/><circle cx="7" cy="2.5" r="1.2"/>
      <circle cx="3" cy="7"   r="1.2"/><circle cx="7" cy="7"   r="1.2"/>
      <circle cx="3" cy="11.5" r="1.2"/><circle cx="7" cy="11.5" r="1.2"/>
    </svg>
  )
}

function DragPreviewCard({ stop }) {
  const accentColor = stop.type === 'handoff' ? '#9CA3AF' : (DRIVER_COLORS[stop.driver] || '#9CA3AF')
  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-lg px-3 py-2.5 shadow-2xl rotate-1 pointer-events-none"
      style={{ borderLeft: `4px solid ${accentColor}`, width: 260, opacity: 0.95 }}
    >
      <div className="text-xs font-mono text-gray-400 mb-0.5">{stop.time}</div>
      <div className="font-semibold text-gray-800 dark:text-gray-100 text-sm truncate">{stop.title}</div>
    </div>
  )
}

function StopCard({ stop, onUpdate, onRemove }) {
  const canEdit = useContext(EditContext)
  const isHandoff = stop.type === 'handoff'
  const isDrive   = stop.type === 'drive'
  const isSub     = stop.level === 'sub'
  const accentColor = isHandoff ? '#9CA3AF' : (DRIVER_COLORS[stop.driver] || '#9CA3AF')

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: stop.id,
    data: { stop },
  })

  function cycleDriver() {
    if (!isDrive || !canEdit) return
    onUpdate({ ...stop, driver: nextDriver(stop.driver) })
  }

  const borderStyle = isHandoff
    ? '2px dashed #D1D5DB'
    : isSub
      ? `1px solid ${accentColor}33`
      : `2px solid ${accentColor}22`

  const estArrival = isDrive && (stop.driveMins > 0) && stop.time?.match(/\d+:\d+\s*(AM|PM)/i)
    ? addMinutesToTime(stop.time, stop.driveMins)
    : null

  return (
    <div
      ref={setNodeRef}
      className={`bg-white dark:bg-gray-800 rounded-lg relative group transition-opacity ${isSub ? 'p-2 sm:p-2.5' : 'p-3 sm:p-4'}`}
      style={{
        border: borderStyle,
        borderLeft: `${isSub ? 3 : 4}px solid ${accentColor}`,
        opacity: isDragging ? 0.35 : 1,
      }}
    >
      {/* Drag handle — only when unlocked */}
      {canEdit && (
        <button
          {...listeners} {...attributes}
          className="absolute top-2 right-9 opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing no-print touch-none"
          title="Drag to move to another day"
          tabIndex={-1}
        >
          <GripIcon />
        </button>
      )}

      {/* Remove button — only when unlocked */}
      {canEdit && (
        <button
          onClick={() => onRemove(stop.id)}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 flex items-center justify-center rounded-full bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 text-xs no-print"
          title="Remove stop"
        >✕</button>
      )}

      <div className="flex items-start gap-2.5">
        <div className="flex flex-col items-center mt-1 flex-shrink-0">
          <div
            className={`rounded-full border-2 border-white shadow ${isSub ? 'w-2 h-2' : 'w-3 h-3'}`}
            style={{ backgroundColor: accentColor }}
          />
        </div>

        <div className="flex-1 min-w-0">
          {/* Time + badges */}
          <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
            <TimeField value={stop.time} onChange={v => onUpdate({ ...stop, time: v })} />
            {isDrive && <DriverBadge driver={stop.driver} type={stop.type} onClick={canEdit ? cycleDriver : undefined} />}
            {isHandoff && <DriverBadge driver={stop.driver} type="handoff" />}
            {stop.type === 'stop' && !isSub && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">📍 Stop</span>
            )}
          </div>

          {/* Title + maps */}
          <div className={`font-semibold text-gray-800 dark:text-gray-100 flex items-center flex-wrap gap-x-1 ${isSub ? 'text-xs sm:text-sm' : 'text-sm sm:text-base'} mb-0.5`}>
            <EditableField value={stop.title} onChange={v => onUpdate({ ...stop, title: v })} placeholder="Add title" />
            <MapsLinkEditor mapsUrl={stop.mapsUrl || ''} onChange={url => onUpdate({ ...stop, mapsUrl: url })} />
          </div>

          {/* Description — hidden on sub-stops */}
          {!isSub && (
            <div className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm mb-1">
              <EditableField value={stop.description} onChange={v => onUpdate({ ...stop, description: v })} multiline placeholder="Add description" />
            </div>
          )}

          {/* Driver: drive time → computed arrival */}
          {isDrive && (
            <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500 dark:text-gray-400">
              <span className="text-gray-400 dark:text-gray-500">drives for</span>
              <MinutesField value={stop.driveMins || 0} onChange={v => onUpdate({ ...stop, driveMins: v })} />
              {estArrival && <span className="text-gray-400 font-mono">· est. arrival {estArrival}</span>}
            </div>
          )}

          {/* Non-driver: stay duration + level toggle */}
          {!isDrive && (
            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-400 no-print">
              {isSub ? (
                <>
                  <span>+</span>
                  <MinutesField value={stop.stopMins || 0} onChange={v => onUpdate({ ...stop, stopMins: v })} />
                  <span className="text-gray-300 text-xs">to arrival</span>
                </>
              ) : (
                <>
                  <span>stay:</span>
                  <MinutesField value={stop.stopMins || 0} onChange={v => onUpdate({ ...stop, stopMins: v })} />
                </>
              )}
              {canEdit && stop.type === 'stop' && (
                <button
                  onClick={() => onUpdate({ ...stop, level: isSub ? 'main' : 'sub' })}
                  className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-xs text-gray-300 dark:text-gray-600 hover:text-blue-500 border border-gray-200 dark:border-gray-700 hover:border-blue-300 rounded px-1.5 py-0.5 leading-none"
                  title={isSub ? 'Promote to main stop' : 'Make sub-stop'}
                >
                  {isSub ? '↑ main' : '↓ sub'}
                </button>
              )}
            </div>
          )}

          {/* Notes — always visible, no PIN required */}
          <NotesSection stopId={stop.id} />
        </div>
      </div>
    </div>
  )
}

function AddStopModal({ day, onAdd, onClose }) {
  const [form, setForm] = useState({
    time: '', title: '', description: '', driver: 'stop', type: 'stop',
    mapsUrl: '', level: 'main', driveMins: 0, stopMins: 0,
  })

  function submit(e) {
    e.preventDefault()
    if (!form.title.trim()) return
    onAdd({ ...form, id: uid(), day })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 no-print" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
        <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-3 text-base">Add stop · {DAY_LABELS[day]}</h3>

        <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 text-xs mb-3">
          {['main', 'sub'].map(lvl => (
            <button
              key={lvl} type="button"
              onClick={() => setForm(f => ({ ...f, level: lvl }))}
              className={`flex-1 py-2 font-medium transition-colors ${form.level === lvl ? 'bg-gray-900 text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
            >
              {lvl === 'main' ? '● Main stop' : '· Sub-stop'}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input
            type="time"
            className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
            value={parseToHHMM(form.time)}
            onChange={e => setForm(f => ({ ...f, time: formatFromHHMM(e.target.value) }))}
          />
          <input
            className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
            placeholder="Title *"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            required
          />
          {form.level === 'main' && (
            <textarea
              className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 resize-none"
              placeholder="Description"
              rows={2}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          )}
          <input
            className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
            placeholder="Google Maps URL (optional)"
            value={form.mapsUrl}
            onChange={e => setForm(f => ({ ...f, mapsUrl: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Driver</label>
              <select
                className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-2 py-2 text-sm outline-none focus:border-blue-400"
                value={form.driver}
                onChange={e => setForm(f => ({ ...f, driver: e.target.value }))}
              >
                {DRIVERS.map(d => <option key={d} value={d}>{DRIVER_LABELS[d]}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Type</label>
              <select
                className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-2 py-2 text-sm outline-none focus:border-blue-400"
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
              >
                <option value="drive">Drive</option>
                <option value="stop">Stop</option>
                <option value="handoff">Handoff</option>
              </select>
            </div>
          </div>

          {form.type === 'drive' && (
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Driving time (min)</label>
              <div className="relative">
                <input
                  type="number" min="0" step="5"
                  className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 pr-10 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
                  placeholder="0"
                  value={form.driveMins || ''}
                  onChange={e => setForm(f => ({ ...f, driveMins: parseInt(e.target.value) || 0 }))}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">min</span>
              </div>
            </div>
          )}

          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
              {form.level === 'sub' ? 'Stop duration (affects arrival)' : 'Stay duration (min)'}
            </label>
            <div className="relative">
              <input
                type="number" min="0" step="5"
                className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 pr-10 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
                placeholder="0"
                value={form.stopMins || ''}
                onChange={e => setForm(f => ({ ...f, stopMins: parseInt(e.target.value) || 0 }))}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">min</span>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-200 dark:border-gray-600 rounded-lg py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
            <button type="submit" className="flex-1 bg-gray-900 text-white rounded-lg py-2 text-sm font-medium hover:bg-gray-700">Add</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function DaySection({ day, stops, onUpdate, onRemove, onAdd }) {
  const canEdit = useContext(EditContext)
  const [showAdd, setShowAdd] = useState(false)
  const { setNodeRef, isOver } = useDroppable({ id: `day-${day}` })

  const sorted = [...stops].sort((a, b) => {
    const am = parseTimeMinutes(a.time)
    const bm = parseTimeMinutes(b.time)
    if (am !== bm) return am - bm
    return a.id < b.id ? -1 : 1
  })

  return (
    <div
      ref={setNodeRef}
      className={`day-section mb-8 rounded-xl transition-colors duration-150 ${isOver ? 'bg-blue-50 ring-2 ring-blue-200 ring-inset' : ''}`}
      style={{ padding: isOver ? '12px' : undefined }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">{DAY_LABELS[day]}</h2>
          <div className="text-xs text-gray-400">{stops.length} stops</div>
        </div>
        {canEdit && (
          <button
            onClick={() => setShowAdd(true)}
            className="no-print flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 rounded-lg px-3 py-1.5 transition-colors"
          >
            <span className="text-base leading-none">+</span> Add stop
          </button>
        )}
      </div>

      <div className="relative">
        <div className="absolute left-[22px] top-4 bottom-4 w-px bg-gray-100 dark:bg-gray-700" />
        <div className="space-y-2">
          {sorted.map(stop => (
            <div key={stop.id} className={stop.level === 'sub' ? 'ml-7 sm:ml-9' : ''}>
              <StopCard stop={stop} onUpdate={onUpdate} onRemove={onRemove} />
            </div>
          ))}
        </div>
      </div>

      {showAdd && (
        <AddStopModal day={day} onAdd={onAdd} onClose={() => setShowAdd(false)} />
      )}
    </div>
  )
}

function RotationBar({ stops }) {
  const driveLegs = stops
    .filter(s => s.type === 'drive')
    .sort((a, b) => {
      if (a.day !== b.day) return a.day - b.day
      return parseTimeMinutes(a.time) - parseTimeMinutes(b.time)
    })

  if (driveLegs.length === 0) return null

  const segments = driveLegs.map(leg => ({
    driver: leg.driver,
    label: DRIVER_LABELS[leg.driver] || leg.driver,
    id: leg.id,
  }))

  return (
    <div className="mb-8">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Driving Rotation</h3>
      <div className="flex rounded-lg overflow-hidden border border-gray-100 dark:border-gray-700 h-9">
        {segments.map(seg => {
          const color = DRIVER_COLORS[seg.driver] || '#9CA3AF'
          return (
            <div
              key={seg.id}
              className="flex items-center justify-center text-white text-xs font-semibold truncate px-1"
              style={{ backgroundColor: color, flex: 1 }}
              title={seg.label}
            >
              <span className="hidden sm:block truncate">{seg.label}</span>
              <span className="sm:hidden">{seg.label[0]}</span>
            </div>
          )
        })}
      </div>
      <div className="flex gap-3 mt-2 flex-wrap">
        {['ezzy', 'kevin', 'henry', 'eduardo'].map(d => (
          <div key={d} className="flex items-center gap-1 text-xs text-gray-500">
            <DriverDot driver={d} size={8} />
            {DRIVER_LABELS[d]}
          </div>
        ))}
      </div>
    </div>
  )
}

function DriverSummaryCards({ stops }) {
  const stats = calcDriverStats(stops)
  const mainDrivers = ['ezzy', 'kevin', 'henry', 'eduardo']

  return (
    <div className="mb-8">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Driver Summary</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {mainDrivers.map(driver => {
          const s = stats[driver]
          const color = DRIVER_COLORS[driver]
          return (
            <div key={driver} className="bg-white dark:bg-gray-800 rounded-lg border p-3" style={{ borderColor: color + '44' }}>
              <div className="flex items-center gap-2 mb-2">
                <DriverDot driver={driver} size={10} />
                <span className="font-semibold text-sm text-gray-800 dark:text-gray-200">{DRIVER_LABELS[driver]}</span>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
                <div className="flex justify-between">
                  <span>Drive time</span>
                  <span className="font-mono font-medium text-gray-700 dark:text-gray-300">{formatHours(s.minutes)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Legs</span>
                  <span className="font-mono font-medium text-gray-700 dark:text-gray-300">{s.legs}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Live Tracker Components ──────────────────────────────────────────────────

function CheckIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5"/>
    </svg>
  )
}

function LiveStopRow({ stop, isChecked, offset, isNext, onCheck, onDelay, onUpdate, onRemove }) {
  const canEdit = useContext(EditContext)
  const [showDelay, setShowDelay] = useState(false)
  const [delayInput, setDelayInput] = useState(15)
  const delayInputRef = useRef(null)

  useEffect(() => {
    if (showDelay && delayInputRef.current) delayInputRef.current.select()
  }, [showDelay])

  const effectiveTime = offset ? addMinutesToTime(stop.time, offset) : stop.time
  const accentColor = stop.type === 'handoff' ? DRIVER_COLORS.handoff : (DRIVER_COLORS[stop.driver] || '#9CA3AF')

  function submitDelay() {
    if (delayInput !== 0) onDelay(stop.id, stop.day, delayInput)
    setShowDelay(false)
    setDelayInput(15)
  }

  const PRESETS = [-30, -15, +15, +30]

  return (
    <div
      className={`relative flex gap-3 px-3 sm:px-4 py-3 rounded-xl border transition-all ${
        isChecked
          ? 'bg-gray-50 dark:bg-gray-800/40 border-gray-100 dark:border-gray-700 opacity-60'
          : isNext
            ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700 shadow-sm'
            : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600'
      }`}
      style={{ borderLeft: `3px solid ${isChecked ? '#E5E7EB' : accentColor}` }}
    >
      {/* Remove — PIN-gated */}
      {canEdit && (
        <button
          onClick={() => onRemove(stop.id)}
          className="absolute top-2 right-2 opacity-0 hover:opacity-100 w-5 h-5 flex items-center justify-center rounded-full bg-red-50 text-red-400 hover:bg-red-100 text-xs transition-opacity"
          title="Remove stop"
        >✕</button>
      )}

      {/* Check button — always available */}
      <button
        onClick={() => onCheck(stop.id, !isChecked)}
        className="mt-0.5 flex-shrink-0 focus:outline-none"
        title={isChecked ? 'Uncheck' : 'Mark done'}
      >
        {isChecked ? (
          <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center shadow-sm">
            <CheckIcon />
          </div>
        ) : isNext ? (
          <div className="w-6 h-6 rounded-full border-2 border-amber-400 bg-amber-50 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-amber-400" style={{ animation: 'pulse 1.5s ease-in-out infinite' }} />
          </div>
        ) : (
          <div className="w-6 h-6 rounded-full border-2 border-gray-200 hover:border-gray-400 transition-colors" />
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Time + offset badge + driver + UP NEXT */}
        <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
          <span className={`text-xs font-mono font-semibold ${isChecked ? 'text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
            {effectiveTime}
          </span>
          {offset !== 0 && (
            <>
              <span className="text-xs font-mono text-gray-400 line-through">{stop.time}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${offset > 0 ? 'bg-orange-100 text-orange-600' : 'bg-emerald-100 text-emerald-700'}`}>
                {offset > 0 ? `+${offset}m` : `${offset}m`}
              </span>
            </>
          )}
          <DriverBadge driver={stop.driver} type={stop.type} />
          {isNext && (
            <span className="text-xs bg-amber-400 text-white px-2 py-0.5 rounded-full font-semibold">UP NEXT</span>
          )}
        </div>

        {/* Title — editable if PIN unlocked */}
        <div className={`font-semibold text-sm flex items-center flex-wrap gap-x-1 ${isChecked ? 'text-gray-400 line-through' : 'text-gray-800 dark:text-gray-100'}`}>
          <EditableField
            value={stop.title}
            onChange={v => onUpdate({ ...stop, title: v })}
            placeholder="Title"
          />
          {stop.mapsUrl && !isChecked && (
            <a
              href={stop.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-700 flex-shrink-0"
              title="Open in Maps"
            >
              <MapPinIcon />
            </a>
          )}
          {canEdit && (
            <MapsLinkEditor mapsUrl={stop.mapsUrl || ''} onChange={url => onUpdate({ ...stop, mapsUrl: url })} />
          )}
        </div>

        {/* Description — editable, hidden when checked */}
        {!isChecked && stop.description && (
          <div className="text-xs text-gray-500 mt-0.5">
            <EditableField
              value={stop.description}
              onChange={v => onUpdate({ ...stop, description: v })}
              multiline
            />
          </div>
        )}

        {/* Delay / shift time UI — available without PIN */}
        {!isChecked && (
          <div className="mt-2">
            {showDelay ? (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-2.5 space-y-2">
                <p className="text-xs text-orange-700 font-medium">
                  Shift this stop + every stop after it today:
                </p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {PRESETS.map(p => (
                    <button
                      key={p}
                      onClick={() => setDelayInput(p)}
                      className={`text-xs px-2 py-1 rounded font-mono font-semibold border transition-colors ${
                        delayInput === p
                          ? p > 0
                            ? 'bg-orange-500 text-white border-orange-500'
                            : 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-gray-400'
                      }`}
                    >
                      {p > 0 ? `+${p}` : p}m
                    </button>
                  ))}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setDelayInput(d => d - 5)}
                      className="w-6 h-6 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center justify-center font-bold"
                    >−</button>
                    <input
                      ref={delayInputRef}
                      type="number"
                      value={delayInput}
                      onChange={e => setDelayInput(parseInt(e.target.value) || 0)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') submitDelay()
                        if (e.key === 'Escape') setShowDelay(false)
                      }}
                      className="w-14 border border-orange-300 dark:border-orange-700 rounded px-1 py-1 text-xs font-mono text-center outline-none focus:ring-1 focus:ring-orange-400 bg-white dark:bg-gray-700 dark:text-gray-100"
                      step="5"
                    />
                    <button
                      onClick={() => setDelayInput(d => d + 5)}
                      className="w-6 h-6 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center justify-center font-bold"
                    >+</button>
                    <span className="text-xs text-gray-500">min</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={submitDelay}
                    className="flex-1 text-xs bg-orange-500 hover:bg-orange-600 text-white rounded-lg py-1.5 font-semibold transition-colors"
                  >
                    Apply shift
                  </button>
                  <button
                    onClick={() => setShowDelay(false)}
                    className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5 border border-gray-200 rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => { setDelayInput(15); setShowDelay(true) }}
                className="text-xs text-gray-400 hover:text-orange-500 flex items-center gap-1 transition-colors mt-0.5"
              >
                <span>⏱</span> shift time
              </button>
            )}
          </div>
        )}

        {/* Notes */}
        <NotesSection stopId={stop.id} />
      </div>
    </div>
  )
}

function LiveDaySection({ day, stops, trackerChecked, trackerOffsets, onCheck, onDelay, onUpdate, onRemove, onAdd, nextStopId }) {
  const canEdit = useContext(EditContext)
  const [showAdd, setShowAdd] = useState(false)

  const sorted = [...stops].sort((a, b) => parseTimeMinutes(a.time) - parseTimeMinutes(b.time))
  const doneCnt = sorted.filter(s => trackerChecked[s.id]).length
  const allDone = doneCnt === sorted.length && sorted.length > 0

  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-3">
        <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100">{DAY_LABELS[day]}</h2>
        <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
          allDone
            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
            : doneCnt > 0
              ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
        }`}>
          {allDone ? '✓ Done' : `${doneCnt} / ${sorted.length}`}
        </span>
        {canEdit && (
          <button
            onClick={() => setShowAdd(true)}
            className="ml-auto text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 rounded-lg px-2.5 py-1 transition-colors flex items-center gap-1"
          >
            + stop
          </button>
        )}
      </div>

      <div className="space-y-2">
        {sorted.map(stop => (
          <LiveStopRow
            key={stop.id}
            stop={stop}
            isChecked={!!trackerChecked[stop.id]}
            offset={trackerOffsets[stop.id] || 0}
            isNext={stop.id === nextStopId}
            onCheck={onCheck}
            onDelay={onDelay}
            onUpdate={onUpdate}
            onRemove={onRemove}
          />
        ))}
      </div>

      {showAdd && (
        <AddStopModal
          day={day}
          onAdd={onAdd}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  )
}

function LiveTrackerTab({ stops, trackerChecked, trackerOffsets, onCheck, onDelay, onUpdate, onRemove, onAdd, onResetOffsets, onResetAll }) {
  const allSorted = [...stops].sort((a, b) => {
    if (a.day !== b.day) return a.day - b.day
    return parseTimeMinutes(a.time) - parseTimeMinutes(b.time)
  })

  const nextStop = allSorted.find(s => !trackerChecked[s.id])
  const nextStopId = nextStop?.id
  const totalChecked = stops.filter(s => trackerChecked[s.id]).length
  const totalStops = stops.length
  const pct = totalStops ? Math.round((totalChecked / totalStops) * 100) : 0
  const hasOffsets = Object.values(trackerOffsets).some(v => v !== 0)
  const [confirmReset, setConfirmReset] = useState(false)

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
      {/* Progress card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 mb-6 shadow-sm">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-0.5">Trip Progress</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{pct}%</p>
            <p className="text-xs text-gray-500">{totalChecked} of {totalStops} stops completed</p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            {hasOffsets && (
              <button
                onClick={onResetOffsets}
                className="text-xs text-orange-500 hover:text-orange-700 border border-orange-200 hover:border-orange-400 rounded-lg px-2.5 py-1 transition-colors font-medium"
              >
                Clear delays
              </button>
            )}
            {!confirmReset ? (
              <button
                onClick={() => setConfirmReset(true)}
                className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg px-2.5 py-1 transition-colors"
              >
                Reset tracker
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500">Sure?</span>
                <button
                  onClick={() => { onResetAll(); setConfirmReset(false) }}
                  className="text-xs bg-red-500 text-white rounded px-2 py-0.5 font-medium"
                >Yes</button>
                <button
                  onClick={() => setConfirmReset(false)}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >No</button>
              </div>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${pct}%`,
              background: pct === 100
                ? '#22c55e'
                : 'linear-gradient(90deg, #22c55e 0%, #f59e0b 100%)',
            }}
          />
        </div>

        {/* Next stop callout */}
        {nextStop && (
          <div className="mt-3 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <div className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" style={{ animation: 'pulse 1.5s ease-in-out infinite' }} />
            <div className="min-w-0">
              <p className="text-xs text-amber-700 font-semibold truncate">Next: {nextStop.title}</p>
              <p className="text-xs text-amber-600 font-mono">
                {addMinutesToTime(nextStop.time, trackerOffsets[nextStop.id] || 0)}
                {(trackerOffsets[nextStop.id] || 0) !== 0 && (
                  <span className="ml-1 line-through text-amber-400">{nextStop.time}</span>
                )}
                {' '}· {DAY_LABELS[nextStop.day]}
              </p>
            </div>
          </div>
        )}

        {pct === 100 && (
          <div className="mt-3 text-center text-sm text-green-600 font-semibold">
            🎉 Trip complete!
          </div>
        )}
      </div>

      {/* Day sections */}
      {[1, 2, 3, 4].map(day => {
        const dayStops = stops.filter(s => s.day === day)
        if (dayStops.length === 0) return null
        return (
          <LiveDaySection
            key={day}
            day={day}
            stops={dayStops}
            trackerChecked={trackerChecked}
            trackerOffsets={trackerOffsets}
            onCheck={onCheck}
            onDelay={onDelay}
            onUpdate={onUpdate}
            onRemove={onRemove}
            onAdd={onAdd}
            nextStopId={nextStopId}
          />
        )
      })}

      <p className="text-center text-xs text-gray-300 pb-8">
        Tap the circle to check off a stop · Tap ⏱ shift time to cascade a delay
      </p>
    </main>
  )
}

// ─── Costs Tab ───────────────────────────────────────────────────────────────

const COST_PEOPLE = ['ezzy', 'kevin', 'henry', 'eduardo', 'yousif', 'abob']
const EMPTY_EXPENSE_FORM = { amount: '', category: 'food', paidBy: 'ezzy', description: '', excludedFrom: [] }

function CostsTab({ expenses, onAdd, onRemove, onUpdate }) {
  const [expenseModal, setExpenseModal] = useState(null) // null | { mode:'add' } | { mode:'edit', expense }
  const [form, setForm] = useState(EMPTY_EXPENSE_FORM)
  const amountRef = useRef(null)

  const expList = Object.values(expenses).sort((a, b) => b.timestamp - a.timestamp)

  // Per-expense balance computation
  const paid = Object.fromEntries(COST_PEOPLE.map(p => [p, 0]))
  const owes = Object.fromEntries(COST_PEOPLE.map(p => [p, 0]))
  expList.forEach(exp => {
    if (paid[exp.paidBy] !== undefined) paid[exp.paidBy] += Number(exp.amount)
    const excluded = exp.excludedFrom || []
    const included = COST_PEOPLE.filter(p => !excluded.includes(p))
    if (included.length === 0) return
    const perPerson = Number(exp.amount) / included.length
    included.forEach(p => { owes[p] += perPerson })
  })
  const balances = Object.fromEntries(COST_PEOPLE.map(p => [p, paid[p] - owes[p]]))
  const total = expList.reduce((s, e) => s + Number(e.amount), 0)
  const transfers = computeSettlement({ ...balances })

  useEffect(() => { if (expenseModal) setTimeout(() => amountRef.current?.focus(), 50) }, [expenseModal])

  function openAdd() {
    setForm(EMPTY_EXPENSE_FORM)
    setExpenseModal({ mode: 'add' })
  }

  function openEdit(exp) {
    setForm({
      amount: String(exp.amount),
      category: exp.category,
      paidBy: exp.paidBy,
      description: exp.description || '',
      excludedFrom: exp.excludedFrom || [],
    })
    setExpenseModal({ mode: 'edit', expense: exp })
  }

  function toggleExcluded(person) {
    setForm(f => ({
      ...f,
      excludedFrom: f.excludedFrom.includes(person)
        ? f.excludedFrom.filter(p => p !== person)
        : [...f.excludedFrom, person],
    }))
  }

  function submit(e) {
    e.preventDefault()
    const amt = parseFloat(form.amount)
    if (!amt || isNaN(amt)) return
    const data = {
      amount: amt,
      category: form.category,
      paidBy: form.paidBy,
      description: form.description.trim(),
      excludedFrom: form.excludedFrom,
    }
    if (expenseModal.mode === 'add') {
      onAdd({ id: uid(), ...data, timestamp: Date.now() })
    } else {
      onUpdate({ ...expenseModal.expense, ...data })
    }
    setExpenseModal(null)
  }

  const includedInForm = COST_PEOPLE.filter(p => !form.excludedFrom.includes(p))
  const perPersonPreview = includedInForm.length > 0 && form.amount && !isNaN(parseFloat(form.amount))
    ? parseFloat(form.amount) / includedInForm.length
    : null

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
      {/* Total + add button */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 mb-4 flex items-center justify-between shadow-sm">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-0.5">Total Spent</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">${total.toFixed(2)}</p>
          <p className="text-xs text-gray-400">{expList.length} expense{expList.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 bg-gray-900 text-white rounded-xl px-4 py-2.5 text-sm font-bold hover:bg-gray-700 transition-colors"
        >
          + Add
        </button>
      </div>

      {/* Per-person paid cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
        {COST_PEOPLE.map(person => {
          const color = DRIVER_COLORS[person]
          const bal = balances[person]
          const settled = Math.abs(bal) < 0.01
          return (
            <div key={person} className="bg-white dark:bg-gray-800 rounded-xl border p-3 shadow-sm" style={{ borderColor: color + '55' }}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <DriverDot driver={person} size={8} />
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{DRIVER_LABELS[person]}</span>
              </div>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">${paid[person].toFixed(2)}</p>
              <p className={`text-xs font-semibold mt-0.5 ${settled ? 'text-gray-400' : bal > 0 ? 'text-green-600' : 'text-red-500'}`}>
                {settled ? 'even' : bal > 0 ? `+$${bal.toFixed(2)} owed` : `-$${Math.abs(bal).toFixed(2)} owes`}
              </p>
            </div>
          )
        })}
      </div>

      {/* Settlement */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 mb-4 shadow-sm">
        {transfers.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-1.5">
            {total < 0.01 ? 'No expenses yet' : '✓ All settled up!'}
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">To settle up</p>
            {transfers.map((t, i) => (
              <div key={i} className="flex items-center gap-2 py-1.5 border-t border-gray-50 dark:border-gray-700">
                <div className="flex items-center gap-1 min-w-0">
                  <DriverDot driver={t.from} size={8} />
                  <span className="text-sm font-semibold truncate" style={{ color: DRIVER_COLORS[t.from] }}>{DRIVER_LABELS[t.from]}</span>
                </div>
                <span className="text-gray-400 text-sm flex-shrink-0">→</span>
                <div className="flex items-center gap-1 min-w-0">
                  <DriverDot driver={t.to} size={8} />
                  <span className="text-sm font-semibold truncate" style={{ color: DRIVER_COLORS[t.to] }}>{DRIVER_LABELS[t.to]}</span>
                </div>
                <span className="ml-auto font-mono font-bold text-gray-800 dark:text-gray-200 flex-shrink-0">${t.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Category breakdown */}
      {expList.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 mb-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">By Category</p>
          <div className="space-y-1.5">
            {Object.entries(EXPENSE_CATEGORIES).map(([key, cat]) => {
              const catTotal = expList.filter(e => e.category === key).reduce((s, e) => s + Number(e.amount), 0)
              if (catTotal === 0) return null
              const pct = total > 0 ? (catTotal / total) * 100 : 0
              return (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-base w-6 flex-shrink-0">{cat.icon}</span>
                  <span className="text-xs text-gray-600 dark:text-gray-400 w-14 flex-shrink-0">{cat.label}</span>
                  <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-gray-600 dark:bg-gray-400 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs font-mono font-semibold text-gray-700 dark:text-gray-300 w-14 text-right flex-shrink-0">${catTotal.toFixed(2)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Expense list */}
      {expList.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">All Expenses</p>
          {expList.map(exp => {
            const cat = EXPENSE_CATEGORIES[exp.category] || EXPENSE_CATEGORIES.misc
            const excluded = exp.excludedFrom || []
            const included = COST_PEOPLE.filter(p => !excluded.includes(p))
            const perPerson = included.length > 0 ? Number(exp.amount) / included.length : 0
            return (
              <div key={exp.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 px-4 py-3 flex items-center gap-3 group shadow-sm">
                <span className="text-xl flex-shrink-0">{cat.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{exp.description || cat.label}</p>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <DriverDot driver={exp.paidBy} size={6} />
                    <span className="text-xs text-gray-500">{DRIVER_LABELS[exp.paidBy]}</span>
                    <span className="text-gray-200 dark:text-gray-600">·</span>
                    <span className="text-xs text-gray-400">{cat.label}</span>
                    {excluded.length > 0 && (
                      <>
                        <span className="text-gray-200 dark:text-gray-600">·</span>
                        <span className="text-xs text-gray-400">
                          {included.length} people · ${perPerson.toFixed(2)}/ea
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <span className="font-mono font-bold text-gray-900 dark:text-gray-100 text-sm flex-shrink-0">${Number(exp.amount).toFixed(2)}</span>
                <button
                  onClick={() => openEdit(exp)}
                  className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-400 hover:bg-blue-100 text-xs transition-opacity flex-shrink-0"
                  title="Edit"
                >✎</button>
                <button
                  onClick={() => onRemove(exp.id)}
                  className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded-full bg-red-50 text-red-400 hover:bg-red-100 text-xs transition-opacity flex-shrink-0"
                  title="Remove"
                >✕</button>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-4xl mb-2">💸</p>
          <p className="text-sm text-gray-400">No expenses yet — tap Add to log the first one.</p>
        </div>
      )}

      {/* Add / Edit expense modal */}
      {expenseModal && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4" onClick={() => setExpenseModal(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm p-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4 text-base">
              {expenseModal.mode === 'add' ? 'Add Expense' : 'Edit Expense'}
            </h3>
            <form onSubmit={submit} className="space-y-4">
              {/* Amount */}
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Amount ($)</label>
                <input
                  ref={amountRef}
                  type="number" min="0" step="0.01" placeholder="0.00"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl px-3 py-2.5 text-xl font-mono outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
                  required
                />
              </div>

              {/* Category */}
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 block">Category</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {Object.entries(EXPENSE_CATEGORIES).map(([key, cat]) => (
                    <button key={key} type="button"
                      onClick={() => setForm(f => ({ ...f, category: key }))}
                      className={`flex flex-col items-center gap-0.5 py-2 px-1 rounded-xl border text-xs font-semibold transition-colors ${
                        form.category === key ? 'bg-gray-900 text-white border-gray-900' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-gray-400'
                      }`}
                    >
                      <span className="text-lg">{cat.icon}</span>
                      <span className="text-[10px]">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Paid by */}
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 block">Paid by</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {COST_PEOPLE.map(person => (
                    <button key={person} type="button"
                      onClick={() => setForm(f => ({ ...f, paidBy: person }))}
                      className={`py-2 rounded-xl border text-xs font-bold transition-colors ${
                        form.paidBy === person ? 'text-white border-transparent' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-gray-400'
                      }`}
                      style={form.paidBy === person ? { backgroundColor: DRIVER_COLORS[person] } : {}}
                    >
                      {DRIVER_LABELS[person]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Exclude from split */}
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 block">
                  Exclude from split <span className="text-gray-300 dark:text-gray-600">(tap to exclude)</span>
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {COST_PEOPLE.map(person => {
                    const isExcluded = form.excludedFrom.includes(person)
                    return (
                      <button key={person} type="button"
                        onClick={() => toggleExcluded(person)}
                        className={`py-2 rounded-xl border text-xs font-bold transition-colors ${
                          isExcluded
                            ? 'bg-gray-100 dark:bg-gray-600 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-500 line-through'
                            : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-gray-400'
                        }`}
                      >
                        {DRIVER_LABELS[person]}
                      </button>
                    )
                  })}
                </div>
                {form.excludedFrom.length > 0 && (
                  <p className="text-xs text-gray-400 mt-1.5">
                    Split among {includedInForm.length} {includedInForm.length === 1 ? 'person' : 'people'}
                    {perPersonPreview !== null ? ` · $${perPersonPreview.toFixed(2)}/ea` : ''}
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Description <span className="text-gray-300 dark:text-gray-600">(optional)</span></label>
                <input
                  type="text" placeholder="e.g. Shell on I-81"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setExpenseModal(null)} className="flex-1 border border-gray-200 dark:border-gray-600 rounded-xl py-2.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium">Cancel</button>
                <button type="submit" className="flex-1 bg-gray-900 text-white rounded-xl py-2.5 text-sm font-bold hover:bg-gray-700">
                  {expenseModal.mode === 'add' ? 'Add' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}

// ─── Gallery Tab ─────────────────────────────────────────────────────────────

const driveImg = (id, w = 1600) => `https://drive.google.com/thumbnail?id=${id}&sz=w${w}`

function GalleryTab() {
  const [images, setImages]           = useState([])
  const [loading, setLoading]         = useState(false)
  const [fetchError, setFetchError]   = useState(null)
  const [idx, setIdx]                 = useState(0)
  const [imgLoaded, setImgLoaded]     = useState(false)
  const [uploadToken, setUploadToken] = useState(null)
  const [uploading, setUploading]     = useState(false)
  const [uploadResults, setUploadResults] = useState([])
  const [dragging, setDragging]       = useState(false)

  const tokenClientRef  = useRef(null)
  const pendingFilesRef = useRef(null)
  const fileInputRef    = useRef(null)

  const apiKey   = import.meta.env.VITE_GOOGLE_DRIVE_API_KEY
  const folderId = import.meta.env.VITE_GOOGLE_DRIVE_FOLDER_ID
  const clientId = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID
  const total    = images.length

  function fetchImages() {
    if (!apiKey || !folderId) return
    setLoading(true)
    const q = encodeURIComponent(`'${folderId}' in parents and mimeType contains 'image/' and trashed=false`)
    fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)&pageSize=200&orderBy=createdTime desc&key=${apiKey}`)
      .then(r => r.json())
      .then(data => { setImages(data.files || []); setLoading(false) })
      .catch(err => { setFetchError(err.message); setLoading(false) })
  }

  useEffect(fetchImages, [])
  useEffect(() => { setImgLoaded(false) }, [idx])
  useEffect(() => {
    if (total === 0) return
    function onKey(e) {
      if (e.key === 'ArrowLeft')  setIdx(i => (i - 1 + total) % total)
      if (e.key === 'ArrowRight') setIdx(i => (i + 1) % total)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [total])

  function getTokenClient() {
    if (tokenClientRef.current) return tokenClientRef.current
    if (!clientId || !window.google?.accounts?.oauth2) return null
    tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/drive.file',
      callback: (resp) => {
        if (resp.access_token) {
          setUploadToken(resp.access_token)
          if (pendingFilesRef.current) {
            const f = pendingFilesRef.current
            pendingFilesRef.current = null
            doUpload(f, resp.access_token)
          }
        }
      },
    })
    return tokenClientRef.current
  }

  async function doUpload(files, token) {
    setUploading(true)
    const arr = Array.from(files)
    const results = arr.map(f => ({ name: f.name, done: false, error: null }))
    setUploadResults([...results])
    for (let i = 0; i < arr.length; i++) {
      try {
        const metadata = { name: arr[i].name, parents: [folderId] }
        const form = new FormData()
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
        form.append('file', arr[i])
        const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        })
        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          throw new Error(j.error?.message || `HTTP ${res.status}`)
        }
        results[i] = { ...results[i], done: true }
      } catch (err) {
        results[i] = { ...results[i], error: err.message }
      }
      setUploadResults([...results])
    }
    setUploading(false)
    setTimeout(() => { fetchImages(); setUploadResults([]) }, 2500)
  }

  function handleFiles(files) {
    if (!files?.length) return
    if (!uploadToken) {
      pendingFilesRef.current = files
      getTokenClient()?.requestAccessToken()
    } else {
      doUpload(files, uploadToken)
    }
  }

  if (!apiKey) {
    return (
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-16 text-center">
        <p className="text-5xl mb-4">📸</p>
        <p className="text-gray-700 font-semibold mb-1">Gallery not configured</p>
        <p className="text-sm text-gray-400">Add <code className="bg-gray-100 px-1 rounded">VITE_GOOGLE_DRIVE_API_KEY</code> and <code className="bg-gray-100 px-1 rounded">VITE_GOOGLE_DRIVE_FOLDER_ID</code> to .env</p>
      </main>
    )
  }
  if (loading) {
    return (
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-16 text-center">
        <div className="bg-gray-900 rounded-2xl h-72 animate-pulse mb-4" />
        <p className="text-gray-400 text-sm">Loading photos…</p>
      </main>
    )
  }
  if (fetchError) {
    return (
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-16 text-center">
        <p className="text-5xl mb-4">⚠️</p>
        <p className="text-red-500 font-semibold text-sm">Could not load photos</p>
        <p className="text-xs text-gray-400 mt-1">{fetchError}</p>
      </main>
    )
  }

  const current = total > 0 ? images[idx] : null

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
      {/* Slideshow */}
      {current ? (
        <>
          <div className="relative bg-gray-900 rounded-2xl overflow-hidden flex items-center justify-center" style={{ minHeight: 320 }}>
            {!imgLoaded && <div className="absolute inset-0 bg-gray-800 animate-pulse" />}
            <img
              key={current.id}
              src={driveImg(current.id, 1600)}
              alt={current.name}
              onLoad={() => setImgLoaded(true)}
              className={`w-full object-contain max-h-[70vh] transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            />
            <button onClick={() => setIdx(i => (i - 1 + total) % total)}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center text-2xl font-light select-none"
              aria-label="Previous">‹</button>
            <button onClick={() => setIdx(i => (i + 1) % total)}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center text-2xl font-light select-none"
              aria-label="Next">›</button>
            <div className="absolute top-3 right-3 bg-black/50 text-white text-xs font-mono px-2.5 py-1 rounded-full select-none">
              {idx + 1} / {total}
            </div>
          </div>
          <p className="text-center text-xs text-gray-400 mt-2.5 truncate px-8">
            {current.name.replace(/\.[^.]+$/, '')}
          </p>
          <div className="flex justify-center gap-1.5 mt-3 flex-wrap px-4">
            {images.map((_, i) => (
              <button key={i} onClick={() => setIdx(i)}
                className={`rounded-full transition-all duration-200 ${i === idx ? 'w-4 h-2 bg-gray-700 dark:bg-gray-300' : 'w-2 h-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-500'}`}
                aria-label={`Photo ${i + 1}`} />
            ))}
          </div>
          <p className="text-center text-xs text-gray-300 mt-3">← → arrow keys · click dots to jump</p>
        </>
      ) : (
        <div className="text-center py-12">
          <p className="text-5xl mb-3">📂</p>
          <p className="text-gray-500 text-sm font-medium">No photos yet</p>
          <p className="text-xs text-gray-400 mt-1">Upload the first one below!</p>
        </div>
      )}

      {/* Upload section */}
      <div className="mt-6 border-t border-gray-100 dark:border-gray-700 pt-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">📤 Upload Photos</h3>
          {uploadToken && (
            <span className="text-xs text-green-600 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              Signed in
            </span>
          )}
        </div>

        {!clientId ? (
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Upload not configured</p>
            <p className="text-xs text-gray-400 leading-relaxed">
              Add <code className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 px-1 rounded">VITE_GOOGLE_OAUTH_CLIENT_ID</code> to .env<br/>
              Google Cloud Console → Credentials → Create OAuth 2.0 Client ID (Web app)<br/>
              Add authorized origin: <code className="bg-white border border-gray-200 px-1 rounded">http://localhost:5173</code>
            </p>
          </div>
        ) : !uploadToken ? (
          <button
            onClick={() => getTokenClient()?.requestAccessToken()}
            className="w-full flex items-center justify-center gap-2.5 border border-gray-200 rounded-xl py-3 text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-colors font-medium"
          >
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            </svg>
            Sign in with Google to upload
          </button>
        ) : (
          <>
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
              onClick={() => !uploading && fileInputRef.current?.click()}
              className={`rounded-xl border-2 border-dashed py-8 text-center cursor-pointer transition-colors ${
                dragging ? 'border-purple-400 bg-purple-50 dark:bg-purple-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/30'
              } ${uploading ? 'pointer-events-none opacity-60' : ''}`}
            >
              <p className="text-2xl mb-1">🖼️</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Drop photos here or click to browse</p>
              <p className="text-xs text-gray-400 mt-0.5">JPG · PNG · HEIC · multiple files OK</p>
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
                onChange={e => handleFiles(e.target.files)} />
            </div>

            {uploadResults.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {uploadResults.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className={r.done ? 'text-green-500' : r.error ? 'text-red-500' : 'text-gray-400 animate-pulse'}>
                      {r.done ? '✓' : r.error ? '✕' : '⋯'}
                    </span>
                    <span className={`truncate flex-1 ${r.error ? 'text-red-500' : 'text-gray-600'}`}>{r.name}</span>
                    {r.error && <span className="text-red-400 text-xs flex-shrink-0 max-w-[120px] truncate">{r.error}</span>}
                  </div>
                ))}
                {!uploading && (
                  <p className="text-xs mt-1.5 font-medium">
                    {uploadResults.some(r => r.error)
                      ? <span className="text-orange-500">⚠️ Some uploads failed — check folder is shared as Editor</span>
                      : <span className="text-green-600">✓ Uploaded! Refreshing gallery…</span>
                    }
                  </p>
                )}
              </div>
            )}

            <p className="text-xs text-gray-400 mt-2.5">
              Folder must be shared as <strong>Editor</strong> (not Viewer) for uploads to work.
            </p>
          </>
        )}
      </div>
    </main>
  )
}

// ─── Login Gate ──────────────────────────────────────────────────────────────

function LoginGate({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const usernameRef = useRef(null)

  useEffect(() => { usernameRef.current?.focus() }, [])

  function submit(e) {
    e.preventDefault()
    if (username === 'broskis' && password === 'letsdrive26$') {
      sessionStorage.setItem('site_auth', '1')
      onLogin()
    } else {
      setError(true)
      setPassword('')
      setTimeout(() => usernameRef.current?.focus(), 0)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-5xl mb-3">🚗</p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Road Trip 2026</h1>
          <p className="text-sm text-gray-400 mt-1">Sign in to access the trip planner</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Username</label>
              <input
                ref={usernameRef}
                type="text"
                autoComplete="username"
                value={username}
                onChange={e => { setUsername(e.target.value); setError(false) }}
                placeholder="username"
                className={`w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 transition-colors dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500 ${
                  error ? 'border-red-300 bg-red-50 focus:ring-red-200 dark:bg-red-900/30 dark:border-red-700' : 'border-gray-200 dark:border-gray-600 focus:ring-blue-200 focus:border-blue-400'
                }`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Password</label>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(false) }}
                placeholder="password"
                className={`w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 transition-colors dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500 ${
                  error ? 'border-red-300 bg-red-50 focus:ring-red-200 dark:bg-red-900/30 dark:border-red-700' : 'border-gray-200 dark:border-gray-600 focus:ring-blue-200 focus:border-blue-400'
                }`}
              />
            </div>
            {error && <p className="text-xs text-red-500 dark:text-red-400 text-center">Incorrect credentials. Try again.</p>}
            <button
              type="submit"
              className="w-full bg-gray-900 dark:bg-gray-700 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors mt-1"
            >
              Sign in
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

// ─── Main App ────────────────────────────────────────────────────────────────

function AppContent({ darkMode, setDarkMode }) {
  const [stops, setStops] = useState(null)
  const [notes, setNotes] = useState({})
  const [generalNote, setGeneralNote] = useState('')
  const [draggedStop, setDraggedStop] = useState(null)
  const [pinUnlocked, setPinUnlocked] = useState(() => sessionStorage.getItem('pin_unlocked') === '1')
  const [showPinModal, setShowPinModal] = useState(false)
  const [activeTab, setActiveTab] = useState('itinerary')
  const [trackerChecked, setTrackerChecked] = useState({})
  const [trackerOffsets, setTrackerOffsets] = useState({})
  const [expenses, setExpenses] = useState({})
  const skipSaveRef = useRef(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  function onDragStart({ active }) {
    if (!pinUnlocked) return
    setDraggedStop(stops?.find(s => s.id === active.id) ?? null)
  }

  function onDragEnd({ active, over }) {
    setDraggedStop(null)
    if (!pinUnlocked || !over) return
    const overId = String(over.id)
    if (!overId.startsWith('day-')) return
    const targetDay = parseInt(overId.slice(4))
    const stop = stops?.find(s => s.id === active.id)
    if (stop && stop.day !== targetDay) {
      updateStop({ ...stop, day: targetDay })
    }
  }

  // Subscribe to itinerary
  useEffect(() => {
    const dbRef = ref(db, 'itinerary')
    const unsub = onValue(dbRef, (snapshot) => {
      const raw = snapshot.val()
      skipSaveRef.current = true
      setStops(raw ? JSON.parse(raw.v) : INITIAL_STOPS)
    })
    return unsub
  }, [])

  // Subscribe to notes
  useEffect(() => {
    const dbRef = ref(db, 'notes')
    const unsub = onValue(dbRef, (snapshot) => {
      setNotes(snapshot.val() || {})
    })
    return unsub
  }, [])

  // Subscribe to general note
  useEffect(() => {
    const dbRef = ref(db, 'generalNote')
    const unsub = onValue(dbRef, (snapshot) => {
      setGeneralNote(snapshot.val() || '')
    })
    return unsub
  }, [])

  // Subscribe to expenses
  useEffect(() => {
    const dbRef = ref(db, 'expenses')
    return onValue(dbRef, snap => setExpenses(snap.val() || {}))
  }, [])

  // Subscribe to tracker state (checked + offsets)
  useEffect(() => {
    const dbRef = ref(db, 'tracker')
    const unsub = onValue(dbRef, (snapshot) => {
      const data = snapshot.val() || {}
      setTrackerChecked(data.checked || {})
      setTrackerOffsets(data.offsets || {})
    })
    return unsub
  }, [])

  useEffect(() => {
    if (stops === null) return
    if (skipSaveRef.current) {
      skipSaveRef.current = false
      return
    }
    set(ref(db, 'itinerary'), { v: JSON.stringify(stops) })
  }, [stops])

  function updateNote(stopId, text) {
    set(ref(db, `notes/${stopId}`), text || null)
  }

  function updateGeneralNote(text) {
    set(ref(db, 'generalNote'), text || null)
  }

  function updateStop(updated) {
    setStops(prev => {
      const exists = prev.some(s => s.id === updated.id)
      return exists ? prev.map(s => s.id === updated.id ? updated : s) : [...prev, updated]
    })
  }

  function removeStop(id) {
    setStops(prev => prev.filter(s => s.id !== id))
  }

  function addStop(stop) {
    setStops(prev => [...prev, stop])
  }

  function resetData() {
    if (confirm('Reset all changes and restore original itinerary?')) {
      setStops(INITIAL_STOPS)
    }
  }

  function lock() {
    sessionStorage.removeItem('pin_unlocked')
    setPinUnlocked(false)
  }

  // Tracker: check/uncheck a stop
  function checkStop(stopId, val) {
    const newChecked = { ...trackerChecked }
    if (val) newChecked[stopId] = true
    else delete newChecked[stopId]
    set(ref(db, 'tracker/checked'), newChecked)
  }

  // Tracker: cascade a time shift from a stop forward through the same day
  function applyDelay(fromStopId, day, minutes) {
    if (!stops) return
    const dayStops = stops
      .filter(s => s.day === day)
      .sort((a, b) => parseTimeMinutes(a.time) - parseTimeMinutes(b.time))

    const fromIndex = dayStops.findIndex(s => s.id === fromStopId)
    if (fromIndex === -1) return

    const newOffsets = { ...trackerOffsets }
    for (let i = fromIndex; i < dayStops.length; i++) {
      const sid = dayStops[i].id
      newOffsets[sid] = (newOffsets[sid] || 0) + minutes
    }
    set(ref(db, 'tracker/offsets'), newOffsets)
  }

  // Tracker: clear all delay offsets
  function resetOffsets() {
    set(ref(db, 'tracker/offsets'), {})
  }

  // Tracker: clear all tracker state (checks + offsets)
  function resetTracker() {
    set(ref(db, 'tracker'), { checked: {}, offsets: {} })
  }

  // Costs: add / remove expense
  function addExpense(expense) {
    set(ref(db, `expenses/${expense.id}`), expense)
  }

  function removeExpense(id) {
    set(ref(db, `expenses/${id}`), null)
  }

  function updateExpense(expense) {
    set(ref(db, `expenses/${expense.id}`), expense)
  }

  if (stops === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading itinerary…</p>
      </div>
    )
  }

  return (
    <EditContext.Provider value={pinUnlocked}>
      <NotesContext.Provider value={{ notes, updateNote }}>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          {/* Header */}
          <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30 no-print">
            <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 leading-tight">🚗 Road Trip 2026</h1>
                <p className="text-xs text-gray-400 dark:text-gray-500">May 14–17 · NYC → Columbia University</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => setDarkMode(d => !d)}
                  title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors p-1 rounded-lg"
                >
                  {darkMode ? '☀️' : '🌙'}
                </button>
                {pinUnlocked ? (
                  <button
                    onClick={lock}
                    title="Click to lock editing"
                    className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-2.5 py-1.5 hover:bg-green-100 transition-colors font-medium"
                  >
                    🔓 Unlocked
                  </button>
                ) : (
                  <button
                    onClick={() => setShowPinModal(true)}
                    title="Enter PIN to enable editing"
                    className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-2.5 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    🔒 Locked
                  </button>
                )}

                {pinUnlocked && activeTab === 'itinerary' && (
                  <button
                    onClick={resetData}
                    className="text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-lg px-2.5 py-1.5 hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
                  >
                    Reset
                  </button>
                )}
                {activeTab === 'itinerary' && (
                  <button
                    onClick={() => window.print()}
                    className="text-xs bg-gray-900 text-white rounded-lg px-3 py-1.5 hover:bg-gray-700 transition-colors font-medium"
                  >
                    Export PDF
                  </button>
                )}
              </div>
            </div>

            {/* Tab bar */}
            <div className="max-w-2xl mx-auto px-4 sm:px-6 flex border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={() => setActiveTab('itinerary')}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'itinerary'
                    ? 'border-gray-900 dark:border-gray-100 text-gray-900 dark:text-gray-100'
                    : 'border-transparent text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                🗺 Itinerary
              </button>
              <button
                onClick={() => setActiveTab('tracker')}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors relative ${
                  activeTab === 'tracker'
                    ? 'border-amber-500 text-gray-900 dark:text-gray-100'
                    : 'border-transparent text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                📍 Live Tracker
                {Object.keys(trackerChecked).length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('gallery')}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'gallery'
                    ? 'border-purple-500 text-gray-900 dark:text-gray-100'
                    : 'border-transparent text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                📸 Gallery
              </button>
              <button
                onClick={() => setActiveTab('costs')}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'costs'
                    ? 'border-emerald-500 text-gray-900 dark:text-gray-100'
                    : 'border-transparent text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                💰 Costs
              </button>
            </div>
          </header>

          {/* Print header */}
          <div className="hidden print:block p-8 pb-4">
            <h1 className="text-2xl font-bold text-gray-900">Road Trip 2026 · May 14–17</h1>
            <p className="text-gray-500 text-sm">NYC → Columbia University, New York</p>
          </div>

          {/* Tab: Itinerary */}
          {activeTab === 'itinerary' && (
            <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
              <GeneralNotesSection note={generalNote} onUpdate={updateGeneralNote} />

              <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
                <RotationBar stops={stops} />

                {[1, 2, 3, 4].map(day => (
                  <DaySection
                    key={day}
                    day={day}
                    stops={stops.filter(s => s.day === day)}
                    onUpdate={updateStop}
                    onRemove={removeStop}
                    onAdd={addStop}
                  />
                ))}

                <DragOverlay dropAnimation={null}>
                  {draggedStop ? <DragPreviewCard stop={draggedStop} /> : null}
                </DragOverlay>
              </DndContext>

              <DriverSummaryCards stops={stops} />

              <p className="text-center text-xs text-gray-300 pb-8 no-print">
                {pinUnlocked
                  ? 'Editing unlocked · Click any field to edit · Hover a stop to drag it'
                  : 'View only · Click 🔒 to unlock editing · Anyone can add notes below stops'}
              </p>
            </main>
          )}

          {/* Tab: Gallery */}
          {activeTab === 'gallery' && <GalleryTab />}

          {/* Tab: Costs */}
          {activeTab === 'costs' && (
            <CostsTab
              expenses={expenses}
              onAdd={addExpense}
              onRemove={removeExpense}
              onUpdate={updateExpense}
            />
          )}

          {/* Tab: Live Tracker */}
          {activeTab === 'tracker' && (
            <LiveTrackerTab
              stops={stops}
              trackerChecked={trackerChecked}
              trackerOffsets={trackerOffsets}
              onCheck={checkStop}
              onDelay={applyDelay}
              onUpdate={updateStop}
              onRemove={removeStop}
              onAdd={addStop}
              onResetOffsets={resetOffsets}
              onResetAll={resetTracker}
            />
          )}
        </div>

        {showPinModal && (
          <PinModal
            onSuccess={() => { setPinUnlocked(true); setShowPinModal(false) }}
            onClose={() => setShowPinModal(false)}
          />
        )}
      </NotesContext.Provider>
    </EditContext.Provider>
  )
}

export default function App() {
  const [loggedIn, setLoggedIn] = useState(() => sessionStorage.getItem('site_auth') === '1')
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('dark') === '1')

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    localStorage.setItem('dark', darkMode ? '1' : '0')
  }, [darkMode])

  if (!loggedIn) return <LoginGate onLogin={() => setLoggedIn(true)} />
  return <AppContent darkMode={darkMode} setDarkMode={setDarkMode} />
}
