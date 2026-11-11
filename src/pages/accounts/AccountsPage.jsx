import { useState } from 'react'
import { Search, CreditCard, Plus, Edit2, Trash2, Receipt } from 'lucide-react'
import { useInvoices, useRecordPayment, useUpdateInvoiceStatus } from '../../hooks/useInvoices'
import { useExpenses, useDeleteExpense } from '../../hooks/useExpenses'
import { useAuth } from '../../lib/AuthContext'
import { useToast } from '../../lib/ToastContext'
import { usePermissionsContext } from '../../contexts/PermissionsContext'
import NewExpenseModal from './NewExpenseModal'

const TABS = [
  { key: 'invoices', label: 'Invoices' },
  { key: 'expenses', label: 'Expenses' },
  { key: 'summary', label: 'Summary' },
]

const STATUS_TABS = ['all', 'draft', 'sent', 'paid', 'overdue']
const STATUS_LABEL = { draft: 'Draft', sent: 'Pending', paid: 'Paid', partially_paid: 'Partially Paid', overdue: 'Overdue', cancelled: 'Cancelled' }
const STATUS_BADGE = {
  draft:           { bg: 'rgba(148,163,184,0.15)', color: '#94a3b8' },
  sent:            { bg: 'rgba(245,158,11,0.15)',  color: '#f59e0b' },
  paid:            { bg: 'rgba(16,185,129,0.15)',  color: '#10b981' },
  partially_paid:  { bg: 'rgba(37,99,235,0.15)',   color: '#3b82f6' },
  overdue:         { bg: 'rgba(239,68,68,0.15)',   color: '#ef4444' },
  cancelled:       { bg: 'rgba(148,163,184,0.15)', color: '#94a3b8' },
}

