import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { X, Download, CheckCircle, XCircle, Clock, ArrowRight, Eye, AlertTriangle, Pencil, GitBranch, History } from 'lucide-react'
import { useQuotation, useQuotationLogs, useRejectQuotation, useSubmitForApproval, useUpdateQuotation, useReviseQuotation, useQuotationSummary, useSupersededBy, useDeleteQuotation } from '../../hooks/useQuotations'
import { useAuth } from '../../lib/AuthContext'
import { useToast } from '../../lib/ToastContext'
import { exportQuotationDocx } from '../../lib/exportQuotation'
import { exportStandardQuotationFromTemplate } from '../../lib/exportStandardQuotation'
import { exportFormationQuotationFromTemplate } from '../../lib/exportFormationQuotation'
import { exportDocxAsPDF } from '../../lib/exportToPDF'
import { exportErrorMessage } from '../../lib/templateLoader'
import { wasQuotationSigned } from '../../lib/quotationSignature'
import ConvertToInvoiceModal from './ConvertToInvoiceModal'
import NewQuotationModal from './NewQuotationModal'
import NewFormationQuotationModal from './NewFormationQuotationModal'
import DeleteQuotationDialog from './DeleteQuotationDialog'
import { usePermissionsContext } from '../../contexts/PermissionsContext'

const STATUS_BADGE = {
  draft:            'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
  pending_approval: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  approved:         'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  rejected:         'bg-rose-500/15 text-rose-400 border-rose-500/30',
  converted:        'bg-blue-500/15 text-blue-400 border-blue-500/30',
  expired:          'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
  superseded:       'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
}

