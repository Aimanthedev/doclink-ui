import { Activity, AlertTriangle, ArrowUpRight, CalendarClock, FolderOpen, RefreshCw, Sparkles, TrendingUp, Users, Wallet } from 'lucide-react'
import { useAuth } from '../../../lib/AuthContext'
import { greetingFor, qatarToday, formatDateLong, firstName } from '../../../lib/qatarTime'
import { useNavigate } from '@/lib/router-compat'

// Premium "waiting for live data" Overview, shown when the Overview has no data
// to display (e.g. this design copy, or before the first records exist).
const KPIS = [
  { label: 'Active Cases', icon: FolderOpen, tone: '#3d7bff', featured: true, to: '/cases' },
  { label: 'Clients', icon: Users, tone: '#22d3ee', to: '/clients' },
  { label: 'Renewals Due', icon: RefreshCw, tone: '#8b6cff', to: '/renewals' },
  { label: 'Pipeline Value', icon: TrendingUp, tone: '#e04fd8', to: '/sales' },
]
const BARS = [42, 28, 64, 46, 80, 38, 70, 52, 60]
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep']

export default function CommandCenterEmpty({ onRetry }) {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const now = new Date()
  const name = firstName(profile?.full_name)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <section className="cc-hero">
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div style={{ minWidth: 0 }}>
            <div className="cc-eyebrow">{formatDateLong(qatarToday(now))} · Command Center</div>
            <h1 className="cc-title">{greetingFor(now)}{name ? `, ${name}` : ''}</h1>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 6, maxWidth: 520 }}>
              Your workspace is ready. Live cases, renewals and finance figures will appear here as soon as data starts flowing.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <span className="cc-chip"><span style={{ width: 7, height: 7, borderRadius: 9, background: 'var(--status-pending)', boxShadow: '0 0 10px var(--status-pending)' }} /> Awaiting live data</span>
            {onRetry && <button className="btn-ghost" style={{ padding: '8px 14px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }} onClick={() => onRetry()}><RefreshCw size={14} /> Refresh</button>}
          </div>
        </div>
      </section>

      <div className="cc-grid">
        {KPIS.map(({ label, icon: Icon, tone, featured, to }) => (
          <button key={label} type="button" onClick={() => navigate(to)} className={`glass card-hover cc-kpi${featured ? ' is-featured' : ''}`} style={{ textAlign: 'left', cursor: 'pointer', font: 'inherit' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12.5, color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
              <span className="cc-kpi-icon" style={{ background: `color-mix(in oklab, ${tone} 16%, transparent)`, color: tone }}><Icon size={18} /></span>
            </div>
            <div className="cc-kpi-value">—</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
              <ArrowUpRight size={13} /> Open {label.toLowerCase()}
            </div>
          </button>
        ))}
      </div>

      <div className="cc-split">
        <section className="glass cc-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div>
              <div className="cc-panel-title">Business activity</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Cases opened and closed per month</div>
            </div>
            <span className="cc-chip">Monthly</span>
          </div>
          <div className="cc-bars" aria-hidden="true">
            {BARS.map((h, i) => <div key={i} className={`cc-bar${i === 4 ? ' is-hi' : ''}`} style={{ height: `${h}%` }} />)}
          </div>
          <div style={{ display: 'flex', gap: 14, marginTop: 10 }}>
            {MONTHS.map(m => <div key={m} style={{ flex: 1, textAlign: 'center', fontSize: 11, color: 'var(--text-muted)' }}>{m}</div>)}
          </div>
          <div style={{ marginTop: 14, fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={13} color="var(--accent-blue-bright)" /> Preview chart — real figures replace it automatically.
          </div>
        </section>

        <section className="glass cc-panel">
          <div className="cc-panel-title">Revenue mix</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Invoices by service line</div>
          <div style={{ position: 'relative' }}>
            <div className="cc-ring" />
            <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Total</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: 'var(--accent-blue-bright)' }}>QAR —</div>
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 16, fontSize: 12, color: 'var(--text-secondary)' }}>
            {[['Formation', '#3d7bff'], ['PRO services', '#22d3ee'], ['Renewals', '#8b6cff'], ['Consulting', '#e04fd8']].map(([l, c]) => (
              <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 8, height: 8, borderRadius: 9, background: c }} />{l}</span>
            ))}
          </div>
        </section>
      </div>

      <div className="cc-split">
        <section className="glass cc-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={16} color="var(--status-pending)" />
            <div className="cc-panel-title">Priority attention</div>
          </div>
          <div style={{ marginTop: 10 }}>
            {[['Overdue renewals', CalendarClock], ['Cases awaiting approval', FolderOpen], ['Unpaid invoices', Wallet]].map(([l, I]) => (
              <div key={l} className="cc-empty-row">
                <span className="cc-kpi-icon" style={{ width: 34, height: 34, background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}><I size={15} /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{l}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>All clear — nothing waiting</div>
                </div>
                <span className="badge badge-approved">0</span>
              </div>
            ))}
          </div>
        </section>
        <section className="glass cc-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={16} color="var(--accent-cyan)" />
            <div className="cc-panel-title">Recent activity</div>
          </div>
          <div className="empty-state" style={{ padding: '30px 10px' }}>
            <div className="empty-state-art" style={{ width: 60, height: 60, borderRadius: 18 }}><Activity size={24} /></div>
            <div className="empty-state-title" style={{ fontSize: 15 }}>Quiet for now</div>
            <div className="empty-state-text">Team updates, approvals and payments will stream in here.</div>
          </div>
        </section>
      </div>
    </div>
  )
}