const EXPENSE_TYPE_LABEL = { case_expense: 'Case Expense', miscellaneous: 'Miscellaneous', salary: 'Salary', rent: 'Rent', utilities: 'Utilities', other: 'Other' }
const EXPENSE_TYPE_BADGE = {
  case_expense:  { bg: 'rgba(37,99,235,0.15)',  color: '#3b82f6' },
  miscellaneous: { bg: 'rgba(148,163,184,0.15)', color: '#94a3b8' },
  salary:        { bg: 'rgba(139,92,246,0.15)', color: '#8b5cf6' },
  rent:          { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' },
  utilities:     { bg: 'rgba(16,185,129,0.15)', color: '#10b981' },
  other:         { bg: 'rgba(148,163,184,0.15)', color: '#94a3b8' },
}
const EXPENSE_STATUS_BADGE = {
  recorded:         { bg: 'rgba(148,163,184,0.15)', color: '#94a3b8' },
  pending_approval: { bg: 'rgba(245,158,11,0.15)',  color: '#f59e0b' },
  approved:         { bg: 'rgba(16,185,129,0.15)',  color: '#10b981' },
  rejected:         { bg: 'rgba(239,68,68,0.15)',   color: '#ef4444' },
}

function formatQAR(amount) {
  return `QAR ${Math.round(Number(amount) || 0).toLocaleString('en-US')}.00`
}

function PaymentModal({ invoice, onClose }) {
  const { profile } = useAuth()
  const toast = useToast()
  const { mutateAsync: recordPayment, isPending } = useRecordPayment()
  const [amount, setAmount] = useState(Number(invoice.amount_due).toFixed(2))
  const [method, setMethod] = useState('cash')
  const [ref, setRef] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])

  async function handleSubmit() {
    if (!amount || Number(amount) <= 0) { toast('Enter a valid amount', 'error'); return }
    try {
      await recordPayment({ invoiceId: invoice.id, payment: { client_id: invoice.client_id, amount: Number(amount), payment_method: method, reference_number: ref || null, payment_date: date, recorded_by: profile?.id } })
      toast('Payment recorded successfully', 'success')
      onClose()
    } catch (err) { toast(err.message || 'Failed to record payment', 'error') }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 16, border: '1px solid var(--bg-border)', width: '100%', maxWidth: 420, padding: 24 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Record Payment</h3>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>{invoice.invoice_number} · Outstanding: QAR {Number(invoice.amount_due).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Amount (QAR) *</label>
            <input className="input-base" type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Payment Method</label>
            <select className="input-base" value={method} onChange={e => setMethod(e.target.value)}>
              {['cash','bank_transfer','cheque','card','other'].map(m => <option key={m} value={m}>{m.replace('_',' ')}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Reference Number</label>
            <input className="input-base" placeholder="Bank ref, cheque number..." value={ref} onChange={e => setRef(e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Payment Date</label>
            <input className="input-base" type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-gold" onClick={handleSubmit} disabled={isPending}>{isPending ? 'Recording...' : 'Record Payment'}</button>
        </div>
      </div>
    </div>
  )
}

export default function AccountsPage() {
  const toast = useToast()
  const { can } = usePermissionsContext()
  const [activeTab, setActiveTab] = useState('invoices')

  // ── Invoices tab state (unchanged) ──────────────────────────────────────────
  const [activeStatus, setActiveStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [payingInvoice, setPayingInvoice] = useState(null)
  const { mutateAsync: updateStatus } = useUpdateInvoiceStatus()

  const { data: invoices = [], isLoading } = useInvoices(activeStatus !== 'all' ? { status: activeStatus } : {})

  const filtered = invoices.filter(inv => {
    if (!search.trim()) return true
    const s = search.toLowerCase()
    return inv.invoice_number?.toLowerCase().includes(s) || inv.client?.company_name?.toLowerCase().includes(s) || inv.client?.contact_person?.toLowerCase().includes(s)
  })

  const totalRevenue = invoices.reduce((s, i) => s + Number(i.total_amount || 0), 0)
  const collected = invoices.reduce((s, i) => s + Number(i.amount_paid || 0), 0)
  const outstanding = invoices.reduce((s, i) => s + Number(i.amount_due || 0), 0)
  const overdue = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + Number(i.amount_due || 0), 0)
  const avgInvoice = invoices.length > 0 ? totalRevenue / invoices.length : 0
  const collectionRate = totalRevenue > 0 ? (collected / totalRevenue) * 100 : 0

  async function markSent(id) {
    try { await updateStatus({ id, status: 'sent' }); toast('Invoice marked as sent', 'success') }
    catch (err) { toast(err.message || 'Failed to update', 'error') }
  }

  const kpis = [
    { label: 'Monthly Revenue', value: `QAR ${Math.round(totalRevenue).toLocaleString('en-US')}`, color: 'var(--text-primary)' },
    { label: 'Collected', value: `QAR ${Math.round(collected).toLocaleString('en-US')}`, color: '#10b981' },
    { label: 'Outstanding', value: `QAR ${Math.round(outstanding).toLocaleString('en-US')}`, color: '#f59e0b' },
    { label: 'Overdue', value: `QAR ${Math.round(overdue).toLocaleString('en-US')}`, color: '#ef4444' },
    { label: 'Avg Invoice', value: `QAR ${Math.round(avgInvoice).toLocaleString('en-US')}`, color: 'var(--text-primary)' },
    { label: 'Collection Rate', value: `${Math.round(collectionRate)}%`, color: '#10b981' },
  ]

  // ── Expenses tab state ───────────────────────────────────────────────────────
  const { data: expenses = [], isLoading: expensesLoading } = useExpenses()
  const { mutateAsync: deleteExpense } = useDeleteExpense()
  const [showNewExpense, setShowNewExpense] = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)

  const now = new Date()
  const expensesThisMonth = expenses.filter(e => {
    const d = new Date(e.expense_date)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const totalExpensesThisMonth = expensesThisMonth.reduce((s, e) => s + Number(e.amount || 0), 0)
  const caseExpenses = expenses.filter(e => e.expense_type === 'case_expense').reduce((s, e) => s + Number(e.amount || 0), 0)
  const miscExpenses = expenses.filter(e => e.expense_type !== 'case_expense').reduce((s, e) => s + Number(e.amount || 0), 0)
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount || 0), 0)

  const expenseKpis = [
    { label: 'Total Expenses This Month', value: formatQAR(totalExpensesThisMonth), color: 'var(--text-primary)' },
    { label: 'Case Expenses', value: formatQAR(caseExpenses), color: '#3b82f6' },
    { label: 'Misc Expenses', value: formatQAR(miscExpenses), color: '#94a3b8' },
  ]

  async function handleDeleteExpense(expense) {
    if (!window.confirm(`Delete expense "${expense.title}"?`)) return
    try { await deleteExpense(expense.id); toast('Expense deleted', 'success') }
    catch (err) { toast(err.message || 'Failed to delete expense', 'error') }
  }

  // ── Summary tab ──────────────────────────────────────────────────────────────
  const netProfit = collected - totalExpenses

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Accounts</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Revenue, expenses, and overall financial health</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 18, marginBottom: 24, borderBottom: '1px solid var(--bg-border)' }}>
        {TABS.map(t => {
          const active = activeTab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                padding: '10px 0',
                background: 'none',
                border: 'none',
                borderBottom: active ? '2px solid #2563eb' : '2px solid transparent',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: active ? 600 : 500,
                color: active ? '#3b82f6' : 'var(--text-muted)',
                transition: 'all 0.15s',
              }}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {/* ── Invoices tab (unchanged content) ──────────────────────────────── */}
      {activeTab === 'invoices' && (
        <>
          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 24 }}>
            {kpis.map(s => (
              <div key={s.label} style={{ background: 'var(--bg-card)', borderRadius: 10, padding: '16px 18px' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{s.label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
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
                placeholder="Search invoices..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
              />
            </div>

            <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
              {STATUS_TABS.map(s => {
                const active = activeStatus === s
                return (
                  <button
                    key={s}
                    onClick={() => setActiveStatus(s)}
                    style={{
                      padding: '8px 0',
                      background: 'none',
                      border: 'none',
                      borderBottom: active ? '2px solid #2563eb' : '2px solid transparent',
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: active ? 600 : 500,
                      color: active ? '#3b82f6' : 'var(--text-muted)',
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
          {isLoading ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading invoices...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center' }}>
              <CreditCard size={36} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
              <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>No invoices found</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
            <table className="data-table" style={{ tableLayout: 'fixed', minWidth: 700 }}>
              <colgroup>
                <col style={{ width: 120 }} />
                <col style={{ width: 150 }} />
                <col style={{ width: 200 }} />
                <col style={{ width: 110 }} />
                <col style={{ width: 120 }} />
                <col style={{ width: 130 }} />
                <col style={{ width: 160 }} />
              </colgroup>
              <thead>
                <tr>
                  <th style={{ background: 'transparent', borderBottom: '1px solid var(--bg-border)' }}>Invoice</th>
                  <th style={{ background: 'transparent', borderBottom: '1px solid var(--bg-border)' }}>Client</th>
                  <th style={{ background: 'transparent', borderBottom: '1px solid var(--bg-border)' }}>Service</th>
                  <th style={{ background: 'transparent', borderBottom: '1px solid var(--bg-border)' }}>Due</th>
                  <th style={{ background: 'transparent', borderBottom: '1px solid var(--bg-border)', textAlign: 'right' }}>Amount</th>
                  <th style={{ background: 'transparent', borderBottom: '1px solid var(--bg-border)' }}>Status</th>
                  <th style={{ background: 'transparent', borderBottom: '1px solid var(--bg-border)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(inv => {
                  const dateValue = inv.due_date || inv.created_at
                  const isOverdue = inv.due_date && new Date(inv.due_date) < new Date() && inv.status !== 'paid'
                  const badge = STATUS_BADGE[inv.status] || STATUS_BADGE.cancelled
                  const serviceName = inv.invoice_items?.[0]?.service_name
                  return (
                    <tr key={inv.id}>
                      <td>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>{inv.invoice_number}</span>
                      </td>
                      <td style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {inv.client?.company_name || inv.client?.contact_person}
                      </td>
                      <td style={{ fontSize: 13, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{serviceName || '—'}</td>
                      <td style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: isOverdue ? '#ef4444' : 'var(--text-muted)' }}>
                        {dateValue ? new Date(dateValue).toISOString().slice(0, 10) : '—'}
                      </td>
                      <td style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', textAlign: 'right' }}>
                        QAR {Math.round(Number(inv.total_amount)).toLocaleString('en-US')}
                      </td>
                      <td>
                        <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: badge.bg, color: badge.color, fontWeight: 500 }}>
                          {STATUS_LABEL[inv.status] || inv.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {inv.status === 'draft' && (
                            <button className="btn-ghost" onClick={() => markSent(inv.id)} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 8 }}>Mark Sent</button>
                          )}
                          {['draft', 'sent', 'partially_paid', 'overdue'].includes(inv.status) && can('can_view_financials') && (
                            <button className="btn-gold" onClick={() => setPayingInvoice(inv)} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 8 }}>Record Payment</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            </div>
          )}

          {payingInvoice && <PaymentModal invoice={payingInvoice} onClose={() => setPayingInvoice(null)} />}
        </>
      )}

      {/* ── Expenses tab ───────────────────────────────────────────────────── */}
      {activeTab === 'expenses' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 24 }}>
            {expenseKpis.map(s => (
              <div key={s.label} style={{ background: 'var(--bg-card)', borderRadius: 10, padding: '16px 18px' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{s.label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button className="btn-gold" onClick={() => setShowNewExpense(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, borderRadius: 10 }}>
              <Plus size={15} /> Add Expense
            </button>
          </div>

          {expensesLoading ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading expenses...</div>
          ) : expenses.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center' }}>
              <Receipt size={36} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
              <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>No expenses recorded</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
            <table className="data-table" style={{ minWidth: 700 }}>
              <thead>
                <tr>
                  <th style={{ background: 'transparent', borderBottom: '1px solid var(--bg-border)' }}>Date</th>
                  <th style={{ background: 'transparent', borderBottom: '1px solid var(--bg-border)' }}>Title</th>
                  <th style={{ background: 'transparent', borderBottom: '1px solid var(--bg-border)' }}>Type</th>
                  <th style={{ background: 'transparent', borderBottom: '1px solid var(--bg-border)' }}>Case</th>
                  <th style={{ background: 'transparent', borderBottom: '1px solid var(--bg-border)', textAlign: 'right' }}>Amount</th>
                  <th style={{ background: 'transparent', borderBottom: '1px solid var(--bg-border)' }}>Status</th>
                  <th style={{ background: 'transparent', borderBottom: '1px solid var(--bg-border)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map(exp => {
                  const typeBadge = EXPENSE_TYPE_BADGE[exp.expense_type] || EXPENSE_TYPE_BADGE.other
                  const statusBadge = EXPENSE_STATUS_BADGE[exp.status] || EXPENSE_STATUS_BADGE.recorded
                  return (
                    <tr key={exp.id}>
                      <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        {new Date(exp.expense_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{exp.title}</td>
                      <td>
                        <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: typeBadge.bg, color: typeBadge.color, fontWeight: 500 }}>
                          {EXPENSE_TYPE_LABEL[exp.expense_type] || exp.expense_type}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{exp.case?.case_number || '—'}</td>
                      <td style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', textAlign: 'right' }}>{formatQAR(exp.amount)}</td>
                      <td>
                        <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: statusBadge.bg, color: statusBadge.color, fontWeight: 500 }}>
                          {exp.status?.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn-ghost" onClick={() => setEditingExpense(exp)} style={{ fontSize: 11, padding: '4px 8px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Edit2 size={12} /> Edit
                          </button>
                          <button className="btn-danger" onClick={() => handleDeleteExpense(exp)} style={{ fontSize: 11, padding: '4px 8px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Trash2 size={12} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            </div>
          )}

          {showNewExpense && <NewExpenseModal onClose={() => setShowNewExpense(false)} />}
          {editingExpense && <NewExpenseModal expense={editingExpense} onClose={() => setEditingExpense(null)} />}
        </>
      )}

      {/* ── Summary tab ────────────────────────────────────────────────────── */}
      {activeTab === 'summary' && (
        <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 24, maxWidth: 480 }}>
          {[
            { label: 'Total Revenue', value: totalRevenue, color: 'var(--text-primary)' },
            { label: 'Total Collected', value: collected, color: '#10b981' },
            { label: 'Total Expenses', value: totalExpenses, color: '#ef4444' },
            { label: 'Net Profit', value: netProfit, color: netProfit >= 0 ? '#10b981' : '#ef4444' },
            { label: 'Outstanding Receivables', value: outstanding, color: '#f59e0b' },
          ].map((row, i) => (
            <div
              key={row.label}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0',
                borderBottom: i < 4 ? '1px solid var(--bg-border)' : 'none',
              }}
            >
              <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{row.label}</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: row.color }}>{formatQAR(row.value)}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 14 }}>
            <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Collection Rate</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#3b82f6' }}>{Math.round(collectionRate)}%</span>
          </div>
        </div>
      )}
    </div>
  )
}
