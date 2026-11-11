import { useRef, useState } from 'react'
import { X, Download, Printer } from 'lucide-react'
import { exportReceiptFromTemplate } from '../../lib/exportReceipt'
import { exportDocxAsPDF } from '../../lib/exportToPDF'
import { exportErrorMessage } from '../../lib/templateLoader'
import { isReceiptSigned } from '../../lib/documentSignature'
import { numberToWordsQAR } from '../../lib/numberToWords'
import { useToast } from '../../lib/ToastContext'

export default function ReceiptPreviewModal({ receipt, onClose }) {
  const toast = useToast()
  const printRef = useRef()
  const [exporting, setExporting] = useState(false)

  const invoice = receipt.invoice ?? {}
  const client = invoice.client ?? {}
  const hasBillTo = !!invoice.bill_to_name
  const billTo = invoice.bill_to_name || client.company_name || client.contact_person || 'N/A'
  const isApproved = isReceiptSigned(receipt)
  const items = receipt.receipt_items ?? []
  const total = items.reduce((s, i) => s + Number(i.amount || 0), 0)

  async function handleExport() {
    if (isApproved) {
      setExporting(true)
      try {
        const blob = await exportReceiptFromTemplate(receipt, { returnBlob: true })
        await exportDocxAsPDF(blob, receipt.receipt_number)
        toast('PDF exported successfully', 'success')
      } catch (err) {
        console.error('[ReceiptPreviewModal] PDF export failed:', err)
        toast(exportErrorMessage(err, 'PDF export failed. Please try again.'), 'error')
      } finally {
        setExporting(false)
      }
      return
    }
    try {
      await exportReceiptFromTemplate(receipt)
      toast('Receipt exported as DOCX', 'success')
    } catch (err) { toast(err.message || 'Export failed', 'error') }
  }

  function handlePrint() {
    const content = printRef.current.innerHTML
    const win = window.open('', '_blank')
    win.document.write(`<html><head><title>${receipt.receipt_number}</title><style>
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
              Receipt Preview
            </span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--accent-gold)' }}>
              {receipt.receipt_number}
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
                <div style={{ fontSize: 36, fontWeight: 800, color: '#c9a84c', letterSpacing: '-0.02em' }}>RECEIPT</div>
                <div style={{ fontSize: 14, color: '#666', marginTop: 6, fontFamily: 'monospace' }}>{receipt.receipt_number}</div>
                <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                  Date: {receipt.issue_date ? new Date(receipt.issue_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : ''}
                </div>
                <div style={{ fontSize: 12, color: '#999' }}>Invoice: {invoice.invoice_number || 'N/A'}</div>
                {receipt.payment_terms && (
                  <div style={{ fontSize: 12, color: '#999' }}>Payment Terms: {receipt.payment_terms}</div>
                )}
              </div>
            </div>

            {/* Bill To */}
            <div style={{ marginBottom: 32, background: '#f9f7f2', borderRadius: 8, padding: '20px 24px', borderLeft: '4px solid #c9a84c' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#999', marginBottom: 10 }}>Received From</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a2e', marginBottom: 4 }}>
                {billTo}
              </div>
              {!hasBillTo && client.phone && <div style={{ fontSize: 13, color: '#777' }}>{client.phone}</div>}
              {!hasBillTo && client.email && <div style={{ fontSize: 13, color: '#777' }}>{client.email}</div>}
            </div>

            {/* Items Table */}
            <div style={{ marginBottom: 32 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['#', 'Description', 'Amount (QAR)'].map((h, i) => (
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
                      <td style={{ padding: '12px 14px', fontSize: 13, color: '#1a1a2e', borderBottom: '1px solid #eee' }}>
                        {item.description_snapshot || '—'}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontSize: 13, fontWeight: 600, color: '#1a1a2e', borderBottom: '1px solid #eee' }}>
                        {Number(item.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                <div style={{ width: 280 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', fontSize: 16, fontWeight: 800, color: '#1a1a2e', borderTop: '2px solid #c9a84c' }}>
                    <span>TOTAL RECEIVED</span>
                    <span style={{ color: '#c9a84c' }}>QAR {total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 10, fontSize: 11, fontStyle: 'italic', color: '#999', textAlign: 'right' }}>
                {numberToWordsQAR(total)}
              </div>
            </div>

            {/* Signature Block — only once approved */}
            {isApproved && (
              <div style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid #eee' }}>
                {receipt.signature_url ? (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#999', marginBottom: 12 }}>Authorised Signature</div>
                    <img
                      src={receipt.signature_url}
                      alt="Signature"
                      style={{ maxHeight: 80, maxWidth: 240, objectFit: 'contain', marginBottom: 8 }}
                    />
                    <div style={{ width: 240, borderTop: '1px solid #1a1a2e', paddingTop: 6 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#1a1a2e' }}>{receipt.approved_by_user?.full_name || 'Authorised Signatory'}</div>
                      <div style={{ fontSize: 11, color: '#999' }}>DocLink Global Services</div>
                      {receipt.approved_at && (
                        <div style={{ fontSize: 11, color: '#999' }}>{new Date(receipt.approved_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: '#999' }}>Authorised Signatory</div>
                )}
              </div>
            )}

            {/* Footer */}
            <div style={{ marginTop: 40, paddingTop: 16, borderTop: '1px solid #eee', textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: '#bbb' }}>
                This is a computer-generated receipt by DocLink Global Services · Doha, Qatar
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