function StatusBadge({ status }) {
  const cls = STATUS_BADGE[status] || 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30'
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${cls}`}>
      {status?.replace('_', ' ')}
    </span>
  )
}

const sectionLabel = {
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--text-muted)',
  marginBottom: 10,
}

const infoLabel = {
  fontSize: 10,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: 3,
}

const thSt = {
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--text-muted)',
  textTransform: 'none',
  letterSpacing: 'normal',
}

export default function QuotationDetailDrawer({ quotationId, onClose, onPreview, onConverted, onRevised, onNavigate }) {
  const { profile } = useAuth()
  const toast = useToast()
  const qc = useQueryClient()
  const { can } = usePermissionsContext()
  const { data: quotation, isLoading } = useQuotation(quotationId)
  const { data: logs = [] } = useQuotationLogs(quotationId)
  const { mutateAsync: reject, isPending: rejecting } = useRejectQuotation()
  const { mutateAsync: submit, isPending: submitting } = useSubmitForApproval()
  const { mutateAsync: updateQuotation, isPending: movingToDraft } = useUpdateQuotation()
  const { mutateAsync: revise, isPending: revising } = useReviseQuotation()
  const { mutateAsync: deleteQuotation, isPending: deleting } = useDeleteQuotation()
  const { data: revisionSource } = useQuotationSummary(quotation?.revised_from_quotation_id)
  const { data: supersededBy } = useSupersededBy(quotation?.status === 'superseded' ? quotation.id : undefined)

  const [rejectReason, setRejectReason] = useState('')
  const [showRejectBox, setShowRejectBox] = useState(false)
  const [showConvertModal, setShowConvertModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [exporting, setExporting] = useState(false)

  const isAdmin = ['super_admin', 'manager'].includes(profile?.role)
  const canApprove = isAdmin && quotation?.status === 'pending_approval' && can('can_approve_quotations')
  const canReject = isAdmin && quotation?.status === 'pending_approval' && can('can_reject_quotations')
  const canSubmit = quotation?.status === 'draft' && quotation?.created_by === profile?.id
  const canDelete = can('can_delete_records') && (quotation?.status === 'draft' || quotation?.status === 'pending_approval')
  // True once a rejected quotation has been moved back to draft — the row still carries
  // the old rejection_reason/reviewed_by/reviewed_at (that move only touches `status`),
  // so this just re-surfaces it distinctly from an active 'rejected' state.
  const wasPreviouslyRejected = quotation?.status === 'draft' && !!quotation?.rejection_reason

  const items = quotation?.quotation_items || []
  const uninvoicedCount = items.filter(i => !i.invoiced).length
  const hasInvoicedSome = items.some(i => i.invoiced)
  const canConvert = (isAdmin || can('can_convert_to_invoice')) && quotation?.status === 'approved' && uninvoicedCount > 0

  async function handleReject() {
    if (!rejectReason.trim()) { toast('Please provide a rejection reason', 'error'); return }
    try {
      await reject({ id: quotationId, userId: profile.id, reason: rejectReason })
      toast('Quotation rejected', 'info')
      setShowRejectBox(false)
    } catch (err) { toast(err.message || 'Failed to reject', 'error') }
  }

  async function handleSubmit() {
    try {
      await submit({ id: quotationId, userId: profile.id })
      toast('Submitted for approval', 'success')
    } catch (err) { toast(err.message || 'Failed to submit', 'error') }
  }

  async function handleRevise() {
    if (!quotation) return
    try {
      const newQuotation = await revise({ id: quotation.id, userId: profile.id })
      toast(`Created ${newQuotation.quotation_number} as a revision`, 'success')
      onRevised?.(newQuotation.id)
    } catch (err) {
      toast(err.message || 'Failed to revise quotation', 'error')
    }
  }

  async function handleDelete() {
    try {
      await deleteQuotation(quotationId)
      toast('Quotation deleted', 'success')
      setShowDeleteDialog(false)
      onClose()
    } catch (err) {
      toast(err.message || 'Failed to delete quotation', 'error')
    }
  }

  async function handleEditAndResubmit() {
    try {
      await updateQuotation({
        id: quotationId,
        updates: { status: 'draft' },
        userId: profile.id,
        logAction: 'Moved back to draft for editing',
        previousStatus: 'rejected',
      })
      toast('Quotation moved back to draft — you can now edit and resubmit', 'success')
    } catch (err) { toast(err.message || 'Failed to update quotation', 'error') }
  }

  async function fetchFreshQuotation() {
    const { supabase } = await import('../../lib/supabase')
    const { data: fresh } = await supabase
      .from('quotations')
      .select(`
        *,
        client:clients(*),
        created_by_user:users!quotations_created_by_fkey(id, full_name, signature_url),
        reviewed_by_user:users!quotations_reviewed_by_fkey(id, full_name, signature_url),
        quotation_items(*)
      `)
      .eq('id', quotation.id)
      .single()
    return fresh || quotation
  }

  async function downloadQuotationDocx(target) {
    if (target.quotation_type === 'standard') {
      await exportStandardQuotationFromTemplate(target)
    } else if (target.quotation_type === 'company_formation_expat' || target.quotation_type === 'company_formation_qatari') {
      await exportFormationQuotationFromTemplate(target)
    } else {
      await exportQuotationDocx(target)
    }
  }

  async function handleExport() {
    if (!quotation) return
    const target = await fetchFreshQuotation()

    if (wasQuotationSigned(target) !== wasQuotationSigned(quotation)) {
      qc.invalidateQueries({ queryKey: ['quotation', quotation.id] })
      qc.invalidateQueries({ queryKey: ['quotations'] })
      toast('This document changed status. Review and click Export again.', 'info')
      return
    }

    if (!wasQuotationSigned(target)) {
      try {
        await downloadQuotationDocx(target)
        toast('Quotation exported as DOCX', 'success')
      } catch (err) { toast(err.message || 'Export failed', 'error') }
      return
    }

    // Signed quotations (approved, or superseded-but-was-approved) export as
    // PDF only — generate the DOCX blob first, then convert. No DOCX fallback.
    setExporting(true)
    try {
      let blob
      if (target.quotation_type === 'standard') {
        blob = await exportStandardQuotationFromTemplate(target, { returnBlob: true })
      } else if (target.quotation_type === 'company_formation_expat' || target.quotation_type === 'company_formation_qatari') {
        blob = await exportFormationQuotationFromTemplate(target, { returnBlob: true })
      } else {
        blob = await exportQuotationDocx(target, { returnBlob: true })
      }
      await exportDocxAsPDF(blob, target.quotation_number)
      toast('PDF exported successfully', 'success')
    } catch (err) {
      console.error('[QuotationDetailDrawer] PDF export failed:', err)
      toast(exportErrorMessage(err, 'PDF export failed. Please try again.'), 'error')
    } finally {
      setExporting(false)
    }
  }

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer-panel">
        {isLoading || !quotation ? (
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
                    {quotation.quotation_number}
                  </span>
                  <StatusBadge status={quotation.status} />
                </div>
                <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {quotation.client_name_snapshot || quotation.client_contact_snapshot || quotation.client?.company_name || quotation.client?.contact_person}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  Created by {quotation.created_by_user?.full_name} · {new Date(quotation.created_at).toLocaleDateString('en-GB')}
                </div>
                {quotation.revised_from_quotation_id && revisionSource && (
                  <button
                    onClick={() => onNavigate?.(revisionSource.id)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6, background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 11, color: 'var(--text-muted)', textDecoration: 'underline' }}
                  >
                    <GitBranch size={11} /> Revision of {revisionSource.quotation_number}
                  </button>
                )}
              </div>
              <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '24px' }}>

              {/* Superseded banner */}
              {quotation.status === 'superseded' && (
                <div style={{ marginBottom: 24, background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <History size={16} color="var(--text-muted)" />
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>This quotation has been superseded by a newer revision.</span>
                  </div>
                  {supersededBy && (
                    <button
                      className="btn-ghost"
                      onClick={() => onNavigate?.(supersededBy.id)}
                      style={{ fontSize: 12, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      View {supersededBy.quotation_number} <ArrowRight size={12} />
                    </button>
                  )}
                </div>
              )}

              {/* Rejected banner */}
              {quotation.status === 'rejected' && (
                <div style={{ marginBottom: 24, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertTriangle size={16} color="#ef4444" />
                  <span style={{ fontSize: 13, color: '#ef4444' }}>This quotation was rejected. Edit and resubmit for approval.</span>
                </div>
              )}

              {/* Previously-rejected banner (moved back to draft, reason still on record) */}
              {wasPreviouslyRejected && (
                <div style={{ marginBottom: 24, background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertTriangle size={16} color="var(--text-muted)" />
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Previously rejected: {quotation.rejection_reason}</span>
                </div>
              )}

              {/* Client Details */}
              <div style={{ marginBottom: 24 }}>
                <h4 style={sectionLabel}>Client</h4>
                <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '12px 14px' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
                    {quotation.client_name_snapshot || quotation.client_contact_snapshot || quotation.client?.company_name || quotation.client?.contact_person}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
                    {(quotation.client_contact_snapshot || quotation.client?.contact_person) && (quotation.client_name_snapshot || quotation.client?.company_name) && (
                      <div>
                        <div style={infoLabel}>Contact</div>
                        <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{quotation.client_contact_snapshot || quotation.client?.contact_person}</div>
                      </div>
                    )}
                    {(quotation.client_phone_snapshot || quotation.client?.phone) && (
                      <div>
                        <div style={infoLabel}>Phone</div>
                        <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{quotation.client_phone_snapshot || quotation.client?.phone}</div>
                      </div>
                    )}
                    {(quotation.client_email_snapshot || quotation.client?.email) && (
                      <div>
                        <div style={infoLabel}>Email</div>
                        <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{quotation.client_email_snapshot || quotation.client?.email}</div>
                      </div>
                    )}
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
                      {(quotation.quotation_items || []).map(item => (
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
                        Subtotal: QAR {Number(quotation.subtotal).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                      {quotation.discount_amount > 0 && (
                        <div style={{ fontSize: 13, color: 'var(--status-overdue)' }}>
                          Discount: - QAR {Number(quotation.discount_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                      )}
                      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                        Total: QAR {Number(quotation.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Validity + Notes */}
              {(quotation.valid_until || quotation.notes) && (
                <div style={{ display: 'grid', gridTemplateColumns: quotation.valid_until && quotation.notes ? '1fr 1fr' : '1fr', gap: 16, marginBottom: 24 }}>
                  {quotation.valid_until && (
                    <div>
                      <h4 style={sectionLabel}>Valid Until</h4>
                      <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: 12 }}>
                        <div style={infoLabel}>Date</div>
                        <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                          {new Date(quotation.valid_until).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </div>
                      </div>
                    </div>
                  )}
                  {quotation.notes && (
                    <div>
                      <h4 style={sectionLabel}>Notes</h4>
                      <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: 12, fontSize: 13, color: 'var(--text-secondary)' }}>
                        {quotation.notes}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Approval info */}
              {quotation.status === 'approved' && (
                <div style={{ marginBottom: 24, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <CheckCircle size={16} color="var(--status-active)" />
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--status-active)' }}>Approved</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    By {quotation.reviewed_by_user?.full_name} · {quotation.reviewed_at ? new Date(quotation.reviewed_at).toLocaleDateString('en-GB') : ''}
                  </div>
                  {quotation.signature_url && (
                    <img src={quotation.signature_url} alt="Signature" style={{ marginTop: 10, maxHeight: 56, objectFit: 'contain' }} />
                  )}
                </div>
              )}

              {/* Rejection info */}
              {(quotation.status === 'rejected' || wasPreviouslyRejected) && (
                <div style={{
                  marginBottom: 24,
                  background: quotation.status === 'rejected' ? 'rgba(239,68,68,0.08)' : 'var(--bg-elevated)',
                  border: quotation.status === 'rejected' ? '1px solid rgba(239,68,68,0.2)' : '1px solid var(--bg-border)',
                  borderRadius: 10, padding: 16,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <XCircle size={16} color={quotation.status === 'rejected' ? 'var(--status-overdue)' : 'var(--text-muted)'} />
                    <span style={{ fontSize: 14, fontWeight: 600, color: quotation.status === 'rejected' ? 'var(--status-overdue)' : 'var(--text-muted)' }}>
                      {quotation.status === 'rejected' ? 'Rejected' : 'Previously Rejected'}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{quotation.rejection_reason}</div>
                  {(quotation.reviewed_by_user?.full_name || quotation.reviewed_at) && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                      By {quotation.reviewed_by_user?.full_name || 'Unknown'}{quotation.reviewed_at ? ` · ${new Date(quotation.reviewed_at).toLocaleDateString('en-GB')}` : ''}
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
                    placeholder="Explain why this quotation is being rejected..."
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

              {/* Audit trail */}
              {logs.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <h4 style={sectionLabel}>Activity Log</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {logs.map(log => (
                      <div key={log.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <Clock size={12} style={{ color: 'var(--text-muted)', marginTop: 3, flexShrink: 0 }} />
                        <div>
                          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{log.action}</span>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>
                            {log.performed_by_user?.full_name} · {new Date(log.created_at).toLocaleDateString('en-GB')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Actions Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--bg-border)', position: 'sticky', bottom: 0, background: 'var(--bg-secondary)', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <button className="btn-ghost" onClick={() => onPreview(quotation)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Eye size={14} /> Preview
              </button>
              {can('can_export_documents') && (
                <button className="btn-ghost" onClick={handleExport} disabled={exporting} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Download size={14} /> {exporting ? 'Generating PDF...' : wasQuotationSigned(quotation) ? 'Export PDF' : 'Export DOCX'}
                </button>
              )}
              {quotation.status === 'draft' && (
                <button className="btn-ghost" onClick={() => setShowEditModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Pencil size={14} /> Edit Quotation
                </button>
              )}
              {quotation.status === 'approved' && (
                <button className="btn-gold" onClick={handleRevise} disabled={revising} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <GitBranch size={14} /> {revising ? 'Revising...' : 'Revise Quotation'}
                </button>
              )}
              {canSubmit && (
                <button className="btn-ghost" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit for Approval'}
                </button>
              )}
              {quotation.status === 'rejected' && (
                <button className="btn-gold" onClick={handleEditAndResubmit} disabled={movingToDraft}>
                  {movingToDraft ? 'Moving...' : 'Edit & Resubmit'}
                </button>
              )}
              {canApprove && (
                <button className="btn-gold" onClick={() => onPreview(quotation)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle size={14} /> Review & Approve
                </button>
              )}
              {canReject && !showRejectBox && (
                <button className="btn-danger" onClick={() => setShowRejectBox(true)}>
                  Reject
                </button>
              )}
              {canConvert && (
                <button className="btn-gold" onClick={() => setShowConvertModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ArrowRight size={14} /> {hasInvoicedSome ? 'Invoice Remaining Items' : 'Convert to Invoice'}
                </button>
              )}
              {canDelete && (
                <button className="btn-danger" onClick={() => setShowDeleteDialog(true)} style={{ marginLeft: 'auto' }}>
                  Delete
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {showConvertModal && (
        <ConvertToInvoiceModal
          quotation={quotation}
          onClose={() => setShowConvertModal(false)}
          onSuccess={(inv) => {
            setShowConvertModal(false)
            onConverted?.(inv)
          }}
        />
      )}

      {showEditModal && quotation && quotation.quotation_type === 'standard' && (
        <NewQuotationModal
          initialData={quotation}
          onClose={() => setShowEditModal(false)}
        />
      )}
      {showEditModal && quotation && (quotation.quotation_type === 'company_formation_expat' || quotation.quotation_type === 'company_formation_qatari') && (
        <NewFormationQuotationModal
          quotationType={quotation.quotation_type}
          initialData={quotation}
          onClose={() => setShowEditModal(false)}
        />
      )}

      {showDeleteDialog && (
        <DeleteQuotationDialog
          onCancel={() => setShowDeleteDialog(false)}
          onConfirm={handleDelete}
          isPending={deleting}
        />
      )}
    </>
  )
}
