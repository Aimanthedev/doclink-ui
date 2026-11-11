import { useRef, useState } from 'react'
import { X, Download, CheckCircle, Printer } from 'lucide-react'
import { exportQuotationDocx } from '../../lib/exportQuotation'
import { exportStandardQuotationFromTemplate } from '../../lib/exportStandardQuotation'
import { exportFormationQuotationFromTemplate } from '../../lib/exportFormationQuotation'
import { numberToWordsQAR } from '../../lib/numberToWords'
import { useToast } from '../../lib/ToastContext'
import { exportDocxAsPDF } from '../../lib/exportToPDF'
import { exportErrorMessage } from '../../lib/templateLoader'
import { wasQuotationSigned } from '../../lib/quotationSignature'

function FormationDocument({ q, client, wasSigned }) {
  const items = q.quotation_items ?? []
  const features = (q.features_notes ?? []).filter(f => (f.field && f.field.trim()) || (f.value && f.value.trim()))
  const total = Number(q.total_amount ?? 0)

  const ownershipType = q.features_notes?.find(f => f.field === 'Legal form of business')?.value
    || (q.quotation_type === 'company_formation_expat'
      ? '100% Expat Owned (non-Qatari) Limited Liability Company'
      : 'Qatari Owned Limited Liability Company')

  return (
    <>
      {/* Company Header — left branding only, no QUOTATION banner */}
      <div style={{ marginBottom: 32, paddingBottom: 24, borderBottom: '3px solid #c9a84c' }}>
        <div style={{ fontSize: 28, fontWeight: 700, color: '#1a1a2e', letterSpacing: '-0.02em' }}>DocLink</div>
        <div style={{ fontSize: 13, color: '#666', marginTop: 2 }}>Global Services</div>
        <div style={{ fontSize: 12, color: '#999', marginTop: 6, lineHeight: 1.6 }}>
          Doha, Qatar<br />
          info@doclink.qa
        </div>
      </div>

      {/* Date + Reference */}
      <div style={{ marginBottom: 24, fontSize: 13, color: '#333' }}>
        <div>Date: {new Date(q.issue_date || q.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
        <div>Ref: {q.quotation_number}</div>
      </div>

      {/* To: block */}
      <div style={{ marginBottom: 24, paddingLeft: 4, fontSize: 13, color: '#333', lineHeight: 1.6 }}>
        <div style={{ fontWeight: 700 }}>{client?.company_name || client?.contact_person}</div>
        {client?.phone && <div>{client.phone}</div>}
        <div>Doha, Qatar</div>
      </div>

      {/* Subject */}
      <div style={{ textAlign: 'center', fontWeight: 700, textDecoration: 'underline', fontSize: 14, color: '#1a1a2e', marginBottom: 24 }}>
        Subject: Proposal for business formation
      </div>

      {/* Salutation + scope */}
      <div style={{ fontSize: 13, color: '#333', lineHeight: 1.7, marginBottom: 24 }}>
        <p style={{ marginBottom: 12 }}>Dear Sir/Madam,</p>
        <p style={{ marginBottom: 16 }}>Please find below detailed scope of services and fees in reference to above subject.</p>
        <p style={{ fontWeight: 700, textDecoration: 'underline', marginBottom: 8 }}>Scope of Services:</p>
        <p>
          Professional consultation and assistance to incorporate a {ownershipType} in the state of Qatar and includes processing
          all documentations and correspondence with relevant government bodies until completion of the procedures and grant of
          stated licenses.
        </p>
      </div>

      {/* Features & Notes */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontWeight: 700, textDecoration: 'underline', fontSize: 13, color: '#1a1a2e', marginBottom: 10 }}>Features & Notes:</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <tbody>
            {features.map((f, idx) => (
              <tr key={idx} style={{ background: idx % 2 === 0 ? '#fff' : '#f7f7f7' }}>
                <td style={{ border: '1px solid #ddd', padding: '8px 12px', width: '35%', color: '#1a1a2e' }}>{f.field}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px 12px', color: '#333' }}>{f.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Page break visual separator */}
      <hr style={{ border: 'none', borderTop: '1px dashed #ccc', margin: '40px 0' }} />

      {/* Table of Fees & Timelines */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 700, textDecoration: 'underline', fontSize: 13, color: '#1a1a2e', marginBottom: 10 }}>Table of Fees & Timelines:</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #ddd', padding: '8px 12px', textAlign: 'left', fontStyle: 'italic', fontWeight: 600 }}>Description</th>
              <th style={{ border: '1px solid #ddd', padding: '8px 12px', textAlign: 'right', fontStyle: 'italic', fontWeight: 600 }}>Amount QAR</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const price = Number(item.total_price ?? 0)
              return (
                <tr key={item.id ?? idx} style={{ background: idx % 2 === 0 ? '#fff' : '#f7f7f7' }}>
                  <td style={{ border: '1px solid #ddd', padding: '8px 12px', color: '#333' }}>{item.service_name}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px 12px', textAlign: 'right', color: '#333' }}>
                    {price === 0 ? '-' : price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              )
            })}
            <tr>
              <td style={{ border: '1px solid #ddd', padding: '8px 12px', fontWeight: 700, color: '#1a1a2e' }}>
                TOTAL: {numberToWordsQAR(total)}
              </td>
              <td style={{ border: '1px solid #ddd', padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#1a1a2e' }}>
                {total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Footer note */}
      <div style={{ fontSize: 11, fontStyle: 'italic', color: '#999', marginBottom: 28 }}>
        *additional charges applicable as per required scope of work for '*' indicated services
      </div>

      {/* Closing Message */}
      <div style={{ marginBottom: 32, fontSize: 13, color: '#555', lineHeight: 1.7, fontStyle: 'italic' }}>
        {q.closing_message || "We are pleased to have this opportunity to be of service to you. Should there be further inquiries, kindly don't hesitate to contact us."}
      </div>

      {/* Signature Block (duplicated from the standard path on purpose — see plan notes) */}
      <div style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid #eee' }}>
        {wasSigned && q.signature_url ? (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#999', marginBottom: 12 }}>Authorised Signature</div>
            <img
              src={q.signature_url}
              alt="Signature"
              style={{ maxHeight: 80, maxWidth: 240, objectFit: 'contain', marginBottom: 8 }}
            />
            <div style={{ width: 240, borderTop: '1px solid #1a1a2e', paddingTop: 6 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#1a1a2e' }}>{q.reviewed_by_user?.full_name || q.signatory_name || 'Authorised Signatory'}</div>
              <div style={{ fontSize: 11, color: '#999' }}>{q.signatory_position || 'DocLink Global Services'}</div>
              {q.signed_at && (
                <div style={{ fontSize: 11, color: '#999' }}>{new Date(q.signed_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ textAlign: 'center', width: 240 }}>
              <div style={{ height: 60, borderBottom: '1px solid #1a1a2e', marginBottom: 8 }} />
              <div style={{ fontSize: 12, color: '#999' }}>{q.signatory_name || 'Authorised Signature'}</div>
              <div style={{ fontSize: 11, color: '#bbb' }}>{q.signatory_position || 'DocLink Global Services'}</div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default function QuotationPreviewModal({ quotation, onClose, onApprove, canApprove, approving }) {
  const toast = useToast()
  const printRef = useRef()
  const [exporting, setExporting] = useState(false)

  const q = quotation
  const client = q.client
  const items = q.quotation_items ?? []
  const wasSigned = wasQuotationSigned(q)
  const isFormation = q.quotation_type === 'company_formation_expat' || q.quotation_type === 'company_formation_qatari'

  async function handleExport() {
    if (wasSigned) {
      setExporting(true)
      try {
        let blob
        if (q.quotation_type === 'standard') {
          blob = await exportStandardQuotationFromTemplate(q, { returnBlob: true })
        } else if (isFormation) {
          blob = await exportFormationQuotationFromTemplate(q, { returnBlob: true })
        } else {
          blob = await exportQuotationDocx(q, { returnBlob: true })
        }
        await exportDocxAsPDF(blob, q.quotation_number)
        toast('PDF exported successfully', 'success')
      } catch (err) {
        console.error('[QuotationPreviewModal] PDF export failed:', err)
        toast(exportErrorMessage(err, 'PDF export failed. Please try again.'), 'error')
      } finally {
        setExporting(false)
      }
      return
    }
    try {
      if (q.quotation_type === 'standard') {
        await exportStandardQuotationFromTemplate(q)
      } else if (q.quotation_type === 'company_formation_expat' || q.quotation_type === 'company_formation_qatari') {
        await exportFormationQuotationFromTemplate(q)
      } else {
        await exportQuotationDocx(q)
      }
      toast('Quotation exported as DOCX', 'success')
    } catch (err) { toast(err.message || 'Export failed', 'error') }
  }

  function handlePrint() {
    const content = printRef.current.innerHTML
    const win = window.open('', '_blank')
    win.document.write(`<html><head><title>${q.quotation_number}</title><style>
      body { font-family: Calibri, sans-serif; margin: 0; padding: 40px; color: #1a1a2e; }
      table { width: 100%; border-collapse: collapse; }
      th { background: #c9a84c; color: white; padding: 10px 14px; text-align: left; font-size: 13px; }
      td { padding: 10px 14px; border-bottom: 1px solid #eee; font-size: 13px; }
      .total-row td { font-weight: 700; font-size: 15px; border-top: 2px solid #c9a84c; }
    </style></head><body>${content}</body></html>`)
    win.document.close()
    win.print()
  }

  const subtotal = Number(q.subtotal ?? 0)
  const discount = Number(q.discount_amount ?? 0)
  const tax = Number(q.tax_amount ?? 0)
  const additionalCharges = Number(q.additional_charges ?? 0)
  const total = Number(q.total_amount ?? 0)
  const preparedBy = q.prepared_by_override || q.created_by_user?.full_name

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'var(--bg-secondary)',
        borderRadius: 16,
        border: '1px solid var(--bg-border)',
        width: '100%',
        maxWidth: 860,
        maxHeight: '94vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
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
            <button className="btn-ghost" onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <Printer size={13} /> Print
            </button>
            <button className="btn-ghost" onClick={handleExport} disabled={exporting} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <Download size={13} /> {exporting ? 'Generating PDF...' : wasSigned ? 'Export PDF' : 'Export DOCX'}
            </button>
            {canApprove && (
              <button className="btn-gold" onClick={onApprove} disabled={approving} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                <CheckCircle size={13} /> {approving ? 'Approving...' : 'Approve & Sign'}
              </button>
            )}
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', marginLeft: 4 }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Document Preview */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px', background: 'var(--bg-primary)' }}>
          <div
            ref={printRef}
            style={{
              background: '#ffffff',
              borderRadius: 8,
              padding: '56px 64px',
              maxWidth: 760,
              margin: '0 auto',
              color: '#1a1a2e',
              fontFamily: 'Calibri, sans-serif',
              boxShadow: '0 8px 48px rgba(0,0,0,0.4)',
            }}
          >

            {isFormation ? (
              <FormationDocument q={q} client={client} wasSigned={wasSigned} />
            ) : (
              <>

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
                <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                  Date: {new Date(q.issue_date || q.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
                </div>
                {q.valid_until && (
                  <div style={{ fontSize: 12, color: '#999' }}>
                    Valid Until: {new Date(q.valid_until).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </div>
                )}
                {preparedBy && (
                  <div style={{ fontSize: 12, color: '#999' }}>Prepared By: {preparedBy}</div>
                )}
              </div>
            </div>

            {/* Subject */}
            {q.subject && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#999', marginBottom: 4 }}>Subject</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a2e' }}>{q.subject}</div>
              </div>
            )}

            {/* Client Info */}
            <div style={{ marginBottom: 32, background: '#f9f7f2', borderRadius: 8, padding: '20px 24px', borderLeft: '4px solid #c9a84c' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#999', marginBottom: 10 }}>Bill To</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a2e', marginBottom: 4 }}>
                {client?.company_name || client?.contact_person}
              </div>
              {client?.company_name && (
                <div style={{ fontSize: 13, color: '#555', marginBottom: 2 }}>{client.contact_person}</div>
              )}
              <div style={{ fontSize: 13, color: '#777', display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 4 }}>
                {client?.phone && <span>{client.phone}</span>}
                {client?.email && <span>{client.email}</span>}
              </div>
            </div>

            {/* Services Table */}
            <div style={{ marginBottom: 32 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['#', 'Service / Description', 'Qty', 'Unit Price (QAR)', 'Total (QAR)'].map((h, i) => (
                      <th key={h} style={{
                        background: '#1a1a2e',
                        color: '#c9a84c',
                        padding: '12px 14px',
                        textAlign: i > 1 ? 'right' : i === 0 ? 'center' : 'left',
                        fontSize: 12,
                        fontWeight: 700,
                        letterSpacing: '0.04em',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const subParts = []
                    if (item.category) subParts.push(`Category: ${item.category}`)
                    if (item.tax_rate) subParts.push(`Tax ${item.tax_rate}%`)
                    if (item.discount_amount) subParts.push(`Discount QAR ${Number(item.discount_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`)
                    if (item.estimated_delivery) subParts.push(`Est. delivery: ${item.estimated_delivery}`)
                    if (item.notes) subParts.push(item.notes)
                    return (
                      <tr key={item.id} style={{ background: idx % 2 === 0 ? '#fff' : '#fafaf8' }}>
                        <td style={{ padding: '12px 14px', textAlign: 'center', fontSize: 13, color: '#999', borderBottom: '1px solid #eee' }}>{idx + 1}</td>
                        <td style={{ padding: '12px 14px', borderBottom: '1px solid #eee' }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}>{item.service_name}</div>
                          {item.description && <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{item.description}</div>}
                          {subParts.length > 0 && <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>{subParts.join(' · ')}</div>}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', fontSize: 13, color: '#555', borderBottom: '1px solid #eee' }}>
                          {item.quantity}{item.unit_type ? ` ${item.unit_type}` : ''}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', fontSize: 13, color: '#555', borderBottom: '1px solid #eee' }}>
                          {Number(item.unit_price).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', fontSize: 13, fontWeight: 600, color: '#1a1a2e', borderBottom: '1px solid #eee' }}>
                          {Number(item.total_price).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {/* Totals */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                <div style={{ width: 280 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee', fontSize: 13, color: '#555' }}>
                    <span>Subtotal</span>
                    <span>QAR {subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                  {discount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee', fontSize: 13, color: '#e55' }}>
                      <span>Discount</span>
                      <span>- QAR {discount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  {tax > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee', fontSize: 13, color: '#555' }}>
                      <span>Tax</span>
                      <span>+ QAR {tax.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  {additionalCharges > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee', fontSize: 13, color: '#555' }}>
                      <span>Additional Charges</span>
                      <span>+ QAR {additionalCharges.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', fontSize: 16, fontWeight: 800, color: '#1a1a2e', borderTop: '2px solid #c9a84c', marginTop: 4 }}>
                    <span>GRAND TOTAL</span>
                    <span style={{ color: '#c9a84c' }}>QAR {total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Terms */}
            {q.terms && (
              <div style={{ marginBottom: 28, padding: '16px 20px', background: '#f9f7f2', borderRadius: 6 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#999', marginBottom: 8 }}>Terms & Conditions</div>
                <div style={{ fontSize: 12, color: '#666', lineHeight: 1.7 }}>{q.terms}</div>
              </div>
            )}

            {/* Notes */}
            {q.notes && (
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#999', marginBottom: 8 }}>Notes</div>
                <div style={{ fontSize: 12, color: '#666', lineHeight: 1.7 }}>{q.notes}</div>
              </div>
            )}

            {/* Closing Message */}
            {q.closing_message && (
              <div style={{ marginTop: 32, fontSize: 13, color: '#555', lineHeight: 1.7, fontStyle: 'italic' }}>
                {q.closing_message}
              </div>
            )}

            {/* Signature Block */}
            <div style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid #eee' }}>
              {wasSigned && q.signature_url ? (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#999', marginBottom: 12 }}>Authorised Signature</div>
                  <img
                    src={q.signature_url}
                    alt="Signature"
                    style={{ maxHeight: 80, maxWidth: 240, objectFit: 'contain', marginBottom: 8 }}
                  />
                  <div style={{ width: 240, borderTop: '1px solid #1a1a2e', paddingTop: 6 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#1a1a2e' }}>{q.reviewed_by_user?.full_name || q.signatory_name || 'Authorised Signatory'}</div>
                    <div style={{ fontSize: 11, color: '#999' }}>{q.signatory_position || 'DocLink Global Services'}</div>
                    {q.signed_at && (
                      <div style={{ fontSize: 11, color: '#999' }}>{new Date(q.signed_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <div style={{ textAlign: 'center', width: 240 }}>
                    <div style={{ height: 60, borderBottom: '1px solid #1a1a2e', marginBottom: 8 }} />
                    <div style={{ fontSize: 12, color: '#999' }}>{q.signatory_name || 'Authorised Signature'}</div>
                    <div style={{ fontSize: 11, color: '#bbb' }}>{q.signatory_position || 'DocLink Global Services'}</div>
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

              </>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}