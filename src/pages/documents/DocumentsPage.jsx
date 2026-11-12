import { useState, useMemo, useEffect, useRef } from 'react'
import { useSearchParams } from '@/lib/router-compat'
import {
  Plus, Search, FileText, FileSpreadsheet, Image as ImageIcon, FileArchive, File as FileIcon,
  Download, Trash2, Users, FolderKanban, HardDrive, Files,
} from 'lucide-react'
import { useDocuments, useDeleteDocument, useDownloadDocument } from '../../hooks/useDocuments'
import { useToast } from '../../lib/ToastContext'
import { usePermissionsContext } from '../../contexts/PermissionsContext'
import UploadDocumentModal from './UploadDocumentModal'

function formatFileSize(bytes) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
}

function getFileIcon(fileName = '') {
  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  if (ext === 'pdf') return { Icon: FileText, color: 'var(--status-overdue)' }
  if (['doc', 'docx', 'txt', 'rtf'].includes(ext)) return { Icon: FileText, color: 'var(--status-review)' }
  if (['xls', 'xlsx', 'csv'].includes(ext)) return { Icon: FileSpreadsheet, color: 'var(--status-active)' }
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) return { Icon: ImageIcon, color: 'var(--accent-gold)' }
  if (['zip', 'rar', '7z'].includes(ext)) return { Icon: FileArchive, color: 'var(--text-secondary)' }
  return { Icon: FileIcon, color: 'var(--text-muted)' }
}

function groupDocuments(docs, view) {
  const groups = new Map()
  for (const doc of docs) {
    const key = view === 'category'
      ? (doc.category || 'Uncategorized')
      : (doc.client?.id || 'unassigned')
    const label = view === 'category'
      ? (doc.category || 'Uncategorized')
      : (doc.client ? (doc.client.company_name || doc.client.contact_person) : 'Unassigned')

    if (!groups.has(key)) groups.set(key, { key, label, items: [] })
    groups.get(key).items.push(doc)
  }
  return Array.from(groups.values()).sort((a, b) => {
    if (a.key === 'unassigned' || a.label === 'Uncategorized') return 1
    if (b.key === 'unassigned' || b.label === 'Uncategorized') return -1
    return a.label.localeCompare(b.label)
  })
}

function DocumentRow({ doc, view, onDownload, onDelete, busy, highlighted, innerRef }) {
  const { Icon, color } = getFileIcon(doc.file_name)
  return (
    <div
      ref={innerRef}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--bg-border)',
        background: highlighted ? 'var(--accent-gold-dim)' : 'transparent', transition: 'background 0.6s',
      }}
    >
      <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={17} color={color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {doc.file_name}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {view === 'category'
            ? (doc.client ? (doc.client.company_name || doc.client.contact_person) : 'Unassigned')
            : (doc.category || 'Uncategorized')}
          {' · '}{formatFileSize(doc.file_size_bytes)}{' · '}{formatDate(doc.created_at)}
          {doc.case ? ` · ${doc.case.case_number}` : ''}
          {doc.uploaded_by_user ? ` · ${doc.uploaded_by_user.full_name}` : ''}
        </div>
      </div>
      <button onClick={() => onDownload(doc)} disabled={busy === doc.id} title="Download"
        style={{ background: 'none', border: '1px solid var(--bg-border)', borderRadius: 8, padding: 7, cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }}
        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-gold)'}
        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--bg-border)'}>
        <Download size={14} />
      </button>
      <button onClick={() => onDelete(doc)} disabled={busy === doc.id} title="Delete"
        style={{ background: 'none', border: '1px solid var(--bg-border)', borderRadius: 8, padding: 7, cursor: 'pointer', color: 'var(--status-overdue)', display: 'flex' }}
        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--status-overdue)'}
        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--bg-border)'}>
        <Trash2 size={14} />
      </button>
    </div>
  )
}

