import { useState } from 'react'
import { ChevronDown, ChevronRight, Settings2, AlertTriangle } from 'lucide-react'
import { useQuotationPreset, useUpdateQuotationPreset } from '../../hooks/useQuotationPresets'
import { useAuth } from '../../lib/AuthContext'
import { useToast } from '../../lib/ToastContext'
import FeaturesNotesEditor from '../../components/quotations/FeaturesNotesEditor'
import FeesEditor from '../../components/quotations/FeesEditor'

const PRESET_TYPES = [
  { type: 'company_formation_expat', label: 'Company Formation — Expat Ownership' },
  { type: 'company_formation_qatari', label: 'Company Formation — Qatari Ownership' },
]

const labelStyle = { display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }

function PresetSubSection({ type, label }) {
  const { profile } = useAuth()
  const toast = useToast()
  const { data: preset, isLoading } = useQuotationPreset(type)
  const { mutateAsync: updatePreset } = useUpdateQuotationPreset()
  const [seededFor, setSeededFor] = useState(undefined) // undefined = not yet seeded

  const [features, setFeatures] = useState([])
  const [fees, setFees] = useState([])
  const [closingMessage, setClosingMessage] = useState('')
  const [signatoryPosition, setSignatoryPosition] = useState('')
  const [savingKey, setSavingKey] = useState(null) // 'features' | 'fees' | 'closing'

  // Seed local editable state from the fetched preset once it resolves — a
  // conditional setState during render rather than a useEffect, to avoid the
  // extra cascading render that calling setState synchronously in an effect causes.
  if (!isLoading && seededFor === undefined) {
    setSeededFor(preset ?? null)
    if (preset) {
      setFeatures((preset.features_notes || []).map(f => ({ ...f })))
      setFees((preset.default_fees || []).map(f => ({ ...f })))
      setClosingMessage(preset.closing_message || '')
      setSignatoryPosition(preset.signatory_position || '')
    }
  }

  async function saveFeatures() {
    setSavingKey('features')
    try {
      await updatePreset({ quotationType: type, updates: { features_notes: features }, userId: profile?.id })
      toast('Features & Notes preset saved', 'success')
    } catch (err) {
      toast(err.message || 'Failed to save', 'error')
    } finally {
      setSavingKey(null)
    }
  }

  async function saveFees() {
    setSavingKey('fees')
    try {
      await updatePreset({ quotationType: type, updates: { default_fees: fees }, userId: profile?.id })
      toast('Default Fees preset saved', 'success')
    } catch (err) {
      toast(err.message || 'Failed to save', 'error')
    } finally {
      setSavingKey(null)
    }
  }

  async function saveClosing() {
    setSavingKey('closing')
    try {
      await updatePreset({
        quotationType: type,
        updates: { closing_message: closingMessage || null, signatory_position: signatoryPosition || null },
        userId: profile?.id,
      })
      toast('Closing defaults saved', 'success')
    } catch (err) {
      toast(err.message || 'Failed to save', 'error')
    } finally {
      setSavingKey(null)
    }
  }

  if (isLoading) {
    return <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading preset...</div>
  }

  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{label}</h3>
        {preset?.updated_at && (
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Last updated: {new Date(preset.updated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            {preset.updated_by_user?.full_name && ` by ${preset.updated_by_user.full_name}`}
          </span>
        )}
      </div>

      {/* Features & Notes */}
      <div style={{ marginBottom: 20 }}>
        <h4 style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 10 }}>Features & Notes</h4>
        <FeaturesNotesEditor rows={features} onChange={setFeatures} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
          <button className="btn-gold" onClick={saveFeatures} disabled={savingKey === 'features'} style={{ fontSize: 12, padding: '8px 16px' }}>
            {savingKey === 'features' ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Default Fees */}
      <div style={{ marginBottom: 20 }}>
        <h4 style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 10 }}>Default Fees</h4>
        <FeesEditor rows={fees} onChange={setFees} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
          <button className="btn-gold" onClick={saveFees} disabled={savingKey === 'fees'} style={{ fontSize: 12, padding: '8px 16px' }}>
            {savingKey === 'fees' ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Closing defaults */}
      <div>
        <h4 style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 10 }}>Closing Defaults</h4>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Closing Message</label>
          <textarea className="input-base" rows={2} style={{ resize: 'vertical' }} value={closingMessage} onChange={e => setClosingMessage(e.target.value)} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Signatory Position</label>
          <input className="input-base" placeholder="e.g. Managing Director" value={signatoryPosition} onChange={e => setSignatoryPosition(e.target.value)} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn-gold" onClick={saveClosing} disabled={savingKey === 'closing'} style={{ fontSize: 12, padding: '8px 16px' }}>
            {savingKey === 'closing' ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function QuotationPresetSection() {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="card" style={{ padding: 0, marginBottom: 20, overflow: 'hidden' }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{ padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, background: 'var(--bg-elevated)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Settings2 size={16} color="var(--accent-gold)" />
          </div>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Quotation Presets</h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Edit the default content that auto-loads when creating a new formation quotation</p>
          </div>
        </div>
        {expanded ? <ChevronDown size={18} color="var(--text-muted)" /> : <ChevronRight size={18} color="var(--text-muted)" />}
      </div>

      {expanded && (
        <div style={{ padding: '0 24px 24px' }}>
          <div className="gold-line" style={{ marginBottom: 20 }} />

          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: 'var(--status-overdue)22', border: '1px solid var(--status-overdue)44', borderRadius: 8, padding: '12px 14px', marginBottom: 20 }}>
            <AlertTriangle size={15} color="var(--status-overdue)" style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Changes here only affect new quotations. Existing quotations keep their original content.
            </div>
          </div>

          {PRESET_TYPES.map(({ type, label }) => (
            <PresetSubSection key={type} type={type} label={label} />
          ))}
        </div>
      )}
    </div>
  )
}
