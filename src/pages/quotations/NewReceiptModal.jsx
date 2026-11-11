import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, ArrowRight } from 'lucide-react'
import { useInvoiceItemBalances, useCreateReceipt, useUpdateReceipt } from '../../hooks/useReceipts'
import { useAuth } from '../../lib/AuthContext'
import { useToast } from '../../lib/ToastContext'

// Pass `receipt` to edit an existing draft in place, same
// create-modal-doubles-as-edit-modal pattern used for quotations.
export default function NewReceiptModal({ invoice, receipt = null, onClose, onSuccess }) {
  const { profile } = useAuth()
  const toast = useToast()
  const isEditMode = !!receipt
  const { data: balances = [], isLoading } = useInvoiceItemBalances(invoice.id)
  const { mutateAsync: createReceipt, isPending: isCreating } = useCreateReceipt()
  const { mutateAsync: updateReceipt, isPending: isUpdating } = useUpdateReceipt()
  const isPending = isEditMode ? isUpdating : isCreating

  // invoice_item_balances already carries service_name (the line item's
  // always-populated label, shown below), so that's what gets snapshotted.
  // invoice_items.description is a separate, optional free-text field left
  // blank on most items, so it's only used as a fallback here.
  const invoiceItems = invoice.items ?? invoice.invoice_items ?? []
  const items = balances.map(b => ({
    ...b,
    description: b.service_name || invoiceItems.find(i => i.id === b.invoice_item_id)?.description || null,
  }))

  const payableItems = items.filter(i => Number(i.remaining_balance) > 0)
  const fullyPaidItems = items.filter(i => Number(i.remaining_balance) <= 0)

  const [selectedIds, setSelectedIds] = useState(() => new Set((receipt?.receipt_items ?? []).map(ri => ri.invoice_item_id)))
  const [amounts, setAmounts] = useState(() => Object.fromEntries((receipt?.receipt_items ?? []).map(ri => [ri.invoice_item_id, String(ri.amount)])))
  const [issueDate, setIssueDate] = useState(() => (receipt?.issue_date ? receipt.issue_date.slice(0, 10) : new Date().toISOString().slice(0, 10)))
  const [paymentTerms, setPaymentTerms] = useState(receipt?.payment_terms || '')

  function toggleItem(item) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(item.invoice_item_id)) {
        next.delete(item.invoice_item_id)
      } else {
        next.add(item.invoice_item_id)
        setAmounts(a => (item.invoice_item_id in a ? a : { ...a, [item.invoice_item_id]: String(item.remaining_balance) }))
      }
      return next
    })
  }

  function setAmount(itemId, value) {
    setAmounts(a => ({ ...a, [itemId]: value }))
  }

  function amountError(item) {
    if (!selectedIds.has(item.invoice_item_id)) return null
    const raw = amounts[item.invoice_item_id]
    const value = Number(raw)
    if (raw === undefined || raw === '' || Number.isNaN(value)) return 'Enter an amount'
    if (value <= 0) return 'Amount must be greater than zero'
    if (value > Number(item.remaining_balance)) return 'Cannot exceed remaining balance'
    return null
  }

  const selectedItems = payableItems.filter(i => selectedIds.has(i.invoice_item_id))
  const hasErrors = selectedItems.some(i => !!amountError(i))
  const selectedTotal = selectedItems.reduce((s, i) => s + (Number(amounts[i.invoice_item_id]) || 0), 0)

  const invoiceBalanceBefore = items.reduce((s, i) => s + Number(i.remaining_balance || 0), 0)
  const invoiceBalanceAfter = invoiceBalanceBefore - selectedTotal

  async function handleSave() {
    if (selectedItems.length === 0) { toast('Select at least one item', 'error'); return }
    if (hasErrors) { toast('Fix the highlighted amounts before saving', 'error'); return }
    try {
      const receiptItems = selectedItems.map(i => ({
        invoice_item_id: i.invoice_item_id,
        amount: Number(amounts[i.invoice_item_id]),
        description_snapshot: i.description,
      }))
      if (isEditMode) {
        await updateReceipt({ id: receipt.id, issueDate, paymentTerms, items: receiptItems })
        toast('Receipt updated', 'success')
        onSuccess?.(receipt)
      } else {
        const created = await createReceipt({ invoiceId: invoice.id, items: receiptItems, userId: profile.id, issueDate, paymentTerms })
        toast(`Receipt ${created.receipt_number} created as draft, submit for approval when ready`, 'success')
        onSuccess?.(created)
      }
      onClose()
    } catch (err) {
      toast(err.message || `Failed to ${isEditMode ? 'update' : 'create'} receipt`, 'error')
    }
  }

  return createPortal(
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 16, border: '1px solid var(--bg-border)', width: '100%', maxWidth: 600, maxHeight: '88vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--bg-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}>{isEditMode ? 'Edit Receipt' : 'Create Receipt'}</h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {isEditMode ? `Editing ${receipt.receipt_number}` : `Record a payment against ${invoice.invoice_number}`}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Date</label>
              <input
                type="date"
                className="input-base"
                value={issueDate}
                onChange={e => setIssueDate(e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Payment Terms</label>
              <input
                className="input-base"
                placeholder="e.g. Due on receipt"
                value={paymentTerms}
                onChange={e => setPaymentTerms(e.target.value)}
              />
            </div>
          </div>

          {isLoading ? (
            <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-muted)' }}>Loading balances...</div>
          ) : payableItems.length === 0 && fullyPaidItems.length === 0 ? (
            <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-muted)' }}>No line items on this invoice</div>
          ) : (
            <div style={{ border: '1px solid var(--bg-border)', borderRadius: 10, overflow: 'hidden' }}>
              {payableItems.map((item, idx) => {
                const checked = selectedIds.has(item.invoice_item_id)
                const error = amountError(item)
                const afterBalance = Number(item.remaining_balance) - Number(amounts[item.invoice_item_id])
                return (
                  <div
                    key={item.invoice_item_id}
                    style={{
                      padding: '12px 16px',
                      borderBottom: (idx < payableItems.length - 1 || fullyPaidItems.length > 0) ? '1px solid var(--bg-border)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <input type="checkbox" checked={checked} onChange={() => toggleItem(item)} style={{ cursor: 'pointer' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{item.service_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                          QAR {Number(item.remaining_balance).toLocaleString('en-US', { minimumFractionDigits: 2 })} remaining of QAR {Number(item.total_price).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                        {checked && !error && (
                          <div style={{ fontSize: 11, color: 'var(--status-active)', marginTop: 2 }}>
                            After this receipt: QAR {afterBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })} remaining
                          </div>
                        )}
                      </div>
                      {checked && (
                        <input
                          className="input-base"
                          type="number"
                          min="0"
                          step="0.01"
                          style={{ width: 130, textAlign: 'right' }}
                          value={amounts[item.invoice_item_id] ?? ''}
                          onChange={e => setAmount(item.invoice_item_id, e.target.value)}
                        />
                      )}
                    </div>
                    {checked && error && (
                      <div style={{ fontSize: 11, color: 'var(--status-overdue)', marginTop: 6, marginLeft: 30 }}>{error}</div>
                    )}
                  </div>
                )
              })}

              {fullyPaidItems.map((item, idx) => (
                <div
                  key={item.invoice_item_id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                    borderBottom: idx < fullyPaidItems.length - 1 ? '1px solid var(--bg-border)' : 'none',
                    opacity: 0.6,
                  }}
                >
                  <input type="checkbox" checked disabled style={{ cursor: 'default' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{item.service_name}</div>
                    <span style={{
                      display: 'inline-block', marginTop: 4, fontSize: 10, fontWeight: 600,
                      textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--status-active)',
                      background: 'rgba(16,185,129,0.12)', borderRadius: 20, padding: '2px 8px',
                    }}>
                      Fully paid
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--bg-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
            <span>{selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected</span>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              Total: QAR {selectedTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
            <span>Invoice balance</span>
            <span>
              QAR {invoiceBalanceBefore.toLocaleString('en-US', { minimumFractionDigits: 2 })} {'->'} QAR {invoiceBalanceAfter.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button className="btn-ghost" onClick={onClose}>Cancel</button>
            <button
              className="btn-gold"
              onClick={handleSave}
              disabled={selectedItems.length === 0 || hasErrors || isPending}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <ArrowRight size={14} /> {isPending ? 'Saving...' : isEditMode ? 'Save Changes' : 'Save as Draft'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
