import { useEffect, useState } from 'react'
import { useSearchParams } from '@/lib/router-compat'
import { ChevronLeft, ChevronRight, Plus, X, Clock, MapPin, User as UserIcon, CheckCircle2, Trash2, List, Grid3x3, Pencil, Bell } from 'lucide-react'
import { useEvents, useCreateEvent, useUpdateEvent, useDeleteEvent, fetchEventById } from '../../hooks/useEvents'
import { useClients } from '../../hooks/useClients'
import { useCases } from '../../hooks/useCases'
import { useUsers } from '../../hooks/useUsers'
import { useAuth } from '../../lib/AuthContext'
import { useToast } from '../../lib/ToastContext'
import { usePermissionsContext } from '../../contexts/PermissionsContext'

// Bright "highlighter marker" palette — solid fills only, no muting/opacity.
const EVENT_TYPES = [
  { key: 'Government Visit', color: '#FFD700', text: '#1a1a1a' }, // bright yellow
  { key: 'Client Meeting', color: '#FF1493', text: '#ffffff' },   // hot pink
  { key: 'Deadline', color: '#0099FF', text: '#ffffff' },         // electric blue
  { key: 'Internal Review', color: '#39FF14', text: '#1a1a1a' },  // lime green
  { key: 'Payment Follow-up', color: '#FF6600', text: '#ffffff' }, // bright orange
  { key: 'Renewal Reminder', color: '#9400D3', text: '#ffffff' }, // vivid purple
  { key: 'Document Collection', color: '#00E5FF', text: '#1a1a1a' }, // cyan
]
const TYPE_COLOR = Object.fromEntries(EVENT_TYPES.map(t => [t.key, t.color]))
const TYPE_TEXT = Object.fromEntries(EVENT_TYPES.map(t => [t.key, t.text]))

// Vivid, solid-fill palette for month-grid event pills — cycles by the event's
// index within its day (not by event type), same in light and dark mode.
const PILL_COLORS = [
  { bg: '#FF6B6B', text: '#ffffff' }, // coral red
  { bg: '#FFD93D', text: '#1a1a1a' }, // bright yellow
  { bg: '#6BCB77', text: '#1a1a1a' }, // lime green
  { bg: '#4D96FF', text: '#ffffff' }, // electric blue
  { bg: '#FF6FC8', text: '#ffffff' }, // hot pink
  { bg: '#C77DFF', text: '#ffffff' }, // vivid purple
  { bg: '#00C9A7', text: '#1a1a1a' }, // cyan green
]

const TODAY_BG = '#2563eb'
const WEEKEND_TINT = 'rgba(148,163,184,0.07)'
const GRID_LINE = 'rgba(148,163,184,0.28)'

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

const STAFF_COLORS = ['#f87171', '#fb923c', '#facc15', '#4ade80', '#22d3ee', '#818cf8', '#e879f9', '#fb7185', '#34d399', '#60a5fa']

function staffColor(userId) {
  if (!userId) return '#9896a4'
  let hash = 0
  for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) >>> 0
  return STAFF_COLORS[hash % STAFF_COLORS.length]
}

function staffInitials(name) {
  if (!name) return '?'
  return name.trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase()).join('')
}

function formatReminder(value, unit) {
  if (!value) return 'No reminder set'
  const n = Number(value)
  const label = unit === 'days' ? (n === 1 ? 'day' : 'days') : (n === 1 ? 'hour' : 'hours')
  return `${n} ${label} before`
}

