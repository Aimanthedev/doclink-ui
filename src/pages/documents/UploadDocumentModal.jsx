import { useState } from 'react'
import { X, Search, UploadCloud } from 'lucide-react'
import { useUploadDocument } from '../../hooks/useDocuments'
import { useClients, useClient } from '../../hooks/useClients'
import { useCases, useCase } from '../../hooks/useCases'
import { useAuth } from '../../lib/AuthContext'
import { useToast } from '../../lib/ToastContext'
import { DOCUMENT_CATEGORIES } from './documentCategories'

const FILE_SIZE_LIMIT = 50 * 1024 * 1024

function resolveCategory(inputLabel) {
  const trimmed = inputLabel.trim()
  const match = DOCUMENT_CATEGORIES.find(c => c.label.toLowerCase() === trimmed.toLowerCase())
  return match ? { category: match.value, categoryCustom: null } : { category: null, categoryCustom: trimmed || null }
}

export default function UploadDocumentModal({ onClose, prefillClientId = null, prefillCaseId = null }) {
  const { profile } = useAuth()
  const toast = useToast()
  const { mutateAsync: uploadDocument, isPending } = useUploadDocument()

  const [categoryInput, setCategoryInput] = useState(DOCUMENT_CATEGORIES[0].label)
  const [showCategoryDrop, setShowCategoryDrop] = useState(false)
  const [clientSearch, setClientSearch] = useState('')
  const [selectedClient, setSelectedClient] = useState(null)
  const [showClientDrop, setShowClientDrop] = useState(false)
  const [caseId, setCaseId] = useState(prefillCaseId || '')
  const [file, setFile] = useState(null)
  const [notes, setNotes] = useState('')
  const [isAdminOnly, setIsAdminOnly] = useState(false)
  const [expiryDate, setExpiryDate] = useState('')

  const { data: clients = [] } = useClients(clientSearch)
  const { data: cases = [] } = useCases(selectedClient ? { client_id: selectedClient.id } : {})
  const { data: prefilledCase } = useCase(prefillCaseId)
  const { data: prefilledClient } = useClient(prefillClientId)

  const canRestrict = profile?.role === 'super_admin' || profile?.role === 'manager'
  const fileExceedsLimit = file && file.size > FILE_SIZE_LIMIT
  const filteredCategories = DOCUMENT_CATEGORIES.filter(c => c.label.toLowerCase().includes(categoryInput.trim().toLowerCase()))

  async function handleSubmit() {
    if (!file) { toast('Please select a file to upload', 'error'); return }
    const { category, categoryCustom } = resolveCategory(categoryInput)
    try {
      await uploadDocument({
        file,
        category,
        categoryCustom,
        clientId: selectedClient?.id || prefillClientId || null,
        caseId: caseId || null,
        uploadedBy: profile?.id,
        notes: notes.trim() || null,
        isAdminOnly,
        requiresApproval: fileExceedsLimit,
        approvalStatus: fileExceedsLimit ? 'pending_approval' : 'approved',
        expiryDate: expiryDate || null,
      })
      toast(
        expiryDate ? 'Document uploaded and renewal reminder created' : 'Document uploaded successfully',
        'success'
      )
      onClose()
    } catch (err) {
      toast(err.message || 'Failed to upload document', 'error')
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 16, border: '1px solid var(--bg-border)', width: '100%', maxWidth: 560, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--bg-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: 22, fontWeight: 600, color: 'var(--text-primary)' }}>Upload Document</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            <div style={{ position: 'relative' }}>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Category</label>
              <input
                className="input-base"
                placeholder="Select or type a category..."
                value={categoryInput}
                onChange={e => setCategoryInput(e.target.value)}
                onFocus={() => setShowCategoryDrop(true)}
                onBlur={() => setTimeout(() => setShowCategoryDrop(false), 100)}
              />
              {showCategoryDrop && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', borderRadius: 8, maxHeight: 160, overflowY: 'auto', zIndex: 10 }}>
                  {filteredCategories.length > 0 ? filteredCategories.map(c => (
                    <div
                      key={c.value}
                      onClick={() => { setCategoryInput(c.label); setShowCategoryDrop(false) }}
                      style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, color: 'var(--text-primary)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      {c.label}
                    </div>
                  )) : (
                    <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text-muted)' }}>No matching category — will be saved as custom</div>
                  )}
                </div>
              )}
            </div>

            {prefillClientId ? (
              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Client</label>
                <div style={{ fontSize: 13, color: 'var(--text-primary)', background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', borderRadius: 8, padding: '9px 12px' }}>
                  Linked to client: <span style={{ fontWeight: 600 }}>{prefilledClient?.company_name || prefilledClient?.contact_person || '…'}</span>
                  {prefilledClient?.client_code && <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}> ({prefilledClient.client_code})</span>}
                </div>
              </div>
            ) : (
              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Client (optional)</label>
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input className="input-base" style={{ paddingLeft: 36 }} placeholder="Search client..." value={selectedClient ? (selectedClient.company_name || selectedClient.contact_person) : clientSearch}
                    onChange={e => { setClientSearch(e.target.value); setSelectedClient(null); setCaseId(''); setShowClientDrop(true) }}
                    onFocus={() => setShowClientDrop(true)} />
                </div>
                {showClientDrop && !selectedClient && clients.length > 0 && (
                  <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', borderRadius: 8, marginTop: 4, maxHeight: 180, overflowY: 'auto' }}>
                    {clients.map(c => (
                      <div key={c.id} onClick={() => { setSelectedClient(c); setShowClientDrop(false) }} style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--bg-border)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{c.company_name || c.contact_person}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.client_code}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {prefillCaseId ? (
              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Case</label>
                <div style={{ fontSize: 13, color: 'var(--text-primary)', background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', borderRadius: 8, padding: '9px 12px' }}>
                  Linked to case: <span style={{ fontFamily: 'var(--font-mono)' }}>{prefilledCase?.case_number || '…'}</span>
                </div>
              </div>
            ) : selectedClient && (
              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Case (optional)</label>
                <select className="input-base" value={caseId} onChange={e => setCaseId(e.target.value)}>
                  <option value="">No specific case</option>
                  {cases.map(c => <option key={c.id} value={c.id}>{c.title} ({c.case_number})</option>)}
                </select>
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>File</label>
              <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '24px 16px', border: '1px dashed var(--bg-border)', borderRadius: 10, cursor: 'pointer', background: 'var(--bg-elevated)' }}>
                <UploadCloud size={22} color="var(--text-muted)" />
                <span style={{ fontSize: 13, color: file ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                  {file ? file.name : 'Click to choose a file'}
                </span>
                {file && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{(file.size / 1024).toFixed(1)} KB</span>}
                <input type="file" style={{ display: 'none' }} onChange={e => setFile(e.target.files?.[0] || null)} />
              </label>
              {fileExceedsLimit && (
                <div style={{ fontSize: 12, color: '#f59e0b', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, padding: '8px 12px', marginTop: 8 }}>
                  This file exceeds 50MB. It will require Super Admin approval before it can be accessed.
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Notes</label>
              <textarea
                className="input-base"
                rows={3}
                placeholder="Optional notes about this document..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                style={{ resize: 'vertical' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Expiry Date (optional)</label>
              <input
                type="date"
                className="input-base"
                value={expiryDate}
                onChange={e => setExpiryDate(e.target.value)}
              />
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>
                If set, this document will appear in the Renewals tab when nearing expiry
              </p>
            </div>

            {canRestrict && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Restrict to Super Admin only</label>
                <button
                  type="button"
                  onClick={() => setIsAdminOnly(v => !v)}
                  style={{
                    width: 40, height: 22, borderRadius: 20, border: 'none', cursor: 'pointer', position: 'relative', padding: 0, flexShrink: 0,
                    background: isAdminOnly ? '#2563eb' : 'var(--bg-elevated)', transition: 'background 0.15s',
                  }}
                >
                  <span style={{
                    position: 'absolute', top: 2, left: isAdminOnly ? 20 : 2, width: 18, height: 18, borderRadius: '50%',
                    background: '#ffffff', transition: 'left 0.15s',
                  }} />
                </button>
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--bg-border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-gold" onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Uploading...' : 'Upload Document'}
          </button>
        </div>
      </div>
    </div>
  )
}
