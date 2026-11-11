import { useEffect, useState } from 'react'
import { AlertTriangle, Loader2, ShieldAlert, RefreshCw } from 'lucide-react'
import { greetingFor, qatarToday, formatDateLong, firstName } from '../../../lib/qatarTime'

// Shared presentational pieces for every role's Overview. No data access here.

const muted = { color: 'var(--text-muted)' }

export function OverviewHeader({ fullName, message }) {
  // Re-evaluated each minute so the greeting/date roll over at Qatar midnight.
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(t)
  }, [])
  const name = firstName(fullName)
  return (
    <div>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#3b82f6', fontWeight: 600, marginBottom: 6 }}>
        {formatDateLong(qatarToday(now))}
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
        {greetingFor(now)}{name ? `, ${name}` : ''}
      </h1>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Here's what needs your attention today.</p>
      {message && (
        <p style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 10, padding: '8px 12px', borderLeft: '3px solid #3b82f6', background: 'rgba(37,99,235,0.06)', borderRadius: '0 8px 8px 0', maxWidth: 720 }}>
          {message}
        </p>
      )}
    </div>
  )
}

export function KpiCard({ label, value, sub, icon: Icon, onClick, tone }) {
  const interactive = !!onClick
  return (
    <div
      className={`glass${interactive ? ' card-hover' : ''}`}
      onClick={onClick}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={interactive ? e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } } : undefined}
      style={{ borderRadius: 12, padding: '16px 20px', cursor: interactive ? 'pointer' : 'default', minWidth: 0 }}
    >
      {Icon && (
        <div style={{ width: 34, height: 34, background: 'rgba(37,99,235,0.1)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
          <Icon size={16} color="#3b82f6" />
        </div>
      )}
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', ...muted, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, fontFamily: 'var(--font-display)', color: tone || 'var(--text-primary)', overflowWrap: 'anywhere' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, ...muted, marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

export function KpiGrid({ children, className = 'grid grid-cols-2 md:grid-cols-4 gap-3' }) {
  return <div className={className}>{children}</div>
}

export function Section({ title, subtitle, action, children, className = '' }) {
  return (
    <div className={`glass ${className}`} style={{ borderRadius: 12, padding: 20, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</div>
          {subtitle && <div style={{ fontSize: 12, ...muted, marginTop: 2 }}>{subtitle}</div>}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

export function Pill({ children, color = '#94a3b8' }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: `${color}22`, color, whiteSpace: 'nowrap' }}>
      {children}
    </span>
  )
}

export function EmptyNote({ children }) {
  return <div style={{ fontSize: 13, ...muted, textAlign: 'center', padding: '18px 0' }}>{children}</div>
}

export function SmallButton({ children, onClick, kind = 'ghost', disabled, title }) {
  return (
    <button
      className={kind === 'gold' ? 'btn-gold' : 'btn-ghost'}
      onClick={e => { e.stopPropagation(); onClick?.(e) }}
      disabled={disabled}
      title={title}
      style={{ fontSize: 11, padding: '4px 10px', whiteSpace: 'nowrap' }}
    >
      {children}
    </button>
  )
}

export function BarList({ rows, valueFormat = v => v }) {
  const max = Math.max(1, ...rows.map(r => r.value))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {rows.map(r => (
        <div key={r.key ?? r.label}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 5 }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{r.label}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{r.display ?? valueFormat(r.value)}</span>
          </div>
          <div style={{ height: 6, borderRadius: 4, background: 'var(--bg-elevated)' }}>
            <div style={{ width: `${Math.max(2, (r.value / max) * 100)}%`, height: '100%', borderRadius: 4, background: r.color || '#3b82f6' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export function Stat({ label, value, sub }) {
  return (
    <div style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--bg-elevated)', minWidth: 0 }}>
      <div style={{ fontSize: 11, ...muted, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, ...muted, marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

export function LoadingState({ label = 'Loading your overview...' }) {
  return (
    <div style={{ padding: '80px 0', textAlign: 'center', ...muted, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <Loader2 size={22} className="animate-spin" />
      <span style={{ fontSize: 13 }}>{label}</span>
    </div>
  )
}

// Permission problems get their own message; everything else is shown as a real
// error with Retry. An error is never rendered as zeros.
export function ErrorState({ error, onRetry }) {
  const denied = error?.code === '42501'
  const finance = error?.hint === 'finance_permission'
  const Icon = denied ? ShieldAlert : AlertTriangle
  const title = finance ? 'Financial access is not enabled for your account'
    : denied ? 'Your account is not set up for this overview'
    : "We couldn't load your overview"
  const body = finance ? 'Ask an administrator to enable "View Financials" for you in Settings.'
    : denied ? 'Contact your administrator if you believe this is a mistake.'
    : (error?.message || 'Something went wrong while loading the data.')
  return (
    <div style={{ padding: '70px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <Icon size={34} color={denied ? '#f59e0b' : '#ef4444'} />
      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</div>
      <div style={{ fontSize: 13, ...muted, maxWidth: 460 }}>{body}</div>
      {!denied && onRetry && (
        <button className="btn-ghost" onClick={onRetry} style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
          <RefreshCw size={13} /> Try again
        </button>
      )}
    </div>
  )
}

export function Page({ children }) {
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>{children}</div>
}
