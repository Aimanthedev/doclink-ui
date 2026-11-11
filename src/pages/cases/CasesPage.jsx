import { useState, useEffect } from 'react'
import { useSearchParams } from '@/lib/router-compat'
import { statusFromParams } from '../../lib/urlStatus'
import { Plus, Search, Filter, FolderOpen } from 'lucide-react'
import { useCases } from '../../hooks/useCases'
import { usePermissionsContext } from '../../contexts/PermissionsContext'
import NewCaseModal from './NewCaseModal'
import CaseDetailDrawer from './CaseDetailDrawer'

const STATUS_TABS = ['all', 'active', 'waiting_client', 'government_review', 'completed', 'overdue']
const PRIORITY_COLOR = { low: '#94a3b8', medium: '#2563eb', high: '#f59e0b', urgent: '#ef4444', critical: '#ef4444' }
const STATUS_BADGE = {
  active:            { bg: 'rgba(37,99,235,0.15)',  color: '#3b82f6' },
  government_review: { bg: 'rgba(139,92,246,0.15)', color: '#8b5cf6' },
  waiting_client:    { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' },
  completed:         { bg: 'rgba(16,185,129,0.15)', color: '#10b981' },
  overdue:           { bg: 'rgba(239,68,68,0.15)',  color: '#ef4444' },
  cancelled:         { bg: 'rgba(148,163,184,0.15)', color: '#94a3b8' },
}
// Visual-only stand-in for a real progress field (none exists on cases) — derived from status.
const STATUS_PROGRESS_PCT = { active: 50, waiting_client: 25, government_review: 75, completed: 100, cancelled: 0 }

function formatDate(dateStr) {
  return new Date(dateStr).toISOString().slice(0, 10)
}

export default function CasesPage() {
  const { can } = usePermissionsContext()
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeStatus, setActiveStatus] = useState(() => statusFromParams(searchParams, STATUS_TABS))
  const [search, setSearch] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [selectedId, setSelectedId] = useState(null)

  const { data: cases = [], isLoading } = useCases({
    ...(activeStatus !== 'all' && { status: activeStatus }),
    ...(search.trim() && { search }),
  })

  // Deep-link from global search — /cases?open=CASE_ID opens the drawer
  // directly, then the param is cleared so a refresh doesn't re-trigger it.
  // Depends on searchParams (not just mount) so re-searching for a different
  // case while already on this page still opens the new drawer.
  useEffect(() => {
    const openId = searchParams.get('open')
    if (openId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedId(openId)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const stats = {
    total: cases.length,
    active: cases.filter(c => c.status === 'active').length,
    waiting: cases.filter(c => c.status === 'waiting_client').length,
    overdue: cases.filter(c => c.status === 'overdue').length,
    completed: cases.filter(c => c.status === 'completed').length,
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4, letterSpacing: '-0.02em' }}>Cases</h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Track and manage all active service cases</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 8, borderRadius: 10 }}>
            <Filter size={14} /> Filters
          </button>
          {can('can_manage_cases') && (
            <button
              className="btn-glow"
              onClick={() => setShowNew(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, borderRadius: 10,
                background: 'linear-gradient(135deg, #3b82f6, #6366f1)', color: '#fff', border: 'none',
                padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              <Plus size={15} /> New Case
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total', value: stats.total, color: 'var(--text-primary)' },
          { label: 'Active', value: stats.active, color: '#3b82f6' },
          { label: 'Waiting Client', value: stats.waiting, color: '#f59e0b' },
          { label: 'Overdue / Urgent', value: stats.overdue, color: '#ef4444' },
        ].map(s => (
          <div key={s.label} className="glass" style={{ borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Search + status tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="input-base"
            style={{
              paddingLeft: 36,
              background: 'var(--bg-elevated)',
              border: `1px solid ${searchFocused ? '#2563eb' : 'var(--bg-border)'}`,
              borderRadius: 10,
            }}
            placeholder="Search by case number or title..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
        </div>

        <div style={{ display: 'inline-flex', background: 'var(--bg-elevated)', borderRadius: 10, padding: 4, gap: 2, flexWrap: 'wrap' }}>
          {STATUS_TABS.map(s => {
            const active = activeStatus === s
            return (
              <button
                key={s}
                onClick={() => setActiveStatus(s)}
                style={{
                  padding: '7px 16px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: active ? 600 : 500,
                  border: 'none',
                  cursor: 'pointer',
                  background: active ? 'var(--bg-card)' : 'transparent',
                  color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                  boxShadow: active ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
                  textTransform: 'capitalize',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s',
                }}
              >
                {s.replace('_', ' ')}
              </button>
            )
          })}
        </div>
      </div>

      {/* Table */}
      <div className="glass" style={{ borderRadius: 12, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading cases...</div>
        ) : cases.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <FolderOpen size={36} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
            <div style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 4 }}>No cases found</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Create your first case using the button above</div>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ background: 'transparent', borderBottom: '1px solid var(--bg-border)' }}>Case</th>
                <th style={{ background: 'transparent', borderBottom: '1px solid var(--bg-border)' }}>Client</th>
                <th style={{ background: 'transparent', borderBottom: '1px solid var(--bg-border)' }}>Service</th>
                <th style={{ background: 'transparent', borderBottom: '1px solid var(--bg-border)' }}>Assigned</th>
                <th style={{ background: 'transparent', borderBottom: '1px solid var(--bg-border)' }}>Status</th>
                <th style={{ background: 'transparent', borderBottom: '1px solid var(--bg-border)' }}>Priority</th>
                <th style={{ background: 'transparent', borderBottom: '1px solid var(--bg-border)' }}>Due</th>
                <th style={{ background: 'transparent', borderBottom: '1px solid var(--bg-border)' }}>Progress</th>
                <th style={{ background: 'transparent', borderBottom: '1px solid var(--bg-border)', textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {cases.map(c => {
                const isOverdue = c.due_date && new Date(c.due_date) < new Date()
                const statusBadge = STATUS_BADGE[c.status] || STATUS_BADGE.cancelled
                const priorityColor = PRIORITY_COLOR[c.priority] || PRIORITY_COLOR.low
                const progressPct = STATUS_PROGRESS_PCT[c.status] ?? 0
                return (
                  <tr key={c.id} onClick={() => setSelectedId(c.id)} style={{ cursor: 'pointer' }}>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>{c.case_number}</span>
                    </td>
                    <td style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {c.client?.company_name || c.client?.contact_person}
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{c.service?.name || c.title}</td>
                    <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{c.assigned_to_user?.full_name || '—'}</td>
                    <td>
                      <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: statusBadge.bg, color: statusBadge.color, fontWeight: 500, textTransform: 'capitalize' }}>
                        {c.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: priorityColor, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{c.priority}</span>
                      </span>
                    </td>
                    <td style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: isOverdue ? '#ef4444' : 'var(--text-muted)' }}>
                      {c.due_date ? formatDate(c.due_date) : '—'}
                    </td>
                    <td>
                      {c.status === 'overdue' ? (
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#ef4444' }}>Overdue</span>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 60, height: 6, background: 'var(--bg-border)', borderRadius: 3, overflow: 'hidden', flexShrink: 0 }}>
                            <div style={{ height: '100%', width: `${progressPct}%`, background: '#2563eb', borderRadius: 3 }} />
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{progressPct}%</span>
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', textAlign: 'right' }}>
                      {c.amount > 0 ? `QAR ${Math.round(Number(c.amount)).toLocaleString('en-US')}` : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {showNew && <NewCaseModal onClose={() => setShowNew(false)} />}
      {selectedId && <CaseDetailDrawer caseId={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  )
}
