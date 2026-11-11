import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, Users } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import { useToast } from '../../lib/ToastContext'

const ROLE_OPTIONS = ['super_admin', 'manager', 'pro_officer', 'accounts_staff', 'sales_staff']

const selectStyle = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--bg-border)',
  borderRadius: 6,
  fontSize: 12,
  padding: '4px 8px',
  color: 'var(--text-primary)',
}

function initials(fullName) {
  return (fullName || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0].toUpperCase())
    .join('')
}

function useUsersList() {
  return useQuery({
    queryKey: ['users_list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, role, is_active, created_at')
        .order('created_at', { ascending: true })
      if (error) throw error
      return data ?? []
    },
  })
}

function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, updates }) => {
      const { data, error } = await supabase.from('users').update(updates).eq('id', id).select('id')
      if (error) throw error
      if (!data || data.length === 0) {
        throw new Error('User was not updated. Check the Row Level Security UPDATE policy on users for this role.')
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users_list'] }),
  })
}

export default function UserManagementSection() {
  const { profile } = useAuth()
  const toast = useToast()
  const [expanded, setExpanded] = useState(false)
  const { data: users = [], isLoading } = useUsersList()
  const { mutateAsync: updateUser } = useUpdateUser()

  async function handleRoleChange(user, newRole) {
    try {
      await updateUser({ id: user.id, updates: { role: newRole } })
      toast('Role updated', 'success')
    } catch (err) {
      toast(err.message || 'Failed to update role', 'error')
    }
  }

  async function handleToggleActive(user) {
    if (user.is_active && !window.confirm(`Are you sure you want to deactivate ${user.full_name}?`)) return
    try {
      await updateUser({ id: user.id, updates: { is_active: !user.is_active } })
      toast(user.is_active ? 'User deactivated' : 'User activated', 'success')
    } catch (err) {
      toast(err.message || 'Failed to update status', 'error')
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
            <Users size={16} color="var(--accent-gold)" />
          </div>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>User Management</h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Manage team access and roles</p>
          </div>
        </div>
        {expanded ? <ChevronDown size={18} color="var(--text-muted)" /> : <ChevronRight size={18} color="var(--text-muted)" />}
      </div>

      {expanded && (
        <div style={{ padding: '0 24px 24px' }}>
          <div className="gold-line" style={{ marginBottom: 20 }} />

          {isLoading ? (
            <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading users...</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 52 }}></th>
                  <th>Name & Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => {
                  const isSelf = user.id === profile?.id
                  return (
                    <tr key={user.id}>
                      <td>
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%',
                          background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0,
                        }}>
                          {initials(user.full_name)}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{user.full_name}</span>
                          {isSelf && (
                            <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 10, background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>(you)</span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{user.email}</div>
                      </td>
                      <td>
                        <select
                          value={user.role}
                          disabled={isSelf}
                          onChange={e => handleRoleChange(user, e.target.value)}
                          style={{ ...selectStyle, opacity: isSelf ? 0.5 : 1, cursor: isSelf ? 'not-allowed' : 'pointer' }}
                        >
                          {ROLE_OPTIONS.map(r => (
                            <option key={r} value={r}>{r.replace('_', ' ')}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <span style={{
                          fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 500,
                          background: user.is_active ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                          color: user.is_active ? '#10b981' : '#ef4444',
                        }}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className={user.is_active ? 'btn-danger' : 'btn-ghost'}
                          disabled={isSelf}
                          onClick={() => handleToggleActive(user)}
                          style={{
                            fontSize: 11,
                            padding: '4px 10px',
                            opacity: isSelf ? 0.5 : 1,
                            cursor: isSelf ? 'not-allowed' : 'pointer',
                            ...(!user.is_active ? { color: '#10b981', borderColor: 'rgba(16,185,129,0.3)' } : {}),
                          }}
                        >
                          {user.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
