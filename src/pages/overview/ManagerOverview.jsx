import { FolderOpen, BellRing, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../../lib/AuthContext'
import { useManagerOverview } from '../../hooks/useOverviewData'
import { formatDay, formatNumber, formatQar, formatTimeQatar, plural } from '../../lib/qatarTime'
import { managerMessage } from './overviewMessages'
import {
  CASE_STATUS_COLORS, CASE_STATUS_LABELS, CASE_STATUS_ORDER, PRIORITY_COLORS, STAGE_COLORS, STAGE_LABELS, STAGE_ORDER, leadName, sortByOrder,
} from './overviewLabels'
import { useOverviewNav } from './useOverviewNav'
import {
  BarList, EmptyNote, ErrorState, KpiCard, KpiGrid, LoadingState, OverviewHeader, Page, Pill, Section, Stat,
} from './components/OverviewUI'
import TeamTable from './components/TeamTable'

function ListRow({ onClick, title, sub, right }) {
  return (
    <div
      onClick={onClick}
      className={onClick ? 'card-hover' : undefined}
      style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center', padding: '8px 10px', border: '1px solid var(--bg-border)', borderRadius: 8, cursor: onClick ? 'pointer' : 'default' }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{title}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
      </div>
      {right}
    </div>
  )
}

function List({ children }) {
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{children}</div>
}

export default function ManagerOverview() {
  const { profile } = useAuth()
  const { allowed, go } = useOverviewNav()
  const { data, error, isLoading, refetch } = useManagerOverview()

  if (isLoading) return <LoadingState />
  if (!data) return <ErrorState error={error || new Error("No data available in this design copy")} onRetry={refetch} />

  const k = data.kpis
  const canCases = allowed('/cases')
  const canSales = allowed('/sales')
  const canRenewals = allowed('/renewals')
  const canCalendar = allowed('/calendar')
  const overdueTotal = k.overdue_cases + k.overdue_followups + k.overdue_renewals

  const activeStages = sortByOrder(data.pipeline.filter(s => !['won', 'lost'].includes(s.stage)), 'stage', STAGE_ORDER)
  const pipelineValue = activeStages.reduce((sum, s) => sum + Number(s.value), 0)
  const stageRows = sortByOrder(data.pipeline, 'stage', STAGE_ORDER).map(s => ({
    key: s.stage, label: STAGE_LABELS[s.stage] || s.stage, value: s.count,
    display: `${formatNumber(s.count)} · ${formatQar(s.value)}`, color: STAGE_COLORS[s.stage],
  }))
  const caseRows = sortByOrder(data.case_status, 'status', CASE_STATUS_ORDER).map(s => ({
    key: s.status, label: CASE_STATUS_LABELS[s.status] || s.status, value: s.count, color: CASE_STATUS_COLORS[s.status],
  }))

  return (
    <Page>
      <OverviewHeader fullName={profile?.full_name} message={managerMessage(data)} />
      {error && <div style={{ fontSize: 12, color: '#f59e0b' }}>Couldn't refresh just now. Showing the last loaded data.</div>}

      <KpiGrid>
        <KpiCard label="Active Team Cases" value={formatNumber(k.active_cases)} sub="Not completed or cancelled" icon={FolderOpen} onClick={canCases ? () => go('/cases') : undefined} />
        <KpiCard
          label="Team Follow-ups Due" value={formatNumber(k.followups_due)} icon={BellRing} onClick={canSales ? () => go('/sales') : undefined}
          sub={k.followups_unassigned > 0 ? `${k.followups_unassigned} unassigned · today and overdue` : 'Today and overdue'}
        />
        <KpiCard
          label="Overdue Assignments" value={formatNumber(overdueTotal)} icon={AlertTriangle} tone={overdueTotal > 0 ? '#ef4444' : undefined}
          sub={`${k.overdue_cases} cases · ${k.overdue_followups} follow-ups · ${k.overdue_renewals} renewals`}
        />
        <KpiCard label="Cases Completed This Month" value={formatNumber(k.completed_month)} sub="By completion date" icon={CheckCircle2} onClick={canCases ? () => go('/cases?status=completed') : undefined} />
      </KpiGrid>

      <Section title="Team Workload" subtitle="Each person is measured on the work their role does">
        <TeamTable rows={data.workload} />
      </Section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="Critical & Overdue Cases" subtitle="Urgent, critical or past due">
          {data.critical_cases.length === 0 ? <EmptyNote>No critical or overdue cases.</EmptyNote> : (
            <List>
              {data.critical_cases.map(c => (
                <ListRow
                  key={c.id} onClick={canCases ? () => go(`/cases?open=${c.id}`) : undefined}
                  title={`${c.case_number} · ${c.title}`}
                  sub={`${c.client_name} · ${c.assignee_name || 'Unassigned'} · due ${formatDay(c.due_date)}`}
                  right={<div style={{ display: 'flex', gap: 6 }}>{c.is_overdue && <Pill color="#ef4444">Overdue</Pill>}<Pill color={PRIORITY_COLORS[c.priority]}>{c.priority}</Pill></div>}
                />
              ))}
            </List>
          )}
        </Section>

        <Section title="Stalled Government Approvals" subtitle="In government review with no activity for 14+ days">
          {data.stalled_gov.length === 0 ? <EmptyNote>No stalled approvals.</EmptyNote> : (
            <List>
              {data.stalled_gov.map(c => (
                <ListRow
                  key={c.id} onClick={canCases ? () => go(`/cases?open=${c.id}`) : undefined}
                  title={`${c.case_number} · ${c.title}`} sub={`${c.client_name} · ${c.assignee_name || 'Unassigned'}`}
                  right={<Pill color="#f59e0b">{c.days_idle}d idle</Pill>}
                />
              ))}
            </List>
          )}
        </Section>

        <Section title="Overdue Sales Follow-ups" subtitle="Oldest first">
          {data.overdue_followups_list.length === 0 ? <EmptyNote>No overdue follow-ups.</EmptyNote> : (
            <List>
              {data.overdue_followups_list.map(f => (
                <ListRow
                  key={f.id} onClick={canSales ? () => go(`/sales?open=${f.id}`) : undefined}
                  title={leadName(f)} sub={`${f.assignee_name || 'Unassigned'} · was due ${formatDay(f.follow_up_date)}`}
                  right={<Pill color="#ef4444">{f.days_overdue}d overdue</Pill>}
                />
              ))}
              {k.overdue_followups > data.overdue_followups_list.length && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Showing the oldest {data.overdue_followups_list.length} of {formatNumber(k.overdue_followups)}.</div>
              )}
            </List>
          )}
        </Section>

        <Section title="Renewals Approaching Expiry" subtitle="Next 30 days, including already expired">
          {data.renewals.length === 0 ? <EmptyNote>No renewals need attention.</EmptyNote> : (
            <List>
              {data.renewals.map(r => (
                <ListRow
                  key={r.id} onClick={canRenewals ? () => go(`/renewals?q=${encodeURIComponent(r.client_name)}`) : undefined}
                  title={r.client_name} sub={`${r.renewal_type} · ${r.assignee_name || 'Unassigned'} · ${formatDay(r.expiry_date, { year: true })}`}
                  right={<Pill color={r.days_left < 0 ? '#ef4444' : r.days_left <= 7 ? '#f59e0b' : '#94a3b8'}>{r.days_left < 0 ? `Expired ${-r.days_left}d ago` : `${r.days_left}d left`}</Pill>}
                />
              ))}
            </List>
          )}
        </Section>
      </div>

      <Section title="Scheduled Appointments" subtitle="Team calendar, next 7 days">
        {data.events.length === 0 ? <EmptyNote>No appointments scheduled.</EmptyNote> : (
          <List>
            {data.events.map(ev => (
              <ListRow
                key={ev.id} onClick={canCalendar ? () => go(`/calendar?open=${ev.id}`) : undefined}
                title={ev.title} sub={[ev.client_name, ev.assignee_name || 'Unassigned', ev.location].filter(Boolean).join(' · ')}
                right={<Pill color="#3b82f6">{formatDay(ev.start_time)} {formatTimeQatar(ev.start_time)}</Pill>}
              />
            ))}
          </List>
        )}
      </Section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Section title="Sales Pipeline" subtitle="All leads, by stage">
          <div className="grid grid-cols-2 gap-3" style={{ marginBottom: 14 }}>
            <Stat label="Active pipeline" value={formatQar(pipelineValue)} sub={plural(activeStages.reduce((s, x) => s + x.count, 0), 'active lead')} />
            <Stat label="Won this month" value={plural(data.won_month.count, 'lead')} sub={formatQar(data.won_month.value)} />
          </div>
          {stageRows.length === 0 ? <EmptyNote>No leads yet.</EmptyNote> : <BarList rows={stageRows} />}
        </Section>

        <Section title="Team Case Status" subtitle="All cases">
          {caseRows.length === 0 ? <EmptyNote>No cases have been created yet.</EmptyNote> : <BarList rows={caseRows} valueFormat={formatNumber} />}
        </Section>
      </div>
    </Page>
  )
}
