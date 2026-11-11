import { useState } from 'react'
import { X, Download, CheckCircle, XCircle, AlertTriangle, Pencil, Receipt, Eye } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useInvoice, useSubmitInvoiceForApproval, useApproveInvoice, useRejectInvoice, useUpdateInvoiceStatus, useUpdateInvoice } from '../../hooks/useInvoices'
import { useCompanySettings } from '../../hooks/useCompanySettings'
import { useAuth } from '../../lib/AuthContext'
import { useToast } from '../../lib/ToastContext'
import { supabase } from '../../lib/supabase'
import { exportInvoiceFromTemplate } from '../../lib/exportInvoice'
import { exportDocxAsPDF } from '../../lib/exportToPDF'
import { exportErrorMessage } from '../../lib/templateLoader'
import { isInvoiceSigned } from '../../lib/documentSignature'
import { numberToWordsQAR } from '../../lib/numberToWords'
import { usePermissionsContext } from '../../contexts/PermissionsContext'
import { useReceipts, useInvoiceItemBalances } from '../../hooks/useReceipts'
import NewReceiptModal from './NewReceiptModal'
import ReceiptDetailDrawer from './ReceiptDetailDrawer'
import InvoicePreviewModal from './InvoicePreviewModal'

const STATUS_BADGE = {
  draft:            'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
  pending_approval: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  approved:         'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  rejected:         'bg-rose-500/15 text-rose-400 border-rose-500/30',
}

