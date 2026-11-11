import { Wallet, AlertTriangle, HandCoins, ClipboardCheck } from 'lucide-react'
import { useAuth } from '../../lib/AuthContext'
import { useAccountsOverview } from '../../hooks/useOverviewData'
import { formatDay, formatNumber, formatQar, plural, qatarToday, relativeDue } from '../../lib/qatarTime'
import { accountsMessage } from './overviewMessages'
import { INVOICE_STATUS_LABELS } from './overviewLabels'
import { useOverviewNav } from './useOverviewNav'
import {
  BarList, EmptyNote, ErrorState, KpiCard, KpiGrid, LoadingState, OverviewHeader, Page, Pill, Section, SmallButton,
} from './components/OverviewUI'

const BUCKET_STYLE = {
  overdue: { label: 'Overdue', color: '#ef4444' },
  due_soon: { label: 'Due soon', color: '#f59e0b' },
  upcoming: { label: 'Upcoming', color: '#3b82f6' },
  no_due_date: { label: 'No due date', color: '#94a3b8' },
}

const STATUS_COLORS = { draft: '#94a3b8', pending_approval: '#f59e0b', approved: '#10b981', rejected: '#ef4444' }

export default function AccountsOverview() {
  const { profile } = useAuth()
  const { allowed, go } = useOverviewNav()
  const { data, error, isLoading, refetch } = useAccountsOverview()

  if (isLoading) return <LoadingState />
  if (!data) return <ErrorState error={error || new Error("No data available in this design copy")} onRetry={refetch} />

  const today = data.today || qatarToday()
  const k = data.kpis
  const canInvoices = allowed('/quotations')
  const canAccounts = allowed('/accounts')
  const invoiceLink = id => `/quotations?view=invoices&open=${id}`
  const receiptLink = id => `/quotations?view=receipts&open=${id}`
  const toInvoices = canInvoices ? () => go('/quotations?view=invoices&status=approved') : undefined
  const toPendingInvoices = canInvoices ? () => go('/quotations?view=invoices&status=pending_approval') : undefined
  const needsAction = k.awaiting_invoice_approval + k.overdue_count

  const statusRows = data.invoice_status.map(s => ({
    key: s.status, label: INVOICE_STATUS_LABELS[s.status] || s.status, value: s.count,
    display: `${s.count} · ${formatQar(s.total)}`, color: STATUS_COLORS[s.status] || '#3b82f6',
  }))

  return (
    <Page>
      <OverviewHeader fullName={profile?.full_name} message={accountsMessage(data)} />
      {error && <div style={{ fontSize: 12, color: '#f59e0b' }}>Couldn't refresh just now. Showing the last loaded data.</div>}

      <KpiGrid>
        <KpiCard label="Outstanding Receivables" value={formatQar(k.outstanding)} sub={`${plural(data.priorities_total, 'invoice')} with a balance`} icon={Wallet} onClick={toInvoices} />
        <KpiCard
          label="Overdue Receivables" value={formatQar(k.overdue_amount)} icon={AlertTriangle} onClick={toInvoices}
          tone={k.overdue_count > 0 ? '#ef4444' : undefined} sub={`${plural(k.overdue_count, 'invoice')} past due date`}
        />
        <KpiCard
          label="Collections This Month" value={formatQar(k.collections_month)} icon={HandCoins}
          sub={k.collections_from_payments > 0 ? `Includes ${formatQar(k.collections_from_payments)} from payment records` : 'Approved receipts, by receipt date'}
        />
        <KpiCard
          label="Invoices Needing Action" value={formatNumber(needsAction)} icon={ClipboardCheck} onClick={toPendingInvoices}
          sub={`${k.awaiting_invoice_approval} awaiting approval · ${k.overdue_count} overdue`}
        />
      </KpiGrid>

      <Section title="Collection Priorities" subtitle="Approved invoices with a balance still to collect. Overdue first.">
        {data.priorities.length === 0 ? <EmptyNote>No outstanding invoices.</EmptyNote> : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ minWidth: 720 }}>
              <thead>
                <tr><th>Invoice</th><th>Client</th><th style={{ textAlign: 'right' }}>Amount Due</th><th>Due Date</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {data.priorities.map(inv => {
                  const b = BUCKET_STYLE[inv.bucket]
                  return (
                    <tr key={inv.id}>
                      <td><span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--accent-gold)' }}>{inv.invoice_number}</span></td>
                      <td style={{ fontSize: 13, color: 'var(--text-primary)' }}>{inv.client_name}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--text-primary)' }}>{formatQar(inv.balance, { decimals: 2 })}</td>
                      <td style={{ fontSize: 12 }}>
                        {inv.due_date ? <>{formatDay(inv.due_date, { year: true })}<div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{relativeDue(inv.due_date, today)}</div></> : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      <td><Pill color={b.color}>{b.label}</Pill></td>
                      <td>{canInvoices && <SmallButton onClick={() => go(invoiceLink(inv.id))}>Open Invoice</SmallButton>}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        {data.priorities_total > data.priorities.length && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 10 }}>
            Showing {data.priorities.length} of {data.priorities_total} open invoices, in priority order.
          </div>
        )}
        {k.no_due_date_count > 0 && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
            {plural(k.no_due_date_count, 'open invoice')} {k.no_due_date_count === 1 ? 'has' : 'have'} no due date set, so {k.no_due_date_count === 1 ? 'it' : 'they'} can't be flagged overdue.
          </div>
        )}
      </Section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="Pending Approvals" subtitle="Approve from the invoice or receipt itself">
          {data.pending_invoices.length === 0 && data.pending_receipts.length === 0 ? <EmptyNote>Nothing is waiting for approval.</EmptyNote> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {data.pending_invoices.map(i => (
                <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>Invoice {i.invoice_number}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{i.client_name} · {formatQar(i.total_amount, { decimals: 2 })} · submitted {formatDay(i.created_at)}</div>
                  </div>
                  {canInvoices && <SmallButton onClick={() => go(invoiceLink(i.id))}>Review</SmallButton>}
                </div>
              ))}
              {data.pending_receipts.map(r => (
                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>Receipt {r.receipt_number}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>For {r.invoice_number} · {formatQar(r.amount, { decimals: 2 })} · submitted {formatDay(r.created_at)}</div>
                  </div>
                  {canInvoices && <SmallButton onClick={() => go(receiptLink(r.id))}>Review</SmallButton>}
                </div>
              ))}
              {k.awaiting_receipt_approval > data.pending_receipts.length && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Showing {data.pending_receipts.length} of {k.awaiting_receipt_approval} receipts awaiting approval.</div>
              )}
            </div>
          )}
        </Section>

        <Section title="Recent Payments Recorded" subtitle="Approved receipts and payment records, newest first">
          {data.recent_payments.length === 0 ? <EmptyNote>No payments recorded yet.</EmptyNote> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {data.recent_payments.map(p => (
                <div key={`${p.source}-${p.id}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{formatQar(p.amount, { decimals: 2 })}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.ref || (p.source === 'receipt' ? 'Receipt' : 'Payment')} · {p.invoice_number}</div>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDay(p.paid_on, { year: true })}</span>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Section title="Invoice Status" subtitle="All invoices">
          {statusRows.length === 0 ? <EmptyNote>No invoices yet.</EmptyNote> : <BarList rows={statusRows} />}
        </Section>

        <Section title="Upcoming Payment Deadlines" subtitle="Due in the next 14 days">
          {data.upcoming_deadlines.length === 0 ? <EmptyNote>No invoices fall due in the next 14 days.</EmptyNote> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {data.upcoming_deadlines.map(i => (
                <div key={i.id} onClick={canInvoices ? () => go(invoiceLink(i.id)) : undefined} style={{ cursor: canInvoices ? 'pointer' : 'default' }}>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{i.invoice_number} · {formatQar(i.balance, { decimals: 2 })}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{i.client_name} · {relativeDue(i.due_date, today)} ({formatDay(i.due_date)})</div>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section
          title="Expenses to Review"
          subtitle={k ? `${plural(data.expenses_review_total, 'expense')} not yet approved` : undefined}
          action={canAccounts && <SmallButton onClick={() => go('/accounts')}>Open Accounts</SmallButton>}
        >
          {data.expenses_recent.length === 0 ? <EmptyNote>No expenses recorded yet.</EmptyNote> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {data.expenses_recent.map(e => (
                <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{e.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{e.expense_type} · {formatDay(e.expense_date)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{formatQar(e.amount, { decimals: 2 })}</div>
                    {e.needs_review && <Pill color="#f59e0b">Needs review</Pill>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>
    </Page>
  )
}
