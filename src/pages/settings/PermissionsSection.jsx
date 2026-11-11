import { useState } from 'react'
import { ChevronDown, ChevronRight, ShieldCheck, RotateCcw, AlertTriangle } from 'lucide-react'
import { useAllPermissions, useUpdatePermissions, TAB_PERMISSIONS, FEATURE_PERMISSIONS, DEFAULT_PERMISSIONS } from '../../hooks/usePermissions'
import { useToast } from '../../lib/ToastContext'

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        width: 36, height: 20, borderRadius: 20, border: 'none', cursor: 'pointer', position: 'relative', padding: 0, flexShrink: 0,
        background: checked ? '#2563eb' : 'var(--bg-elevated)', transition: 'background 0.15s',
      }}
    >
      <span style={{
        position: 'absolute', top: 2, left: checked ? 18 : 2, width: 16, height: 16, borderRadius: '50%',
        background: '#ffffff', transition: 'left 0.15s',
      }} />
    </button>
  )
}

function getInitials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return parts.slice(0, 2).map(p => p[0]?.toUpperCase()).join('')
}

function UserPermissionRow({ user }) {
  const toast = useToast()
  const { mutateAsync: updatePermissions } = useUpdatePermissions()
  const [expanded, setExpanded] = useState(false)
  const [local, setLocal] = useState(user.permissions)

  const isSuperAdmin = user.role === 'super_admin'

  async function persist(next) {
    try {
      await updatePermissions({ userId: user.id, ...next })
    } catch (err) {
      toast(err.message || 'Failed to save permissions', 'error')
    }
  }

  function handleToggle(key, value) {
    const next = { ...local, [key]: value }
    setLocal(next)
    persist(next)
  }

  function handleReset() {
    setLocal(DEFAULT_PERMISSIONS)
    persist(DEFAULT_PERMISSIONS)
    toast('Reset to default permissions', 'success')
  }

  return (
    <div style={{ border: '1px solid var(--bg-border)', borderRadius: 10, marginBottom: 10, overflow: 'hidden' }}>
      <div
        onClick={() => !isSuperAdmin && setExpanded(!expanded)}
        style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: isSuperAdmin ? 'default' : 'pointer' }}
      >
        <div style={{
          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, #6366f1, #3b82f6)', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700,
        }}>
          {getInitials(user.full_name)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{user.full_name}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
        </div>
        <span style={{
          fontSize: 10, padding: '3px 9px', borderRadius: 20, fontWeight: 600, textTransform: 'capitalize', flexShrink: 0,
          background: 'var(--accent-gold-dim)', color: 'var(--accent-gold)',
        }}>
          {user.role?.replace('_', ' ')}
        </span>

        {isSuperAdmin ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: '#10b981', flexShrink: 0 }}>
            <ShieldCheck size={14} /> Super Admin — Full Access
          </span>
        ) : (
          <button className="btn-ghost" onClick={(e) => { e.stopPropagation(); setExpanded(!expanded) }} style={{ fontSize: 11, padding: '5px 12px', borderRadius: 8, flexShrink: 0 }}>
            {expanded ? 'Hide' : 'Edit Access'}
          </button>
        )}
      </div>

      {expanded && !isSuperAdmin && (
        <div style={{ padding: '4px 16px 16px', borderTop: '1px solid var(--bg-border)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 12 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 10 }}>Tab Access</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {TAB_PERMISSIONS.map(p => (
                  <div key={p.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{p.label}</span>
                    <Toggle checked={local[p.key] === true} onChange={v => handleToggle(p.key, v)} />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 10 }}>Feature Permissions</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {FEATURE_PERMISSIONS.map(p => (
                  <div key={p.key} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{p.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{p.description}</div>
                    </div>
                    <Toggle checked={local[p.key] === true} onChange={v => handleToggle(p.key, v)} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--bg-border)' }}>
            <button className="btn-ghost" onClick={handleReset} style={{ fontSize: 11, padding: '5px 12px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <RotateCcw size={12} /> Reset to Defaults
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function PermissionsSection() {
  const [expanded, setExpanded] = useState(false)
  const { data: users = [], isLoading, error } = useAllPermissions()

  return (
    <div className="card" style={{ padding: 0, marginBottom: 20, overflow: 'hidden' }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{ padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, background: 'var(--bg-elevated)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ShieldCheck size={16} color="var(--accent-gold)" />
          </div>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>User Access Control</h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Manage what each team member can access and do.</p>
          </div>
        </div>
        {expanded ? <ChevronDown size={18} color="var(--text-muted)" /> : <ChevronRight size={18} color="var(--text-muted)" />}
      </div>

      {expanded && (
        <div style={{ padding: '0 24px 24px' }}>
          <div className="gold-line" style={{ marginBottom: 20 }} />

          {isLoading ? (
            <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading users...</div>
          ) : error ? (
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: 'var(--status-overdue)22', border: '1px solid var(--status-overdue)44', borderRadius: 8, padding: '12px 14px' }}>
              <AlertTriangle size={15} color="var(--status-overdue)" style={{ flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Failed to load users: {error.message}
                <div style={{ marginTop: 4, color: 'var(--text-muted)' }}>Check the browser console for the full query error — this is usually an RLS policy or a relationship-embed issue.</div>
              </div>
            </div>
          ) : users.length === 0 ? (
            <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No users found</div>
          ) : (
            users.map(user => <UserPermissionRow key={user.id} user={user} />)
          )}
        </div>
      )}
    </div>
  )
}