function StatusBadge({ status }) {
  const cls = STATUS_BADGE[status] || 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30'
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${cls}`}>
      {status?.replace('_', ' ')}
    </span>
  )
}

const sectionLabel = { fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 10 }
const infoLabel = { fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }
const thSt = { fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'none', letterSpacing: 'normal' }

function ApproveSignModal({ invoice, onClose, onApproved }) {
  const { profile } = useAuth()
  const toast = useToast()
  const { mutateAsync: approve, isPending } = useApproveInvoice()

  const [signatoryName, setSignatoryName] = useState(invoice.signatory_name || profile?.full_name || '')
  const [signatoryPosition, setSignatoryPosition] = useState(invoice.signatory_position || '')

  const hasSignature = !!profile?.signature_url

  async function handleConfirm() {
    try {
      await approve({
        invoiceId: invoice.id,
        reviewerId: profile.id,
        signatureUrl: profile.signature_url,
        signatoryName,
        signatoryPosition,
      })
      toast('Invoice approved and signed', 'success')
      onApproved?.()
    } catch (err) {
      toast(err.message || 'Failed to approve invoice', 'error')
    }
  }

  return createPortal(
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 16, border: '1px solid var(--bg-border)', width: '100%', maxWidth: 480, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--bg-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}>Approve & Sign</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '20px 24px' }}>
          {!hasSignature ? (
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: 'var(--status-overdue)22', border: '1px solid var(--status-overdue)44', borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
              <AlertTriangle size={15} color="var(--status-overdue)" style={{ flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                You don't have a signature on file yet. Upload one in Settings before approving invoices.
              </div>
            </div>
          ) : (
            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', borderRadius: 10, padding: 16, marginBottom: 16, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <img src={profile.signature_url} alt="Your signature" style={{ maxHeight: 70, maxWidth: 220, objectFit: 'contain' }} />
            </div>
          )}

          <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Signatory Name</label>
          <input
            className="input-base"
            style={{ marginBottom: 14 }}
            value={signatoryName}
            onChange={e => setSignatoryName(e.target.value)}
          />

          <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Signatory Position</label>
          <input
            className="input-base"
            placeholder="e.g. General Manager"
            value={signatoryPosition}
            onChange={e => setSignatoryPosition(e.target.value)}
          />
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--bg-border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-gold" onClick={handleConfirm} disabled={!hasSignature || isPending} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle size={14} /> {isPending ? 'Approving...' : 'Confirm & Sign'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

function EditInvoiceModal({ invoice, onClose }) {
  const toast = useToast()
  const qc = useQueryClient()

  const [subject, setSubject] = useState(invoice.subject || '')
  const [notes, setNotes] = useState(invoice.notes || '')
  const [terms, setTerms] = useState(invoice.terms || '')
  const [signatoryPosition, setSignatoryPosition] = useState(invoice.signatory_position || 'Managing Partner')
  const [dueDate, setDueDate] = useState(invoice.due_date ? invoice.due_date.slice(0, 10) : '')
  const [paymentTerms, setPaymentTerms] = useState(invoice.payment_terms || 'Due on receipt')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('invoices')
        .update({
          subject: subject || null,
          notes: notes || null,
          terms: terms || null,
          signatory_position: signatoryPosition || null,
          due_date: dueDate || null,
          payment_terms: paymentTerms || null,
        })
        .eq('id', invoice.id)
        .select('id')
      if (error) throw error
      if (!data || data.length === 0) {
        throw new Error('Invoice was not updated. Check the Row Level Security UPDATE policy on invoices for this role.')
      }

      qc.invalidateQueries({ queryKey: ['invoice', invoice.id] })
      qc.invalidateQueries({ queryKey: ['invoices'] })
      toast('Invoice updated', 'success')
      onClose()
    } catch (err) {
      toast(err.message || 'Failed to update invoice', 'error')
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 16, border: '1px solid var(--bg-border)', width: '100%', maxWidth: 520, maxHeight: '88vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--bg-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}>Edit Invoice</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {invoice.status === 'draft' && invoice.rejection_reason && (
            <div style={{ marginBottom: 16, background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <AlertTriangle size={16} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Previously rejected: {invoice.rejection_reason}</span>
            </div>
          )}

          <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Subject</label>
          <input
            className="input-base"
            style={{ marginBottom: 14 }}
            placeholder="e.g. Company Formation Services — Al Noor Trading"
            value={subject}
            onChange={e => setSubject(e.target.value)}
          />

          <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Notes</label>
          <textarea
            className="input-base"
            rows={3}
            style={{ marginBottom: 14 }}
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />

          <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Terms</label>
          <textarea
            className="input-base"
            rows={3}
            style={{ marginBottom: 14 }}
            value={terms}
            onChange={e => setTerms(e.target.value)}
          />

          <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Signatory Position</label>
          <input
            className="input-base"
            style={{ marginBottom: 14 }}
            value={signatoryPosition}
            onChange={e => setSignatoryPosition(e.target.value)}
          />

          <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Due Date</label>
          <input
            type="date"
            className="input-base"
            style={{ marginBottom: 14 }}
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
          />

          <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Payment Terms</label>
          <input
            className="input-base"
            placeholder="e.g. Due on receipt"
            value={paymentTerms}
            onChange={e => setPaymentTerms(e.target.value)}
          />
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--bg-border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-gold" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default function InvoiceDetailDrawer({ invoiceId, onClose }) {
  const { profile } = useAuth()
  const toast = useToast()
  const qc = useQueryClient()
  const { can } = usePermissionsContext()
  const { data: invoice, isLoading } = useInvoice(invoiceId)
  const { data: companySettings } = useCompanySettings()
  const { mutateAsync: submit, isPending: submitting } = useSubmitInvoiceForApproval()
  const { mutateAsync: reject, isPending: rejecting } = useRejectInvoice()
  const { mutateAsync: updateStatus, isPending: movingToDraft } = useUpdateInvoiceStatus()
  const { mutateAsync: updateInvoice } = useUpdateInvoice()
  const { data: receipts = [] } = useReceipts({ invoice_id: invoiceId })
  const { data: balances = [] } = useInvoiceItemBalances(invoiceId)

  const [showRejectBox, setShowRejectBox] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [selectedReceiptId, setSelectedReceiptId] = useState(null)
  const [exporting, setExporting] = useState(false)
  const [editingBillTo, setEditingBillTo] = useState(false)
  const [billToDraft, setBillToDraft] = useState('')
  const [savingBillTo, setSavingBillTo] = useState(false)

  const isAdmin = ['super_admin', 'manager'].includes(profile?.role)
  // True once a rejected invoice has been reset to draft — the row still carries the
  // old rejection_reason/reviewed_by/reviewed_at (reset only touches `status`), so this
  // just re-surfaces it distinctly from an active 'rejected' state.
  const wasPreviouslyRejected = invoice?.status === 'draft' && !!invoice?.rejection_reason
  const canEditBillTo = invoice?.status === 'draft' || invoice?.status === 'rejected'
  const clientName = invoice?.client?.company_name || invoice?.client?.contact_person || ''

  async function handleSaveBillTo() {
    setSavingBillTo(true)
    try {
      await updateInvoice({ id: invoiceId, fields: { bill_to_name: billToDraft.trim() || null } })
      toast('Bill to name updated', 'success')
      setEditingBillTo(false)
    } catch (err) {
      toast(err.message || 'Failed to update bill to name', 'error')
    } finally {
      setSavingBillTo(false)
    }
  }

  async function handleSubmit() {
    try {
      await submit({ id: invoiceId })
      toast('Invoice submitted for approval', 'success')
    } catch (err) { toast(err.message || 'Failed to submit invoice', 'error') }
  }

  async function handleReject() {
    if (!rejectReason.trim()) { toast('Please provide a rejection reason', 'error'); return }
    try {
      await reject({ id: invoiceId, userId: profile.id, reason: rejectReason })
      toast('Invoice rejected', 'info')
      setShowRejectBox(false)
    } catch (err) {
      console.error('[REJECT INVOICE]', {
        message: err?.message,
        details: err?.details,
        hint: err?.hint,
        code: err?.code,
      })
      toast(err.message || 'Failed to reject invoice', 'error')
    }
  }

  async function handleResetToDraft() {
    try {
      await updateStatus({ id: invoiceId, status: 'draft' })
      toast('Invoice moved back to draft', 'success')
    } catch (err) { toast(err.message || 'Failed to update invoice', 'error') }
  }

  async function fetchFreshInvoice() {
    const { data: fresh } = await supabase
      .from('invoices')
      .select('*, client:clients(*), items:invoice_items(*)')
      .eq('id', invoice.id)
      .single()
    return fresh || invoice
  }

  async function handleExport() {
    if (!invoice) return
    const target = await fetchFreshInvoice()

    if (isInvoiceSigned(target) !== isInvoiceSigned(invoice)) {
      qc.invalidateQueries({ queryKey: ['invoice', invoice.id] })
      qc.invalidateQueries({ queryKey: ['invoices'] })
      toast('This document changed status. Review and click Export again.', 'info')
      return
    }

    if (!isInvoiceSigned(target)) {
      try {
        await exportInvoiceFromTemplate(target, companySettings)
        toast('Invoice exported as DOCX', 'success')
      } catch (err) { toast(err.message || 'Export failed', 'error') }
      return
    }

    // Approved invoices export as PDF only — generate the DOCX blob first,
    // then convert. No DOCX fallback.
    setExporting(true)
    try {
      const blob = await exportInvoiceFromTemplate(target, companySettings, { returnBlob: true })
      await exportDocxAsPDF(blob, target.invoice_number)
      toast('PDF exported successfully', 'success')
    } catch (err) {
      console.error('[InvoiceDetailDrawer] PDF export failed:', err)
      toast(exportErrorMessage(err, 'PDF export failed. Please try again.'), 'error')
    } finally {
      setExporting(false)
    }
  }

  const items = invoice?.items || []
  const subtotal = Number(invoice?.subtotal ?? 0)
  const discount = Number(invoice?.discount_amount ?? 0)
  const tax = Number(invoice?.tax_amount ?? 0)
  const total = Number(invoice?.total_amount ?? 0)

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer-panel">
        {isLoading || !invoice ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
            Loading...
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--bg-border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 1 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: '#3b82f6' }}>
                    {invoice.invoice_number}
                  </span>
                  <StatusBadge status={invoice.status} />
                </div>
                <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {invoice.subject || 'Invoice'} · {invoice.client?.company_name || invoice.client?.contact_person}
                </div>
              </div>
              <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '24px' }}>

              {/* Rejected banner */}
              {invoice.status === 'rejected' && (
                <div style={{ marginBottom: 24, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertTriangle size={16} color="#ef4444" />
                  <span style={{ fontSize: 13, color: '#ef4444' }}>
                    This invoice was rejected{invoice.rejection_reason ? `: ${invoice.rejection_reason}` : '.'}
                  </span>
                </div>
              )}

              {/* Previously-rejected banner (reset to draft, reason still on record) */}
              {wasPreviouslyRejected && (
                <div style={{ marginBottom: 24, background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertTriangle size={16} color="var(--text-muted)" />
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    Previously rejected: {invoice.rejection_reason}
                  </span>
                </div>
              )}

              {/* Info grid 2x2 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                <div>
                  <h4 style={sectionLabel}>Client</h4>
                  <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: 12 }}>
                    <div style={infoLabel}>Company</div>
                    <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                      {clientName || 'N/A'}
                    </div>
                    {invoice.bill_to_name && invoice.bill_to_name !== clientName && !editingBillTo && (
                      <>
                        <div style={{ ...infoLabel, marginTop: 10 }}>Billed As</div>
                        <div style={{ fontSize: 13, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                          {invoice.bill_to_name}
                          {canEditBillTo && (
                            <button
                              onClick={() => { setBillToDraft(invoice.bill_to_name || ''); setEditingBillTo(true) }}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}
                            >
                              <Pencil size={12} />
                            </button>
                          )}
                        </div>
                      </>
                    )}
                    {!invoice.bill_to_name && canEditBillTo && !editingBillTo && (
                      <button
                        onClick={() => { setBillToDraft(''); setEditingBillTo(true) }}
                        style={{ marginTop: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, padding: 0 }}
                      >
                        <Pencil size={12} /> Set a different bill-to name
                      </button>
                    )}
                    {editingBillTo && (
                      <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
                        <input
                          className="input-base"
                          style={{ fontSize: 12, padding: '6px 8px' }}
                          placeholder={clientName}
                          value={billToDraft}
                          onChange={e => setBillToDraft(e.target.value)}
                        />
                        <button className="btn-gold" style={{ padding: '4px 10px', fontSize: 12 }} onClick={handleSaveBillTo} disabled={savingBillTo}>
                          {savingBillTo ? '...' : 'Save'}
                        </button>
                        <button className="btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setEditingBillTo(false)}>Cancel</button>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <h4 style={sectionLabel}>Prepared By</h4>
                  <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: 12 }}>
                    <div style={infoLabel}>Created By</div>
                    <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                      {invoice.created_by_user?.full_name || 'N/A'}
                    </div>
                  </div>
                </div>
                <div>
                  <h4 style={sectionLabel}>Created Date</h4>
                  <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: 12 }}>
                    <div style={infoLabel}>Date</div>
                    <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                      {new Date(invoice.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </div>
                  </div>
                </div>
                <div>
                  <h4 style={sectionLabel}>Amount</h4>
                  <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: 12 }}>
                    <div style={infoLabel}>Total</div>
                    <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>
                      QAR {total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Line Items */}
              <div style={{ marginBottom: 24 }}>
                <h4 style={sectionLabel}>Services</h4>
                <div className="card" style={{ overflow: 'hidden' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={thSt}>Service</th>
                        <th style={{ ...thSt, textAlign: 'center' }}>Qty</th>
                        <th style={{ ...thSt, textAlign: 'right' }}>Unit Price</th>
                        <th style={{ ...thSt, textAlign: 'right' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map(item => (
                        <tr key={item.id}>
                          <td>
                            <div style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: 13 }}>{item.service_name}</div>
                            {item.description && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{item.description}</div>}
                          </td>
                          <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                          <td style={{ textAlign: 'right', fontSize: 13 }}>QAR {Number(item.unit_price).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                          <td style={{ textAlign: 'right', color: 'var(--text-primary)', fontWeight: 500, fontSize: 13 }}>QAR {Number(item.total_price).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ padding: '14px 20px', borderTop: '1px solid var(--bg-border)', background: 'var(--bg-elevated)' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                        Subtotal: QAR {subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                      {discount > 0 && (
                        <div style={{ fontSize: 13, color: 'var(--status-overdue)' }}>
                          Discount: - QAR {discount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                      )}
                      {tax > 0 && (
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                          Tax: + QAR {tax.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                      )}
                      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                        Total: QAR {total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'right', maxWidth: 320 }}>
                        {numberToWordsQAR(total)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payments: per-item balances plus the receipts recorded against this invoice */}
              {(invoice.status === 'approved' || receipts.length > 0) && (
                <div style={{ marginBottom: 24 }}>
                  <h4 style={sectionLabel}>Payments</h4>
                  <div className="card" style={{ overflow: 'hidden', marginBottom: 12 }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th style={thSt}>Service</th>
                          <th style={{ ...thSt, textAlign: 'right' }}>Total</th>
                          <th style={{ ...thSt, textAlign: 'right' }}>Received</th>
                          <th style={{ ...thSt, textAlign: 'right' }}>Remaining</th>
                        </tr>
                      </thead>
                      <tbody>
                        {balances.map(b => (
                          <tr key={b.invoice_item_id}>
                            <td style={{ color: 'var(--text-primary)', fontSize: 13 }}>{b.service_name}</td>
                            <td style={{ textAlign: 'right', fontSize: 13 }}>QAR {Number(b.total_price).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                            <td style={{ textAlign: 'right', fontSize: 13, color: 'var(--status-active)' }}>QAR {Number(b.amount_received).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                            <td style={{ textAlign: 'right', fontSize: 13, fontWeight: 600, color: Number(b.remaining_balance) > 0 ? 'var(--status-pending)' : 'var(--text-muted)' }}>
                              QAR {Number(b.remaining_balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {receipts.length === 0 ? (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '10px 0' }}>No receipts yet</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {receipts.map(r => {
                        const receiptTotal = (r.receipt_items ?? []).reduce((s, i) => s + Number(i.amount || 0), 0)
                        return (
                          <div
                            key={r.id}
                            className="card"
                            onClick={() => setSelectedReceiptId(r.id)}
                            style={{ padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}
                          >
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace' }}>{r.receipt_number}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                {new Date(r.issue_date || r.created_at).toLocaleDateString('en-GB')}
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                                QAR {receiptTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </span>
                              <StatusBadge status={r.status} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Approval info */}
              {invoice.status === 'approved' && (
                <div style={{ marginBottom: 24, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <CheckCircle size={16} color="var(--status-active)" />
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--status-active)' }}>Approved</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    By {invoice.reviewed_by_user?.full_name || invoice.signatory_name} · {invoice.signed_at ? new Date(invoice.signed_at).toLocaleDateString('en-GB') : ''}
                  </div>
                  {invoice.signature_url && (
                    <img src={invoice.signature_url} alt="Signature" style={{ marginTop: 10, maxHeight: 56, objectFit: 'contain' }} />
                  )}
                </div>
              )}

              {/* Rejection info */}
              {(invoice.status === 'rejected' || wasPreviouslyRejected) && invoice.rejection_reason && (
                <div style={{
                  marginBottom: 24,
                  background: invoice.status === 'rejected' ? 'rgba(239,68,68,0.08)' : 'var(--bg-elevated)',
                  border: invoice.status === 'rejected' ? '1px solid rgba(239,68,68,0.2)' : '1px solid var(--bg-border)',
                  borderRadius: 10, padding: 16,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <XCircle size={16} color={invoice.status === 'rejected' ? 'var(--status-overdue)' : 'var(--text-muted)'} />
                    <span style={{ fontSize: 14, fontWeight: 600, color: invoice.status === 'rejected' ? 'var(--status-overdue)' : 'var(--text-muted)' }}>
                      {invoice.status === 'rejected' ? 'Rejected' : 'Previously Rejected'}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{invoice.rejection_reason}</div>
                  {(invoice.reviewed_by_user?.full_name || invoice.reviewed_at) && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                      By {invoice.reviewed_by_user?.full_name || 'Unknown'}{invoice.reviewed_at ? ` · ${new Date(invoice.reviewed_at).toLocaleDateString('en-GB')}` : ''}
                    </div>
                  )}
                </div>
              )}

              {/* Reject input box */}
              {showRejectBox && (
                <div style={{ marginBottom: 16, background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', borderRadius: 10, padding: 16 }}>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Rejection Reason *</label>
                  <textarea
                    className="input-base"
                    rows={3}
                    placeholder="Explain why this invoice is being rejected..."
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                  />
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button className="btn-danger" onClick={handleReject} disabled={rejecting}>
                      {rejecting ? 'Rejecting...' : 'Confirm Rejection'}
                    </button>
                    <button className="btn-ghost" onClick={() => setShowRejectBox(false)}>Cancel</button>
                  </div>
                </div>
              )}
            </div>

            {/* Actions Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--bg-border)', position: 'sticky', bottom: 0, background: 'var(--bg-secondary)', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {invoice.status === 'draft' && (
                <>
                  <button className="btn-gold" onClick={handleSubmit} disabled={submitting}>
                    {submitting ? 'Submitting...' : 'Submit for Approval'}
                  </button>
                  <button className="btn-ghost" onClick={() => setShowEditModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Pencil size={14} /> Edit Invoice
                  </button>
                </>
              )}

              {invoice.status === 'pending_approval' && isAdmin && can('can_approve_invoices') && (
                <button className="btn-gold" onClick={() => setShowApproveModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle size={14} /> Approve & Sign
                </button>
              )}
              {invoice.status === 'pending_approval' && isAdmin && can('can_approve_invoices') && !showRejectBox && (
                <button className="btn-danger" onClick={() => setShowRejectBox(true)}>Reject</button>
              )}

              {invoice.status === 'approved' && (
                <button className="btn-gold" onClick={() => setShowReceiptModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Receipt size={14} /> Create Receipt
                </button>
              )}

              <button className="btn-ghost" onClick={() => setShowPreviewModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Eye size={14} /> Preview
              </button>

              <button className="btn-ghost" onClick={handleExport} disabled={exporting} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Download size={14} /> {exporting ? 'Generating PDF...' : isInvoiceSigned(invoice) ? 'Export PDF' : 'Export DOCX'}
              </button>

              {invoice.status === 'rejected' && (
                <button className="btn-gold" onClick={handleResetToDraft} disabled={movingToDraft}>
                  {movingToDraft ? 'Moving...' : 'Reset to Draft'}
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {showApproveModal && invoice && (
        <ApproveSignModal
          invoice={invoice}
          onClose={() => setShowApproveModal(false)}
          onApproved={() => setShowApproveModal(false)}
        />
      )}

      {showEditModal && invoice && (
        <EditInvoiceModal
          invoice={invoice}
          onClose={() => setShowEditModal(false)}
        />
      )}

      {showReceiptModal && invoice && (
        <NewReceiptModal
          invoice={invoice}
          onClose={() => setShowReceiptModal(false)}
          onSuccess={() => setShowReceiptModal(false)}
        />
      )}

      {selectedReceiptId && (
        <ReceiptDetailDrawer
          receiptId={selectedReceiptId}
          onClose={() => setSelectedReceiptId(null)}
        />
      )}

      {showPreviewModal && invoice && (
        <InvoicePreviewModal
          invoice={invoice}
          companySettings={companySettings}
          onClose={() => setShowPreviewModal(false)}
        />
      )}
    </>
  )
}
