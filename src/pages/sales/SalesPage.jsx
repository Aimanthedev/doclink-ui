import { useState, useRef, useEffect } from 'react'
import { useSearchParams } from '@/lib/router-compat'
import { Plus, X, ArrowRight, Pencil, Zap, Phone, CheckCircle2 } from 'lucide-react'
import { useLeads, useLead, useCreateLead, useUpdateLead, useDeleteLead, useConvertLeadToClient } from '../../hooks/useLeads'
import { useTodaysFollowUps, useMarkFollowUpDone } from '../../hooks/useFollowUps'
import { useUsers } from '../../hooks/useUsers'
import { useMyPermissions, hasPermission } from '../../hooks/usePermissions'
import { useAuth } from '../../lib/AuthContext'
import { useToast } from '../../lib/ToastContext'

const STAGES = [
  { key: 'new_lead', label: 'New Lead', color: '#6366f1' },
  { key: 'consultation', label: 'Consultation', color: '#3b82f6' },
  { key: 'proposal_sent', label: 'Proposal Sent', color: '#8b5cf6' },
  { key: 'documents_requested', label: 'Documents Requested', color: '#f59e0b' },
  { key: 'won', label: 'Won', color: '#10b981' },
  { key: 'lost', label: 'Lost', color: '#ef4444' },
]

const SOURCES = ['Referral', 'Meta Platforms', 'Website', 'Walk-in', 'Existing Client', 'Call', 'Quotation', 'Other']
const SOURCE_COLOR = { Referral: '#3b82f6', 'Meta Platforms': '#8b5cf6', Website: '#10b981', 'Walk-in': '#f59e0b', 'Existing Client': '#6366f1', Call: '#ec4899', Quotation: '#14b8a6', Other: '#94a3b8' }
const DEFAULT_SOURCE_COLOR = '#94a3b8'

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

