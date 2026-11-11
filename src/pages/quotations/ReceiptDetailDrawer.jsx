import { useState } from 'react'
import { X, CheckCircle, XCircle, AlertTriangle, Download, Pencil, Eye } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useReceipt, useSubmitReceiptForApproval, useApproveReceipt, useRejectReceipt, useUpdateReceiptStatus } from '../../hooks/useReceipts'
import { useAuth } from '../../lib/AuthContext'
import { useToast } from '../../lib/ToastContext'
import { usePermissionsContext } from '../../contexts/PermissionsContext'
import { supabase } from '../../lib/supabase'
import { exportReceiptFromTemplate } from '../../lib/exportReceipt'
import { exportDocxAsPDF } from '../../lib/exportToPDF'
import { exportErrorMessage } from '../../lib/templateLoader'
import { isReceiptSigned } from '../../lib/documentSignature'
import NewReceiptModal from './NewReceiptModal'
import ReceiptPreviewModal from './ReceiptPreviewModal'

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

function ApproveReceiptModal({ receipt, onClose, onApproved }) {
  const { profile } = useAuth()
  const toast = useToast()
  const { mutateAsync: approve, isPending } = useApproveReceipt()

  const hasSignature = !!profile?.signature_url

  async function handleConfirm() {
    try {
      await approve({
        receiptId: receipt.id,
        id: receipt.id,
        userId: profile.id,
        signatureUrl: profile.signature_url,
      })
      toast('Receipt approved and signed', 'success')
      onApproved?.()
    } catch (err) {
      toast(err.message || 'Failed to approve receipt', 'error')
    }
  }

  return createPortal(
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 16, border: '1px solid var(--bg-border)', width: '100%', maxWidth: 460, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--bg-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}>Approve & Sign</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '20px 24px' }}>
          {!hasSignature ? (
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: 'var(--status-overdue)22', border: '1px solid var(--status-overdue)44', borderRadius: 8, padding: '12px 14px' }}>
              <AlertTriangle size={15} color="var(--status-overdue)" style={{ flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                You don't have a signature on file yet. Upload one in Settings before approving receipts.
              </div>
            </div>
          ) : (
            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <img src={profile.signature_url} alt="Your signature" style={{ maxHeight: 70, maxWidth: 220, objectFit: 'contain' }} />
            </div>
          )}
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

