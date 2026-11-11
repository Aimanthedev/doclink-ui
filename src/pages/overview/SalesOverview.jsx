import { useState } from 'react'
import { Users, BellRing, Wallet, Trophy, Calendar as CalendarIcon, ExternalLink } from 'lucide-react'
import { useAuth } from '../../lib/AuthContext'
import { useToast } from '../../lib/ToastContext'
import { useMarkFollowUpDone } from '../../hooks/useFollowUps'
import { useUpdateLead } from '../../hooks/useLeads'
import { useSalesOverview } from '../../hooks/useOverviewData'
import { addDaysISO, formatDay, formatNumber, formatQar, formatTimeQatar, plural, qatarToday, relativeDue } from '../../lib/qatarTime'
import { salesMessage } from './overviewMessages'
import { STAGE_COLORS, STAGE_LABELS, STAGE_ORDER, leadName, sortByOrder } from './overviewLabels'
import { useOverviewNav } from './useOverviewNav'
import {
  BarList, EmptyNote, ErrorState, KpiCard, KpiGrid, LoadingState, OverviewHeader, Page, Pill, Section, SmallButton, Stat,
} from './components/OverviewUI'

const PERIODS = [
  { key: 'this_month', label: 'This Month' },
  { key: 'last_month', label: 'Last Month' },
  { key: 'all_time', label: 'All Time' },
]
const COLLAPSED_ROWS = 6

function Row({ children }) {
  return (
    <div style={{ border: '1px solid var(--bg-border)', borderRadius: 8, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {children}
    </div>
  )
}

function FollowUpRow({ item, today, canOpenLead, onOpenLead }) {
  const toast = useToast()
  const { mutateAsync: markDone, isPending: marking } = useMarkFollowUpDone()
  const { mutateAsync: updateLead, isPending: saving } = useUpdateLead()
  const [rescheduling, setRescheduling] = useState(false)
  const [nextDate, setNextDate] = useState(() => addDaysISO(qatarToday(), 1))
  const busy = marking || saving

  // Only runs when the user clicks "Mark complete" - never automatically.
  async function handleComplete() {
    try {
      await markDone(item.id)
      toast('Follow-up marked complete', 'success')
    } catch (err) { toast(err.message || 'Failed to mark follow-up complete', 'error') }
  }

  async function handleReschedule() {
    if (!nextDate || nextDate < today) { toast('Choose today or a future date', 'error'); return }
    try {
      await updateLead({ id: item.id, follow_up_date: nextDate, follow_up_reminder_sent: false, follow_up_completed_at: null })
      toast(`Follow-up moved to ${formatDay(nextDate)}`, 'success')
      setRescheduling(false)
    } catch (err) { toast(err.message || 'Failed to reschedule follow-up', 'error') }
  }

  return (
    <Row>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{leadName(item)}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            {[item.service_interest, STAGE_LABELS[item.stage] || item.stage].filter(Boolean).join(' · ')}
          </div>
        </div>
        <Pill color={item.overdue ? '#ef4444' : '#f59e0b'}>{relativeDue(item.follow_up_date, today)}</Pill>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {canOpenLead && <SmallButton onClick={() => onOpenLead(item.id)}>Open Lead</SmallButton>}
        <SmallButton kind="gold" onClick={handleComplete} disabled={busy}>{marking ? 'Saving...' : 'Mark Complete'}</SmallButton>
        <SmallButton onClick={() => setRescheduling(r => !r)} disabled={busy}>Reschedule</SmallButton>
      </div>
      {rescheduling && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input className="input-base" type="date" min={today} value={nextDate} onChange={e => setNextDate(e.target.value)} style={{ maxWidth: 170 }} />
          <SmallButton kind="gold" onClick={handleReschedule} disabled={busy}>{saving ? 'Saving...' : 'Save'}</SmallButton>
          <SmallButton onClick={() => setRescheduling(false)} disabled={busy}>Cancel</SmallButton>
        </div>
      )}
    </Row>
  )
}

function GroupTitle({ children, count }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', margin: '4px 0 8px' }}>
      {children}{count != null ? ` (${count})` : ''}
    </div>
  )
}

