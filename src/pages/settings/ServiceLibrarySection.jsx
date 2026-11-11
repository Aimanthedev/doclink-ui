import { useState } from 'react'
import { ChevronDown, ChevronRight, Plus, Briefcase } from 'lucide-react'
import { useServices, useDeactivateService } from '../../hooks/useServices'
import { useToast } from '../../lib/ToastContext'
import ServiceModal from './ServiceModal'

const TYPE_FILTERS = [
  { value: '', label: 'All' },
  { value: 'company_formation_expat', label: 'Expat Formation' },
  { value: 'company_formation_qatari', label: 'Qatari Formation' },
  { value: 'standard', label: 'Standard' },
]

const TYPE_BADGE_LABEL = {
  company_formation_expat: 'Expat',
  company_formation_qatari: 'Qatari',
  standard: 'Standard',
}

const TYPE_BADGE_COLOR = {
  company_formation_expat: '#60a5fa',
  company_formation_qatari: '#c9a84c',
  standard: '#3ecf8e',
}

export default function ServiceLibrarySection() {
  const toast = useToast()
  const [expanded, setExpanded] = useState(false)
  const [typeFilter, setTypeFilter] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [editingService, setEditingService] = useState(null)
  const [showAdd, setShowAdd] = useState(false)

  const { data: services = [], isLoading } = useServices({
    appliesTo: typeFilter || undefined,
    includeInactive: showInactive,
  })

  const { mutateAsync: deactivateService } = useDeactivateService()

  async function toggleActive(e, service) {
    e.stopPropagation()
    try {
      await deactivateService({ id: service.id, isActive: !service.is_active })
      toast(service.is_active ? 'Service deactivated' : 'Service reactivated', 'success')
    } catch (err) {
      toast(err.message || 'Failed to update service', 'error')
    }
  }

  return (
    <div className="card" style={{ padding: 0, marginBottom: 20, overflow: 'hidden' }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{ padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, background: 'var(--bg-elevated)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Briefcase size={16} color="var(--accent-gold)" />
          </div>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Service Library</h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Manage services, pricing, and which quotation types they apply to</p>
          </div>
        </div>
        {expanded ? <ChevronDown size={18} color="var(--text-muted)" /> : <ChevronRight size={18} color="var(--text-muted)" />}
      </div>

      {expanded && (
        <div style={{ padding: '0 24px 24px' }}>
          <div className="gold-line" style={{ marginBottom: 20 }} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {TYPE_FILTERS.map(f => (
                <button
                  key={f.value}
                  onClick={() => setTypeFilter(f.value)}
                  style={{
                    fontSize: 12, padding: '6px 14px', borderRadius: 20, cursor: 'pointer',
                    border: typeFilter === f.value ? '1px solid var(--accent-gold)' : '1px solid var(--bg-border)',
                    background: typeFilter === f.value ? 'var(--accent-gold-dim)' : 'transparent',
                    color: typeFilter === f.value ? 'var(--accent-gold)' : 'var(--text-secondary)',
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer' }}>
                <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
                Show inactive
              </label>
              <button className="btn-gold" onClick={() => setShowAdd(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, padding: '8px 16px' }}>
                <Plus size={14} /> Add Service
              </button>
            </div>
          </div>

          {isLoading ? (
            <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading services...</div>
          ) : services.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              No services found for this filter
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Service</th>
                    <th>Applies To</th>
                    <th>Base Price</th>
                    <th>Optional</th>
                    <th>Govt Direct</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map(s => (
                    <tr key={s.id} onClick={() => setEditingService(s)} style={{ cursor: 'pointer', opacity: s.is_active ? 1 : 0.5 }}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{s.name}</div>
                        {s.category && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{s.category}</div>}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {(s.applies_to || []).map(t => (
                            <span key={t} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: `${TYPE_BADGE_COLOR[t]}22`, color: TYPE_BADGE_COLOR[t] }}>
                              {TYPE_BADGE_LABEL[t] || t}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>{s.currency} {Number(s.base_price ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td>{s.is_optional_default ? 'Yes' : 'No'}</td>
                      <td>{s.is_govt_direct ? 'Yes' : 'No'}</td>
                      <td>
                        <span
                          onClick={e => toggleActive(e, s)}
                          style={{
                            fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 500, cursor: 'pointer',
                            background: s.is_active ? '#3ecf8e22' : '#9896a422',
                            color: s.is_active ? '#3ecf8e' : '#9896a4',
                          }}
                        >
                          {s.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showAdd && <ServiceModal onClose={() => setShowAdd(false)} />}
      {editingService && <ServiceModal service={editingService} onClose={() => setEditingService(null)} />}
    </div>
  )
}
