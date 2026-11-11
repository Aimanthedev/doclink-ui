import { useState } from 'react'
import { X } from 'lucide-react'
import { useCreateService, useUpdateService } from '../../hooks/useServices'
import { useToast } from '../../lib/ToastContext'

const APPLIES_TO_OPTIONS = [
  { value: 'company_formation_expat', label: 'Expat Formation' },
  { value: 'company_formation_qatari', label: 'Qatari Formation' },
  { value: 'standard', label: 'Standard Quotation' },
]

function TogglePill({ active, onClick, activeLabel, inactiveLabel }) {
  return (
    <span
      onClick={onClick}
      style={{
        fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 500, cursor: 'pointer',
        background: active ? '#3ecf8e22' : 'var(--bg-elevated)',
        color: active ? '#3ecf8e' : 'var(--text-muted)',
      }}
    >
      {active ? activeLabel : inactiveLabel}
    </span>
  )
}

export default function ServiceModal({ service, onClose }) {
  const isEdit = !!service?.id
  const toast = useToast()
  const { mutateAsync: createService, isPending: isCreating } = useCreateService()
  const { mutateAsync: updateService, isPending: isUpdating } = useUpdateService()
  const isPending = isCreating || isUpdating

  const [form, setForm] = useState({
    name: service?.name || '',
    category: service?.category || '',
    description: service?.description || '',
    base_price: service?.base_price ?? 0,
    currency: service?.currency || 'QAR',
    default_timeline: service?.default_timeline || '',
    is_optional_default: service?.is_optional_default ?? false,
    is_govt_direct: service?.is_govt_direct ?? false,
    is_active: service?.is_active ?? true,
    applies_to: service?.applies_to || [],
  })
  const set = (f, v) => setForm(p => ({ ...p, [f]: v }))

  function toggleAppliesTo(value) {
    setForm(p => ({
      ...p,
      applies_to: p.applies_to.includes(value)
        ? p.applies_to.filter(v => v !== value)
        : [...p.applies_to, value],
    }))
  }

  async function handleSubmit() {
    if (!form.name.trim()) { toast('Service name is required', 'error'); return }
    if (form.applies_to.length === 0) { toast('Select at least one quotation type', 'error'); return }

    const payload = {
      ...form,
      base_price: Number(form.base_price) || 0,
      category: form.category || null,
      description: form.description || null,
      default_timeline: form.default_timeline || null,
    }

    try {
      if (isEdit) {
        await updateService({ id: service.id, ...payload })
        toast('Service updated', 'success')
      } else {
        await createService(payload)
        toast('Service added', 'success')
      }
      onClose()
    } catch (err) {
      toast(err.message || 'Failed to save service', 'error')
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 16, border: '1px solid var(--bg-border)', width: '100%', maxWidth: 600, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--bg-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, color: 'var(--text-primary)' }}>
              {isEdit ? 'Edit Service' : 'Add Service'}
            </h2>
            {isEdit && (
              <div style={{ marginTop: 6 }}>
                <TogglePill
                  active={form.is_active}
                  onClick={() => set('is_active', !form.is_active)}
                  activeLabel="Active"
                  inactiveLabel="Inactive"
                />
              </div>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Name *</label>
                <input className="input-base" placeholder="e.g. Trade License Renewal" value={form.name} onChange={e => set('name', e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Category</label>
                <input className="input-base" placeholder="e.g. Government Services" value={form.category} onChange={e => set('category', e.target.value)} />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Description</label>
              <textarea className="input-base" rows={3} style={{ resize: 'vertical' }} placeholder="Optional description shown internally" value={form.description} onChange={e => set('description', e.target.value)} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Base Price</label>
                <input className="input-base" type="number" min="0" step="0.01" value={form.base_price} onChange={e => set('base_price', e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Currency</label>
                <select className="input-base" value={form.currency} onChange={e => set('currency', e.target.value)}>
                  <option value="QAR">QAR</option>
                  <option value="USD">USD</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Default Timeline</label>
                <input className="input-base" placeholder="e.g. 5-7 business days" value={form.default_timeline} onChange={e => set('default_timeline', e.target.value)} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 24 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.is_optional_default} onChange={e => set('is_optional_default', e.target.checked)} />
                Optional by default
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.is_govt_direct} onChange={e => set('is_govt_direct', e.target.checked)} />
                Government direct payment
              </label>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Applies To *</label>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {APPLIES_TO_OPTIONS.map(opt => (
                  <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.applies_to.includes(opt.value)} onChange={() => toggleAppliesTo(opt.value)} />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--bg-border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-gold" onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Service'}
          </button>
        </div>
      </div>
    </div>
  )
}
