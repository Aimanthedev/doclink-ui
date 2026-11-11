import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Upload, Download } from 'lucide-react'
import { useClient, useUpdateClient, useDeleteClient } from '../../hooks/useClients'
import { useDocuments, useDownloadDocument } from '../../hooks/useDocuments'
import { useQuotations } from '../../hooks/useQuotations'
import { useToast } from '../../lib/ToastContext'
import { useAuth } from '../../lib/AuthContext'
import UploadDocumentModal from '../documents/UploadDocumentModal'

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function DeleteClientModal({ client, onClose, onDeleted }) {
  const toast = useToast()
  const { mutateAsync: deleteClient, isPending } = useDeleteClient()
  const [confirmText, setConfirmText] = useState('')

  const expectedName = client.company_name || client.contact_person
  const canDelete = confirmText.trim() === expectedName

  async function handleDelete() {
    try {
      await deleteClient(client.id)
      toast('Client deleted', 'success')
      onDeleted?.()
    } catch (err) {
      toast(err.message || 'Failed to delete client', 'error')
    }
  }

  return createPortal(
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 16, border: '1px solid var(--bg-border)', width: '100%', maxWidth: 460, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--bg-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}>Delete Client</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
        </div>

        <div style={{ padding: '20px 24px' }}>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
            This moves <strong>{expectedName}</strong> to the recycle bin. It can be restored within 30 days, after which it can no longer be restored.
          </div>
          <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Type "{expectedName}" to confirm
          </label>
          <input className="input-base" value={confirmText} onChange={e => setConfirmText(e.target.value)} placeholder={expectedName} />
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--bg-border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-danger" onClick={handleDelete} disabled={!canDelete || isPending}>
            {isPending ? 'Deleting...' : 'Delete Client'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default function ClientDetailDrawer({ clientId, onClose }) {
  const toast = useToast()
  const { profile } = useAuth()
  const { data: client, isLoading } = useClient(clientId)
  const { mutateAsync: updateClient } = useUpdateClient()
  const [activeTab, setActiveTab] = useState('overview')
  const { data: documents = [] } = useDocuments({ client_id: clientId })
  const { mutateAsync: getDownloadUrl } = useDownloadDocument()
  const { data: quotations = [] } = useQuotations({ client_id: clientId })
  const [downloadingId, setDownloadingId] = useState(null)
  const [showUpload, setShowUpload] = useState(false)
  const [uploadCaseId, setUploadCaseId] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  async function toggleStatus() {
    const newStatus = client.status === 'active' ? 'inactive' : 'active'
    try {
      await updateClient({ id: clientId, status: newStatus })
      toast(`Client marked as ${newStatus}`, 'success')
    } catch (err) { toast(err.message || 'Failed to update status', 'error') }
  }

  async function handleDownloadDoc(doc) {
    setDownloadingId(doc.id)
    try {
      const url = await getDownloadUrl({ fileKey: doc.file_key })
      window.open(url, '_blank')
    } catch (err) {
      toast(err.message || 'Failed to get download link', 'error')
    } finally {
      setDownloadingId(null)
    }
  }

  function openUpload(caseId = null) {
    setUploadCaseId(caseId)
    setShowUpload(true)
  }

  const TABS = ['overview', 'cases', 'invoices', 'documents', 'quotations']
  const isActive = client?.status === 'active'
  const totalBilled = (client?.invoices ?? []).reduce((s, i) => s + Number(i.total_amount || 0), 0)
  const outstanding = (client?.invoices ?? []).reduce((s, i) => s + Number(i.amount_due || 0), 0)

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer-panel">
        {isLoading || !client ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>Loading...</div>
        ) : (
          <>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--bg-border)', position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>{client.company_name || client.contact_person}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    {client.contact_person}{client.contact_person && client.client_type && ' · '}<span style={{ textTransform: 'capitalize' }}>{client.client_type}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{client.client_code}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span
                    onClick={toggleStatus}
                    style={{
                      fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 500, cursor: 'pointer', textTransform: 'capitalize',
                      background: isActive ? 'rgba(16,185,129,0.15)' : 'rgba(148,163,184,0.15)',
                      color: isActive ? '#10b981' : '#94a3b8',
                      border: `1px solid ${isActive ? 'rgba(16,185,129,0.3)' : 'rgba(148,163,184,0.3)'}`,
                    }}
                  >
                    {client.status}
                  </span>
                  <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div style={{ borderRadius: 8, border: '1px solid var(--bg-border)', padding: 12 }}>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 4 }}>Phone</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{client.phone || '—'}</div>
                </div>
                <div style={{ borderRadius: 8, border: '1px solid var(--bg-border)', padding: 12 }}>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 4 }}>Email</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{client.email || '—'}</div>
                </div>
                <div style={{ borderRadius: 8, border: '1px solid var(--bg-border)', padding: 12 }}>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 4 }}>Total Billed</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                    QAR {Math.round(totalBilled).toLocaleString('en-US')}
                  </div>
                </div>
                <div style={{ borderRadius: 8, border: '1px solid var(--bg-border)', padding: 12 }}>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 4 }}>Outstanding</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: outstanding > 0 ? '#f59e0b' : '#10b981' }}>
                    QAR {Math.round(outstanding).toLocaleString('en-US')}
                  </div>
                </div>
              </div>

              <div style={{ display: 'inline-flex', gap: 4, marginTop: 16 }}>
                {TABS.map(tab => {
                  const active = activeTab === tab
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      style={{
                        padding: '7px 16px',
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 500,
                        border: 'none',
                        cursor: 'pointer',
                        textTransform: 'capitalize',
                        background: active ? 'var(--bg-elevated)' : 'transparent',
                        color: active ? 'var(--accent-blue-bright)' : 'var(--text-muted)',
                        transition: 'all 0.15s',
                      }}
                    >
                      {tab}
                    </button>
                  )
                })}
              </div>
            </div>

            <div style={{ padding: 24 }}>
              {activeTab === 'overview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ background: 'var(--bg-elevated)', borderRadius: 12, padding: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 14 }}>Client Details</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      {[
                        { label: 'Contact Person', value: client.contact_person },
                        { label: 'Client Type', value: client.client_type },
                        { label: 'Phone', value: client.phone },
                        { label: 'WhatsApp', value: client.whatsapp },
                        { label: 'Email', value: client.email },
                        { label: 'QID Number', value: client.qid_number },
                        { label: 'CR Number', value: client.cr_number },
                        { label: 'Address', value: client.address },
                      ].map(f => f.value ? (
                        <div key={f.label}>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{f.label}</div>
                          <div style={{ fontSize: 13, color: 'var(--text-primary)', textTransform: 'capitalize' }}>{f.value}</div>
                        </div>
                      ) : null)}
                    </div>
                    {client.notes && (
                      <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--bg-border)' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Notes</div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{client.notes}</div>
                      </div>
                    )}
                  </div>

                  {(client.owners ?? []).length > 0 && (
                    <div style={{ background: 'var(--bg-elevated)', borderRadius: 12, padding: 16 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 14 }}>Owners / Shareholders</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {client.owners.map((owner, index) => (
                          <div key={index} style={{ borderRadius: 8, border: '1px solid var(--bg-border)', padding: 12, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{owner.full_name || '—'}</div>
                              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                                {[owner.qid_number, owner.nationality].filter(Boolean).join(' · ') || '—'}
                              </div>
                            </div>
                            {owner.shareholding_pct !== '' && owner.shareholding_pct != null && (
                              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-blue-bright)', flexShrink: 0 }}>{owner.shareholding_pct}%</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                    {[
                      { label: 'Active Cases', value: client.cases?.length ?? 0, color: 'var(--accent-blue-bright)' },
                      { label: 'Total Invoiced', value: `QAR ${(client.invoices ?? []).reduce((s, i) => s + Number(i.total_amount || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, color: 'var(--text-primary)' },
                      { label: 'Documents', value: client.documents?.length ?? 0, color: 'var(--status-active)' },
                    ].map(s => (
                      <div key={s.label} style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: 16, textAlign: 'center' }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: s.color, fontFamily: 'Inter, system-ui, sans-serif' }}>{s.value}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'cases' && (
                <div>
                  {(client.cases ?? []).length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 13 }}>No cases for this client yet</div>
                  ) : (
                    <div>
                      {client.cases.map(c => (
                        <div key={c.id} style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: '14px 16px', marginBottom: 8 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{c.title}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{c.case_number}</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                              <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, background: 'var(--bg-elevated)', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{c.status?.replace('_', ' ')}</span>
                              <button
                                onClick={() => openUpload(c.id)}
                                title="Upload Doc"
                                style={{ background: 'none', border: '1px solid var(--bg-border)', borderRadius: 6, padding: 5, cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }}
                              >
                                <Upload size={14} />
                              </button>
                            </div>
                          </div>
                          {c.assigned_to_user && (
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>Assigned to {c.assigned_to_user.full_name}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'invoices' && (
                <div>
                  {(client.invoices ?? []).length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 13 }}>No invoices for this client yet</div>
                  ) : (
                    <div>
                      {client.invoices.map(inv => {
                        const statusColor = inv.status === 'paid' ? '#10b981' : inv.status === 'overdue' ? '#ef4444' : '#f59e0b'
                        return (
                          <div key={inv.id} style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: '14px 16px', marginBottom: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{inv.invoice_number}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>QAR {Number(inv.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                              </div>
                              <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, background: `${statusColor}1a`, color: statusColor, fontWeight: 500, textTransform: 'capitalize' }}>{inv.status}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'documents' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
                    <button
                      className="btn-ghost"
                      onClick={() => openUpload(null)}
                      style={{ fontSize: 12, borderRadius: 8, color: '#3b82f6', borderColor: 'rgba(59,130,246,0.3)', display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <Upload size={14} /> Upload Document
                    </button>
                  </div>
                  {documents.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 13 }}>No documents uploaded for this client</div>
                  ) : (
                    <div>
                      {documents.map(doc => (
                        <div key={doc.id} style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: '12px 16px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 13, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.file_name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, textTransform: 'capitalize' }}>
                              {(doc.category || doc.category_custom || 'uncategorized').replace(/_/g, ' ')} · {formatDate(doc.created_at)}
                            </div>
                          </div>
                          <button
                            onClick={() => handleDownloadDoc(doc)}
                            disabled={downloadingId === doc.id}
                            title="Download"
                            style={{ background: 'none', border: '1px solid var(--bg-border)', borderRadius: 8, padding: 7, cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', flexShrink: 0 }}
                          >
                            <Download size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'quotations' && (
                <div>
                  {quotations.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 13 }}>No quotations for this client yet</div>
                  ) : (
                    <div>
                      {quotations.map(q => (
                        <div key={q.id} style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '12px 14px', marginBottom: 8 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                            <div>
                              <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{q.quotation_number}</div>
                              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, textTransform: 'capitalize' }}>{q.quotation_type?.replace(/_/g, ' ')}</div>
                            </div>
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              <span className={`badge badge-${q.status}`}>{q.status?.replace('_', ' ')}</span>
                              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginTop: 4 }}>
                                QAR {Number(q.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </div>
                            </div>
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>{formatDate(q.issue_date || q.created_at)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {profile?.role === 'super_admin' && !client.deleted_at && (
              <div style={{ padding: '16px 24px', borderTop: '1px solid var(--bg-border)', position: 'sticky', bottom: 0, background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn-danger" onClick={() => setShowDeleteModal(true)}>Delete Client</button>
              </div>
            )}
          </>
        )}
      </div>

      {showUpload && (
        <UploadDocumentModal
          onClose={() => setShowUpload(false)}
          prefillClientId={clientId}
          prefillCaseId={uploadCaseId}
        />
      )}

      {showDeleteModal && client && (
        <DeleteClientModal
          client={client}
          onClose={() => setShowDeleteModal(false)}
          onDeleted={() => { setShowDeleteModal(false); onClose() }}
        />
      )}
    </>
  )
}
