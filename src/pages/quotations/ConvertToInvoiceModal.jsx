import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, AlertTriangle, ArrowRight } from 'lucide-react'
import { useConvertToInvoice } from '../../hooks/useQuotations'
import { useAuth } from '../../lib/AuthContext'
import { useToast } from '../../lib/ToastContext'

export default function ConvertToInvoiceModal({ quotation, onClose, onSuccess }) {
  const { profile } = useAuth()
  const toast = useToast()
  const { mutateAsync: convert, isPending } = useConvertToInvoice()

  const items = quotation.quotation_items || []
  const allInvoiced = items.length > 0 && items.every(i => i.invoiced)

  const [selectedIds, setSelectedIds] = useState(() => items.filter(i => !i.invoiced).map(i => i.id))
  const [subject, setSubject] = useState(quotation.subject || '')
  const [billToName, setBillToName] = useState(
    quotation.client?.company_name || quotation.client?.contact_person || quotation.client_name_snapshot || ''
  )

  function toggleItem(id) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const selectedTotal = items
    .filter(i => selectedIds.includes(i.id))
    .reduce((sum, i) => sum + Number(i.total_price), 0)

  async function handleCreateInvoice() {
    try {
      const inv = await convert({
        quotationId: quotation.id,
        selectedItemIds: selectedIds,
        quotation,
        userId: profile.id,
        subject,
        billToName,
      })
      toast(`Invoice ${inv.invoice_number} created as draft — submit for approval when ready`, 'success')
      onSuccess?.(inv)
      onClose()
    } catch (err) {
      toast(err.message || 'Failed to convert to invoice', 'error')
    }
  }

  return createPortal(
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 16, border: '1px solid var(--bg-border)', width: '100%', maxWidth: 560, maxHeight: '88vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--bg-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}>Convert to Invoice</h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Select which items to invoice — {quotation.quotation_number}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {!allInvoiced && (
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Invoice Subject</label>
              <input
                className="input-base"
                placeholder="e.g. Company Formation Services — Al Noor Trading"
                value={subject}
                onChange={e => setSubject(e.target.value)}
              />
            </div>
          )}

          {!allInvoiced && (
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Bill to name (shown on the invoice)</label>
              <input
                className="input-base"
                placeholder="e.g. Al Noor Trading W.L.L."
                value={billToName}
                onChange={e => setBillToName(e.target.value)}
              />
            </div>
          )}

          {allInvoiced ? (
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: 'var(--status-overdue)22', border: '1px solid var(--status-overdue)44', borderRadius: 8, padding: '14px 16px' }}>
              <AlertTriangle size={16} color="var(--status-overdue)" style={{ flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                All items from this quotation have already been invoiced.
              </div>
            </div>
          ) : (
            <div style={{ border: '1px solid var(--bg-border)', borderRadius: 10, overflow: 'hidden' }}>
              {items.map((item, idx) => {
                const checked = item.invoiced || selectedIds.includes(item.id)
                return (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                      borderBottom: idx < items.length - 1 ? '1px solid var(--bg-border)' : 'none',
                      opacity: item.invoiced ? 0.6 : 1,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={item.invoiced}
                      onChange={() => toggleItem(item.id)}
                      style={{ cursor: item.invoiced ? 'default' : 'pointer' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{item.service_name}</div>
                      {item.invoiced && (
                        <span style={{
                          display: 'inline-block', marginTop: 4, fontSize: 10, fontWeight: 600,
                          textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent-gold)',
                          background: 'var(--accent-gold-dim)', borderRadius: 20, padding: '2px 8px',
                        }}>
                          Already invoiced
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                      QAR {Number(item.total_price).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--bg-border)' }}>
          {!allInvoiced && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
              <span>{selectedIds.length} item{selectedIds.length !== 1 ? 's' : ''} selected</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                Total: QAR {selectedTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button className="btn-ghost" onClick={onClose}>Cancel</button>
            {!allInvoiced && (
              <button
                className="btn-gold"
                onClick={handleCreateInvoice}
                disabled={selectedIds.length === 0 || isPending}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <ArrowRight size={14} /> {isPending ? 'Creating...' : 'Create Invoice'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
