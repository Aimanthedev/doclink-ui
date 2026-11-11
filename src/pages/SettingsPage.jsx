import { useState, useRef } from 'react'
import { Upload, Trash2, User } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { useToast } from '../lib/ToastContext'
import ServiceLibrarySection from './settings/ServiceLibrarySection'
import QuotationTemplateSection from './settings/QuotationTemplateSection'
import InvoiceTemplateSection from './settings/InvoiceTemplateSection'
import ReceiptTemplateSection from './settings/ReceiptTemplateSection'
import QuotationPresetSection from './settings/QuotationPresetSection'
import CompanyProfileSection from './settings/CompanyProfileSection'
import NotificationPreferencesSection from './settings/NotificationPreferencesSection'
import UserManagementSection from './settings/UserManagementSection'
import PermissionsSection from './settings/PermissionsSection'
import AuditTrailSection from './settings/AuditTrailSection'

export default function SettingsPage() {
  const { profile, fetchProfile } = useAuth()
  const toast = useToast()
  const fileInputRef = useRef()

  const [signatureUrl, setSignatureUrl] = useState(profile?.signature_url || null)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(null)

  const isAdmin = ['super_admin', 'manager'].includes(profile?.role)

  async function handleSignatureUpload(e) {
    const file = e.target.files[0]
    if (!file) return

    // Validate
    if (!file.type.startsWith('image/')) { toast('Please upload an image file (PNG recommended)', 'error'); return }
    if (file.size > 2 * 1024 * 1024) { toast('Signature image must be under 2MB', 'error'); return }

    // Show local preview immediately
    const reader = new FileReader()
    reader.onload = (ev) => setPreview(ev.target.result)
    reader.readAsDataURL(file)

    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const fileName = `signatures/${profile.id}_${Date.now()}.${ext}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('signatures')
        .upload(fileName, file, { upsert: true, contentType: file.type })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('signatures')
        .getPublicUrl(fileName)

      // Save to users table
      const { error: updateError } = await supabase
        .from('users')
        .update({ signature_url: publicUrl })
        .eq('id', profile.id)

      if (updateError) throw updateError

      setSignatureUrl(publicUrl)
      await fetchProfile(profile.id)
      toast('Signature saved successfully', 'success')
    } catch (err) {
      toast(err.message || 'Upload failed', 'error')
      setPreview(null)
    } finally {
      setUploading(false)
    }
  }

  async function handleRemoveSignature() {
    try {
      const { data, error } = await supabase.from('users').update({ signature_url: null }).eq('id', profile.id).select('id')
      if (error) throw error
      if (!data || data.length === 0) {
        throw new Error('Signature was not removed. Check the Row Level Security UPDATE policy on users for this role.')
      }
      setSignatureUrl(null)
      setPreview(null)
      toast('Signature removed', 'info')
    } catch (err) { toast(err.message || 'Failed to remove signature', 'error') }
  }

  const displayUrl = preview || signatureUrl

  return (
    <div style={{ maxWidth: 960 }}>
      {/* Page Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: 30, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
          Settings
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Manage your account and system preferences</p>
      </div>

      {/* Profile Card */}
      <div className="card" style={{ padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ width: 40, height: 40, background: 'var(--accent-gold-dim)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={18} color="var(--accent-gold)" />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{profile?.full_name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{profile?.role?.replace('_', ' ')} · {profile?.email}</div>
          </div>
        </div>
        <div className="gold-line" />
      </div>

      {/* Signature Section — admin/manager only */}
      {isAdmin && (
        <div className="card" style={{ padding: 24, marginBottom: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>E-Signature</h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>
            This signature will be automatically embedded into quotation documents when you approve them.
            Upload a PNG with transparent background for best results.
          </p>

          {displayUrl ? (
            <div>
              {/* Signature preview */}
              <div style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--bg-border)',
                borderRadius: 10,
                padding: 24,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                marginBottom: 16,
                minHeight: 120,
              }}>
                <img
                  src={displayUrl}
                  alt="Your signature"
                  style={{ maxHeight: 100, maxWidth: 300, objectFit: 'contain' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  className="btn-ghost"
                  onClick={() => fileInputRef.current.click()}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}
                  disabled={uploading}
                >
                  <Upload size={13} /> Replace Signature
                </button>
                <button
                  className="btn-danger"
                  onClick={handleRemoveSignature}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}
                >
                  <Trash2 size={13} /> Remove
                </button>
              </div>

              {uploading && (
                <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)' }}>Uploading...</div>
              )}
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current.click()}
              style={{
                border: '2px dashed var(--bg-border)',
                borderRadius: 10,
                padding: '40px 24px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-gold)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--bg-border)'}
            >
              <Upload size={28} style={{ color: 'var(--text-muted)', marginBottom: 10 }} />
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>Click to upload signature</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>PNG with transparent background recommended · Max 2MB</div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleSignatureUpload}
          />
        </div>
      )}

      {/* Service Library — admin/manager only */}
      {isAdmin && <ServiceLibrarySection />}

      {/* Quotation Templates — admin/manager only */}
      {isAdmin && <QuotationTemplateSection />}

      {/* Invoice Templates — admin/manager only */}
      {isAdmin && <InvoiceTemplateSection />}

      {/* Receipt Templates — admin/manager only */}
      {isAdmin && <ReceiptTemplateSection />}

      {/* Quotation Presets — admin/manager only */}
      {isAdmin && <QuotationPresetSection />}

      {/* Company Profile — admin/manager only */}
      {isAdmin && <CompanyProfileSection />}

      {/* Notification Preferences — all authenticated users */}
      <NotificationPreferencesSection />

      {/* User Management — super_admin only */}
      {profile?.role === 'super_admin' && <UserManagementSection />}

      {/* User Access Control (RBAC) — super_admin only */}
      {profile?.role === 'super_admin' && <PermissionsSection />}

      {/* Audit Trail — super_admin only */}
      {profile?.role === 'super_admin' && <AuditTrailSection />}
    </div>
  )
}