function EventModal({ event, defaultDate, onClose }) {
  const { profile } = useAuth()
  const { can } = usePermissionsContext()
  const toast = useToast()
  const { mutateAsync: createEvent, isPending: creating } = useCreateEvent()
  const { mutateAsync: updateEvent, isPending: updating } = useUpdateEvent()
  const { mutateAsync: deleteEvent } = useDeleteEvent()
  const { data: users = [] } = useUsers()
  const { data: clients = [] } = useClients()
  const { data: cases = [] } = useCases()

  const isEdit = !!event
  // Existing events open into a read-only info card first; new events go
  // straight to the form since there's nothing yet to show read-only.
  const [isEditingForm, setIsEditingForm] = useState(!isEdit)
  const [form, setForm] = useState({
    title: event?.title || '',
    event_type: event?.event_type || 'Client Meeting',
    client_id: event?.client_id || '',
    case_id: event?.case_id || '',
    assigned_to: event?.assigned_to || profile?.id || '',
    start_date: event ? new Date(event.start_time).toISOString().split('T')[0] : (defaultDate || new Date().toISOString().split('T')[0]),
    start_time_only: event ? new Date(event.start_time).toTimeString().slice(0,5) : '09:00',
    location: event?.location || '',
    notes: event?.notes || '',
    is_completed: event?.is_completed || false,
    remind_before_value: event?.remind_before_value ?? '',
    remind_before_unit: event?.remind_before_unit || 'hours',
  })
  const set = (f, v) => setForm(p => ({ ...p, [f]: v }))

  async function handleSubmit() {
    if (!form.title.trim()) { toast('Event title is required', 'error'); return }
    const start_time = new Date(`${form.start_date}T${form.start_time_only}`).toISOString()
    const payload = {
      title: form.title, event_type: form.event_type,
      client_id: form.client_id || null, case_id: form.case_id || null,
      assigned_to: form.assigned_to || null, start_time,
      location: form.location || null, notes: form.notes || null,
      is_completed: form.is_completed,
      remind_before_value: form.remind_before_value ? Number(form.remind_before_value) : null,
      remind_before_unit: form.remind_before_value ? form.remind_before_unit : null,
    }
    try {
      if (isEdit) {
        await updateEvent({ id: event.id, ...payload })
        toast('Event updated', 'success')
      } else {
        await createEvent({ ...payload, created_by: profile?.id })
        toast('Event scheduled', 'success')
      }
      onClose()
    } catch (err) { toast(err.message || 'Failed to save event', 'error') }
  }

  async function handleDelete() {
    try { await deleteEvent(event.id); toast('Event deleted', 'success'); onClose() }
    catch (err) { toast(err.message || 'Failed to delete', 'error') }
  }

  async function markComplete() {
    try { await updateEvent({ id: event.id, is_completed: true }); set('is_completed', true); toast('Marked complete', 'success') }
    catch (err) { toast(err.message || 'Failed to update', 'error') }
  }

  if (isEdit && !isEditingForm) {
    return (
      <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 16, border: '1px solid var(--bg-border)', width: '100%', maxWidth: 440, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--bg-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}>{event.title}</h2>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0 }}><X size={20} /></button>
          </div>

          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
              <Clock size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
              {new Date(event.start_time).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })} · {new Date(event.start_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true })}
            </div>

            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Description</div>
              <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{event.notes || 'No description'}</div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
              <Bell size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
              {formatReminder(event.remind_before_value, event.remind_before_unit)}
            </div>

            {form.is_completed ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--status-active)', fontWeight: 600 }}>
                <CheckCircle2 size={14} /> Completed
              </div>
            ) : (
              <button onClick={markComplete} className="btn-ghost" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13 }}>
                <CheckCircle2 size={14} color="var(--text-muted)" /> Mark as completed
              </button>
            )}
          </div>

          <div style={{ padding: '16px 24px', borderTop: '1px solid var(--bg-border)', display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn-gold" onClick={() => setIsEditingForm(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Pencil size={14} /> Edit
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 16, border: '1px solid var(--bg-border)', width: '100%', maxWidth: 520, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--bg-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, color: 'var(--text-primary)' }}>{isEdit ? 'Edit Event' : 'New Event'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Title *</label>
            <input className="input-base" placeholder="e.g. Trade license renewal at MoCI" value={form.title} onChange={e => set('title', e.target.value)} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Event Type</label>
              <select className="input-base" value={form.event_type} onChange={e => set('event_type', e.target.value)}>
                {EVENT_TYPES.map(t => <option key={t.key} value={t.key}>{t.key}</option>)}
              </select>
            </div>
            {can('can_access_settings') && (
              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Assign To</label>
                <select className="input-base" value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)}>
                  <option value="">Unassigned</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Date</label>
              <input className="input-base" type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Time</label>
              <input className="input-base" type="time" value={form.start_time_only} onChange={e => set('start_time_only', e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Client</label>
              <select className="input-base" value={form.client_id} onChange={e => set('client_id', e.target.value)}>
                <option value="">None</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.company_name || c.contact_person}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Related Case</label>
              <select className="input-base" value={form.case_id} onChange={e => set('case_id', e.target.value)}>
                <option value="">None</option>
                {cases.map(c => <option key={c.id} value={c.id}>{c.case_number} — {c.title}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Location</label>
            <input className="input-base" placeholder="e.g. Ministry of Commerce, Doha" value={form.location} onChange={e => set('location', e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Notes</label>
            <textarea className="input-base" rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} style={{ resize: 'vertical' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Remind Me</label>
            <div style={{ display: 'flex', gap: 10 }}>
              <input className="input-base" type="number" min="0" placeholder="e.g. 2" value={form.remind_before_value} onChange={e => set('remind_before_value', e.target.value)} style={{ flex: 1 }} />
              <select className="input-base" value={form.remind_before_unit} onChange={e => set('remind_before_unit', e.target.value)} style={{ flex: 1 }}>
                <option value="hours">Hours</option>
                <option value="days">Days</option>
              </select>
            </div>
          </div>
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--bg-border)', display: 'flex', justifyContent: 'space-between', gap: 10 }}>
          {isEdit ? (
            <button className="btn-danger" onClick={handleDelete} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Trash2 size={14} /> Delete</button>
          ) : <div />}
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn-gold" onClick={handleSubmit} disabled={creating || updating}>{creating || updating ? 'Saving...' : isEdit ? 'Save Changes' : 'Schedule Event'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CalendarPage() {
  const { profile } = useAuth()
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const isSuperAdmin = profile?.role === 'super_admin'
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState('month')
  const [showNew, setShowNew] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [newEventDate, setNewEventDate] = useState(null)
  const [dayOverflow, setDayOverflow] = useState(null)
  const [typeFilter, setTypeFilter] = useState('all')
  const [calendarView, setCalendarView] = useState('mine') // 'mine' | 'all' — 'all' only reachable by super_admin

  const showingAllStaff = isSuperAdmin && calendarView === 'all'
  const { data: events = [], isLoading } = useEvents(currentDate, { createdBy: showingAllStaff ? undefined : profile?.id })

  // Deep link from the Overview: /calendar?open=EVENT_ID opens that event (and
  // jumps to its month). The param is cleared once handled so a refresh does not
  // reopen it.
  const openId = searchParams.get('open')
  useEffect(() => {
    if (!openId) return
    fetchEventById(openId)
      .then(ev => {
        if (!ev) { toast('That event could not be found', 'error'); return }
        setCurrentDate(new Date(ev.start_time))
        setEditingEvent(ev)
      })
      .catch(err => toast(err.message || 'Could not open that event', 'error'))
      .finally(() => setSearchParams({}, { replace: true }))
  }, [openId, setSearchParams, toast])

  const filtered = typeFilter === 'all' ? events : events.filter(e => e.event_type === typeFilter)

  function changeMonth(delta) {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1))
  }

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date()

  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  function eventsForDay(day) {
    if (!day) return []
    return filtered.filter(e => {
      const d = new Date(e.start_time)
      return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year
    }).sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
  }

  function openNewEvent(day) {
    const date = new Date(year, month, day || today.getDate())
    setNewEventDate(date.toISOString().split('T')[0])
    setShowNew(true)
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Calendar</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Appointments, deadlines, and PRO visits</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {isSuperAdmin && (
            <div style={{ display: 'inline-flex', background: 'var(--bg-elevated)', borderRadius: 8, padding: 3, gap: 2 }}>
              {[{ key: 'mine', label: 'My Calendar' }, { key: 'all', label: 'All Staff' }].map(v => (
                <button
                  key={v.key}
                  onClick={() => setCalendarView(v.key)}
                  style={{
                    padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
                    background: calendarView === v.key ? 'var(--accent-gold-dim)' : 'transparent',
                    color: calendarView === v.key ? 'var(--accent-gold)' : 'var(--text-muted)',
                    transition: 'all 0.15s',
                  }}
                >
                  {v.label}
                </button>
              ))}
            </div>
          )}
          <button className="btn-gold" onClick={() => openNewEvent(null)} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Plus size={15} /> New Event
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: '12px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => changeMonth(-1)} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', borderRadius: 8, cursor: 'pointer', color: 'var(--text-secondary)', padding: 6, display: 'flex' }}><ChevronLeft size={16} /></button>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', minWidth: 160, textAlign: 'center' }}>{MONTH_NAMES[month]} {year}</div>
          <button onClick={() => changeMonth(1)} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', borderRadius: 8, cursor: 'pointer', color: 'var(--text-secondary)', padding: 6, display: 'flex' }}><ChevronRight size={16} /></button>
          <button onClick={() => setCurrentDate(new Date())} className="btn-ghost" style={{ fontSize: 12, padding: '6px 12px' }}>Today</button>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select className="input-base" style={{ width: 180, fontSize: 12 }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="all">All Event Types</option>
            {EVENT_TYPES.map(t => <option key={t.key} value={t.key}>{t.key}</option>)}
          </select>
          <button onClick={() => setView('month')} style={{ background: view === 'month' ? 'var(--accent-gold-dim)' : 'var(--bg-elevated)', border: '1px solid var(--bg-border)', borderRadius: 8, cursor: 'pointer', color: view === 'month' ? 'var(--accent-gold)' : 'var(--text-muted)', padding: 6, display: 'flex' }}><Grid3x3 size={16} /></button>
          <button onClick={() => setView('list')} style={{ background: view === 'list' ? 'var(--accent-gold-dim)' : 'var(--bg-elevated)', border: '1px solid var(--bg-border)', borderRadius: 8, cursor: 'pointer', color: view === 'list' ? 'var(--accent-gold)' : 'var(--text-muted)', padding: 6, display: 'flex' }}><List size={16} /></button>
        </div>
      </div>

      {isLoading ? (
        <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading calendar...</div>
      ) : view === 'month' ? (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: `1px solid ${GRID_LINE}` }}>
            {DAY_NAMES.map((d, i) => (
              <div key={d} style={{ padding: '10px 8px', textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', background: (i === 0 || i === 6) ? WEEKEND_TINT : 'transparent' }}>{d}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {cells.map((day, idx) => {
              const dayEvents = eventsForDay(day)
              const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
              const col = idx % 7
              const isWeekend = col === 0 || col === 6
              return (
                <div key={idx} onClick={() => day && openNewEvent(day)} style={{ minHeight: 100, padding: 8, borderRight: (idx + 1) % 7 !== 0 ? `1px solid ${GRID_LINE}` : 'none', borderBottom: `1px solid ${GRID_LINE}`, cursor: day ? 'pointer' : 'default', background: isToday ? TODAY_BG : (isWeekend ? WEEKEND_TINT : 'transparent') }}>
                  {day && (
                    <>
                      <div style={{ fontSize: 12, fontWeight: 700, color: isToday ? '#ffffff' : 'var(--text-primary)', marginBottom: 6 }}>{day}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {dayEvents.slice(0, 3).map((ev, i) => {
                          const pill = PILL_COLORS[i % PILL_COLORS.length]
                          return (
                            <div key={ev.id} onClick={(e) => { e.stopPropagation(); setEditingEvent(ev) }} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: pill.bg, color: pill.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textDecoration: ev.is_completed ? 'line-through' : 'none', opacity: ev.is_completed ? 0.5 : 1 }}>
                              {showingAllStaff && (
                                <span title={ev.created_by_user?.full_name} style={{ width: 6, height: 6, borderRadius: '50%', background: staffColor(ev.created_by), flexShrink: 0 }} />
                              )}
                              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{ev.title}</span>
                            </div>
                          )
                        })}
                        {dayEvents.length > 3 && (
                          <div
                            onClick={(e) => { e.stopPropagation(); setDayOverflow({ day, events: dayEvents }) }}
                            style={{ fontSize: 10, fontWeight: 700, color: '#FF1493', cursor: 'pointer' }}
                          >
                            +{dayEvents.length - 3} more
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>No events scheduled this month</div>
          ) : (
            <div>
              {filtered.map(ev => (
                <div key={ev.id} onClick={() => setEditingEvent(ev)} style={{ padding: '14px 20px', borderBottom: '1px solid var(--bg-border)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 4, height: 36, borderRadius: 4, background: TYPE_COLOR[ev.event_type] || '#9896a4', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', textDecoration: ev.is_completed ? 'line-through' : 'none', opacity: ev.is_completed ? 0.5 : 1 }}>{ev.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 12, marginTop: 2, flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={11} />{new Date(ev.start_time).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} · {new Date(ev.start_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                      {ev.location && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={11} />{ev.location}</span>}
                      {ev.assigned_to_user && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><UserIcon size={11} />{ev.assigned_to_user.full_name}</span>}
                    </div>
                  </div>
                  {showingAllStaff && (
                    <span
                      title={ev.created_by_user?.full_name}
                      style={{
                        width: 22, height: 22, borderRadius: '50%', flexShrink: 0, background: staffColor(ev.created_by),
                        color: '#fff', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      {staffInitials(ev.created_by_user?.full_name)}
                    </span>
                  )}
                  <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, background: TYPE_COLOR[ev.event_type] || '#FFD700', color: TYPE_TEXT[ev.event_type] || '#1a1a1a', fontWeight: 600 }}>{ev.event_type}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showNew && <EventModal defaultDate={newEventDate} onClose={() => { setShowNew(false); setNewEventDate(null) }} />}
      {editingEvent && <EventModal event={editingEvent} onClose={() => setEditingEvent(null)} />}
      {dayOverflow && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDayOverflow(null)}>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 16, border: '1px solid var(--bg-border)', width: '100%', maxWidth: 360, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--bg-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
                {MONTH_NAMES[month]} {dayOverflow.day}, {year}
              </h2>
              <button onClick={() => setDayOverflow(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <div style={{ maxHeight: 320, overflowY: 'auto', padding: 8 }}>
              {dayOverflow.events.map(ev => (
                <div
                  key={ev.id}
                  onClick={() => { setDayOverflow(null); setEditingEvent(ev) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, cursor: 'pointer' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-elevated)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: TYPE_COLOR[ev.event_type] || '#FFD700', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', textDecoration: ev.is_completed ? 'line-through' : 'none', opacity: ev.is_completed ? 0.5 : 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {ev.title}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {new Date(ev.start_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}