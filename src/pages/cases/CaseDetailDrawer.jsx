import { useState, useRef } from 'react'
import { X, Upload, Download } from 'lucide-react'
import { useCase, useUpdateCase, useAddCaseActivity } from '../../hooks/useCases'
import { useDocuments, useDownloadDocument } from '../../hooks/useDocuments'
import { useGetTimeline, useAddTimelineEntry } from '../../hooks/useCaseTimeline'
import { useAuth } from '../../lib/AuthContext'
import { useToast } from '../../lib/ToastContext'
import UploadDocumentModal from '../documents/UploadDocumentModal'
import { Progress } from '../../components/ui/progress'

const STATUS_OPTIONS = ['active', 'waiting_client', 'government_review', 'completed', 'overdue', 'cancelled']
const PRIORITY_COLOR = { low: '#94a3b8', medium: '#2563eb', high: '#f59e0b', urgent: '#ef4444', critical: '#ef4444' }
const STATUS_BADGE = {
  active:            { bg: 'rgba(37,99,235,0.15)',  color: '#3b82f6' },
  government_review: { bg: 'rgba(139,92,246,0.15)', color: '#8b5cf6' },
  waiting_client:    { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' },
  completed:         { bg: 'rgba(16,185,129,0.15)', color: '#10b981' },
  overdue:           { bg: 'rgba(239,68,68,0.15)',  color: '#ef4444' },
  cancelled:         { bg: 'rgba(148,163,184,0.15)', color: '#94a3b8' },
}
const ENTRY_BADGE = {
  status_change:   { bg: 'rgba(37,99,235,0.15)',  color: '#3b82f6', label: 'Status' },
  manual:          { bg: 'rgba(148,163,184,0.15)', color: '#94a3b8', label: 'Note' },
  document_added:  { bg: 'rgba(16,185,129,0.15)',  color: '#10b981', label: 'Document' },
}
// Visual-only stand-in for a real progress field (none exists on cases) — derived from status.
const STATUS_PROGRESS_PCT = { active: 50, waiting_client: 25, government_review: 75, completed: 100, overdue: 100, cancelled: 0 }

export default function CaseDetailDrawer({ caseId, onClose }) {
  const { profile } = useAuth()
  const toast = useToast()
  const { data: caseData, isLoading } = useCase(caseId)
  const { mutateAsync: updateCase } = useUpdateCase()
  const { mutateAsync: addActivity } = useAddCaseActivity()
  const { data: caseDocuments = [] } = useDocuments({ case_id: caseId })
  const { mutateAsync: getDownloadUrl } = useDownloadDocument()
  const { data: timeline = [] } = useGetTimeline(caseId)
  const { mutateAsync: addTimelineEntry } = useAddTimelineEntry()
  const [note, setNote] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [downloadingId, setDownloadingId] = useState(null)
  const [statusNotePrompt, setStatusNotePrompt] = useState(false)
  const [statusNoteText, setStatusNoteText] = useState('')
  const [showAddEntry, setShowAddEntry] = useState(false)
  const [entryTitle, setEntryTitle] = useState('')
  const [entryDescription, setEntryDescription] = useState('')
  const [addingEntry, setAddingEntry] = useState(false)

  const statusSectionRef = useRef(null)
  const noteTextareaRef = useRef(null)

  async function handleStatusChange(newStatus) {
    try {
      await updateCase({ id: caseId, status: newStatus })
      // Mirrors the change into case_activities too, since activity views (e.g. the
      // Overview's case metrics) read that table directly and have no visibility into case_timeline_entries.
      await addActivity({ case_id: caseId, performed_by: profile?.id, action: `Status changed to ${newStatus.replace('_', ' ')}` })
      await addTimelineEntry({ case_id: caseId, entry_type: 'status_change', title: `Status changed to ${newStatus.replace('_', ' ')}`, performed_by: profile?.id })
      toast(`Case status updated to ${newStatus.replace('_', ' ')}`, 'success')
      setStatusNotePrompt(true)
    } catch (err) { toast(err.message || 'Failed to update status', 'error') }
  }

  async function handleConfirmStatusNote() {
    if (statusNoteText.trim()) {
      try {
        await addTimelineEntry({ case_id: caseId, entry_type: 'manual', title: statusNoteText.trim(), performed_by: profile?.id })
      } catch (err) { toast(err.message || 'Failed to add note', 'error') }
    }
    setStatusNotePrompt(false)
    setStatusNoteText('')
  }

  function handleSkipStatusNote() {
    setStatusNotePrompt(false)
    setStatusNoteText('')
  }

  async function handleAddNote() {
    if (!note.trim()) return
    setAddingNote(true)
    try {
      await addActivity({ case_id: caseId, performed_by: profile?.id, action: note, notes: note })
      await addTimelineEntry({ case_id: caseId, entry_type: 'manual', title: note, performed_by: profile?.id })
      setNote('')
      toast('Note added', 'success')
    } catch (err) { toast(err.message || 'Failed to add note', 'error') }
    setAddingNote(false)
  }

  async function handleAddTimelineEntry() {
    if (!entryTitle.trim()) return
    setAddingEntry(true)
    try {
      await addTimelineEntry({
        case_id: caseId, entry_type: 'manual', title: entryTitle.trim(),
        description: entryDescription.trim() || null, performed_by: profile?.id,
      })
      setEntryTitle('')
      setEntryDescription('')
      setShowAddEntry(false)
      toast('Timeline entry added', 'success')
    } catch (err) { toast(err.message || 'Failed to add entry', 'error') }
    setAddingEntry(false)
  }

  function scrollToStatus() {
    statusSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function scrollToNote() {
    noteTextareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    noteTextareaRef.current?.focus()
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

  const statusBadge = caseData ? (STATUS_BADGE[caseData.status] || STATUS_BADGE.cancelled) : null
  const priorityColor = caseData ? (PRIORITY_COLOR[caseData.priority] || PRIORITY_COLOR.low) : null
  const isOverdue = caseData?.due_date && new Date(caseData.due_date) < new Date()
  const progressPct = caseData ? (STATUS_PROGRESS_PCT[caseData.status] ?? 0) : 0

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer-panel">
        {isLoading || !caseData ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>Loading...</div>
        ) : (
          <>
            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--bg-border)', position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>{caseData.case_number}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: statusBadge.bg, color: statusBadge.color, fontWeight: 500, textTransform: 'capitalize' }}>
                    {caseData.status?.replace('_', ' ')}
                  </span>
                  <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
                </div>
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>{caseData.title}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                {caseData.service?.name}{caseData.service?.name && ' · '}{caseData.client?.company_name || caseData.client?.contact_person}
              </div>
            </div>

            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Info grid — 2x2 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 6 }}>Assigned To</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                    {caseData.assigned_to_user?.full_name || '—'}
                  </div>
                </div>

                <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 6 }}>Priority</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: priorityColor, textTransform: 'capitalize' }}>{caseData.priority}</div>
                </div>

                <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 6 }}>Due Date</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: isOverdue ? '#ef4444' : 'var(--text-primary)' }}>
                    {caseData.due_date ? new Date(caseData.due_date).toLocaleDateString('en-GB') : '—'}
                  </div>
                </div>

                <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 6 }}>Amount</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                    {caseData.amount > 0 ? `QAR ${Number(caseData.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>Progress</span>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{progressPct}%</span>
                </div>
                <Progress value={progressPct} className="h-2" />
              </div>

              {/* Update status — pills */}
              <div ref={statusSectionRef}>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 10 }}>Update Status</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {STATUS_OPTIONS.map(s => {
                    const active = caseData.status === s
                    const badge = STATUS_BADGE[s] || STATUS_BADGE.cancelled
                    return (
                      <button
                        key={s}
                        onClick={() => handleStatusChange(s)}
                        style={{
                          fontSize: 11, padding: '5px 12px', borderRadius: 20,
                          border: active ? `1px solid ${badge.color}` : '1px solid var(--bg-border)',
                          background: active ? badge.bg : 'transparent',
                          color: active ? badge.color : 'var(--text-muted)',
                          cursor: 'pointer', textTransform: 'capitalize', fontWeight: active ? 600 : 400,
                          transition: 'all 0.15s',
                        }}
                      >
                        {s.replace('_', ' ')}
                      </button>
                    )
                  })}
                </div>

                {statusNotePrompt && (
                  <div style={{ marginTop: 10, background: 'var(--bg-elevated)', borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>Add a note about this update (optional)</div>
                    <textarea
                      className="input-base"
                      rows={2}
                      placeholder="What changed, or why..."
                      value={statusNoteText}
                      onChange={e => setStatusNoteText(e.target.value)}
                      style={{ resize: 'vertical', marginBottom: 8 }}
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn-gold" onClick={handleConfirmStatusNote} style={{ fontSize: 11, padding: '5px 12px', borderRadius: 8 }}>
                        {statusNoteText.trim() ? 'Add Note' : 'Done'}
                      </button>
                      {statusNoteText.trim() && (
                        <button className="btn-ghost" onClick={handleSkipStatusNote} style={{ fontSize: 11, padding: '5px 12px', borderRadius: 8 }}>
                          Skip
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Timeline */}
              <div>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 12 }}>Timeline</div>
                {timeline.length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>No timeline entries yet</div>
                ) : (
                  <ol style={{ borderLeft: '1px solid var(--bg-border)', margin: 0, paddingLeft: 0, listStyle: 'none' }}>
                    {timeline.map((entry, idx) => {
                      const isLast = idx === timeline.length - 1
                      const badge = ENTRY_BADGE[entry.entry_type] || ENTRY_BADGE.manual
                      return (
                        <li key={entry.id} style={{ position: 'relative', marginLeft: 20, paddingBottom: isLast ? 0 : 18 }}>
                          <span style={{ position: 'absolute', top: 3, left: -25.5, width: 10, height: 10, borderRadius: '50%', background: '#2563eb' }} />
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{entry.title}</div>
                            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: badge.bg, color: badge.color, fontWeight: 500, flexShrink: 0 }}>
                              {badge.label}
                            </span>
                          </div>
                          {entry.description && (
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>{entry.description}</div>
                          )}
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                            {entry.performed_by_user?.full_name || 'System'} · {new Date(entry.created_at).toLocaleDateString('en-GB')}
                          </div>
                        </li>
                      )
                    })}
                  </ol>
                )}

                {showAddEntry ? (
                  <div style={{ marginTop: 12, background: 'var(--bg-elevated)', borderRadius: 8, padding: 14 }}>
                    <input
                      className="input-base"
                      placeholder="Entry title *"
                      value={entryTitle}
                      onChange={e => setEntryTitle(e.target.value)}
                      style={{ marginBottom: 8 }}
                    />
                    <textarea
                      className="input-base"
                      rows={2}
                      placeholder="Description (optional)"
                      value={entryDescription}
                      onChange={e => setEntryDescription(e.target.value)}
                      style={{ resize: 'vertical', marginBottom: 10 }}
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn-gold" onClick={handleAddTimelineEntry} disabled={addingEntry || !entryTitle.trim()} style={{ fontSize: 12, borderRadius: 8 }}>
                        {addingEntry ? 'Adding...' : 'Add Entry'}
                      </button>
                      <button className="btn-ghost" onClick={() => { setShowAddEntry(false); setEntryTitle(''); setEntryDescription('') }} style={{ fontSize: 12, borderRadius: 8 }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button className="btn-ghost" onClick={() => setShowAddEntry(true)} style={{ fontSize: 12, borderRadius: 8, marginTop: 12 }}>
                    + Add Timeline Entry
                  </button>
                )}
              </div>

              {/* Documents */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>Documents</div>
                  <button className="btn-ghost" onClick={() => setShowUpload(true)} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Upload size={12} /> Upload Document
                  </button>
                </div>
                {caseDocuments.length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>No documents yet</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {caseDocuments.map(doc => (
                      <div key={doc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, background: 'var(--bg-elevated)', borderRadius: 8, padding: '10px 12px' }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.file_name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, textTransform: 'capitalize' }}>
                            {(doc.category || 'uncategorized').replace('_', ' ')} · {new Date(doc.created_at).toLocaleDateString('en-GB')}
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

              {/* Add note */}
              <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: 14 }}>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 10 }}>Add Note</div>
                <textarea
                  ref={noteTextareaRef}
                  className="input-base"
                  rows={3}
                  placeholder="Add an internal note or update..."
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  style={{ resize: 'vertical', marginBottom: 10 }}
                />
                <button className="btn-ghost" onClick={handleAddNote} disabled={addingNote || !note.trim()} style={{ fontSize: 12, borderRadius: 8 }}>
                  {addingNote ? 'Adding...' : 'Add Note'}
                </button>
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--bg-border)', position: 'sticky', bottom: 0, background: 'var(--bg-secondary)', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <button className="btn-gold" onClick={scrollToStatus} style={{ fontSize: 13, borderRadius: 8 }}>
                Update Status
              </button>
              <button className="btn-ghost" onClick={scrollToNote} style={{ fontSize: 13, borderRadius: 8 }}>
                Add Note
              </button>
            </div>
          </>
        )}
      </div>

      {showUpload && (
        <UploadDocumentModal
          onClose={() => setShowUpload(false)}
          prefillClientId={caseData?.client_id}
          prefillCaseId={caseId}
        />
      )}
    </>
  )
}