// Free-text input with a filtered suggestions dropdown — lets users pick a
// known option or type anything else (e.g. a lead source not yet on the list).
function ComboBox({ value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filtered = options.filter(o => o.toLowerCase().includes((value || '').toLowerCase()))

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <input
        className="input-base"
        placeholder={placeholder}
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
      />
      {open && filtered.length > 0 && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: 'var(--bg-secondary)', border: '1px solid var(--bg-border)', borderRadius: 8, maxHeight: 180, overflowY: 'auto', zIndex: 20, boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}>
          {filtered.map(opt => (
            <div
              key={opt}
              onClick={() => { onChange(opt); setOpen(false) }}
              style={{ padding: '8px 12px', fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-elevated)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function NewLeadModal({ onClose }) {
  const toast = useToast()
  const { mutateAsync: createLead, isPending } = useCreateLead()
  const { data: users = [] } = useUsers()
  const { user } = useAuth()

  const [form, setForm] = useState({
    company_name: '', contact_person: '', phone_country_code: '+974', phone_number: '', email: '',
    service_interest: '', estimated_value: '', source: '',
    follow_up_date: '', notes: '', assigned_to: user?.id || '',
  })
  const set = (f, v) => setForm(p => ({ ...p, [f]: v }))

  async function handleSubmit() {
    if (!form.contact_person.trim()) { toast('Contact person is required', 'error'); return }
    try {
      await createLead({
        ...form,
        estimated_value: form.estimated_value ? Number(form.estimated_value) : 0,
        assigned_to: form.assigned_to || null,
        follow_up_date: form.follow_up_date || null,
        stage: 'new_lead',
      })
      toast('Lead added', 'success')
      onClose()
    } catch (err) { toast(err.message || 'Failed to add lead', 'error') }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 16, border: '1px solid var(--bg-border)', width: '100%', maxWidth: 560, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--bg-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: 22, fontWeight: 600, color: 'var(--text-primary)' }}>New Lead</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Company Name</label>
              <input className="input-base" placeholder="Company name" value={form.company_name} onChange={e => set('company_name', e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Contact Person *</label>
              <input className="input-base" placeholder="Full name" value={form.contact_person} onChange={e => set('contact_person', e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Phone</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="input-base" style={{ width: 70, flexShrink: 0 }} value={form.phone_country_code} onChange={e => set('phone_country_code', e.target.value)} />
                <input className="input-base" style={{ flex: 1 }} placeholder="5533 9987" value={form.phone_number} onChange={e => set('phone_number', e.target.value.replace(/\D/g, ''))} />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Email</label>
              <input className="input-base" type="email" placeholder="email@company.com" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Service Interest</label>
              <input className="input-base" placeholder="e.g. Company Formation, Visa Processing" value={form.service_interest} onChange={e => set('service_interest', e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Estimated Value (QAR)</label>
              <input className="input-base" type="number" min="0" placeholder="0.00" value={form.estimated_value} onChange={e => set('estimated_value', e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Source</label>
              <ComboBox value={form.source} onChange={v => set('source', v)} options={SOURCES} placeholder="Select or type source..." />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Follow-up Date</label>
              <input className="input-base" type="date" value={form.follow_up_date} onChange={e => set('follow_up_date', e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Assign To</label>
              <select className="input-base" value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)}>
                <option value="">Unassigned</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Notes</label>
            <textarea className="input-base" rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} style={{ resize: 'vertical' }} />
          </div>
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--bg-border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-gold" onClick={handleSubmit} disabled={isPending}>{isPending ? 'Saving...' : 'Add Lead'}</button>
        </div>
      </div>
    </div>
  )
}

function buildLeadForm(lead) {
  return {
    company_name: lead.company_name || '', contact_person: lead.contact_person || '', phone_country_code: lead.phone_country_code || '+974', phone_number: lead.phone_number || '', email: lead.email || '',
    service_interest: lead.service_interest || '', estimated_value: lead.estimated_value || '', source: lead.source || 'Referral',
    follow_up_date: lead.follow_up_date || '', notes: lead.notes || '', assigned_to: lead.assigned_to || '',
  }
}

function LeadDetailModal({ leadId, onClose }) {
  const { profile } = useAuth()
  const toast = useToast()
  const { data: lead, isLoading } = useLead(leadId)
  const { mutateAsync: updateLead, isPending } = useUpdateLead()
  const { mutateAsync: deleteLead, isPending: isDeleting } = useDeleteLead()
  const { mutateAsync: convertToClient, isPending: converting } = useConvertLeadToClient()
  const { data: users = [] } = useUsers()
  const { data: myPermissions } = useMyPermissions()
  const canDelete = hasPermission(myPermissions, 'can_delete_records')

  const [followUp, setFollowUp] = useState('')
  const [notes, setNotes] = useState('')

  const [isEditing, setIsEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [form, setForm] = useState(null)
  const set = (f, v) => setForm(p => ({ ...p, [f]: v }))

  // Lead loads asynchronously (fetched by ID rather than passed in), so the
  // read-only/edit form state can only be seeded once the row actually arrives.
  // The prev-guard keeps a background refetch (e.g. from another mutation)
  // from clobbering in-progress edits once the fields are already seeded.
  useEffect(() => {
    if (!lead) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFollowUp(prev => prev || lead.follow_up_date || '')
    setNotes(prev => prev || lead.notes || '')
    setForm(prev => prev || buildLeadForm(lead))
  }, [lead])

  function startEdit() {
    setForm(buildLeadForm(lead))
    setIsEditing(true)
  }
  function cancelEdit() {
    setIsEditing(false)
    setConfirmDelete(false)
  }

  async function handleStageChange(stage) {
    try {
      await updateLead({ id: lead.id, stage })
      toast(`Lead moved to ${STAGES.find(s => s.key === stage)?.label}`, 'success')
      if (stage !== 'won') onClose()
    } catch (err) { toast(err.message || 'Failed to update stage', 'error') }
  }

  async function handleConvert() {
    try {
      await convertToClient({ lead, userId: profile?.id })
      toast('Lead converted to client', 'success')
      onClose()
    } catch (err) { toast(err.message || 'Failed to convert', 'error') }
  }

  async function handleSave() {
    try {
      await updateLead({ id: lead.id, follow_up_date: followUp || null, follow_up_completed_at: null, notes })
      toast('Lead updated', 'success')
    } catch (err) { toast(err.message || 'Failed to save', 'error') }
  }

  async function handleSaveEdit() {
    if (!form.contact_person.trim()) { toast('Contact person is required', 'error'); return }
    try {
      await updateLead({
        id: lead.id,
        ...form,
        estimated_value: form.estimated_value ? Number(form.estimated_value) : 0,
        assigned_to: form.assigned_to || null,
        follow_up_date: form.follow_up_date || null,
        follow_up_completed_at: null,
      })
      toast('Lead updated', 'success')
      setIsEditing(false)
    } catch (err) { toast(err.message || 'Failed to update lead', 'error') }
  }

  async function handleDelete() {
    try {
      await deleteLead(lead.id)
      toast('Lead deleted', 'success')
      onClose()
    } catch (err) { toast(err.message || 'Failed to delete lead', 'error') }
  }

  if (isLoading || !lead || !form) {
    return (
      <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 16, border: '1px solid var(--bg-border)', width: '100%', maxWidth: 480, padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading lead...
        </div>
      </div>
    )
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 16, border: '1px solid var(--bg-border)', width: '100%', maxWidth: isEditing ? 560 : 480, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: isEditing ? '20px 24px' : '24px 24px 0', borderBottom: isEditing ? '1px solid var(--bg-border)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: isEditing ? 0 : 16 }}>
          <div>
            <h3 style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: isEditing ? 22 : 20, fontWeight: 600, color: 'var(--text-primary)' }}>
              {isEditing ? 'Edit Lead' : (lead.company_name || lead.contact_person)}
            </h3>
            {!isEditing && <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>{lead.lead_number}</div>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {!isEditing && (
              <button onClick={startEdit} title="Edit lead" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, display: 'flex' }}>
                <Pencil size={18} />
              </button>
            )}
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, display: 'flex' }}><X size={20} /></button>
          </div>
        </div>

        {isEditing ? (
          <>
            <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Company Name</label>
                  <input className="input-base" placeholder="Company name" value={form.company_name} onChange={e => set('company_name', e.target.value)} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Contact Person *</label>
                  <input className="input-base" placeholder="Full name" value={form.contact_person} onChange={e => set('contact_person', e.target.value)} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Phone</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input className="input-base" style={{ width: 70, flexShrink: 0 }} value={form.phone_country_code} onChange={e => set('phone_country_code', e.target.value)} />
                    <input className="input-base" style={{ flex: 1 }} placeholder="5533 9987" value={form.phone_number} onChange={e => set('phone_number', e.target.value.replace(/\D/g, ''))} />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Email</label>
                  <input className="input-base" type="email" placeholder="email@company.com" value={form.email} onChange={e => set('email', e.target.value)} />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Service Interest</label>
                  <input className="input-base" placeholder="e.g. Company Formation, Visa Processing" value={form.service_interest} onChange={e => set('service_interest', e.target.value)} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Estimated Value (QAR)</label>
                  <input className="input-base" type="number" min="0" placeholder="0.00" value={form.estimated_value} onChange={e => set('estimated_value', e.target.value)} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Source</label>
                  <ComboBox value={form.source} onChange={v => set('source', v)} options={SOURCES} placeholder="Type or pick a source" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Follow-up Date</label>
                  <input className="input-base" type="date" value={form.follow_up_date} onChange={e => set('follow_up_date', e.target.value)} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Assign To</label>
                  <select className="input-base" value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)}>
                    <option value="">Unassigned</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Notes</label>
                <textarea className="input-base" rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} style={{ resize: 'vertical' }} />
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--bg-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
              <div>
                {canDelete && (
                  confirmDelete ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, color: '#ef4444' }}>Delete this lead permanently?</span>
                      <button className="btn-ghost" onClick={() => setConfirmDelete(false)} style={{ fontSize: 12 }}>Cancel</button>
                      <button
                        onClick={handleDelete}
                        disabled={isDeleting}
                        style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                      >
                        {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(true)}
                      style={{ background: 'none', border: '1px solid #ef4444', color: '#ef4444', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                    >
                      Delete Lead
                    </button>
                  )
                )}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn-ghost" onClick={cancelEdit}>Cancel</button>
                <button className="btn-gold" onClick={handleSaveEdit} disabled={isPending}>{isPending ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Contact', value: lead.contact_person },
                  { label: 'Phone', value: `${lead.phone_country_code || '+974'} ${lead.phone_number || ''}`.trim() },
                  { label: 'Email', value: lead.email },
                  { label: 'Service Interest', value: lead.service_interest },
                  { label: 'Estimated Value', value: lead.estimated_value > 0 ? `QAR ${Number(lead.estimated_value).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : null },
                  { label: 'Source', value: lead.source },
                  { label: 'Assigned To', value: lead.assigned_to_user?.full_name },
                ].map(f => f.value ? (
                  <div key={f.label}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>{f.label}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {f.value}
                      {f.label === 'Phone' && lead.phone_number && (
                        <a
                          href={`tel:${lead.phone_country_code}${lead.phone_number}`}
                          title="Call"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, display: 'flex', textDecoration: 'none' }}
                        >
                          <Phone size={14} />
                        </a>
                      )}
                    </div>
                  </div>
                ) : null)}
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Follow-up Date</label>
                <input className="input-base" type="date" value={followUp} onChange={e => setFollowUp(e.target.value)} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Notes</label>
                <textarea className="input-base" rows={3} value={notes} onChange={e => setNotes(e.target.value)} style={{ resize: 'vertical' }} />
              </div>

              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 10 }}>Move to Stage</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: lead.stage === 'won' ? 16 : 0 }}>
                {STAGES.map(s => (
                  <button key={s.key} onClick={() => handleStageChange(s.key)} disabled={lead.stage === s.key} style={{ fontSize: 11, padding: '6px 12px', borderRadius: 20, border: `1px solid ${lead.stage === s.key ? s.color : 'var(--bg-border)'}`, background: lead.stage === s.key ? `${s.color}22` : 'transparent', color: lead.stage === s.key ? s.color : 'var(--text-muted)', cursor: lead.stage === s.key ? 'default' : 'pointer', fontWeight: lead.stage === s.key ? 600 : 400, transition: 'all 0.15s' }}>
                    {s.label}
                  </button>
                ))}
              </div>

              {lead.stage === 'won' && !lead.converted_to_client_id && (
                <button className="btn-gold" onClick={handleConvert} disabled={converting} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <ArrowRight size={14} /> {converting ? 'Converting...' : 'Convert to Client'}
                </button>
              )}
              {lead.converted_to_client_id && (
                <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--status-active)', padding: '10px 0' }}>Converted to client</div>
              )}
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--bg-border)' }}>
              <button className="btn-ghost" onClick={handleSave} style={{ width: '100%', fontSize: 12 }}>Save Notes & Follow-up</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const FOLLOWUP_TABS = [
  { key: 'all', label: 'All' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'today', label: 'Today' },
]

function followUpTabStyle(active) {
  return {
    padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
    background: active ? 'var(--accent-gold-dim)' : 'transparent',
    color: active ? 'var(--accent-gold)' : 'var(--text-muted)',
    transition: 'all 0.15s',
  }
}

const FOLLOWUP_PAGE_SIZE = 5

function tomorrowISO() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

function TodaysFollowUpsCard({ assignedToId, enabled, onOpenLead }) {
  const toast = useToast()
  const cardRef = useRef(null)
  const { data: followUps = [], isLoading } = useTodaysFollowUps(assignedToId, { enabled })
  const { mutateAsync: markDone } = useMarkFollowUpDone()
  const { mutateAsync: updateLead } = useUpdateLead()
  const [doneIds, setDoneIds] = useState(() => new Set())
  const [tab, setTab] = useState('all')
  const [page, setPage] = useState(1)
  const [confirmingId, setConfirmingId] = useState(null)
  const [nextDate, setNextDate] = useState('')

  const today = new Date().toISOString().split('T')[0]
  const visible = followUps.filter(l => !doneIds.has(l.id))
  const overdueItems = visible.filter(l => l.follow_up_date < today)
  const todayItems = visible.filter(l => l.follow_up_date === today)
  const tabCounts = { all: visible.length, overdue: overdueItems.length, today: todayItems.length }
  const filtered = tab === 'overdue' ? overdueItems : tab === 'today' ? todayItems : visible

  const totalPages = Math.max(1, Math.ceil(filtered.length / FOLLOWUP_PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageItems = filtered.slice((safePage - 1) * FOLLOWUP_PAGE_SIZE, safePage * FOLLOWUP_PAGE_SIZE)

  function changeTab(key) {
    setTab(key)
    setPage(1)
  }

  function goToPage(p) {
    setPage(p)
    cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function openConfirm(e, id) {
    e.stopPropagation()
    setConfirmingId(id)
    setNextDate(tomorrowISO())
  }

  async function handleSaveAndDone(e, id) {
    e.stopPropagation()
    if (!nextDate) return
    // Fire the write and wait for it to actually succeed before touching local
    // state — hiding the row first (optimistically) meant a failed write still
    // looked saved until the next refetch pulled the untouched row back.
    try {
      await updateLead({ id, follow_up_date: nextDate, follow_up_reminder_sent: false, follow_up_completed_at: null })
      setDoneIds(prev => new Set(prev).add(id))
      setConfirmingId(null)
    } catch (err) {
      toast(err.message || 'Failed to update follow-up', 'error')
    }
  }

  async function handleSkip(e, id) {
    e.stopPropagation()
    try {
      await markDone(id)
      setDoneIds(prev => new Set(prev).add(id))
      setConfirmingId(null)
    } catch (err) {
      toast(err.message || 'Failed to update follow-up', 'error')
    }
  }

  return (
    <div ref={cardRef} className="glass" style={{ borderRadius: 12, padding: 20, marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: 'linear-gradient(135deg, #f59e0b, #ef4444)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Zap size={17} color="#fff" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Today's Follow-ups</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Leads requiring action today</div>
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', flexShrink: 0 }}>
          {visible.length} item{visible.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Tabs — always visible regardless of whether the active tab has items */}
      <div style={{ display: 'inline-flex', background: 'var(--bg-elevated)', borderRadius: 8, padding: 3, gap: 2, marginBottom: 14 }}>
        {FOLLOWUP_TABS.map(t => (
          <button key={t.key} onClick={() => changeTab(t.key)} style={followUpTabStyle(tab === t.key)}>
            {t.label} ({tabCounts[t.key]})
          </button>
        ))}
      </div>

      {isLoading ? (
        <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading follow-ups...</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '30px 0', textAlign: 'center' }}>
          <CheckCircle2 size={26} color="#10b981" style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>All caught up for today</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
          {pageItems.map(l => {
            const isOverdue = l.follow_up_date < today
            const isConfirming = confirmingId === l.id
            return (
              <div
                key={l.id}
                onClick={() => !isConfirming && onOpenLead(l.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--bg-border)', cursor: isConfirming ? 'default' : 'pointer', transition: 'border-color 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--bg-border-hover)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--bg-border)' }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: 'linear-gradient(135deg, #3b82f6, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Phone size={16} color="#fff" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {l.company_name ? `${l.company_name}${l.service_interest ? ' · ' + l.service_interest : ''}` : l.contact_person}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, color: isOverdue ? '#ef4444' : '#f59e0b' }}>
                      {isOverdue ? 'Overdue' : 'Today'}
                    </span>
                    <span>· {new Date(l.follow_up_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                    {l.assigned_to_user?.full_name && <span>· {l.assigned_to_user.full_name}</span>}
                  </div>
                </div>
                {isConfirming ? (
                  <div onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Set next follow-up date:</span>
                    <input
                      type="date"
                      className="input-base"
                      value={nextDate}
                      onChange={e => setNextDate(e.target.value)}
                      style={{ fontSize: 12, padding: '5px 8px', width: 140 }}
                    />
                    <button className="btn-gold" disabled={!nextDate} onClick={e => handleSaveAndDone(e, l.id)} style={{ fontSize: 11, padding: '6px 10px', opacity: !nextDate ? 0.5 : 1 }}>
                      Save & Done
                    </button>
                    <button className="btn-ghost" onClick={e => handleSkip(e, l.id)} style={{ fontSize: 11, padding: '6px 10px' }}>
                      Skip
                    </button>
                  </div>
                ) : (
                  <button className="btn-ghost" onClick={e => openConfirm(e, l.id)} style={{ fontSize: 12, padding: '6px 12px', flexShrink: 0 }}>
                    Done
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {!isLoading && filtered.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10 }}>
          <button className="btn-ghost" disabled={safePage <= 1} onClick={() => goToPage(safePage - 1)} style={{ fontSize: 12, padding: '6px 12px', opacity: safePage <= 1 ? 0.4 : 1 }}>
            Previous
          </button>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Page {safePage} of {totalPages}</span>
          <button className="btn-ghost" disabled={safePage >= totalPages} onClick={() => goToPage(safePage + 1)} style={{ fontSize: 12, padding: '6px 12px', opacity: safePage >= totalPages ? 0.4 : 1 }}>
            Next
          </button>
        </div>
      )}
    </div>
  )
}

export default function SalesPage() {
  const { profile, user } = useAuth()
  // `user.id` is the raw auth.uid() from the session (the single source of
  // truth for "who is this"), available before the `users` table profile
  // fetch resolves — used for every data filter below instead of profile.id
  // so a not-yet-loaded profile can never fall through to an unfiltered query.
  const currentUserId = user?.id
  const isSuperAdmin = profile?.role === 'super_admin'
  const [searchParams, setSearchParams] = useSearchParams()
  const [salesView, setSalesView] = useState('all') // 'mine' | 'all' — only reachable by super_admin
  // Non-admins never reach the 'all' branch: isSuperAdmin is false until the
  // profile role loads, so this defaults to the safe "my sales only" filter.
  const showingAllStaff = isSuperAdmin && salesView === 'all'
  const leadsFilter = showingAllStaff ? {} : { assignedTo: currentUserId }
  // Hold off firing any query until we actually know who's asking — for the
  // "all staff" view that's immediate, otherwise wait for currentUserId so we
  // never briefly fetch unfiltered while auth/profile is still resolving.
  const queryEnabled = showingAllStaff || !!currentUserId
  const { data: leads = [], isLoading } = useLeads(leadsFilter, { enabled: queryEnabled })
  const [showNew, setShowNew] = useState(false)
  const [selectedLeadId, setSelectedLeadId] = useState(null)

  // Deep-link from global search — /sales?open=LEAD_ID opens that lead's
  // detail popup directly (LeadDetailModal fetches by ID), then the param is
  // cleared so a refresh doesn't re-trigger it. Depends on searchParams (not
  // just mount) so re-searching for a different lead while already on this
  // page still opens the new popup.
  useEffect(() => {
    const openId = searchParams.get('open')
    if (openId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedLeadId(openId)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const activeLeads = leads.filter(l => !['won', 'lost'].includes(l.stage))
  const wonLeads = leads.filter(l => l.stage === 'won')
  const totalPipelineValue = activeLeads.reduce((s, l) => s + Number(l.estimated_value || 0), 0)
  const conversionRate = leads.length > 0 ? Math.round((wonLeads.length / leads.length) * 100) : 0

  const thisMonth = new Date()
  const wonThisMonth = wonLeads.filter(l => l.converted_at && new Date(l.converted_at).getMonth() === thisMonth.getMonth() && new Date(l.converted_at).getFullYear() === thisMonth.getFullYear())
  const wonValueThisMonth = wonThisMonth.reduce((s, l) => s + Number(l.estimated_value || 0), 0)

  const kpis = [
    { label: 'New Leads', value: leads.filter(l => l.stage === 'new_lead').length, color: 'var(--text-primary)' },
    { label: 'Conversion Rate', value: `${conversionRate}%`, color: '#10b981' },
    { label: 'Pipeline Value', value: `QAR ${Math.round(totalPipelineValue).toLocaleString('en-US')}`, color: 'var(--text-primary)' },
    { label: 'Won This Month', value: `QAR ${Math.round(wonValueThisMonth).toLocaleString('en-US')}`, color: '#10b981' },
  ]

  const totalLeads = leads.length
  const stageCounts = STAGES.map(stage => ({
    ...stage,
    count: leads.filter(l => l.stage === stage.key).length,
    value: leads.filter(l => l.stage === stage.key).reduce((s, l) => s + Number(l.estimated_value || 0), 0),
  }))

  const customSources = [...new Set(leads.map(l => l.source))].filter(s => s && !SOURCES.includes(s))
  const sourceCounts = [...SOURCES, ...customSources].map(source => ({
    name: source,
    count: leads.filter(l => l.source === source).length,
  }))

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <h1 style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: 28, fontWeight: 700, color: 'var(--text-primary)' }}>Sales</h1>
            <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
              {showingAllStaff ? 'All Staff Sales' : 'My Sales'}
            </span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Track every lead, proposal, and opportunity through the pipeline.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {isSuperAdmin && (
            <div style={{ display: 'inline-flex', background: 'var(--bg-elevated)', borderRadius: 8, padding: 3, gap: 2 }}>
              {[{ key: 'mine', label: 'My Sales' }, { key: 'all', label: 'All Staff' }].map(v => (
                <button
                  key={v.key}
                  onClick={() => setSalesView(v.key)}
                  style={{
                    padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
                    background: salesView === v.key ? 'var(--accent-gold-dim)' : 'transparent',
                    color: salesView === v.key ? 'var(--accent-gold)' : 'var(--text-muted)',
                    transition: 'all 0.15s',
                  }}
                >
                  {v.label}
                </button>
              ))}
            </div>
          )}
          <button className="btn-gold" onClick={() => setShowNew(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, borderRadius: 10 }}>
            <Plus size={15} /> New Lead
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 24 }}>
        {kpis.map(s => (
          <div key={s.label} style={{ background: 'var(--bg-card)', borderRadius: 10, padding: '16px 18px' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Pipeline overview + Lead sources */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>Pipeline overview</div>
          <div>
            {stageCounts.map(stage => {
              const barWidth = totalLeads > 0 ? Math.max(0, (stage.count / totalLeads) * 100) : 0
              return (
                <div key={stage.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--bg-border)' }}>
                  <div style={{ width: 180, flexShrink: 0, fontSize: 13, color: 'var(--text-secondary)' }}>{stage.label}</div>
                  <div style={{ flex: 1, height: 28, background: 'var(--bg-elevated)', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
                    {stage.count > 0 ? (
                      <div style={{
                        width: `${barWidth}%`, height: '100%', background: hexToRgba(stage.color, 0.7), borderRadius: 6,
                        display: 'flex', alignItems: 'center', paddingLeft: 10,
                      }}>
                        <span style={{ color: '#fff', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {stage.count} deal{stage.count !== 1 ? 's' : ''}
                        </span>
                      </div>
                    ) : (
                      <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', display: 'flex', alignItems: 'center', paddingLeft: 10 }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 600 }}>0 deals</span>
                      </div>
                    )}
                  </div>
                  <div style={{ width: 120, flexShrink: 0, textAlign: 'right', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                    QAR {Math.round(stage.value).toLocaleString('en-US')}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>Lead Sources</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {sourceCounts.map(source => {
              const pct = leads.length > 0 ? Math.round((source.count / leads.length) * 100) : 0
              return (
                <div key={source.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: SOURCE_COLOR[source.name] || DEFAULT_SOURCE_COLOR, flexShrink: 0 }} />
                  <div style={{ flex: 1, fontSize: 13, color: 'var(--text-secondary)' }}>{source.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{source.count} · {pct}%</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <TodaysFollowUpsCard
        assignedToId={showingAllStaff ? null : currentUserId}
        enabled={queryEnabled}
        onOpenLead={setSelectedLeadId}
      />

      {/* Kanban board */}
      {isLoading ? (
        <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading pipeline...</div>
      ) : (
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
          {STAGES.map(stage => {
            const stageLeads = leads.filter(l => l.stage === stage.key)
            return (
              <div key={stage.key} style={{ flexShrink: 0, width: 220, background: 'var(--bg-elevated)', borderRadius: 12, padding: 12, border: '1px solid var(--bg-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--bg-border)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: stage.color, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{stage.label}</div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: hexToRgba(stage.color, 0.15), color: stage.color }}>{stageLeads.length}</span>
                </div>
                {stageLeads.length === 0 ? (
                  <div style={{ border: '1px dashed var(--bg-border)', borderRadius: 10, padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                    No leads
                  </div>
                ) : (
                  <div>
                    {stageLeads.map(l => (
                      <div
                        key={l.id}
                        onClick={() => setSelectedLeadId(l.id)}
                        style={{ background: 'var(--bg-card)', border: '1px solid var(--bg-border)', borderRadius: 10, padding: 14, marginBottom: 8, cursor: 'pointer', transition: 'all 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--bg-border-hover)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--bg-border)'; e.currentTarget.style.transform = 'translateY(0)' }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {l.company_name || l.contact_person}
                        </div>
                        {l.service_interest && (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {l.service_interest}
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          {l.estimated_value > 0 ? (
                            <span style={{ fontSize: 12, fontWeight: 700, color: stage.color }}>QAR {Math.round(Number(l.estimated_value)).toLocaleString('en-US')}</span>
                          ) : <span />}
                          {l.assigned_to_user?.full_name && (
                            <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-elevated)', borderRadius: 20, padding: '2px 8px' }}>
                              {l.assigned_to_user.full_name.split(' ')[0]}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showNew && <NewLeadModal onClose={() => setShowNew(false)} />}
      {selectedLeadId && <LeadDetailModal leadId={selectedLeadId} onClose={() => setSelectedLeadId(null)} />}
    </div>
  )
}
