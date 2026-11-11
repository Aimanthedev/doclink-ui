import { useRef, useState } from 'react'
import { X, Download, Printer } from 'lucide-react'
import { exportInvoiceFromTemplate } from '../../lib/exportInvoice'
import { exportDocxAsPDF } from '../../lib/exportToPDF'
import { exportErrorMessage } from '../../lib/templateLoader'
import { isInvoiceSigned } from '../../lib/documentSignature'
import { numberToWordsQAR } from '../../lib/numberToWords'
import { useToast } from '../../lib/ToastContext'

export default function InvoicePreviewModal({ invoice, companySettings, onClose }) {
  const toast = useToast()
  const printRef = useRef()
  const [exporting, setExporting] = useState(false)

  const inv = invoice
  const client = inv.client
  const settings = companySettings ?? {}
  const items = inv.items ?? inv.invoice_items ?? []
  const isApproved = isInvoiceSigned(inv)
  const hasBillTo = !!inv.bill_to_name
  const billTo = inv.bill_to_name || client?.company_name || client?.contact_person || 'N/A'

  const subtotal = Number(inv.subtotal ?? 0)
  const discount = Number(inv.discount_amount ?? 0)
  const tax = Number(inv.tax_amount ?? 0)
  const total = Number(inv.total_amount ?? 0)

  async function handleExport() {
    if (isApproved) {
      setExporting(true)
      try {
        const blob = await exportInvoiceFromTemplate(inv, companySettings, { returnBlob: true })
        await exportDocxAsPDF(blob, inv.invoice_number)
        toast('PDF exported successfully', 'success')
      } catch (err) {
        console.error('[InvoicePreviewModal] PDF export failed:', err)
        toast(exportErrorMessage(err, 'PDF export failed. Please try again.'), 'error')
      } finally {
        setExporting(false)
      }
      return
    }
    try {
      await exportInvoiceFromTemplate(inv, companySettings)
      toast('Invoice exported as DOCX', 'success')
    } catch (err) { toast(err.message || 'Export failed', 'error') }
  }

  function handlePrint() {
    const content = printRef.current.innerHTML
    const win = window.open('', '_blank')
    win.document.write(`<html><head><title>${inv.invoice_number}</title><style>
      body { font-family: Calibri, sans-serif; margin: 0; padding: 40px; color: #1a1a2e; }
      table { width: 100%; border-collapse: collapse; }
      th { background: #1a1a2e; color: #c9a84c; padding: 10px 14px; text-align: left; font-size: 13px; }
      td { padding: 10px 14px; border-bottom: 1px solid #eee; font-size: 13px; }
    </style></head><body>${content}</body></html>`)
    win.document.close()
    win.print()
  }

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
              Invoice Preview
            </span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--accent-gold)' }}>
              {inv.invoice_number}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="btn-ghost" onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <Printer size={13} /> Print
            </button>
            <button className="btn-ghost" onClick={handleExport} disabled={exporting} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <Download size={13} /> {exporting ? 'Generating PDF...' : isApproved ? 'Export PDF' : 'Export DOCX'}
            </button>
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
                <div style={{ fontSize: 36, fontWeight: 800, color: '#c9a84c', letterSpacing: '-0.02em' }}>INVOICE</div>
                <div style={{ fontSize: 14, color: '#666', marginTop: 6, fontFamily: 'monospace' }}>{inv.invoice_number}</div>
                <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                  Date: {new Date(inv.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
                </div>
                <div style={{ fontSize: 12, color: '#999' }}>Payment Terms: {inv.payment_terms || 'Due on receipt'}</div>
                {inv.due_date && (
                  <div style={{ fontSize: 12, color: '#999' }}>
                    Due: {new Date(inv.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </div>
                )}
              </div>
            </div>

            {/* Subject */}
            {inv.subject && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#999', marginBottom: 4 }}>Subject</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a2e' }}>{inv.subject}</div>
              </div>
            )}

            {/* Bill To */}
            <div style={{ marginBottom: 32, background: '#f9f7f2', borderRadius: 8, padding: '20px 24px', borderLeft: '4px solid #c9a84c' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#999', marginBottom: 10 }}>Bill To</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a2e', marginBottom: 4 }}>
                {billTo}
              </div>
              {!hasBillTo && client?.phone && <div style={{ fontSize: 13, color: '#777' }}>{client.phone}</div>}
              {!hasBillTo && client?.email && <div style={{ fontSize: 13, color: '#777' }}>{client.email}</div>}
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
                  {items.map((item, idx) => (
                    <tr key={item.id ?? idx} style={{ background: idx % 2 === 0 ? '#fff' : '#fafaf8' }}>
                      <td style={{ padding: '12px 14px', textAlign: 'center', fontSize: 13, color: '#999', borderBottom: '1px solid #eee' }}>{idx + 1}</td>
                      <td style={{ padding: '12px 14px', borderBottom: '1px solid #eee' }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}>{item.service_name}</div>
                        {item.description && <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{item.description}</div>}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontSize: 13, color: '#555', borderBottom: '1px solid #eee' }}>
                        {item.quantity}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontSize: 13, color: '#555', borderBottom: '1px solid #eee' }}>
                        {Number(item.unit_price).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontSize: 13, fontWeight: 600, color: '#1a1a2e', borderBottom: '1px solid #eee' }}>
                        {Number(item.total_price).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', fontSize: 16, fontWeight: 800, color: '#1a1a2e', borderTop: '2px solid #c9a84c', marginTop: 4 }}>
                    <span>GRAND TOTAL</span>
                    <span style={{ color: '#c9a84c' }}>QAR {total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 10, fontSize: 11, fontStyle: 'italic', color: '#999', textAlign: 'right' }}>
                {numberToWordsQAR(total)}
              </div>
            </div>

            {/* Bank Details */}
            {(settings.bank_ac_name || settings.bank_iban || settings.bank_name) && (
              <div style={{ marginBottom: 28, padding: '16px 20px', background: '#f9f7f2', borderRadius: 6 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#999', marginBottom: 8 }}>Bank Details</div>
                <div style={{ fontSize: 12, color: '#666', lineHeight: 1.7 }}>
                  {settings.bank_ac_name && <div>Account Name: {settings.bank_ac_name}</div>}
                  {settings.bank_ac_number && <div>Account Number: {settings.bank_ac_number}</div>}
                  {settings.bank_name && <div>Bank: {settings.bank_name}</div>}
                  {settings.bank_iban && <div>IBAN: {settings.bank_iban}</div>}
                  {settings.bank_swift_code && <div>Swift Code: {settings.bank_swift_code}</div>}
                  {settings.bank_fawran_alias && <div>Fawran Alias: {settings.bank_fawran_alias}</div>}
                </div>
              </div>
            )}

            {/* Notes */}
            {inv.notes && (
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#999', marginBottom: 8 }}>Notes</div>
                <div style={{ fontSize: 12, color: '#666', lineHeight: 1.7 }}>{inv.notes}</div>
              </div>
            )}

            {/* Terms */}
            {inv.terms && (
              <div style={{ marginBottom: 28, padding: '16px 20px', background: '#f9f7f2', borderRadius: 6 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#999', marginBottom: 8 }}>Terms & Conditions</div>
                <div style={{ fontSize: 12, color: '#666', lineHeight: 1.7 }}>{inv.terms}</div>
              </div>
            )}

            {/* Signature Block — only once approved */}
            {isApproved && (
              <div style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid #eee' }}>
                {inv.signature_url ? (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#999', marginBottom: 12 }}>Authorised Signature</div>
                    <img
                      src={inv.signature_url}
                      alt="Signature"
                      style={{ maxHeight: 80, maxWidth: 240, objectFit: 'contain', marginBottom: 8 }}
                    />
                    <div style={{ width: 240, borderTop: '1px solid #1a1a2e', paddingTop: 6 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#1a1a2e' }}>{inv.reviewed_by_user?.full_name || inv.signatory_name || 'Authorised Signatory'}</div>
                      <div style={{ fontSize: 11, color: '#999' }}>{inv.signatory_position || 'DocLink Global Services'}</div>
                      {inv.signed_at && (
                        <div style={{ fontSize: 11, color: '#999' }}>{new Date(inv.signed_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: '#999' }}>{inv.signatory_name || 'Authorised Signatory'}</div>
                )}
              </div>
            )}

            {/* Footer */}
            <div style={{ marginTop: 40, paddingTop: 16, borderTop: '1px solid #eee', textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: '#bbb' }}>
                This is a computer-generated invoice by DocLink Global Services · Doha, Qatar
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
