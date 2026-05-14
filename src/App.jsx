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
  stop:     '#185FA5',
  handoff:  '#9CA3AF',
  all:      '#374151',
}

const DRIVER_LABELS = {
  ezzy:     'Ezzy',
  kevin:    'Kevin',
  henry:    'Henry',
  eduardo:  'Eduardo',
  stop:     'Stop',
  all:      'All',
  handoff:  'Handoff',
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
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xs p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">🔒</span>
          <h3 className="font-semibold text-gray-800 text-base">Enter PIN to edit</h3>
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
            className={`w-full border rounded-lg px-3 py-3 text-center text-2xl tracking-[0.5em] font-mono outline-none focus:ring-2 transition-colors ${
              error
                ? 'border-red-400 bg-red-50 focus:ring-red-200'
                : 'border-gray-200 focus:ring-blue-200 focus:border-blue-400'
            }`}
          />
          {error && <p className="text-xs text-red-500 text-center">Incorrect PIN. Try again.</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
            <button type="submit" className="flex-1 bg-gray-900 text-white rounded-lg py-2 text-sm font-medium hover:bg-gray-700">Unlock</button>
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
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-amber-700 flex items-center gap-1.5">
          📋 Trip Notes
        </span>
        {!editing && (
          <button
            onClick={() => { setDraft(note); setEditing(true) }}
            className="no-print text-xs text-gray-300 hover:text-amber-500 transition-colors"
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
          className="w-full text-sm border border-amber-300 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-amber-200 resize-none bg-white placeholder-amber-300"
        />
      ) : (
        <p
          onClick={() => { setDraft(note); setEditing(true) }}
          className={`text-sm cursor-text hover:bg-amber-100 rounded px-1 -mx-1 py-0.5 whitespace-pre-wrap transition-colors ${note ? 'text-gray-700' : 'text-amber-300 italic'}`}
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
    <div className="mt-2 pt-2 border-t border-amber-100">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-amber-600 flex items-center gap-1">
          📝 Notes
        </span>
        {!editing && (
          <button
            onClick={() => { setDraft(noteText); setEditing(true) }}
            className="no-print text-xs text-gray-300 hover:text-amber-500 transition-colors"
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
          className="w-full text-xs border border-amber-300 rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-amber-200 resize-none bg-amber-50 placeholder-amber-300"
        />
      ) : (
        <p
          onClick={() => { setDraft(noteText); setEditing(true) }}
          className="text-xs text-gray-600 cursor-text hover:bg-amber-50 rounded px-1 -mx-1 py-0.5 whitespace-pre-wrap transition-colors"
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
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border border-dashed border-gray-400 text-gray-500 bg-white">
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
      className: `w-full bg-white border border-blue-400 rounded px-1 outline-none focus:ring-2 focus:ring-blue-300 text-sm ${className || ''}`,
    }
    return multiline
      ? <textarea {...shared} rows={2} style={{ resize: 'none' }} />
      : <input {...shared} />
  }

  return (
    <span
      onClick={() => { if (canEdit) { setDraft(value); setEditing(true) } }}
      title={canEdit ? 'Click to edit' : undefined}
      className={`rounded px-0.5 -mx-0.5 transition-colors ${canEdit ? 'cursor-text hover:bg-blue-50' : ''} ${className || ''}`}
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
        className="border border-blue-400 rounded px-1 text-xs font-mono outline-none focus:ring-2 focus:ring-blue-300 w-24"
      />
    )
  }

  return (
    <span
      onClick={() => { if (canEdit) startEdit() }}
      title={canEdit ? 'Click to edit time' : undefined}
      className={`rounded px-0.5 -mx-0.5 transition-colors text-xs font-mono text-gray-400 ${canEdit ? 'cursor-pointer hover:bg-blue-50' : ''}`}
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
      className="bg-white rounded-lg px-3 py-2.5 shadow-2xl rotate-1 pointer-events-none"
      style={{ borderLeft: `4px solid ${accentColor}`, width: 260, opacity: 0.95 }}
    >
      <div className="text-xs font-mono text-gray-400 mb-0.5">{stop.time}</div>
      <div className="font-semibold text-gray-800 text-sm truncate">{stop.title}</div>
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
      className={`bg-white rounded-lg relative group transition-opacity ${isSub ? 'p-2 sm:p-2.5' : 'p-3 sm:p-4'}`}
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
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">📍 Stop</span>
            )}
          </div>

          {/* Title + maps */}
          <div className={`font-semibold text-gray-800 flex items-center flex-wrap gap-x-1 ${isSub ? 'text-xs sm:text-sm' : 'text-sm sm:text-base'} mb-0.5`}>
            <EditableField value={stop.title} onChange={v => onUpdate({ ...stop, title: v })} placeholder="Add title" />
            <MapsLinkEditor mapsUrl={stop.mapsUrl || ''} onChange={url => onUpdate({ ...stop, mapsUrl: url })} />
          </div>

          {/* Description — hidden on sub-stops */}
          {!isSub && (
            <div className="text-gray-500 text-xs sm:text-sm mb-1">
              <EditableField value={stop.description} onChange={v => onUpdate({ ...stop, description: v })} multiline placeholder="Add description" />
            </div>
          )}

          {/* Driver: drive time → computed arrival */}
          {isDrive && (
            <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500">
              <span className="text-gray-400">drives for</span>
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
                  className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-xs text-gray-300 hover:text-blue-500 border border-gray-200 hover:border-blue-300 rounded px-1.5 py-0.5 leading-none"
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
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
        <h3 className="font-semibold text-gray-800 mb-3 text-base">Add stop · {DAY_LABELS[day]}</h3>

        <div className="flex rounded-lg overflow-hidden border border-gray-200 text-xs mb-3">
          {['main', 'sub'].map(lvl => (
            <button
              key={lvl} type="button"
              onClick={() => setForm(f => ({ ...f, level: lvl }))}
              className={`flex-1 py-2 font-medium transition-colors ${form.level === lvl ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              {lvl === 'main' ? '● Main stop' : '· Sub-stop'}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input
            type="time"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
            value={parseToHHMM(form.time)}
            onChange={e => setForm(f => ({ ...f, time: formatFromHHMM(e.target.value) }))}
          />
          <input
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
            placeholder="Title *"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            required
          />
          {form.level === 'main' && (
            <textarea
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 resize-none"
              placeholder="Description"
              rows={2}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          )}
          <input
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
            placeholder="Google Maps URL (optional)"
            value={form.mapsUrl}
            onChange={e => setForm(f => ({ ...f, mapsUrl: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Driver</label>
              <select
                className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm outline-none focus:border-blue-400"
                value={form.driver}
                onChange={e => setForm(f => ({ ...f, driver: e.target.value }))}
              >
                {DRIVERS.map(d => <option key={d} value={d}>{DRIVER_LABELS[d]}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Type</label>
              <select
                className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm outline-none focus:border-blue-400"
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
              <label className="text-xs text-gray-500 mb-1 block">Driving time (min)</label>
              <div className="relative">
                <input
                  type="number" min="0" step="5"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-10 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
                  placeholder="0"
                  value={form.driveMins || ''}
                  onChange={e => setForm(f => ({ ...f, driveMins: parseInt(e.target.value) || 0 }))}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">min</span>
              </div>
            </div>
          )}

          <div>
            <label className="text-xs text-gray-500 mb-1 block">
              {form.level === 'sub' ? 'Stop duration (affects arrival)' : 'Stay duration (min)'}
            </label>
            <div className="relative">
              <input
                type="number" min="0" step="5"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-10 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
                placeholder="0"
                value={form.stopMins || ''}
                onChange={e => setForm(f => ({ ...f, stopMins: parseInt(e.target.value) || 0 }))}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">min</span>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
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
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">{DAY_LABELS[day]}</h2>
          <div className="text-xs text-gray-400">{stops.length} stops</div>
        </div>
        {canEdit && (
          <button
            onClick={() => setShowAdd(true)}
            className="no-print flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 border border-gray-200 hover:border-gray-400 rounded-lg px-3 py-1.5 transition-colors"
          >
            <span className="text-base leading-none">+</span> Add stop
          </button>
        )}
      </div>

      <div className="relative">
        <div className="absolute left-[22px] top-4 bottom-4 w-px bg-gray-100" />
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
      <div className="flex rounded-lg overflow-hidden border border-gray-100 h-9">
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
            <div key={driver} className="bg-white rounded-lg border p-3" style={{ borderColor: color + '44' }}>
              <div className="flex items-center gap-2 mb-2">
                <DriverDot driver={driver} size={10} />
                <span className="font-semibold text-sm text-gray-800">{DRIVER_LABELS[driver]}</span>
              </div>
              <div className="text-xs text-gray-500 space-y-0.5">
                <div className="flex justify-between">
                  <span>Drive time</span>
                  <span className="font-mono font-medium text-gray-700">{formatHours(s.minutes)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Legs</span>
                  <span className="font-mono font-medium text-gray-700">{s.legs}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main App ────────────────────────────────────────────────────────────────

export default function App() {
  const [stops, setStops] = useState(null)
  const [notes, setNotes] = useState({})
  const [generalNote, setGeneralNote] = useState('')
  const [draggedStop, setDraggedStop] = useState(null)
  const [pinUnlocked, setPinUnlocked] = useState(() => sessionStorage.getItem('pin_unlocked') === '1')
  const [showPinModal, setShowPinModal] = useState(false)
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
    setStops(prev => prev.map(s => s.id === updated.id ? updated : s))
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
        <div className="min-h-screen bg-gray-50">
          {/* Header */}
          <header className="bg-white border-b border-gray-200 sticky top-0 z-30 no-print">
            <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
              <div>
                <h1 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">🚗 Road Trip 2026</h1>
                <p className="text-xs text-gray-400">May 14–17 · NYC → Columbia University</p>
              </div>
              <div className="flex items-center gap-2">
                {/* Lock/unlock toggle */}
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
                    className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 hover:bg-gray-100 transition-colors"
                  >
                    🔒 Locked
                  </button>
                )}

                {pinUnlocked && (
                  <button
                    onClick={resetData}
                    className="text-xs text-gray-400 hover:text-gray-700 border border-gray-200 rounded-lg px-2.5 py-1.5 hover:border-gray-400 transition-colors"
                  >
                    Reset
                  </button>
                )}
                <button
                  onClick={() => window.print()}
                  className="text-xs bg-gray-900 text-white rounded-lg px-3 py-1.5 hover:bg-gray-700 transition-colors font-medium"
                >
                  Export PDF
                </button>
              </div>
            </div>
          </header>

          {/* Print header */}
          <div className="hidden print:block p-8 pb-4">
            <h1 className="text-2xl font-bold text-gray-900">Road Trip 2026 · May 14–17</h1>
            <p className="text-gray-500 text-sm">NYC → Columbia University, New York</p>
          </div>

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
