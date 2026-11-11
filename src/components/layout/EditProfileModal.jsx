import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import { useToast } from '../../lib/ToastContext'

const ROLE_LABEL = {
  super_admin: 'Super Admin',
  manager: 'Manager',
  pro_officer: 'PRO Officer',
  accounts_staff: 'Accounts Staff',
  sales_staff: 'Sales Staff',
}
const FIELD_LABEL_STYLE = { display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }

export default function EditProfileModal({ onClose }) {
  const { profile, fetchProfile } = useAuth()
  const toast = useToast()

  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [phone, setPhone] = useState(profile?.phone || '')
  const [saving, setSaving] = useState(false)

  async function handleSaveProfile() {
    if (!fullName.trim()) { toast('Full name is required', 'error'); return }
    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('users')
        .update({ full_name: fullName.trim(), phone: phone.trim() || null })
        .eq('id', profile.id)
        .select('id')
      if (error) throw error
      if (!data || data.length === 0) {
        throw new Error('Profile was not updated. Check the Row Level Security UPDATE policy on users for this role.')
      }
      await fetchProfile(profile.id)
      toast('Profile updated', 'success')
    } catch (err) {
      toast(err.message || 'Failed to update profile', 'error')
    }
    setSaving(false)
  }

  return createPortal(
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 16, border: '1px solid var(--bg-border)', width: '100%', maxWidth: 460, maxHeight: '88vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--bg-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}>Edit Profile</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={FIELD_LABEL_STYLE}>Full Name *</label>
            <input className="input-base" value={fullName} onChange={e => setFullName(e.target.value)} />
          </div>

          <div>
            <label style={FIELD_LABEL_STYLE}>Phone</label>
            <input className="input-base" value={phone} onChange={e => setPhone(e.target.value)} />
          </div>

          <div>
            <label style={FIELD_LABEL_STYLE}>Email</label>
            <input className="input-base" value={profile?.email || ''} disabled style={{ opacity: 0.6, cursor: 'not-allowed' }} />
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Contact admin to change email</div>
          </div>

          <div>
            <label style={FIELD_LABEL_STYLE}>Current Role</label>
            <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 500, background: 'rgba(37,99,235,0.15)', color: '#3b82f6', display: 'inline-block' }}>
              {ROLE_LABEL[profile?.role] || profile?.role}
            </span>
          </div>

          <button className="btn-gold" onClick={handleSaveProfile} disabled={saving} style={{ marginTop: 4 }}>
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