export default function ReceiptDetailDrawer({ receiptId, onClose }) {
  const { profile } = useAuth()
  const toast = useToast()
  const qc = useQueryClient()
  const { can } = usePermissionsContext()
  const { data: receipt, isLoading } = useReceipt(receiptId)
  const { mutateAsync: submit, isPending: submitting } = useSubmitReceiptForApproval()
  const { mutateAsync: reject, isPending: rejecting } = useRejectReceipt()
  const { mutateAsync: updateStatus, isPending: movingToDraft } = useUpdateReceiptStatus()

  const [showRejectBox, setShowRejectBox] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [exporting, setExporting] = useState(false)

  const isAdmin = ['super_admin', 'manager'].includes(profile?.role)
  // True once a rejected receipt has been reset to draft — the row still carries the
  // old rejection_reason/approved_by (reset only touches `status`), so this
  // just re-surfaces it distinctly from an active 'rejected' state.
  const wasPreviouslyRejected = receipt?.status === 'draft' && !!receipt?.rejection_reason

  async function handleSubmit() {
    try {
      await submit({ id: receiptId })
      toast('Receipt submitted for approval', 'success')
    } catch (err) { toast(err.message || 'Failed to submit receipt', 'error') }
  }

  async function handleReject() {
    if (!rejectReason.trim()) { toast('Please provide a rejection reason', 'error'); return }
    try {
      await reject({ id: receiptId, userId: profile.id, reason: rejectReason })
      toast('Receipt rejected', 'info')
      setShowRejectBox(false)
    } catch (err) {
      toast(err.message || 'Failed to reject receipt', 'error')
    }
  }

  async function handleResetToDraft() {
    try {
      await updateStatus({ id: receiptId, status: 'draft' })
      toast('Receipt moved back to draft', 'success')
    } catch (err) { toast(err.message || 'Failed to update receipt', 'error') }
  }

  async function fetchFreshReceipt() {
    const { data: fresh } = await supabase
      .from('receipts')
      .select('id, status')
      .eq('id', receipt.id)
      .single()
    return fresh || receipt
  }

  async function handleExport() {
    if (!receipt) return
    const target = await fetchFreshReceipt()

    if (isReceiptSigned(target) !== isReceiptSigned(receipt)) {
      qc.invalidateQueries({ queryKey: ['receipt', receipt.id] })
      qc.invalidateQueries({ queryKey: ['receipts'] })
      toast('This document changed status. Review and click Export again.', 'info')
      return
    }

    if (!isReceiptSigned(target)) {
      try {
        await exportReceiptFromTemplate(receipt)
        toast('Receipt exported as DOCX', 'success')
      } catch (err) { toast(err.message || 'Export failed', 'error') }
      return
    }

    // Approved receipts export as PDF only, same pattern as invoices —
    // generate the DOCX blob first, then convert. No DOCX fallback.
    setExporting(true)
    try {
      const blob = await exportReceiptFromTemplate(receipt, { returnBlob: true })
      await exportDocxAsPDF(blob, receipt.receipt_number)
      toast('PDF exported successfully', 'success')
    } catch (err) {
      console.error('[ReceiptDetailDrawer] PDF export failed:', err)
      toast(exportErrorMessage(err, 'PDF export failed. Please try again.'), 'error')
    } finally {
      setExporting(false)
    }
  }

  const items = receipt?.receipt_items ?? []
  const total = items.reduce((s, i) => s + Number(i.amount || 0), 0)

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer-panel">
        {isLoading || !receipt ? (
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
                    {receipt.receipt_number}
                  </span>
                  <StatusBadge status={receipt.status} />
                </div>
                <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {receipt.invoice?.client?.company_name || receipt.invoice?.client?.contact_person || 'Receipt'}
                </div>
              </div>
              <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '24px' }}>

              {/* Rejected banner */}
              {receipt.status === 'rejected' && (
                <div style={{ marginBottom: 24, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertTriangle size={16} color="#ef4444" />
                  <span style={{ fontSize: 13, color: '#ef4444' }}>
                    This receipt was rejected{receipt.rejection_reason ? `: ${receipt.rejection_reason}` : '.'}
                  </span>
                </div>
              )}

              {/* Previously-rejected banner (reset to draft, reason still on record) */}
              {wasPreviouslyRejected && (
                <div style={{ marginBottom: 24, background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertTriangle size={16} color="var(--text-muted)" />
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    Previously rejected: {receipt.rejection_reason}
                  </span>
                </div>
              )}

              {/* Info grid 2x2 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                <div>
                  <h4 style={sectionLabel}>Invoice</h4>
                  <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: 12 }}>
                    <div style={infoLabel}>Reference</div>
                    <div style={{ fontSize: 13, color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace' }}>
                      {receipt.invoice?.invoice_number || 'N/A'}
                    </div>
                  </div>
                </div>
                <div>
                  <h4 style={sectionLabel}>Prepared By</h4>
                  <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: 12 }}>
                    <div style={infoLabel}>Created By</div>
                    <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                      {receipt.created_by_user?.full_name || 'N/A'}
                    </div>
                  </div>
                </div>
                <div>
                  <h4 style={sectionLabel}>Issue Date</h4>
                  <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: 12 }}>
                    <div style={infoLabel}>Date</div>
                    <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                      {receipt.issue_date ? new Date(receipt.issue_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : 'N/A'}
                    </div>
                  </div>
                </div>
                <div>
                  <h4 style={sectionLabel}>Amount</h4>
                  <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: 12 }}>
                    <div style={infoLabel}>Total Received</div>
                    <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>
                      QAR {total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Line Items */}
              <div style={{ marginBottom: 24 }}>
                <h4 style={sectionLabel}>Items</h4>
                <div className="card" style={{ overflow: 'hidden' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={thSt}>Description</th>
                        <th style={{ ...thSt, textAlign: 'right' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map(item => (
                        <tr key={item.id}>
                          <td style={{ color: 'var(--text-primary)', fontSize: 13 }}>{item.description_snapshot || '—'}</td>
                          <td style={{ textAlign: 'right', color: 'var(--text-primary)', fontWeight: 500, fontSize: 13 }}>
                            QAR {Number(item.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ padding: '14px 20px', borderTop: '1px solid var(--bg-border)', background: 'var(--bg-elevated)' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                      Total: QAR {total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Approval info */}
              {receipt.status === 'approved' && (
                <div style={{ marginBottom: 24, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <CheckCircle size={16} color="var(--status-active)" />
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--status-active)' }}>Approved</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    By {receipt.approved_by_user?.full_name || 'N/A'} · {receipt.approved_at ? new Date(receipt.approved_at).toLocaleDateString('en-GB') : ''}
                  </div>
                  {receipt.signature_url && (
                    <img src={receipt.signature_url} alt="Signature" style={{ marginTop: 10, maxHeight: 56, objectFit: 'contain' }} />
                  )}
                </div>
              )}

              {/* Rejection info */}
              {receipt.status === 'rejected' && receipt.rejection_reason && (
                <div style={{ marginBottom: 24, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <XCircle size={16} color="var(--status-overdue)" />
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--status-overdue)' }}>Rejected</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{receipt.rejection_reason}</div>
                  {receipt.approved_by_user?.full_name && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>By {receipt.approved_by_user.full_name}</div>
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
                    placeholder="Explain why this receipt is being rejected..."
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
              {receipt.status === 'draft' && (
                <>
                  <button className="btn-gold" onClick={handleSubmit} disabled={submitting}>
                    {submitting ? 'Submitting...' : 'Submit for Approval'}
                  </button>
                  <button className="btn-ghost" onClick={() => setShowEditModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Pencil size={14} /> Edit Receipt
                  </button>
                </>
              )}

              {receipt.status === 'pending_approval' && isAdmin && can('can_approve_receipts') && (
                <button className="btn-gold" onClick={() => setShowApproveModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle size={14} /> Approve & Sign
                </button>
              )}
              {receipt.status === 'pending_approval' && isAdmin && can('can_approve_receipts') && !showRejectBox && (
                <button className="btn-danger" onClick={() => setShowRejectBox(true)}>Reject</button>
              )}

              <button className="btn-ghost" onClick={() => setShowPreviewModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Eye size={14} /> Preview
              </button>

              <button className="btn-ghost" onClick={handleExport} disabled={exporting} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Download size={14} /> {exporting ? 'Generating PDF...' : isReceiptSigned(receipt) ? 'Export PDF' : 'Export DOCX'}
              </button>

              {receipt.status === 'rejected' && (
                <button className="btn-gold" onClick={handleResetToDraft} disabled={movingToDraft}>
                  {movingToDraft ? 'Moving...' : 'Reset to Draft'}
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {showApproveModal && receipt && (
        <ApproveReceiptModal
          receipt={receipt}
          onClose={() => setShowApproveModal(false)}
          onApproved={() => setShowApproveModal(false)}
        />
      )}

      {showEditModal && receipt && (
        <NewReceiptModal
          invoice={receipt.invoice}
          receipt={receipt}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => setShowEditModal(false)}
        />
      )}

      {showPreviewModal && receipt && (
        <ReceiptPreviewModal
          receipt={receipt}
          onClose={() => setShowPreviewModal(false)}
        />
      )}
    </>
  )
}
