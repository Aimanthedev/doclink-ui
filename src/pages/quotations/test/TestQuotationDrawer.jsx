import { X, Download, CheckCircle, XCircle, Clock, ArrowRight, Eye, AlertTriangle, Pencil, GitBranch, History } from 'lucide-react'
import { MOCK_LOGS } from './mockData'

// Visual clone of QuotationDetailDrawer. Every action button is a no-op.
// No data hooks, no Supabase, no contexts.

const noop = () => {}
const fmt = n => Number(n).toLocaleString('en-US', { minimumFractionDigits: 2 })

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
  const cls = STATUS_BADGE[status] || STATUS_BADGE.draft
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${cls}`}>
      {status?.replace('_', ' ')}
    </span>
  )
}

const sectionLabel = { fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 10 }
const infoLabel = { fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }
const thSt = { fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'none', letterSpacing: 'normal' }

export default function TestQuotationDrawer({ quotation, onClose, onPreview }) {
  const q = quotation
  const logs = MOCK_LOGS[q.status] || MOCK_LOGS.default
  const items = q.quotation_items || []
  const clientName = q.client_name_snapshot || q.client_contact_snapshot || q.client?.company_name || q.client?.contact_person

  const canApprove = q.status === 'pending_approval'
  const canReject = q.status === 'pending_approval'
  const canSubmit = q.status === 'draft'
  const canDelete = q.status === 'draft' || q.status === 'pending_approval'
  const canConvert = q.status === 'approved'

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer-panel">
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--bg-border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 1 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: '#3b82f6' }}>{q.quotation_number}</span>
              <StatusBadge status={q.status} />
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>{clientName}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              Created by {q.created_by_user?.full_name} · {new Date(q.created_at).toLocaleDateString('en-GB')}
            </div>
            {q.revision_of_number && (
              <button
                onClick={noop}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6, background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 11, color: 'var(--text-muted)', textDecoration: 'underline' }}
              >
                <GitBranch size={11} /> Revision of {q.revision_of_number}
              </button>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '24px' }}>
          {q.status === 'superseded' && (
            <div style={{ marginBottom: 24, background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <History size={16} color="var(--text-muted)" />
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>This quotation has been superseded by a newer revision.</span>
              </div>
              {q.superseded_by_number && (
                <button className="btn-ghost" onClick={noop} style={{ fontSize: 12, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
                  View {q.superseded_by_number} <ArrowRight size={12} />
                </button>
              )}
            </div>
          )}

          {q.status === 'rejected' && (
            <div style={{ marginBottom: 24, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={16} color="#ef4444" />
              <span style={{ fontSize: 13, color: '#ef4444' }}>This quotation was rejected. Edit and resubmit for approval.</span>
            </div>
          )}

          {/* Client */}
          <div style={{ marginBottom: 24 }}>
            <h4 style={sectionLabel}>Client</h4>
            <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>{clientName}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
                <div>
                  <div style={infoLabel}>Contact</div>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{q.client.contact_person}</div>
                </div>
                <div>
                  <div style={infoLabel}>Phone</div>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{q.client.phone}</div>
                </div>
                <div>
                  <div style={infoLabel}>Email</div>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{q.client.email}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Services */}
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
                      <td style={{ textAlign: 'right', fontSize: 13 }}>QAR {fmt(item.unit_price)}</td>
                      <td style={{ textAlign: 'right', color: 'var(--text-primary)', fontWeight: 500, fontSize: 13 }}>QAR {fmt(item.total_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ padding: '14px 20px', borderTop: '1px solid var(--bg-border)', background: 'var(--bg-elevated)' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Subtotal: QAR {fmt(q.subtotal)}</div>
                  {q.discount_amount > 0 && (
                    <div style={{ fontSize: 13, color: 'var(--status-overdue)' }}>Discount: - QAR {fmt(q.discount_amount)}</div>
                  )}
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Total: QAR {fmt(q.total_amount)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Validity + Notes */}
          {(q.valid_until || q.notes) && (
            <div style={{ display: 'grid', gridTemplateColumns: q.valid_until && q.notes ? '1fr 1fr' : '1fr', gap: 16, marginBottom: 24 }}>
              {q.valid_until && (
                <div>
                  <h4 style={sectionLabel}>Valid Until</h4>
                  <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: 12 }}>
                    <div style={infoLabel}>Date</div>
                    <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                      {new Date(q.valid_until).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </div>
                  </div>
                </div>
              )}
              {q.notes && (
                <div>
                  <h4 style={sectionLabel}>Notes</h4>
                  <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: 12, fontSize: 13, color: 'var(--text-secondary)' }}>{q.notes}</div>
                </div>
              )}
            </div>
          )}

          {/* Approval info */}
          {q.status === 'approved' && (
            <div style={{ marginBottom: 24, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <CheckCircle size={16} color="var(--status-active)" />
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--status-active)' }}>Approved</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                By {q.reviewed_by_user?.full_name} · {q.reviewed_at ? new Date(q.reviewed_at).toLocaleDateString('en-GB') : ''}
              </div>
            </div>
          )}

          {/* Rejection info */}
          {q.status === 'rejected' && (
            <div style={{ marginBottom: 24, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <XCircle size={16} color="var(--status-overdue)" />
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--status-overdue)' }}>Rejected</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{q.rejection_reason}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                By {q.reviewed_by_user?.full_name} · {new Date(q.reviewed_at).toLocaleDateString('en-GB')}
              </div>
            </div>
          )}

          {/* Activity log */}
          <div style={{ marginBottom: 24 }}>
            <h4 style={sectionLabel}>Activity Log</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {logs.map(log => (
                <div key={log.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <Clock size={12} style={{ color: 'var(--text-muted)', marginTop: 3, flexShrink: 0 }} />
                  <div>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{log.action}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>
                      {log.by} · {new Date(log.at).toLocaleDateString('en-GB')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actions footer. Everything except Preview and the reject-box toggle is a no-op. */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--bg-border)', position: 'sticky', bottom: 0, background: 'var(--bg-secondary)', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button className="btn-ghost" onClick={() => onPreview(q)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Eye size={14} /> Preview
          </button>
          <button className="btn-ghost" onClick={noop} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Download size={14} /> {q.status === 'approved' || q.status === 'converted' || q.status === 'superseded' ? 'Export PDF' : 'Export DOCX'}
          </button>
          {q.status === 'draft' && (
            <button className="btn-ghost" onClick={noop} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Pencil size={14} /> Edit Quotation
            </button>
          )}
          {q.status === 'approved' && (
            <button className="btn-gold" onClick={noop} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <GitBranch size={14} /> Revise Quotation
            </button>
          )}
          {canSubmit && (
            <button className="btn-ghost" onClick={noop}>Submit for Approval</button>
          )}
          {q.status === 'rejected' && (
            <button className="btn-gold" onClick={noop}>Edit &amp; Resubmit</button>
          )}
          {canApprove && (
            <button className="btn-gold" onClick={() => onPreview(q)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle size={14} /> Review &amp; Approve
            </button>
          )}
          {canReject && (
            <button className="btn-danger" onClick={noop}>Reject</button>
          )}
          {canConvert && (
            <button className="btn-gold" onClick={noop} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ArrowRight size={14} /> Convert to Invoice
            </button>
          )}
          {canDelete && (
            <button className="btn-danger" onClick={noop} style={{ marginLeft: 'auto' }}>Delete</button>
          )}
        </div>
      </div>
    </>
  )
}