export default function SalesOverview() {
  const { profile } = useAuth()
  const { allowed, go } = useOverviewNav()
  const [period, setPeriod] = useState('this_month')
  const [showAll, setShowAll] = useState(false)
  const { data, error, isLoading, refetch } = useSalesOverview(period)

  if (isLoading) return <LoadingState />
  if (!data) return <ErrorState error={error || new Error("No data available in this design copy")} onRetry={refetch} />

  const today = data.today || qatarToday()
  const k = data.kpis
  const perf = data.performance
  const canSales = allowed('/sales')
  const canCalendar = allowed('/calendar')
  const toSales = canSales ? () => go('/sales') : undefined

  const overdue = data.followups.filter(f => f.overdue)
  const dueToday = data.followups.filter(f => !f.overdue)
  const shownOverdue = showAll ? overdue : overdue.slice(0, COLLAPSED_ROWS)
  const conversion = perf.assigned > 0 ? Math.round((perf.assigned_won / perf.assigned) * 100) : null
  const stageRows = sortByOrder(data.stages, 'stage', STAGE_ORDER).map(s => ({
    key: s.stage, label: STAGE_LABELS[s.stage] || s.stage, value: s.count, color: STAGE_COLORS[s.stage],
  }))
  const nothingScheduled = data.followups.length === 0 && data.events.length === 0 && data.new_leads.length === 0

  return (
    <Page>
      <OverviewHeader fullName={profile?.full_name} message={salesMessage(data)} />
      {error && <div style={{ fontSize: 12, color: '#f59e0b' }}>Couldn't refresh just now. Showing the last loaded data.</div>}

      <KpiGrid>
        <KpiCard label="My Active Leads" value={formatNumber(k.active_leads)} sub="Not yet won or lost" icon={Users} onClick={toSales} />
        <KpiCard
          label="Follow-ups Due" value={formatNumber(k.followups_due)} icon={BellRing} onClick={toSales}
          sub={`Today and overdue${k.followups_overdue > 0 ? ` · ${k.followups_overdue} overdue` : ''}`}
          tone={k.followups_overdue > 0 ? '#ef4444' : undefined}
        />
        <KpiCard label="My Open Pipeline" value={formatQar(k.pipeline_value)} sub="Estimated value of active leads" icon={Wallet} onClick={toSales} />
        <KpiCard label="Deals Won This Month" value={formatQar(k.won_month_value)} sub={plural(k.won_month_count, 'deal')} icon={Trophy} onClick={toSales} />
      </KpiGrid>

      <Section title="Today's Priorities" subtitle="Your follow-ups, appointments and new leads, most urgent first">
        {nothingScheduled && <EmptyNote>Nothing needs your attention right now.</EmptyNote>}

        {overdue.length > 0 && (
          <>
            <GroupTitle count={k.followups_overdue}>Overdue follow-ups</GroupTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
              {shownOverdue.map(item => (
                <FollowUpRow key={item.id} item={item} today={today} canOpenLead={canSales} onOpenLead={id => go(`/sales?open=${id}`)} />
              ))}
              {overdue.length > COLLAPSED_ROWS && (
                <button className="btn-ghost" onClick={() => setShowAll(s => !s)} style={{ fontSize: 12, alignSelf: 'flex-start' }}>
                  {showAll ? 'Show fewer' : `Show all ${overdue.length} listed`}
                </button>
              )}
              {k.followups_overdue > overdue.length && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  Showing the oldest {overdue.length} of {k.followups_overdue} overdue follow-ups.{canSales ? ' Open Sales for the full list.' : ''}
                </div>
              )}
            </div>
          </>
        )}

        {dueToday.length > 0 && (
          <>
            <GroupTitle count={dueToday.length}>Due today</GroupTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
              {dueToday.map(item => (
                <FollowUpRow key={item.id} item={item} today={today} canOpenLead={canSales} onOpenLead={id => go(`/sales?open=${id}`)} />
              ))}
            </div>
          </>
        )}

        {data.events.length > 0 && (
          <>
            <GroupTitle count={data.events.length}>Meetings & appointments (next 7 days)</GroupTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
              {data.events.map(ev => (
                <Row key={ev.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{ev.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {[ev.client_name, ev.location, ev.event_type].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    <Pill color={ev.is_today ? '#3b82f6' : '#94a3b8'}>
                      {ev.is_today ? `Today ${formatTimeQatar(ev.start_time)}` : `${formatDay(ev.start_time)} ${formatTimeQatar(ev.start_time)}`}
                    </Pill>
                  </div>
                  {canCalendar && (
                    <div><SmallButton onClick={() => go(`/calendar?open=${ev.id}`)}>Open in Calendar</SmallButton></div>
                  )}
                </Row>
              ))}
            </div>
          </>
        )}

        {data.new_leads.length > 0 && (
          <>
            <GroupTitle count={data.new_leads_total}>New leads without a follow-up</GroupTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {data.new_leads.map(item => (
                <Row key={item.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{leadName(item)}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {[item.service_interest, `Added ${formatDay(item.created_at)}`].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    <Pill color="#6366f1">Set a follow-up</Pill>
                  </div>
                  {canSales && <div><SmallButton onClick={() => go(`/sales?open=${item.id}`)}>Open Lead</SmallButton></div>}
                </Row>
              ))}
              {data.new_leads_total > data.new_leads.length && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  Showing the {data.new_leads.length} most recent of {data.new_leads_total}.
                </div>
              )}
            </div>
          </>
        )}
      </Section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Section
          className="lg:col-span-2"
          title="Personal Performance"
          subtitle="Leads assigned to you"
          action={
            <div style={{ display: 'inline-flex', background: 'var(--bg-elevated)', borderRadius: 8, padding: 3, gap: 2 }}>
              {PERIODS.map(p => (
                <button
                  key={p.key}
                  onClick={() => setPeriod(p.key)}
                  style={{
                    padding: '5px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
                    background: period === p.key ? 'var(--accent-gold-dim)' : 'transparent',
                    color: period === p.key ? 'var(--accent-gold)' : 'var(--text-muted)',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          }
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Leads assigned" value={formatNumber(perf.assigned)} sub="Created in period" />
            <Stat label="Won" value={formatNumber(perf.won_count)} sub={period === 'all_time' ? 'All time' : 'By conversion date'} />
            <Stat label="Conversion rate" value={conversion == null ? '—' : `${conversion}%`} sub="Of leads created in period" />
            <Stat label="Won value" value={formatQar(perf.won_value)} sub="Estimated value of won leads" />
          </div>
          {period !== 'all_time' && k.won_undated > 0 && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 10 }}>
              {plural(k.won_undated, 'won lead')} {k.won_undated === 1 ? 'has' : 'have'} no conversion date, so {k.won_undated === 1 ? 'it is' : 'they are'} only counted in All Time.
            </div>
          )}
        </Section>

        <Section title="Pipeline by Stage" subtitle="Your leads right now">
          {stageRows.length === 0 ? <EmptyNote>No leads are assigned to you yet.</EmptyNote> : <BarList rows={stageRows} valueFormat={formatNumber} />}
        </Section>
      </div>

      {(canSales || canCalendar) && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {canSales && (
            <button className="btn-gold" onClick={() => go('/sales')} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <ExternalLink size={13} /> Open Sales
            </button>
          )}
          {canCalendar && (
            <button className="btn-ghost" onClick={() => go('/calendar')} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <CalendarIcon size={13} /> Open Calendar
            </button>
          )}
        </div>
      )}
    </Page>
  )
}