export default function DocumentsPage() {
  const { can } = usePermissionsContext()
  const [searchParams, setSearchParams] = useSearchParams()
  const [view, setView] = useState('client')
  const [search, setSearch] = useState('')
  const [showUpload, setShowUpload] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [highlightId, setHighlightId] = useState(null)
  const rowRefs = useRef({})

  const { data: documents = [], isLoading } = useDocuments({ search })
  const { mutateAsync: deleteDocument } = useDeleteDocument()
  const { mutateAsync: getDownloadUrl } = useDownloadDocument()
  const toast = useToast()

  const groups = useMemo(() => groupDocuments(documents, view), [documents, view])

  // Deep-link from global search — /documents?open=DOCUMENT_ID scrolls to and
  // briefly highlights that row (there's no detail drawer to open here), then
  // the param is cleared so a refresh doesn't re-trigger it.
  useEffect(() => {
    const openId = searchParams.get('open')
    if (!openId || documents.length === 0) return
    const match = documents.find(d => d.id === openId)
    if (!match) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHighlightId(openId)
    setSearchParams({}, { replace: true })
    const t = setTimeout(() => setHighlightId(null), 2500)
    return () => clearTimeout(t)
  }, [documents, searchParams, setSearchParams])

  useEffect(() => {
    if (!highlightId) return
    rowRefs.current[highlightId]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [highlightId])

  const stats = {
    total: documents.length,
    categories: new Set(documents.map(d => d.category).filter(Boolean)).size,
    clients: new Set(documents.map(d => d.client?.id).filter(Boolean)).size,
    totalSize: documents.reduce((s, d) => s + Number(d.file_size_bytes || 0), 0),
  }

  async function handleDownload(doc) {
    setBusyId(doc.id)
    try {
      const url = await getDownloadUrl({ fileKey: doc.file_key })
      window.open(url, '_blank')
    } catch (err) {
      toast(err.message || 'Failed to get download link', 'error')
    } finally {
      setBusyId(null)
    }
  }

  async function handleDelete(doc) {
    if (!window.confirm(`Delete "${doc.file_name}"? This cannot be undone.`)) return
    setBusyId(doc.id)
    try {
      await deleteDocument({ id: doc.id, fileKey: doc.file_key })
      toast('Document deleted', 'success')
    } catch (err) {
      toast(err.message || 'Failed to delete document', 'error')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Documents</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Client files, contracts, and case documents stored in R2</p>
        </div>
        {can('can_export_documents') && (
          <button className="btn-gold" onClick={() => setShowUpload(true)} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Plus size={15} /> Upload Document
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total Documents', value: stats.total, icon: Files, color: 'var(--text-primary)' },
          { label: 'Categories', value: stats.categories, icon: FolderKanban, color: 'var(--status-review)' },
          { label: 'Clients with Files', value: stats.clients, icon: Users, color: 'var(--status-active)' },
          { label: 'Total Storage', value: formatFileSize(stats.totalSize), icon: HardDrive, color: 'var(--accent-gold)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 40, height: 40, background: 'var(--bg-elevated)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <s.icon size={18} color={s.color} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: s.color, fontFamily: 'var(--font-display)' }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--bg-border)', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 360 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="input-base" style={{ paddingLeft: 36 }} placeholder="Search documents by name..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          <div style={{ display: 'flex', gap: 0, border: '1px solid var(--bg-border)', borderRadius: 8, overflow: 'hidden', marginLeft: 'auto' }}>
            {[{ key: 'client', label: 'By Client' }, { key: 'category', label: 'By Category' }].map(v => (
              <button key={v.key} onClick={() => setView(v.key)}
                style={{
                  padding: '9px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
                  background: view === v.key ? 'var(--accent-gold)' : 'transparent',
                  color: view === v.key ? '#0a0a0f' : 'var(--text-secondary)',
                  transition: 'all 0.15s',
                }}>
                {v.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading documents...</div>
        ) : documents.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-art"><Files size={34} /></div>
            <div className="empty-state-title">No documents yet</div>
            <div className="empty-state-text">Upload your first document using the button above</div>
          </div>
        ) : (
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {groups.map(group => (
              <div key={group.key} className="card" style={{ overflow: 'hidden' }}>
                <div style={{ padding: '10px 16px', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{group.label}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{group.items.length} file{group.items.length === 1 ? '' : 's'}</span>
                </div>
                <div>
                  {group.items.map(doc => (
                    <DocumentRow
                      key={doc.id}
                      doc={doc}
                      view={view}
                      onDownload={handleDownload}
                      onDelete={handleDelete}
                      busy={busyId}
                      highlighted={highlightId === doc.id}
                      innerRef={el => { if (el) rowRefs.current[doc.id] = el }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showUpload && <UploadDocumentModal onClose={() => setShowUpload(false)} />}
    </div>
  )
}
