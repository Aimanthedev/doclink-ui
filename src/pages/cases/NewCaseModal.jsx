import { useState } from 'react'
import { X, Search } from 'lucide-react'
import { useCreateCase } from '../../hooks/useCases'
import { useClients } from '../../hooks/useClients'
import { useServices } from '../../hooks/useServices'
import { useUsers } from '../../hooks/useUsers'
import { useAuth } from '../../lib/AuthContext'
import { useToast } from '../../lib/ToastContext'

export default function NewCaseModal({ onClose, prefillClientId = null }) {
  const { profile } = useAuth()
  const toast = useToast()
  const { mutateAsync: createCase, isPending } = useCreateCase()
  const { data: services = [] } = useServices()
  const { data: users = [] } = useUsers()

  const [clientSearch, setClientSearch] = useState('')
  const [selectedClient, setSelectedClient] = useState(null)
  const [showClientDrop, setShowClientDrop] = useState(false)
  const { data: clients = [] } = useClients(clientSearch)

  const [form, setForm] = useState({
    title: '',
    service_id: '',
    assigned_to: '',
    priority: 'medium',
    amount: '',
    due_date: '',
    description: '',
  })

  const set = (f, v) => setForm(p => ({ ...p, [f]: v }))

  async function handleSubmit() {
    if (!selectedClient) { toast('Please select a client', 'error'); return }
    if (!form.title.trim()) { toast('Case title is required', 'error'); return }
    try {
      await createCase({
        ...form,
        client_id: selectedClient.id,
        amount: form.amount ? Number(form.amount) : 0,
        due_date: form.due_date || null,
        service_id: form.service_id || null,
        assigned_to: form.assigned_to || null,
        status: 'active',
        created_by: profile?.id,
      })
      toast('Case created successfully', 'success')
      onClose()
    } catch (err) {
      toast(err.message || 'Failed to create case', 'error')
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 16, border: '1px solid var(--bg-border)', width: '100%', maxWidth: 640, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--bg-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: 22, fontWeight: 600, color: 'var(--text-primary)' }}>New Case</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Client selector */}
            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Client *</label>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input className="input-base" style={{ paddingLeft: 36 }} placeholder="Search client..." value={selectedClient ? (selectedClient.company_name || selectedClient.contact_person) : clientSearch}
                  onChange={e => { setClientSearch(e.target.value); setSelectedClient(null); setShowClientDrop(true) }}
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

            {/* Title */}
            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Case Title *</label>
              <input className="input-base" placeholder="e.g. Company Formation for Al Noor Trading" value={form.title} onChange={e => set('title', e.target.value)} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {/* Service */}
              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Service</label>
                <select className="input-base" value={form.service_id} onChange={e => set('service_id', e.target.value)}>
                  <option value="">Select service...</option>
                  {Array.from(new Set(services.map(s => s.category))).map(cat => (
                    <optgroup key={cat} label={cat}>
                      {services.filter(s => s.category === cat).map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* Assigned to */}
              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Assign To</label>
                <select className="input-base" value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)}>
                  <option value="">Unassigned</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                </select>
              </div>

              {/* Priority */}
              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Priority</label>
                <select className="input-base" value={form.priority} onChange={e => set('priority', e.target.value)}>
                  {['low', 'medium', 'high', 'urgent', 'critical'].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Amount (QAR)</label>
                <input className="input-base" type="number" min="0" placeholder="0.00" value={form.amount} onChange={e => set('amount', e.target.value)} />
              </div>

              {/* Due date */}
              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Due Date</label>
                <input className="input-base" type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} />
              </div>
            </div>

            {/* Description */}
            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Description / Notes</label>
              <textarea className="input-base" rows={3} placeholder="Additional details about this case..." value={form.description} onChange={e => set('description', e.target.value)} style={{ resize: 'vertical' }} />
            </div>
          </div>
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--bg-border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-gold" onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Creating...' : 'Create Case'}
          </button>
        </div>
      </div>
    </div>
  )
}