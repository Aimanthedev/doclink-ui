import { useState, useEffect, useRef } from 'react'
import { Calendar, Download, ChevronDown } from 'lucide-react'
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { useReports } from '../../hooks/useReports'
import { useLeadPerformance } from '../../hooks/useLeadPerformance'
import { useAuth } from '../../lib/AuthContext'
import { useToast } from '../../lib/ToastContext'
import { exportOverviewCSV, exportInvoicesXLSX, exportLeadsXLSX, exportCasesXLSX } from '../../lib/exportReports'

const STATUS_COLOR = { active: '#10b981', waiting_client: '#f59e0b', government_review: '#6366f1', completed: '#3b82f6', overdue: '#ef4444', cancelled: '#94a3b8' }
const STAGE_ORDER = ['new_lead', 'consultation', 'proposal_sent', 'documents_requested', 'won', 'lost']
const STAGE_LABEL = { new_lead: 'New Lead', consultation: 'Consultation', proposal_sent: 'Proposal Sent', documents_requested: 'Documents Requested', won: 'Won', lost: 'Lost' }
const STAGE_COLOR = { new_lead: '#6366f1', consultation: '#3b82f6', proposal_sent: '#8b5cf6', documents_requested: '#f59e0b', won: '#10b981', lost: '#ef4444' }

const LEAD_PERF_RANGES = [
  { key: 'this_month', label: 'This Month' },
  { key: 'last_month', label: 'Last Month' },
  { key: 'all_time', label: 'All Time' },
]
const LEAD_PERF_SORTS = [
  { key: 'total', label: 'Total Leads' },
  { key: 'value', label: 'Total Value' },
]

function pillTabStyle(active) {
  return {
    padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
    background: active ? 'var(--accent-gold-dim)' : 'transparent',
    color: active ? 'var(--accent-gold)' : 'var(--text-muted)',
    transition: 'all 0.15s',
  }
}

