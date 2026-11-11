import { useState } from 'react'
import { X, Plus } from 'lucide-react'
import { useUpdateClient } from '../../hooks/useClients'
import { useToast } from '../../lib/ToastContext'

const MAX_OWNERS = 10
const emptyOwner = () => ({ full_name: '', qid_number: '', nationality: '', shareholding_pct: '' })

export default function EditClientModal({ client, onClose }) {
  const toast = useToast()
  const { mutateAsync: updateClient, isPending } = useUpdateClient()

  const [form, setForm] = useState({
    company_name: client.company_name || '',
    contact_person: client.contact_person || '',
    client_type: client.client_type || 'corporate',
    phone: client.phone || '',
    whatsapp: client.whatsapp || '',
    email: client.email || '',
    address: client.address || '',
    qid_number: client.qid_number || '',
    cr_number: client.cr_number || '',
    notes: client.notes || '',
  })
  const [owners, setOwners] = useState(
    (client.owners ?? []).length > 0 ? client.owners.map(o => ({ ...emptyOwner(), ...o })) : [emptyOwner()]
  )

  const set = (field, value) => setForm(p => ({ ...p, [field]: value }))

  function addOwner() {
    setOwners(o => o.length >= MAX_OWNERS ? o : [...o, emptyOwner()])
  }

  function removeOwner(index) {
    setOwners(o => o.filter((_, i) => i !== index))
  }

  function updateOwner(index, field, value) {
    setOwners(o => o.map((owner, i) => i === index ? { ...owner, [field]: value } : owner))
  }

  async function handleSubmit() {
    if (!form.contact_person.trim()) { toast('Contact person is required', 'error'); return }
    try {
      const cleanOwners = form.client_type === 'corporate'
        ? owners.filter(o => o.full_name.trim())
        : []
      await updateClient({ id: client.id, ...form, owners: cleanOwners })
      toast('Client updated successfully', 'success')
      onClose()
    } catch (err) {
      toast(err.message || 'Failed to update client', 'error')
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 16, border: '1px solid var(--bg-border)', width: '100%', maxWidth: 640, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--bg-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, color: 'var(--text-primary)' }}>Edit Client</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Company Name" field="company_name" placeholder="Company or business name" form={form} set={set} />
            <Field label="Contact Person *" field="contact_person" placeholder="Full name" form={form} set={set} />

            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Client Type</label>
              <select className="input-base" value={form.client_type} onChange={e => set('client_type', e.target.value)}>
                <option value="corporate">Corporate</option>
                <option value="individual">Individual</option>
              </select>
            </div>

            <Field label="Email" field="email" type="email" placeholder="email@company.com" form={form} set={set} />
            <Field label="Phone" field="phone" placeholder="+974 XXXX XXXX" form={form} set={set} />
            <Field label="WhatsApp" field="whatsapp" placeholder="+974 XXXX XXXX" form={form} set={set} />
            <Field label="Qatar ID (QID)" field="qid_number" placeholder="QID number" form={form} set={set} />
            <Field label="CR Number" field="cr_number" placeholder="Commercial registration" form={form} set={set} />
            <Field label="Address" field="address" placeholder="Office address" span={2} form={form} set={set} />

            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Notes</label>
              <textarea className="input-base" rows={3} placeholder="Internal notes about this client..." value={form.notes} onChange={e => set('notes', e.target.value)} style={{ resize: 'vertical' }} />
            </div>
          </div>

          {form.client_type === 'corporate' && (
            <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--bg-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Owners / Shareholders</label>
                <button
                  type="button"
                  onClick={addOwner}
                  disabled={owners.length >= MAX_OWNERS}
                  className="btn-ghost"
                  style={{ fontSize: 12, padding: '5px 10px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <Plus size={13} /> Add Owner
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {owners.map((owner, index) => (
                  <div key={index} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 0.7fr auto', gap: 8, alignItems: 'end' }}>
                    <div>
                      {index === 0 && <label style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>Full Name</label>}
                      <input className="input-base" placeholder="Full name" value={owner.full_name} onChange={e => updateOwner(index, 'full_name', e.target.value)} />
                    </div>
                    <div>
                      {index === 0 && <label style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>QID Number</label>}
                      <input className="input-base" placeholder="QID number" value={owner.qid_number} onChange={e => updateOwner(index, 'qid_number', e.target.value)} />
                    </div>
                    <div>
                      {index === 0 && <label style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>Nationality</label>}
                      <input className="input-base" placeholder="Nationality" value={owner.nationality} onChange={e => updateOwner(index, 'nationality', e.target.value)} />
                    </div>
                    <div>
                      {index === 0 && <label style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>Share %</label>}
                      <input className="input-base" type="number" min={0} max={100} placeholder="%" value={owner.shareholding_pct} onChange={e => updateOwner(index, 'shareholding_pct', e.target.value)} />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeOwner(index)}
                      disabled={owners.length === 1}
                      title="Remove owner"
                      style={{ background: 'none', border: '1px solid var(--bg-border)', borderRadius: 8, padding: 8, cursor: owners.length === 1 ? 'default' : 'pointer', color: 'var(--text-muted)', opacity: owners.length === 1 ? 0.4 : 1, display: 'flex' }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--bg-border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-gold" onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, field, type = 'text', placeholder, span = 1, form, set }) {
  return (
    <div style={{ gridColumn: span === 2 ? 'span 2' : 'span 1' }}>
      <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</label>
      <input className="input-base" type={type} placeholder={placeholder} value={form[field]} onChange={e => set(field, e.target.value)} />
    </div>
  )
}
