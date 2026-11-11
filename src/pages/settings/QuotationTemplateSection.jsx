import { useRef, useState } from 'react'
import { ChevronDown, ChevronRight, FileText, Upload, Download, AlertTriangle } from 'lucide-react'
import { useQuotationTemplates, useUploadQuotationTemplate, useGetTemplateUrl } from '../../hooks/useQuotationTemplates'
import { useAuth } from '../../lib/AuthContext'
import { useToast } from '../../lib/ToastContext'

const TEMPLATE_TYPES = [
  { type: 'standard', label: 'Standard Quotation' },
  { type: 'company_formation_expat', label: 'Company Formation (shared by Expat & Qatari)' },
]

function TemplateCard({ type, label, template }) {
  const { profile } = useAuth()
  const toast = useToast()
  const fileInputRef = useRef()
  const { mutateAsync: uploadTemplate, isPending } = useUploadQuotationTemplate()
  const { refetch: fetchSignedUrl, isFetching: isFetchingUrl } = useGetTemplateUrl(template?.storage_path)

  async function handleFileSelect(e) {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.docx')) {
      toast('Please upload a .docx file', 'error')
      return
    }
    try {
      await uploadTemplate({ file, quotationType: type, userId: profile?.id })
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

  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', borderRadius: 10, padding: 18, marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <FileText size={16} color="var(--accent-gold)" style={{ marginTop: 2, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{label}</div>
            {template ? (
              <>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{template.file_name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  Uploaded {new Date(template.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  {template.uploaded_by_user?.full_name && ` by ${template.uploaded_by_user.full_name}`}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>No template uploaded yet</div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          {template && (
            <button className="btn-ghost" onClick={handleDownload} disabled={isFetchingUrl} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <Download size={13} /> Download Current
            </button>
          )}
          <button className="btn-ghost" onClick={() => fileInputRef.current.click()} disabled={isPending} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <Upload size={13} /> {isPending ? 'Uploading...' : 'Upload New Template'}
          </button>
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept=".docx" style={{ display: 'none' }} onChange={handleFileSelect} />
    </div>
  )
}

export default function QuotationTemplateSection() {
  const [expanded, setExpanded] = useState(false)
  const { data: templates = [], isLoading } = useQuotationTemplates()

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
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Quotation Templates</h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Manage the Word document templates used to generate quotation exports</p>
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
              Uploading a new template will affect all future quotations. Existing quotations are not affected.
            </div>
          </div>

          {isLoading ? (
            <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading templates...</div>
          ) : (
            TEMPLATE_TYPES.map(({ type, label }) => (
              <TemplateCard
                key={type}
                type={type}
                label={label}
                template={templates.find(t => t.quotation_type === type && t.is_active)}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}