function LeadPerformanceSection() {
  const { profile } = useAuth()
  const isSuperAdmin = profile?.role === 'super_admin'
  const [rangeKey, setRangeKey] = useState('this_month')
  const [sortBy, setSortBy] = useState('total')
  const { data: leads = [], isLoading } = useLeadPerformance(rangeKey)

  const grouped = new Map()
  for (const l of leads) {
    if (!l.assigned_to) continue
    if (!grouped.has(l.assigned_to)) {
      grouped.set(l.assigned_to, {
        id: l.assigned_to,
        name: l.assigned_to_user?.full_name || 'Unknown',
        total: 0,
        value: 0,
        stages: Object.fromEntries(STAGE_ORDER.map(s => [s, 0])),
      })
    }
    const row = grouped.get(l.assigned_to)
    row.total += 1
    row.value += Number(l.estimated_value || 0)
    if (row.stages[l.stage] !== undefined) row.stages[l.stage] += 1
  }

  let rows = [...grouped.values()]
  if (!isSuperAdmin) rows = rows.filter(r => r.id === profile?.id)
  rows.sort((a, b) => sortBy === 'value' ? b.value - a.value : b.total - a.total)

  const maxMetric = Math.max(1, ...rows.map(r => sortBy === 'value' ? r.value : r.total))

  return (
    <div className="glass" style={{ borderRadius: 12, padding: 20, marginTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Lead Performance by Employee</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'inline-flex', background: 'var(--bg-elevated)', borderRadius: 8, padding: 3, gap: 2 }}>
            {LEAD_PERF_RANGES.map(o => (
              <button key={o.key} onClick={() => setRangeKey(o.key)} style={pillTabStyle(rangeKey === o.key)}>{o.label}</button>
            ))}
          </div>
          <div style={{ display: 'inline-flex', background: 'var(--bg-elevated)', borderRadius: 8, padding: 3, gap: 2 }}>
            {LEAD_PERF_SORTS.map(o => (
              <button key={o.key} onClick={() => setSortBy(o.key)} style={pillTabStyle(sortBy === o.key)}>Sort: {o.label}</button>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0' }}>Loading lead performance...</div>
      ) : rows.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0' }}>No leads assigned in this period</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {rows.map(r => {
            const metric = sortBy === 'value' ? r.value : r.total
            const pct = Math.max(4, Math.round((metric / maxMetric) * 100))
            return (
              <div key={r.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <div style={{ width: 140, flexShrink: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
                  <div style={{ flex: 1, height: 20, background: 'var(--bg-elevated)', borderRadius: 6, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #3b82f6, #6366f1)', borderRadius: 6 }} />
                  </div>
                  <div style={{ width: 50, flexShrink: 0, textAlign: 'right', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{r.total}</div>
                  <div style={{ width: 120, flexShrink: 0, textAlign: 'right', fontSize: 12, color: 'var(--text-muted)' }}>QAR {Math.round(r.value).toLocaleString('en-US')}</div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginLeft: 152 }}>
                  {STAGE_ORDER.filter(s => r.stages[s] > 0).map(s => (
                    <span key={s} style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: `${STAGE_COLOR[s]}22`, color: STAGE_COLOR[s] }}>
                      {STAGE_LABEL[s]} · {r.stages[s]}
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const tooltipStyle = { contentStyle: { background: 'var(--bg-elevated)', borderRadius: 8, border: '1px solid var(--bg-border)', fontSize: 12 }, labelStyle: { color: 'var(--text-secondary)' } }
const axisProps = { stroke: 'var(--text-muted)', fontSize: 11, tickLine: false, axisLine: false }

function getDefaultRange() {
  const end = new Date()
  const start = new Date()
  start.setMonth(start.getMonth() - 1)
  return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] }
}

function getPresets(setRange) {
  const today = new Date()
  return [
    { label: 'Last 7 Days', fn: () => { const s = new Date(); s.setDate(s.getDate() - 7); setRange({ start: s.toISOString().split('T')[0], end: today.toISOString().split('T')[0] }) } },
    { label: 'Last 30 Days', fn: () => { const s = new Date(); s.setDate(s.getDate() - 30); setRange({ start: s.toISOString().split('T')[0], end: today.toISOString().split('T')[0] }) } },
    { label: 'This Month', fn: () => { const s = new Date(today.getFullYear(), today.getMonth(), 1); setRange({ start: s.toISOString().split('T')[0], end: today.toISOString().split('T')[0] }) } },
    { label: 'This Year', fn: () => { const s = new Date(today.getFullYear(), 0, 1); setRange({ start: s.toISOString().split('T')[0], end: today.toISOString().split('T')[0] }) } },
  ]
}

export default function ReportsPage() {
  const [range, setRange] = useState(getDefaultRange())
  const { data, isLoading } = useReports(range)
  const toast = useToast()

  const [exportOpen, setExportOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const exportRef = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (exportRef.current && !exportRef.current.contains(e.target)) setExportOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function runExport(fn) {
    setExportOpen(false)
    setExporting(true)
    try {
      await fn()
    } catch (err) {
      toast(err.message || 'Export failed', 'error')
    } finally {
      setExporting(false)
    }
  }

  const statusData = data ? Object.entries(data.statusBreakdown).map(([status, count]) => ({ name: status.replace('_', ' '), status, value: count, color: STATUS_COLOR[status] || '#94a3b8' })) : []
  const stageData = data ? STAGE_ORDER.map(stage => ({ stage, label: STAGE_LABEL[stage], value: data.stageBreakdown[stage] || 0 })) : []
  const categoryData = data ? Object.entries(data.revenueByCategory).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value) : []
  const employeeData = data ? data.employeeStats.map(e => ({ ...e, firstName: e.name.split(' ')[0] })) : []
  const renewalProgress = data && data.renewalsCreated > 0 ? Math.round((data.renewalsCompleted / data.renewalsCreated) * 100) : 0

  const kpis = data ? [
    { label: 'Total Cases', value: data.totalCases, color: 'var(--text-primary)' },
    { label: 'Completed', value: data.completedCases, color: '#10b981' },
    { label: 'Conversion Rate', value: `${data.conversionRate}%`, color: '#3b82f6' },
    { label: 'Total Revenue', value: `QAR ${Math.round(data.totalRevenue).toLocaleString('en-US')}`, color: 'var(--text-primary)' },
    { label: 'Collected', value: `QAR ${Math.round(data.totalCollected).toLocaleString('en-US')}`, color: '#10b981' },
    { label: 'Outstanding', value: `QAR ${Math.round(data.totalOutstanding).toLocaleString('en-US')}`, color: '#f59e0b' },
  ] : []

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4, letterSpacing: '-0.02em' }}>Reports</h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Operational and financial performance overview</p>
        </div>

        <div ref={exportRef} style={{ position: 'relative' }}>
          <button
            className="btn-gold"
            onClick={() => setExportOpen(v => !v)}
            disabled={exporting}
            style={{ display: 'flex', alignItems: 'center', gap: 8, borderRadius: 10 }}
          >
            <Download size={15} /> {exporting ? 'Exporting...' : 'Export Report'} <ChevronDown size={14} />
          </button>

          {exportOpen && (
            <div style={{
              position: 'absolute', right: 0, top: 'calc(100% + 6px)', minWidth: 220,
              background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', borderRadius: 12,
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)', zIndex: 300, padding: 6,
            }}>
              {[
                { label: 'Export Overview (CSV)', fn: () => exportOverviewCSV(data, range) },
                { label: 'Export Invoices (XLSX)', fn: () => exportInvoicesXLSX(range) },
                { label: 'Export Leads (XLSX)', fn: () => exportLeadsXLSX() },
                { label: 'Export Cases (XLSX)', fn: () => exportCasesXLSX(range) },
              ].map(item => (
                <div
                  key={item.label}
                  onClick={() => runExport(item.fn)}
                  style={{ padding: '10px 12px', borderRadius: 8, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  {item.label}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: '14px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <Calendar size={14} color="var(--text-muted)" />
        <input className="input-base" type="date" style={{ width: 150 }} value={range.start} onChange={e => setRange(p => ({ ...p, start: e.target.value }))} />
        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>to</span>
        <input className="input-base" type="date" style={{ width: 150 }} value={range.end} onChange={e => setRange(p => ({ ...p, end: e.target.value }))} />
        <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
          {getPresets(setRange).map(p => (
            <button key={p.label} onClick={p.fn} className="btn-ghost" style={{ fontSize: 11, padding: '6px 12px' }}>{p.label}</button>
          ))}
        </div>
      </div>

      {isLoading || !data ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>Loading report data...</div>
      ) : (
        <>
          {/* Section 1 — KPI row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 14, marginBottom: 24 }}>
            {kpis.map(k => (
              <div key={k.label} className="glass" style={{ borderRadius: 10, padding: '16px 18px' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{k.label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: k.color }}>{k.value}</div>
              </div>
            ))}
          </div>

          {/* Section 2 — charts row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-3" style={{ gap: 16, marginBottom: 16 }}>
            <div className="glass lg:col-span-2" style={{ borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>Revenue vs Collections</div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={data.revenueByMonth}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-border)" />
                  <XAxis dataKey="month" {...axisProps} />
                  <YAxis {...axisProps} tickFormatter={v => `${v / 1000}k`} />
                  <Tooltip {...tooltipStyle} />
                  <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#3b82f6" strokeWidth={2} fill="url(#revGrad)" />
                  <Area type="monotone" dataKey="collected" name="Collected" stroke="#10b981" strokeWidth={2} fill="url(#colGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="glass" style={{ borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>Cases by Status</div>
              {statusData.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '60px 0' }}>No cases in range</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} stroke="none">
                        {statusData.map(entry => <Cell key={entry.status} fill={entry.color} />)}
                      </Pie>
                      <Tooltip {...tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 8 }}>
                    {statusData.map(s => (
                      <div key={s.status} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                        <span style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{s.name}</span>
                        <span style={{ color: 'var(--text-muted)' }}>({s.value})</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Section 3 — charts row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-3" style={{ gap: 16, marginBottom: 16 }}>
            <div className="glass" style={{ borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>Sales Pipeline</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stageData} layout="vertical" margin={{ left: 8 }}>
                  <XAxis type="number" inputMode="decimal" hide />
                  <YAxis type="category" dataKey="label" {...axisProps} width={130} />
                  <Tooltip {...tooltipStyle} cursor={{ fill: 'var(--bg-elevated)' }} />
                  <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="glass lg:col-span-2" style={{ borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>Employee Productivity</div>
              {employeeData.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '60px 0' }}>No case assignments in this period</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={employeeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-border)" vertical={false} />
                    <XAxis dataKey="firstName" {...axisProps} />
                    <YAxis {...axisProps} allowDecimals={false} />
                    <Tooltip {...tooltipStyle} cursor={{ fill: 'var(--bg-elevated)' }} />
                    <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="completed" name="Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="overdue" name="Overdue" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Section 4 — bottom row */}
          <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: 16 }}>
            <div className="glass" style={{ borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>Revenue by Category</div>
              {categoryData.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0' }}>No revenue recorded in range</div>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(180, categoryData.length * 40)}>
                  <BarChart data={categoryData} layout="vertical" margin={{ left: 8 }}>
                    <defs>
                      <linearGradient id="catGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#6366f1" />
                      </linearGradient>
                    </defs>
                    <XAxis type="number" inputMode="decimal" {...axisProps} tickFormatter={v => `QAR ${v / 1000}k`} />
                    <YAxis type="category" dataKey="name" {...axisProps} width={120} />
                    <Tooltip {...tooltipStyle} cursor={{ fill: 'var(--bg-elevated)' }} formatter={v => `QAR ${Number(v).toLocaleString('en-US')}`} />
                    <Bar dataKey="value" fill="url(#catGrad)" radius={[0, 4, 4, 0]} barSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="glass" style={{ borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>Renewal Risk</div>
              {[
                { label: 'Renewals Tracked', value: data.renewalsCreated, color: 'var(--text-primary)' },
                { label: 'Currently Overdue', value: data.renewalsOverdue, color: '#ef4444' },
                { label: 'Completed', value: data.renewalsCompleted, color: '#10b981' },
              ].map((row, i) => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < 2 ? '1px solid var(--bg-border)' : 'none' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{row.label}</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: row.color }}>{row.value}</span>
                </div>
              ))}
              <div style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>Completion Rate</span>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{renewalProgress}%</span>
                </div>
                <div style={{ height: 6, background: 'var(--bg-border)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${renewalProgress}%`, background: '#10b981', borderRadius: 3 }} />
                </div>
              </div>
            </div>
          </div>

          {/* Section 5 — lead performance by employee */}
          <LeadPerformanceSection />
        </>
      )}
    </div>
  )
}
