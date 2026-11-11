import CommandCenterEmpty from './components/CommandCenterEmpty'
import {
  TrendingUp, HandCoins, Wallet, FolderOpen, Target, Trophy, Landmark, RefreshCw, Users, CheckCircle2, AlertTriangle,
} from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { useAuth } from '../../lib/AuthContext'
import { useAdminOverview } from '../../hooks/useOverviewData'
import { formatDay, formatNumber, formatQar, plural, qatarToday, relativeDue } from '../../lib/qatarTime'
import { adminMessage } from './overviewMessages'
import {
  CASE_STATUS_COLORS, CASE_STATUS_LABELS, CASE_STATUS_ORDER, STAGE_COLORS, STAGE_LABELS, STAGE_ORDER, sortByOrder,
} from './overviewLabels'
import { useOverviewNav } from './useOverviewNav'
import {
  BarList, EmptyNote, ErrorState, KpiCard, KpiGrid, LoadingState, OverviewHeader, Page, Pill, Section, Stat,
} from './components/OverviewUI'
import TeamTable from './components/TeamTable'

const SEVERITY = {
  1: { label: 'Critical', color: '#ef4444' },
  2: { label: 'High', color: '#f59e0b' },
  3: { label: 'Medium', color: '#3b82f6' },
}

// Where each attention category leads. A target the user may not open is dropped
// (the row stays visible but is not clickable).
function attentionTarget(item) {
  switch (item.kind) {
    case 'overdue_case': return `/cases?open=${item.ref_id}`
    case 'urgent_renewal': return '/renewals'
    case 'stale_followups': return '/sales'
    case 'pending_quotations': return '/quotations?view=quotations&status=pending_approval'
    case 'pending_invoices': return '/quotations?view=invoices&status=pending_approval'
    case 'pending_receipts': return '/quotations?view=receipts&status=pending_approval'
    case 'overdue_receivables': return '/quotations?view=invoices&status=approved'
    case 'stalled_government': return '/cases?status=government_review'
    default: return null
  }
}

const SHORTCUTS = [
  { to: '/employees', label: 'Employees' },
  { to: '/settings', label: 'Settings & Access' },
  { to: '/reports', label: 'Reports' },
  { to: '/accounts', label: 'Accounts' },
  { to: '/quotations', label: 'Quotations' },
  { to: '/clients', label: 'Clients' },
]

