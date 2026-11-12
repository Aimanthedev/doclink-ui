import { useState } from 'react'
import { useSearchParams } from '@/lib/router-compat'
import { useQueryClient } from '@tanstack/react-query'
import { Search, RefreshCw, Plus, X, Search as SearchIcon, Upload } from 'lucide-react'
import { useRenewals, useCreateRenewal } from '../../hooks/useRenewals'
import { useUploadDocument } from '../../hooks/useDocuments'
import { useClients } from '../../hooks/useClients'
import { useUsers } from '../../hooks/useUsers'
import { useAuth } from '../../lib/AuthContext'
import { useToast } from '../../lib/ToastContext'
import { supabase } from '../../lib/supabase'

const FILTER_TABS = [
  { key: '7', label: '7 days' },
  { key: '30', label: '30 days' },
  { key: 'all', label: 'All' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'critical', label: 'Expired' },
]

function NewRenewalModal({ onClose }) {
  const { profile } = useAuth()
  const toast = useToast()
  const { mutateAsync: createRenewal, isPending } = useCreateRenewal()
  const { data: users = [] } = useUsers()
  const [clientSearch, setClientSearch] = useState('')
  const [selectedClient, setSelectedClient] = useState(null)
  const [showDrop, setShowDrop] = useState(false)
  const { data: clients = [] } = useClients(clientSearch)

  const [form, setForm] = useState({ renewal_type: '', document_number: '', expiry_date: '', priority: 'medium', assigned_to: '', notes: '' })
  const set = (f, v) => setForm(p => ({ ...p, [f]: v }))

  async function handleSubmit() {
    if (!selectedClient) { toast('Select a client', 'error'); return }
    if (!form.renewal_type.trim() || !form.expiry_date) { toast('Renewal type and expiry date are required', 'error'); return }
    try {
      await createRenewal({ ...form, client_id: selectedClient.id, assigned_to: form.assigned_to || null, status: 'upcoming', created_by: profile?.id })
      toast('Renewal added', 'success')
      onClose()
    } catch (err) { toast(err.message || 'Failed to add renewal', 'error') }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 16, border: '1px solid var(--bg-border)', width: '100%', maxWidth: 520, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--bg-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, color: 'var(--text-primary)' }}>New Renewal</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Client *</label>
            <div style={{ position: 'relative' }}>
              <SearchIcon size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input className="input-base" style={{ paddingLeft: 36 }} placeholder="Search client..." value={selectedClient ? (selectedClient.company_name || selectedClient.contact_person) : clientSearch}
                onChange={e => { setClientSearch(e.target.value); setSelectedClient(null); setShowDrop(true) }} onFocus={() => setShowDrop(true)} />
            </div>
            {showDrop && !selectedClient && clients.length > 0 && (
              <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', borderRadius: 8, marginTop: 4, maxHeight: 160, overflowY: 'auto' }}>
                {clients.map(c => (
                  <div key={c.id} onClick={() => { setSelectedClient(c); setShowDrop(false) }} style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--bg-border)' }}>
                    <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{c.company_name || c.contact_person}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.client_code}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Renewal Type *</label>
            <input className="input-base" placeholder="e.g. Trade License, QID, Visa, Establishment Card" value={form.renewal_type} onChange={e => set('renewal_type', e.target.value)} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Document Number</label>
              <input className="input-base" placeholder="License/QID number" value={form.document_number} onChange={e => set('document_number', e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Expiry Date *</label>
              <input className="input-base" type="date" value={form.expiry_date} onChange={e => set('expiry_date', e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Priority</label>
              <select className="input-base" value={form.priority} onChange={e => set('priority', e.target.value)}>
                {['low','medium','high','urgent','critical'].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
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
            <textarea className="input-base" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} style={{ resize: 'vertical' }} />
          </div>
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--bg-border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-gold" onClick={handleSubmit} disabled={isPending}>{isPending ? 'Saving...' : 'Add Renewal'}</button>
        </div>
      </div>
    </div>
  )
}

function RenewalModal({ renewal, onClose }) {
  const { profile } = useAuth()
  const toast = useToast()
  const qc = useQueryClient()
  const { mutateAsync: uploadDocument } = useUploadDocument()

  const todayStr = new Date().toISOString().split('T')[0]
  const [newExpiryDate, setNewExpiryDate] = useState('')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState(null)
  const [saving, setSaving] = useState(false)

  const clientName = renewal.client?.company_name || renewal.client?.contact_person || 'Unknown'
  const currentExpiry = new Date(renewal.expiry_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })

  async function handleConfirm() {
    if (!newExpiryDate) { toast('New expiry date is required', 'error'); return }
    if (newExpiryDate <= todayStr) { toast('New expiry date must be after today', 'error'); return }

    setSaving(true)
    try {
      // 1. Mark the current renewal as completed
      const { data: completedRenewal, error: updateErr } = await supabase
        .from('renewals')
        .update({
          status: 'completed',
          notes: `${renewal.notes ? renewal.notes + '\n' : ''}Renewed on ${todayStr}`,
        })
        .eq('id', renewal.id)
        .select('id')
      if (updateErr) throw updateErr
      if (!completedRenewal || completedRenewal.length === 0) {
        throw new Error('Could not mark the current renewal as completed. Check the Row Level Security UPDATE policy on renewals for this role.')
      }

      // 2. Create the new renewal record
      const { data: newRenewal, error: insertErr } = await supabase
        .from('renewals')
        .insert([{
          client_id: renewal.client_id,
          case_id: renewal.case_id || null,
          renewal_type: renewal.renewal_type,
          expiry_date: newExpiryDate,
          status: 'upcoming',
          notes: notes || null,
          created_by: profile.id,
        }])
        .select()
        .single()
      if (insertErr) throw insertErr

      // 3. Link the uploaded document (if any) to the new renewal via case_id/notes
      if (file) {
        await uploadDocument({
          file,
          category: renewal.renewal_type,
          clientId: renewal.client_id,
          caseId: renewal.case_id || null,
          uploadedBy: profile.id,
          notes: `Renewed document for ${renewal.renewal_type} — linked to renewal ${newRenewal.id} (expires ${newExpiryDate})`,
        })
      }

      // 4. Invalidate renewals query
      qc.invalidateQueries({ queryKey: ['renewals'] })

      const displayDate = new Date(newExpiryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
      toast(`Renewal recorded — next expiry set for ${displayDate}`, 'success')
      onClose()
    } catch (err) {
      toast(err.message || 'Failed to record renewal', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 16, border: '1px solid var(--bg-border)', width: '100%', maxWidth: 460, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--bg-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, color: 'var(--text-primary)' }}>Mark as Renewed</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>{clientName}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{renewal.renewal_type}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Current expiry: {currentExpiry}</div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>New Expiry Date *</label>
            <input
              className="input-base"
              type="date"
              min={todayStr}
              value={newExpiryDate}
              onChange={e => setNewExpiryDate(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Upload Renewed Document (optional)</label>
            <label
              style={{
                display: 'flex', alignItems: 'center', gap: 8, border: '1px dashed var(--bg-border)', borderRadius: 8,
                padding: '10px 14px', cursor: 'pointer', fontSize: 13, color: file ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
            >
              <Upload size={14} />
              {file ? file.name : 'Choose a file...'}
              <input type="file" style={{ display: 'none' }} onChange={e => setFile(e.target.files[0] || null)} />
            </label>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Notes (optional)</label>
            <textarea className="input-base" rows={3} value={notes} onChange={e => setNotes(e.target.value)} style={{ resize: 'vertical' }} />
          </div>
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--bg-border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-gold" onClick={handleConfirm} disabled={saving}>{saving ? 'Saving...' : 'Confirm Renewal'}</button>
        </div>
      </div>
    </div>
  )
}

function getDaysLeftDisplay(daysLeft) {
  if (daysLeft < 0) return { text: `${Math.abs(daysLeft)}d overdue`, color: '#ef4444', fontWeight: 700 }
  if (daysLeft === 0) return { text: 'Today', color: '#ef4444', fontWeight: 700 }
  if (daysLeft <= 7) return { text: `${daysLeft}d`, color: '#ef4444', fontWeight: 700 }
  if (daysLeft <= 30) return { text: `${daysLeft}d`, color: '#f59e0b', fontWeight: 700 }
  return { text: `${daysLeft}d`, color: '#10b981', fontWeight: 400 }
}

function getStatusBadge(status, daysLeft) {
  if (status === 'completed') return { label: 'Completed', bg: 'rgba(16,185,129,0.15)', color: '#10b981' }
  if (status === 'submitted') return { label: 'Submitted', bg: 'rgba(37,99,235,0.15)', color: '#3b82f6' }
  if (daysLeft <= 7) return { label: 'Critical', bg: 'rgba(239,68,68,0.15)', color: '#ef4444' }
  if (daysLeft <= 30) return { label: 'Due Soon', bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' }
  return { label: 'Upcoming', bg: 'rgba(148,163,184,0.15)', color: '#94a3b8' }
}

export default function RenewalsPage() {
  const [searchParams] = useSearchParams()
  const [activeFilter, setActiveFilter] = useState('all')
  // ?q=... opens the page already searching (used by Overview renewal links).
  const [search, setSearch] = useState(() => searchParams.get('q') || '')
  const [searchFocused, setSearchFocused] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [renewingItem, setRenewingItem] = useState(null)

  const filterParams = activeFilter === '7' || activeFilter === '30' ? { days: activeFilter } : activeFilter === 'critical' ? { status: 'critical' } : activeFilter === 'submitted' ? { status: 'submitted' } : {}
  const { data: renewals = [], isLoading } = useRenewals(filterParams)

  const filtered = renewals.filter(r => {
    if (!search.trim()) return true
    const s = search.toLowerCase()
    return r.renewal_type?.toLowerCase().includes(s) || r.client?.company_name?.toLowerCase().includes(s) || r.client?.contact_person?.toLowerCase().includes(s)
  })

  const today = new Date()
  const in7 = new Date(); in7.setDate(in7.getDate() + 7)
  const in30 = new Date(); in30.setDate(in30.getDate() + 30)

  const stats = {
    due7: renewals.filter(r => new Date(r.expiry_date) <= in7 && new Date(r.expiry_date) >= today).length,
    due30: renewals.filter(r => new Date(r.expiry_date) <= in30 && new Date(r.expiry_date) >= today).length,
    overdue: renewals.filter(r => new Date(r.expiry_date) < today && r.status !== 'completed').length,
    submitted: renewals.filter(r => r.status === 'submitted').length,
  }

  const kpis = [
    { label: 'Due in 7 Days', value: stats.due7, color: '#ef4444' },
    { label: 'Due in 30 Days', value: stats.due30, color: '#f59e0b' },
    { label: 'Overdue', value: stats.overdue, color: '#ef4444' },
    { label: 'Submitted', value: stats.submitted, color: '#3b82f6' },
  ]

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Renewals</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Track license, visa, and document renewal deadlines</p>
        </div>
        <button className="btn-gold" onClick={() => setShowNew(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, borderRadius: 10 }}>
          <Plus size={15} /> New Renewal
        </button>
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

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginBottom: 16 }}>
        {FILTER_TABS.map(t => {
          const active = activeFilter === t.key
          return (
            <button
              key={t.key}
              onClick={() => setActiveFilter(t.key)}
              style={{
                padding: '8px 0',
                background: 'none',
                border: 'none',
                borderBottom: active ? '2px solid #2563eb' : '2px solid transparent',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: active ? 600 : 500,
                color: active ? '#3b82f6' : 'var(--text-muted)',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s',
              }}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          className="input-base"
          style={{
            paddingLeft: 36,
            background: 'var(--bg-elevated)',
            border: `1px solid ${searchFocused ? '#2563eb' : 'var(--bg-border)'}`,
            borderRadius: 10,
          }}
          placeholder="Search renewals..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading renewals...</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-art"><RefreshCw size={34} /></div>
          <div className="empty-state-title">No renewals found</div>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ background: 'transparent', borderBottom: '1px solid var(--bg-border)' }}>ID</th>
              <th style={{ background: 'transparent', borderBottom: '1px solid var(--bg-border)' }}>Client</th>
              <th style={{ background: 'transparent', borderBottom: '1px solid var(--bg-border)' }}>Type</th>
              <th style={{ background: 'transparent', borderBottom: '1px solid var(--bg-border)' }}>Expires</th>
              <th style={{ background: 'transparent', borderBottom: '1px solid var(--bg-border)' }}>Days Left</th>
              <th style={{ background: 'transparent', borderBottom: '1px solid var(--bg-border)' }}>Status</th>
              <th style={{ background: 'transparent', borderBottom: '1px solid var(--bg-border)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => {
              const expiryDate = new Date(r.expiry_date)
              const daysLeft = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24))
              const daysDisplay = getDaysLeftDisplay(daysLeft)
              const badge = getStatusBadge(r.status, daysLeft)
              const isUrgentRow = r.status === 'upcoming' && daysLeft <= 7
              return (
                <tr key={r.id} style={isUrgentRow ? { background: 'rgba(239,68,68,0.03)' } : undefined}>
                  <td>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>{r.id?.slice(0, 8).toUpperCase()}</span>
                  </td>
                  <td style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {r.client?.company_name || r.client?.contact_person}
                  </td>
                  <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{r.renewal_type}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{expiryDate.toISOString().slice(0, 10)}</td>
                  <td style={{ fontSize: 12, color: daysDisplay.color, fontWeight: daysDisplay.fontWeight }}>{daysDisplay.text}</td>
                  <td>
                    <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, background: badge.bg, color: badge.color, fontWeight: 500 }}>
                      {badge.label}
                    </span>
                  </td>
                  <td>
                    {r.status !== 'completed' && (
                      <button
                        className="btn-ghost"
                        onClick={() => setRenewingItem(r)}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, padding: '4px 10px', borderRadius: 8, color: '#3b82f6', borderColor: 'rgba(37,99,235,0.3)' }}
                      >
                        <RefreshCw size={12} /> Renewed
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      {showNew && <NewRenewalModal onClose={() => setShowNew(false)} />}
      {renewingItem && <RenewalModal renewal={renewingItem} onClose={() => setRenewingItem(null)} />}
    </div>
  )
}
