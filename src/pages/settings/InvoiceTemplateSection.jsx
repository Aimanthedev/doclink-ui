import { useRef, useState } from 'react'
import { ChevronDown, ChevronRight, FileText, Upload, Download, Trash2, AlertTriangle } from 'lucide-react'
import { useInvoiceTemplates, useUploadInvoiceTemplate, useDeleteInvoiceTemplate, useGetInvoiceTemplateUrl } from '../../hooks/useInvoiceTemplates'
import { useAuth } from '../../lib/AuthContext'
import { useToast } from '../../lib/ToastContext'

const TOKENS = [
  ['{{inv_reference_number}}', 'The generated invoice number'],
  ['{{date}}', 'Invoice creation date'],
  ['{{payment_terms}}', "Invoice payment terms (defaults to 'Due on receipt')"],
  ['{{company_name}}', "Client's company name"],
  ['{{client_name}}', "Client's contact person"],
  ['{{address}}', "Client's address"],
  ['{{total}}', 'Grand total'],
  ['{{total_in_words}}', 'Grand total spelled out in words'],
  ['{{e_sign}}', 'Signature anchor — replaced with the embedded signature image once approved, left blank otherwise'],
  ['{{sno}}, {{sevice_1}}, {{qty}}, {{s1_unit_price}}, {{s1_price}}', 'Line item row — put all five in a single table row; it is cloned once per invoice line item (note: "sevice_1" is intentional)'],
  ['{{ac_name}}', 'Company bank account name'],
  ['{{ac_number}}', 'Company bank account number'],
  ['{{iban}}', 'Company bank IBAN'],
  ['{{bank_name}}', 'Company bank name'],
  ['{{swift_code}}', 'Company bank Swift code'],
  ['{{Fawran Alias}}', 'Company Fawran alias'],
]

function TokenReference() {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ marginBottom: 20 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-gold)', fontSize: 12, fontWeight: 600, padding: 0 }}
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />} Token Reference
      </button>
      {open && (
        <div style={{ marginTop: 10, border: '1px solid var(--bg-border)', borderRadius: 8, overflow: 'hidden' }}>
          {TOKENS.map(([token, desc], idx) => (
            <div
              key={token}
              style={{
                display: 'flex', gap: 14, padding: '8px 12px',
                background: idx % 2 === 0 ? 'var(--bg-elevated)' : 'transparent',
                borderBottom: idx < TOKENS.length - 1 ? '1px solid var(--bg-border)' : 'none',
              }}
            >
              <code style={{ fontSize: 11, color: 'var(--accent-gold)', flexShrink: 0, minWidth: 160 }}>{token}</code>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{desc}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TemplateCard({ template }) {
  const { profile } = useAuth()
  const toast = useToast()
  const fileInputRef = useRef()
  const { mutateAsync: uploadTemplate, isPending: uploading } = useUploadInvoiceTemplate()
  const { mutateAsync: deleteTemplate, isPending: deleting } = useDeleteInvoiceTemplate()
  const { refetch: fetchSignedUrl, isFetching: isFetchingUrl } = useGetInvoiceTemplateUrl(template?.storage_path)

  async function handleFileSelect(e) {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.docx')) {
      toast('Please upload a .docx file', 'error')
      return
    }
    try {
      await uploadTemplate({ file, userId: profile?.id })
      toast('Template uploaded successfully', 'success')
    } catch (err) {
      toast(err.message || 'Upload failed', 'error')
    }
  }

  async function handleDownload() {
    if (!template?.storage_path) return
    try {
      const { data: url, error } = await fetchSignedUrl()
      if (error) throw error
      if (url) window.open(url, '_blank')
    } catch (err) {
      toast(err.message || 'Failed to get download link', 'error')
    }
  }

  async function handleDelete() {
    if (!template) return
    try {
      await deleteTemplate({ id: template.id, storagePath: template.storage_path })
      toast('Template deleted', 'info')
    } catch (err) {
      toast(err.message || 'Failed to delete template', 'error')
    }
  }

  return (
    <div
      onClick={() => !template && fileInputRef.current.click()}
      style={{
        background: 'var(--bg-elevated)', border: template ? '1px solid var(--bg-border)' : '2px dashed var(--bg-border)',
        borderRadius: 10, padding: 18, cursor: template ? 'default' : 'pointer',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <FileText size={16} color="var(--accent-gold)" style={{ marginTop: 2, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Invoice Template</div>
            {template ? (
              <>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{template.file_name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  Uploaded {new Date(template.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  {template.uploaded_by_user?.full_name && ` by ${template.uploaded_by_user.full_name}`}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                No template uploaded — invoices will export using a basic generated layout
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          {template && (
            <>
              <button className="btn-ghost" onClick={handleDownload} disabled={isFetchingUrl} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                <Download size={13} /> Download Current
              </button>
              <button className="btn-danger" onClick={handleDelete} disabled={deleting} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                <Trash2 size={13} /> {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </>
          )}
          <button className="btn-ghost" onClick={() => fileInputRef.current.click()} disabled={uploading} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <Upload size={13} /> {uploading ? 'Uploading...' : template ? 'Upload New Template' : 'Upload'}
          </button>
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept=".docx" style={{ display: 'none' }} onChange={handleFileSelect} />
    </div>
  )
}

export default function InvoiceTemplateSection() {
  const [expanded, setExpanded] = useState(false)
  const { data: activeTemplate, isLoading } = useInvoiceTemplates()

  return (
    <div className="card" style={{ padding: 0, marginBottom: 20, overflow: 'hidden' }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{ padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, background: 'var(--bg-elevated)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <FileText size={16} color="var(--accent-gold)" />
          </div>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Invoice Templates</h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Manage the Word document template used to generate invoice exports</p>
          </div>
        </div>
        {expanded ? <ChevronDown size={18} color="var(--text-muted)" /> : <ChevronRight size={18} color="var(--text-muted)" />}
      </div>

      {expanded && (
        <div style={{ padding: '0 24px 24px' }}>
          <div className="gold-line" style={{ marginBottom: 20 }} />

          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: 'var(--status-overdue)22', border: '1px solid var(--status-overdue)44', borderRadius: 8, padding: '12px 14px', marginBottom: 20 }}>
            <AlertTriangle size={15} color="var(--status-overdue)" style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Upload a .docx file with {'{{tokens}}'} for invoice generation. See the token reference below. Uploading a new template will affect all future invoice exports — existing invoices are not affected.
            </div>
          </div>

          {isLoading ? (
            <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading templates...</div>
          ) : (
            <div style={{ marginBottom: 12 }}>
              <TemplateCard template={activeTemplate} />
            </div>
          )}

          <TokenReference />
        </div>
      )}
    </div>
  )
}