export default function SuperAdminOverview() {
  const { profile } = useAuth()
  const { allowed, go } = useOverviewNav()
  const { data, error, isLoading, refetch } = useAdminOverview()

  if (isLoading) return <LoadingState />
  if (!data) return <CommandCenterEmpty onRetry={refetch} />

  const today = data.today || qatarToday()
  const k = data.kpis
  const link = path => (allowed(path) ? () => go(path) : undefined)

  const monthsWithData = data.history.filter(m => Number(m.invoiced) > 0 || Number(m.collected) > 0).length
  const funnelRows = sortByOrder(data.funnel, 'stage', STAGE_ORDER).map(s => ({
    key: s.stage, label: STAGE_LABELS[s.stage] || s.stage, value: s.count,
    display: `${formatNumber(s.count)} · ${formatQar(s.value)}`, color: STAGE_COLORS[s.stage],
  }))
  const caseRows = sortByOrder(data.case_status, 'status', CASE_STATUS_ORDER).map(s => ({
    key: s.status, label: CASE_STATUS_LABELS[s.status] || s.status, value: s.count, color: CASE_STATUS_COLORS[s.status],
  }))

  return (
    <Page>
      <OverviewHeader fullName={profile?.full_name} message={adminMessage(data)} />
      {error && <div style={{ fontSize: 12, color: '#f59e0b' }}>Couldn't refresh just now. Showing the last loaded data.</div>}

      <KpiGrid className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <KpiCard label="Revenue This Month" value={formatQar(k.revenue_month)} sub="Approved invoices, by invoice date" icon={TrendingUp} onClick={link('/quotations')} />
        <KpiCard label="Collections This Month" value={formatQar(k.collections_month)} sub="Approved receipts, by receipt date" icon={HandCoins} onClick={link('/quotations')} />
        <KpiCard label="Outstanding Receivables" value={formatQar(k.outstanding)} sub="Approved invoices not yet collected" icon={Wallet} onClick={link('/quotations')} />
        <KpiCard label="Active Cases" value={formatNumber(k.active_cases)} sub="Not completed or cancelled" icon={FolderOpen} onClick={link('/cases')} />
        <KpiCard label="Sales Pipeline Value" value={formatQar(k.pipeline_value)} sub="Estimated value of active leads" icon={Target} onClick={link('/sales')} />
        <KpiCard label="Deals Won This Month" value={formatNumber(k.won_month_count)} sub={formatQar(k.won_month_value)} icon={Trophy} onClick={link('/sales')} />
      </KpiGrid>

      <KpiGrid className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Government Approvals" value={formatNumber(k.gov_review)} sub="Cases in government review" icon={Landmark} onClick={allowed('/cases') ? () => go('/cases?status=government_review') : undefined} />
        <KpiCard label="Renewals Due This Month" value={formatNumber(k.renewals_due_month)} icon={RefreshCw} onClick={link('/renewals')} />
        <KpiCard label="Clients" value={formatNumber(k.total_clients)} sub={`${k.new_clients_month} new this month`} icon={Users} onClick={link('/clients')} />
        <KpiCard label="Completed Cases" value={formatNumber(k.completed_cases)} sub={`${k.completed_month} this month`} icon={CheckCircle2} onClick={allowed('/cases') ? () => go('/cases?status=completed') : undefined} />
      </KpiGrid>

      <Section title="Executive Attention Center" subtitle="Most severe first, then by due date">
        {data.attention.length === 0 ? <EmptyNote>Nothing needs executive attention right now.</EmptyNote> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {data.attention.map((a, i) => {
              const target = attentionTarget(a)
              const onClick = target && allowed(target) ? () => go(target) : undefined
              const sev = SEVERITY[a.severity] || SEVERITY[3]
              return (
                <div
                  key={`${a.kind}-${a.ref_id ?? i}`}
                  onClick={onClick}
                  className={onClick ? 'card-hover' : undefined}
                  style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px', border: `1px solid ${sev.color}33`, background: `${sev.color}12`, borderRadius: 8, cursor: onClick ? 'pointer' : 'default' }}
                >
                  <AlertTriangle size={14} color={sev.color} style={{ marginTop: 2, flexShrink: 0 }} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{a.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {a.subtitle}{a.due ? ` · ${relativeDue(a.due, today)} (${formatDay(a.due)})` : ''}
                    </div>
                  </div>
                  <Pill color={sev.color}>{sev.label}</Pill>
                </div>
              )
            })}
          </div>
        )}
      </Section>

      <Section title="Revenue vs Collections" subtitle="Last 6 months. Invoiced = approved invoices by invoice date. Collected = approved receipts by receipt date.">
        {monthsWithData < 2 ? (
          <EmptyNote>Not enough history yet to show a trend.</EmptyNote>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.history.map(m => ({ month: m.label, Invoiced: Number(m.invoiced), Collected: Number(m.collected) }))}>
              <CartesianGrid stroke="var(--bg-border)" vertical={false} />
              <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} width={50} tickFormatter={v => `${Math.round(v / 1000)}k`} />
              <Tooltip
                formatter={v => formatQar(v)}
                contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: 'var(--text-secondary)' }}
                cursor={{ fill: 'var(--bg-elevated)' }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Invoiced" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Collected" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Section>

      <Section title="Team Performance" subtitle="Grouped by role, measured on each role's own work">
        <TeamTable rows={data.team} />
      </Section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Section title="Sales Funnel" subtitle="All leads by stage">
          {funnelRows.length === 0 ? <EmptyNote>No leads yet.</EmptyNote> : <BarList rows={funnelRows} />}
        </Section>

        <Section title="Case Status" subtitle="All cases">
          {caseRows.length === 0 ? <EmptyNote>No cases have been created yet.</EmptyNote> : <BarList rows={caseRows} valueFormat={formatNumber} />}
        </Section>

        <Section title="Upcoming Renewals" subtitle="Next 30 days, including expired">
          {data.renewals.length === 0 ? <EmptyNote>No renewals need attention.</EmptyNote> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {data.renewals.map(r => (
                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{r.client_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.renewal_type} · {formatDay(r.expiry_date, { year: true })}</div>
                  </div>
                  <Pill color={r.days_left < 0 ? '#ef4444' : r.days_left <= 7 ? '#f59e0b' : '#94a3b8'}>{r.days_left < 0 ? `Expired ${-r.days_left}d ago` : `${r.days_left}d`}</Pill>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Section title="Recent Operational Activity" className="lg:col-span-2">
          {data.activity.length === 0 ? <EmptyNote>No activity recorded yet.</EmptyNote> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {data.activity.map(a => (
                <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{a.actor || 'System'}</span> {String(a.action || '').toLowerCase()} {a.table_name ? `· ${String(a.table_name).replace('_', ' ')}` : ''}
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDay(a.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Shortcuts">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {SHORTCUTS.filter(s => allowed(s.to)).map(s => (
              <button key={s.to} className="btn-ghost" onClick={() => go(s.to)} style={{ fontSize: 12 }}>{s.label}</button>
            ))}
          </div>
          <div style={{ marginTop: 14 }}>
            <Stat label="Items needing attention" value={formatNumber(data.attention.length)} sub={plural(data.attention.filter(a => a.severity === 1).length, 'critical item')} />
          </div>
        </Section>
      </div>
    </Page>
  )
}
