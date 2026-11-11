import { useRef, useState } from 'react'
import { ChevronDown, ChevronRight, Building2, Upload } from 'lucide-react'
import { useCompanySettings, useUpdateCompanySettings } from '../../hooks/useCompanySettings'
import { useAuth } from '../../lib/AuthContext'
import { useToast } from '../../lib/ToastContext'

const FIELD_LABEL_STYLE = { display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }

export default function CompanyProfileSection() {
  const { profile } = useAuth()
  const toast = useToast()
  const [expanded, setExpanded] = useState(false)
  const { data: settings, isLoading } = useCompanySettings()
  const { mutateAsync: updateSettings, isPending } = useUpdateCompanySettings()

  const [form, setForm] = useState(null)
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const fileInputRef = useRef(null)

  if (!isLoading && form === null) {
    setForm({
      company_name: settings?.company_name || '',
      cr_number: settings?.cr_number || '',
      phone: settings?.phone || '',
      email: settings?.email || '',
      website: settings?.website || '',
      address: settings?.address || '',
      bank_ac_name: settings?.bank_ac_name || '',
      bank_ac_number: settings?.bank_ac_number || '',
      bank_iban: settings?.bank_iban || '',
      bank_name: settings?.bank_name || '',
      bank_swift_code: settings?.bank_swift_code || '',
      bank_fawran_alias: settings?.bank_fawran_alias || '',
      signatory_name: settings?.signatory_name || '',
    })
  }

  function set(field, value) {
    setForm(p => ({ ...p, [field]: value }))
  }

  function handleLogoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast('Please upload an image file', 'error'); return }
    if (file.size > 2 * 1024 * 1024) { toast('Logo must be under 2MB', 'error'); return }

    const reader = new FileReader()
    reader.onload = ev => setLogoPreview(ev.target.result)
    reader.readAsDataURL(file)
    setLogoFile(file)
  }

  async function handleSave() {
    if (!form.company_name.trim()) { toast('Company name is required', 'error'); return }
    try {
      await updateSettings({ id: settings?.id, logoFile, updatedBy: profile?.id, ...form })
      setLogoFile(null)
      toast('Company profile updated', 'success')
    } catch (err) {
      toast(err.message || 'Failed to update company profile', 'error')
    }
  }

  const displayLogo = logoPreview || settings?.logo_url

  return (
    <div className="card" style={{ padding: 0, marginBottom: 20, overflow: 'hidden' }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{ padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, background: 'var(--bg-elevated)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Building2 size={16} color="var(--accent-gold)" />
          </div>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Company Profile</h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Company name, address, and contact details</p>
          </div>
        </div>
        {expanded ? <ChevronDown size={18} color="var(--text-muted)" /> : <ChevronRight size={18} color="var(--text-muted)" />}
      </div>

      {expanded && (
        <div style={{ padding: '0 24px 24px' }}>
          <div className="gold-line" style={{ marginBottom: 20 }} />

          {isLoading || !form ? (
            <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading company profile...</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={FIELD_LABEL_STYLE}>Logo</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 120, height: 60, background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                    {displayLogo ? (
                      <img src={displayLogo} alt="Company logo" style={{ maxHeight: 60, maxWidth: 120, objectFit: 'contain' }} />
                    ) : (
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>No logo</span>
                    )}
                  </div>
                  <button className="btn-ghost" onClick={() => fileInputRef.current?.click()} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                    <Upload size={13} /> {displayLogo ? 'Replace Logo' : 'Upload Logo'}
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoChange} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={FIELD_LABEL_STYLE}>Company Name *</label>
                  <input className="input-base" value={form.company_name} onChange={e => set('company_name', e.target.value)} />
                </div>
                <div>
                  <label style={FIELD_LABEL_STYLE}>CR Number</label>
                  <input className="input-base" value={form.cr_number} onChange={e => set('cr_number', e.target.value)} />
                </div>
                <div>
                  <label style={FIELD_LABEL_STYLE}>Phone</label>
                  <input className="input-base" value={form.phone} onChange={e => set('phone', e.target.value)} />
                </div>
                <div>
                  <label style={FIELD_LABEL_STYLE}>Email</label>
                  <input className="input-base" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={FIELD_LABEL_STYLE}>Website</label>
                  <input className="input-base" value={form.website} onChange={e => set('website', e.target.value)} />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={FIELD_LABEL_STYLE}>Address</label>
                  <textarea className="input-base" rows={2} value={form.address} onChange={e => set('address', e.target.value)} style={{ resize: 'vertical' }} />
                </div>
                <div>
                  <label style={FIELD_LABEL_STYLE}>Authorized Signatory Name</label>
                  <input className="input-base" value={form.signatory_name} onChange={e => set('signatory_name', e.target.value)} />
                </div>
              </div>

              <div style={{ marginTop: 8 }}>
                <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Bank Details</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={FIELD_LABEL_STYLE}>Account Name</label>
                    <input className="input-base" value={form.bank_ac_name} onChange={e => set('bank_ac_name', e.target.value)} />
                  </div>
                  <div>
                    <label style={FIELD_LABEL_STYLE}>Account Number</label>
                    <input className="input-base" value={form.bank_ac_number} onChange={e => set('bank_ac_number', e.target.value)} />
                  </div>
                  <div>
                    <label style={FIELD_LABEL_STYLE}>IBAN</label>
                    <input className="input-base" value={form.bank_iban} onChange={e => set('bank_iban', e.target.value)} />
                  </div>
                  <div>
                    <label style={FIELD_LABEL_STYLE}>Bank Name</label>
                    <input className="input-base" value={form.bank_name} onChange={e => set('bank_name', e.target.value)} />
                  </div>
                  <div>
                    <label style={FIELD_LABEL_STYLE}>Swift Code</label>
                    <input className="input-base" value={form.bank_swift_code} onChange={e => set('bank_swift_code', e.target.value)} />
                  </div>
                  <div>
                    <label style={FIELD_LABEL_STYLE}>Fawran Alias</label>
                    <input className="input-base" value={form.bank_fawran_alias} onChange={e => set('bank_fawran_alias', e.target.value)} />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                {settings?.updated_at ? (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Last updated by {settings.updated_by_user?.full_name || 'Unknown'} on {new Date(settings.updated_at).toLocaleDateString('en-GB')}
                  </span>
                ) : <span />}
                <button className="btn-gold" onClick={handleSave} disabled={isPending} style={{ fontSize: 13 }}>
                  {isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
