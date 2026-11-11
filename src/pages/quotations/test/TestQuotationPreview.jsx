import { X, Download, CheckCircle, Printer } from 'lucide-react'

// Visual clone of QuotationPreviewModal (standard layout). Print / Export /
// Approve are no-ops. No exports, no toast, no data access.

const noop = () => {}
const fmt = n => Number(n).toLocaleString('en-US', { minimumFractionDigits: 2 })
const longDate = d => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })

const label = { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#999' }

export default function TestQuotationPreview({ quotation: q, onClose }) {
  const client = q.client
  const items = q.quotation_items ?? []
  const wasSigned = ['approved', 'converted', 'superseded'].includes(q.status)
  const subtotal = Number(q.subtotal ?? 0)
  const discount = Number(q.discount_amount ?? 0)
  const total = Number(q.total_amount ?? 0)
  const canApprove = q.status === 'pending_approval'

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'var(--bg-secondary)', borderRadius: 16, border: '1px solid var(--bg-border)',
        width: '100%', maxWidth: 860, maxHeight: '94vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
      }}>
        {/* Modal Header */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--bg-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
              Quotation Preview
            </span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--accent-gold)' }}>
              {q.quotation_number}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="btn-ghost" onClick={noop} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <Printer size={13} /> Print
            </button>
            <button className="btn-ghost" onClick={noop} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <Download size={13} /> {wasSigned ? 'Export PDF' : 'Export DOCX'}
            </button>
            {canApprove && (
              <button className="btn-gold" onClick={noop} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                <CheckCircle size={13} /> Approve &amp; Sign
              </button>
            )}
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', marginLeft: 4 }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Document Preview */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px', background: 'var(--bg-primary)' }}>
          <div style={{
            background: '#ffffff', borderRadius: 8, padding: '56px 64px', maxWidth: 760, margin: '0 auto',
            color: '#1a1a2e', fontFamily: 'Calibri, sans-serif', boxShadow: '0 8px 48px rgba(0,0,0,0.4)',
          }}>
            {/* Company Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, paddingBottom: 24, borderBottom: '3px solid #c9a84c' }}>
              <div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#1a1a2e', letterSpacing: '-0.02em' }}>DocLink</div>
                <div style={{ fontSize: 13, color: '#666', marginTop: 2 }}>Global Services</div>
                <div style={{ fontSize: 12, color: '#999', marginTop: 6, lineHeight: 1.6 }}>
                  Doha, Qatar<br />
                  info@doclink.qa
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 36, fontWeight: 800, color: '#c9a84c', letterSpacing: '-0.02em' }}>QUOTATION</div>
                <div style={{ fontSize: 14, color: '#666', marginTop: 6, fontFamily: 'monospace' }}>{q.quotation_number}</div>
                <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>Date: {longDate(q.created_at)}</div>
                {q.valid_until && <div style={{ fontSize: 12, color: '#999' }}>Valid Until: {longDate(q.valid_until)}</div>}
                <div style={{ fontSize: 12, color: '#999' }}>Prepared By: {q.created_by_user?.full_name}</div>
              </div>
            </div>

            {/* Client Info */}
            <div style={{ marginBottom: 32, background: '#f9f7f2', borderRadius: 8, padding: '20px 24px', borderLeft: '4px solid #c9a84c' }}>
              <div style={{ ...label, marginBottom: 10 }}>Bill To</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a2e', marginBottom: 4 }}>{client.company_name}</div>
              <div style={{ fontSize: 13, color: '#555', marginBottom: 2 }}>{client.contact_person}</div>
              <div style={{ fontSize: 13, color: '#777', display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 4 }}>
                <span>{client.phone}</span>
                <span>{client.email}</span>
              </div>
            </div>

            {/* Services Table */}
            <div style={{ marginBottom: 32 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['#', 'Service / Description', 'Qty', 'Unit Price (QAR)', 'Total (QAR)'].map((h, i) => (
                      <th key={h} style={{
                        background: '#1a1a2e', color: '#c9a84c', padding: '12px 14px',
                        textAlign: i > 1 ? 'right' : i === 0 ? 'center' : 'left',
                        fontSize: 12, fontWeight: 700, letterSpacing: '0.04em',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={item.id} style={{ background: idx % 2 === 0 ? '#fff' : '#fafaf8' }}>
                      <td style={{ padding: '12px 14px', textAlign: 'center', fontSize: 13, color: '#999', borderBottom: '1px solid #eee' }}>{idx + 1}</td>
                      <td style={{ padding: '12px 14px', borderBottom: '1px solid #eee' }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}>{item.service_name}</div>
                        {item.description && <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{item.description}</div>}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontSize: 13, color: '#555', borderBottom: '1px solid #eee' }}>{item.quantity}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontSize: 13, color: '#555', borderBottom: '1px solid #eee' }}>{fmt(item.unit_price)}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontSize: 13, fontWeight: 600, color: '#1a1a2e', borderBottom: '1px solid #eee' }}>{fmt(item.total_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                <div style={{ width: 280 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee', fontSize: 13, color: '#555' }}>
                    <span>Subtotal</span><span>QAR {fmt(subtotal)}</span>
                  </div>
                  {discount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee', fontSize: 13, color: '#e55' }}>
                      <span>Discount</span><span>- QAR {fmt(discount)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', fontSize: 16, fontWeight: 800, color: '#1a1a2e', borderTop: '2px solid #c9a84c', marginTop: 4 }}>
                    <span>GRAND TOTAL</span>
                    <span style={{ color: '#c9a84c' }}>QAR {fmt(total)}</span>
                  </div>
                </div>
              </div>
            </div>

            {q.notes && (
              <div style={{ marginBottom: 28 }}>
                <div style={{ ...label, marginBottom: 8 }}>Notes</div>
                <div style={{ fontSize: 12, color: '#666', lineHeight: 1.7 }}>{q.notes}</div>
              </div>
            )}

            {/* Signature Block (no real signature image; mock only) */}
            <div style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid #eee' }}>
              {wasSigned ? (
                <div>
                  <div style={{ ...label, marginBottom: 12 }}>Authorised Signature</div>
                  <div style={{ height: 56 }} />
                  <div style={{ width: 240, borderTop: '1px solid #1a1a2e', paddingTop: 6 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#1a1a2e' }}>{q.reviewed_by_user?.full_name || 'Authorised Signatory'}</div>
                    <div style={{ fontSize: 11, color: '#999' }}>DocLink Global Services</div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <div style={{ textAlign: 'center', width: 240 }}>
                    <div style={{ height: 60, borderBottom: '1px solid #1a1a2e', marginBottom: 8 }} />
                    <div style={{ fontSize: 12, color: '#999' }}>Authorised Signature</div>
                    <div style={{ fontSize: 11, color: '#bbb' }}>DocLink Global Services</div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ marginTop: 40, paddingTop: 16, borderTop: '1px solid #eee', textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: '#bbb' }}>
                This is a computer-generated quotation by DocLink Global Services · Doha, Qatar
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
