import { FolderOpen, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../../lib/AuthContext'
import { useProOverview } from '../../hooks/useOverviewData'
import { formatDay, formatNumber, formatTimeQatar, plural, qatarToday, relativeDue } from '../../lib/qatarTime'
import { proMessage } from './overviewMessages'
import { CASE_STATUS_COLORS, CASE_STATUS_LABELS, CASE_STATUS_ORDER, PRIORITY_COLORS, sortByOrder } from './overviewLabels'
import { useOverviewNav } from './useOverviewNav'
import {
  BarList, EmptyNote, ErrorState, KpiCard, KpiGrid, LoadingState, OverviewHeader, Page, Pill, Section, SmallButton, Stat,
} from './components/OverviewUI'

const BUCKETS = {
  1: { title: 'Overdue', color: '#ef4444' },
  2: { title: 'Due today', color: '#f59e0b' },
  3: { title: 'Due within 7 days', color: '#f59e0b' },
  4: { title: 'Awaiting client action', color: '#6366f1' },
  5: { title: 'In government review', color: '#6366f1' },
  6: { title: 'Other active cases', color: '#94a3b8' },
}

const pct = (part, whole) => (whole > 0 ? `${Math.round((part / whole) * 100)}%` : '—')

export default function ProOfficerOverview() {
  const { profile } = useAuth()
  const { allowed, go } = useOverviewNav()
  const { data, error, isLoading, refetch } = useProOverview()

  if (isLoading) return <LoadingState />
  if (!data) return <ErrorState error={error || new Error("No data available in this design copy")} onRetry={refetch} />

  const today = data.today || qatarToday()
  const k = data.kpis
  const canCases = allowed('/cases')
  const canRenewals = allowed('/renewals')
  const canCalendar = allowed('/calendar')
  const toCases = canCases ? () => go('/cases') : undefined
  const toCasesStatus = status => (canCases ? () => go(`/cases?status=${status}`) : undefined)
  const hasNoCases = k.active_cases === 0 && data.status_breakdown.length === 0

  const grouped = Object.keys(BUCKETS).map(Number)
    .map(bucket => ({ bucket, rows: data.queue.filter(c => c.bucket === bucket) }))
    .filter(g => g.rows.length > 0)

  const statusRows = sortByOrder(data.status_breakdown, 'status', CASE_STATUS_ORDER).map(s => ({
    key: s.status, label: CASE_STATUS_LABELS[s.status] || s.status, value: s.count, color: CASE_STATUS_COLORS[s.status],
  }))
  const ot = data.on_time

  return (
    <Page>
      <OverviewHeader fullName={profile?.full_name} message={proMessage(data)} />
      {error && <div style={{ fontSize: 12, color: '#f59e0b' }}>Couldn't refresh just now. Showing the last loaded data.</div>}

      <KpiGrid>
        <KpiCard label="My Active Cases" value={formatNumber(k.active_cases)} sub="Not completed or cancelled" icon={FolderOpen} onClick={toCases} />
        <KpiCard label="Cases Due Soon" value={formatNumber(k.due_soon)} sub="Due within the next 7 days" icon={Clock} onClick={toCases} />
        <KpiCard
          label="My Overdue Cases" value={formatNumber(k.overdue)} icon={AlertTriangle} onClick={toCasesStatus('overdue')}
          tone={k.overdue > 0 ? '#ef4444' : undefined}
          sub={k.overdue_unflagged > 0 ? `${k.overdue_unflagged} past due date, status not updated` : 'Past due date or marked overdue'}
        />
        <KpiCard label="Completed This Month" value={formatNumber(k.completed_month)} sub="By completion date" icon={CheckCircle2} onClick={toCasesStatus('completed')} />
      </KpiGrid>

      <Section title="My Work Queue" subtitle="Assigned cases, most urgent first">
        {hasNoCases ? (
          <EmptyNote>No cases are assigned to you yet.</EmptyNote>
        ) : grouped.length === 0 ? (
          <EmptyNote>You have no open cases.</EmptyNote>
        ) : (
          grouped.map(g => (
            <div key={g.bucket} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: BUCKETS[g.bucket].color, marginBottom: 8 }}>
                {BUCKETS[g.bucket].title} ({g.rows.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {g.rows.map(c => (
                  <div
                    key={c.id}
                    onClick={canCases ? () => go(`/cases?open=${c.id}`) : undefined}
                    className={canCases ? 'card-hover' : undefined}
                    style={{ border: '1px solid var(--bg-border)', borderRadius: 8, padding: '10px 12px', cursor: canCases ? 'pointer' : 'default', display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--accent-gold)', marginRight: 8 }}>{c.case_number}</span>
                        {c.title}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{c.client_name}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Pill color={CASE_STATUS_COLORS[c.status]}>{CASE_STATUS_LABELS[c.status] || c.status}</Pill>
                      <Pill color={PRIORITY_COLORS[c.priority]}>{c.priority}</Pill>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDay(c.due_date)} · {relativeDue(c.due_date, today)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </Section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Section title="Case Status" subtitle="All your cases">
          {statusRows.length === 0 ? <EmptyNote>No cases yet.</EmptyNote> : <BarList rows={statusRows} valueFormat={formatNumber} />}
        </Section>

        <Section title="On-time Completion" subtitle="Completed on or before the due date">
          <div className="grid grid-cols-2 gap-3">
            <Stat label="This month" value={pct(ot.on_time_month, ot.completed_month)} sub={`${ot.on_time_month} of ${ot.completed_month} completed`} />
            <Stat label="All time" value={pct(ot.on_time_all, ot.completed_all)} sub={`${ot.on_time_all} of ${ot.completed_all} completed`} />
          </div>
          {ot.completed_all === 0 && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 10 }}>No completed cases yet, so there is nothing to measure.</div>}
        </Section>

        <Section title="Recently Completed">
          {data.recent_completed.length === 0 ? <EmptyNote>No completed cases yet.</EmptyNote> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {data.recent_completed.map(c => (
                <div
                  key={c.id}
                  onClick={canCases ? () => go(`/cases?open=${c.id}`) : undefined}
                  style={{ cursor: canCases ? 'pointer' : 'default' }}
                >
                  <div style={{ fontSize: 12, color: 'var(--text-primary)' }}>{c.case_number} · {c.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {c.client_name} · {formatDay(c.completed_at)} · {c.on_time ? 'On time' : 'Late'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="My Upcoming Renewals" subtitle="Assigned to you, expiring within 60 days or already expired">
          {data.renewals.length === 0 ? <EmptyNote>No renewals need action.</EmptyNote> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {data.renewals.map(r => (
                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{r.client_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.renewal_type} · expires {formatDay(r.expiry_date, { year: true })}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <Pill color={r.days_left < 0 ? '#ef4444' : r.days_left <= 7 ? '#f59e0b' : '#94a3b8'}>
                      {r.days_left < 0 ? `Expired ${-r.days_left}d ago` : `${r.days_left}d left`}
                    </Pill>
                    {canRenewals && <SmallButton onClick={() => go(`/renewals?q=${encodeURIComponent(r.client_name)}`)}>Open</SmallButton>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Upcoming Appointments" subtitle="Next 7 days">
          {data.events.length === 0 ? <EmptyNote>No appointments scheduled.</EmptyNote> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {data.events.map(ev => (
                <div key={ev.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{ev.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{[ev.client_name, ev.location].filter(Boolean).join(' · ')}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <Pill color={ev.is_today ? '#3b82f6' : '#94a3b8'}>{ev.is_today ? 'Today' : formatDay(ev.start_time)} {formatTimeQatar(ev.start_time)}</Pill>
                    {canCalendar && <SmallButton onClick={() => go(`/calendar?open=${ev.id}`)}>Open</SmallButton>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      {data.checklist_total > 0 && (
        <Section title="Checklist Items to Finish" subtitle={`${plural(data.checklist_total, 'open item')} across your active cases`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.checklist.map(item => (
              <div
                key={item.id}
                onClick={canCases ? () => go(`/cases?open=${item.case_id}`) : undefined}
                style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', cursor: canCases ? 'pointer' : 'default' }}
              >
                <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{item.item_name}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.case_number} · {item.case_title}</span>
              </div>
            ))}
          </div>
        </Section>
      )}
    </Page>
  )
}
