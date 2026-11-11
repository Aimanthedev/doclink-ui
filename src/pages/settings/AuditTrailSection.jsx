import { useState } from 'react'
import { ChevronDown, ChevronRight, ShieldCheck } from 'lucide-react'
import { useLoginEvents, useActivityLogs, useActivityLogUsers, PAGE_SIZE } from '../../hooks/useAuditLogs'

const EVENT_COLOR = {
  login: { bg: 'rgba(16,185,129,0.15)', fg: '#10b981' },
  logout: { bg: 'rgba(148,163,184,0.15)', fg: '#94a3b8' },
}

const ACTION_COLOR = {
  CREATE: { bg: 'rgba(16,185,129,0.15)', fg: '#10b981' },
  UPDATE: { bg: 'rgba(59,130,246,0.15)', fg: '#3b82f6' },
  DELETE: { bg: 'rgba(239,68,68,0.15)', fg: '#ef4444' },
}

function formatTableName(name) {
  if (!name) return '—'
  return name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function shortId(id) {
  return id ? String(id).slice(0, 8) : '—'
}

function formatDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

function Pill({ label, bg, fg }) {
  return (
    <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 500, background: bg, color: fg, textTransform: 'capitalize' }}>
      {label}
    </span>
  )
}

function DateRangeFilter({ from, to, onFrom, onTo }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>From</label>
        <input className="input-base" type="date" style={{ width: 150 }} value={from} onChange={e => onFrom(e.target.value)} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>To</label>
        <input className="input-base" type="date" style={{ width: 150 }} value={to} onChange={e => onTo(e.target.value)} />
      </div>
    </div>
  )
}

function PaginationRow({ page, totalPages, onPrev, onNext }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 14 }}>
      <button className="btn-ghost" onClick={onPrev} disabled={page <= 1} style={{ fontSize: 12, padding: '6px 14px' }}>
        Previous
      </button>
      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Page {page} of {totalPages}</span>
      <button className="btn-ghost" onClick={onNext} disabled={page >= totalPages} style={{ fontSize: 12, padding: '6px 14px' }}>
        Next
      </button>
    </div>
  )
}

function LoginHistoryTable() {
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useLoginEvents(fromDate, toDate, page)
  const events = data?.data ?? []
  const totalPages = Math.max(1, Math.ceil((data?.count ?? 0) / PAGE_SIZE))

  function updateRange(setter) {
    return value => { setter(value); setPage(1) }
  }

  return (
    <div style={{ marginBottom: 32 }}>
      <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 10 }}>Login History</h3>
      <DateRangeFilter from={fromDate} to={toDate} onFrom={updateRange(setFromDate)} onTo={updateRange(setToDate)} />

      {isLoading ? (
        <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading login history...</div>
      ) : events.length === 0 ? (
        <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No login activity found.</div>
      ) : (
        <>
          <table className="data-table">
            <thead>
              <tr>
                <th>User Email</th>
                <th>Event</th>
                <th>Date & Time</th>
              </tr>
            </thead>
            <tbody>
              {events.map(ev => {
                const color = EVENT_COLOR[ev.event_type] || EVENT_COLOR.logout
                return (
                  <tr key={ev.id}>
                    <td style={{ fontSize: 13, color: 'var(--text-primary)' }}>{ev.user_email}</td>
                    <td><Pill label={ev.event_type === 'login' ? 'Login' : 'Logout'} bg={color.bg} fg={color.fg} /></td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDateTime(ev.created_at)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <PaginationRow page={page} totalPages={totalPages} onPrev={() => setPage(p => Math.max(1, p - 1))} onNext={() => setPage(p => Math.min(totalPages, p + 1))} />
        </>
      )}
    </div>
  )
}

function ActivityLogTable() {
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [userId, setUserId] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useActivityLogs(fromDate, toDate, userId || undefined, page)
  const logs = data?.data ?? []
  const totalPages = Math.max(1, Math.ceil((data?.count ?? 0) / PAGE_SIZE))
  const { data: users = [] } = useActivityLogUsers()

  function updateFilter(setter) {
    return value => { setter(value); setPage(1) }
  }

  return (
    <div>
      <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 10 }}>Activity Log</h3>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <DateRangeFilter from={fromDate} to={toDate} onFrom={updateFilter(setFromDate)} onTo={updateFilter(setToDate)} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>User</label>
          <select className="input-base" style={{ width: 180 }} value={userId} onChange={e => updateFilter(setUserId)(e.target.value)}>
            <option value="">All users</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.email}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading activity log...</div>
      ) : logs.length === 0 ? (
        <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No activity found.</div>
      ) : (
        <>
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Action</th>
                <th>Table</th>
                <th>Record ID</th>
                <th>Date & Time</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => {
                const color = ACTION_COLOR[log.action] || { bg: 'var(--bg-elevated)', fg: 'var(--text-muted)' }
                return (
                  <tr key={log.id}>
                    <td style={{ fontSize: 13, color: 'var(--text-primary)' }}>{log.user_email}</td>
                    <td><Pill label={log.action} bg={color.bg} fg={color.fg} /></td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{formatTableName(log.table_name)}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{shortId(log.record_id)}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDateTime(log.created_at)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <PaginationRow page={page} totalPages={totalPages} onPrev={() => setPage(p => Math.max(1, p - 1))} onNext={() => setPage(p => Math.min(totalPages, p + 1))} />
        </>
      )}
    </div>
  )
}

export default function AuditTrailSection() {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="card" style={{ padding: 0, marginBottom: 20, overflow: 'hidden' }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{ padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, background: 'var(--bg-elevated)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ShieldCheck size={16} color="var(--accent-gold)" />
          </div>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Audit Trail</h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Login history and record activity across the system</p>
          </div>
        </div>
        {expanded ? <ChevronDown size={18} color="var(--text-muted)" /> : <ChevronRight size={18} color="var(--text-muted)" />}
      </div>

      {expanded && (
        <div style={{ padding: '0 24px 24px' }}>
          <div className="gold-line" style={{ marginBottom: 20 }} />
          <LoginHistoryTable />
          <ActivityLogTable />
        </div>
      )}
    </div>
  )
}
