import { useState } from 'react'
import { X, Copy, Check, KeyRound } from 'lucide-react'
import { useCreateEmployee } from '../../hooks/useEmployees'
import { useAuth } from '../../lib/AuthContext'
import { useToast } from '../../lib/ToastContext'
import { rolesCreatableBy } from './employeeRoles'

const labelStyle = { display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }

export default function AddEmployeeModal({ onClose }) {
  const toast = useToast()
  const { profile } = useAuth()
  const { mutateAsync: createEmployee, isPending } = useCreateEmployee()
  const roles = rolesCreatableBy(profile?.role)

  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', role: roles[roles.length - 1]?.value || 'sales_staff',
    employee_code: '', department: '', position: '', whatsapp: '',
  })
  const set = (f, v) => setForm(p => ({ ...p, [f]: v }))
  // Held only in this component's state while the dialog is open, never cached.
  const [created, setCreated] = useState(null)
  const [copied, setCopied] = useState(false)

  async function handleSubmit() {
    if (!form.full_name.trim() || !form.email.trim()) { toast('Name and email are required', 'error'); return }
    try {
      const result = await createEmployee(form)
      setCreated({ email: result.email, password: result.temp_password })
    } catch (err) {
      toast(err.message || 'Failed to add employee', 'error')
    }
  }

  async function copyPassword() {
    try {
      await navigator.clipboard.writeText(created.password)
      setCopied(true)
    } catch {
      toast('Could not copy. Select the password and copy it manually.', 'error')
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && !created && onClose()}>
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 16, border: '1px solid var(--bg-border)', width: '100%', maxWidth: 560, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--bg-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: 22, fontWeight: 600, color: 'var(--text-primary)' }}>
            {created ? 'Employee added' : 'Add Employee'}
          </h2>
          {!created && (
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
          )}
        </div>

        {created ? (
          <div style={{ padding: 24 }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
              The login for <strong style={{ color: 'var(--text-primary)' }}>{created.email}</strong> is ready.
            </div>
            <div style={{ background: 'var(--accent-gold-dim)', border: '1px solid var(--accent-gold)44', borderRadius: 10, padding: 16 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 10 }}>
                <KeyRound size={15} color="var(--accent-gold)" /> Temporary password: shown only once
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <code style={{ flex: 1, fontFamily: 'JetBrains Mono, monospace', fontSize: 16, letterSpacing: '0.05em', color: 'var(--text-primary)', background: 'var(--bg-elevated)', padding: '10px 12px', borderRadius: 8, userSelect: 'all' }}>
                  {created.password}
                </code>
                <button className="btn-ghost" onClick={copyPassword} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                  {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
                </button>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 10, lineHeight: 1.6 }}>
                Give it to them securely (not by group chat). It can't be viewed again after you close this window. They should sign in and change it right away.
              </div>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 18 }}>
              This creates their login and staff profile in one step. You'll get a one-time temporary password to give them.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={labelStyle}>Full Name *</label>
                <input className="input-base" placeholder="Full name" value={form.full_name} onChange={e => set('full_name', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Email *</label>
                <input className="input-base" type="email" placeholder="name@example.com" value={form.email} onChange={e => set('email', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Role</label>
                <select className="input-base" value={form.role} onChange={e => set('role', e.target.value)}>
                  {roles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Phone</label>
                <input className="input-base" placeholder="+974 XXXX XXXX" value={form.phone} onChange={e => set('phone', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>WhatsApp</label>
                <input className="input-base" placeholder="+974 XXXX XXXX" value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Employee Code</label>
                <input className="input-base" placeholder="e.g. EMP-001" value={form.employee_code} onChange={e => set('employee_code', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Department</label>
                <input className="input-base" placeholder="e.g. PRO Services" value={form.department} onChange={e => set('department', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Position</label>
                <input className="input-base" placeholder="e.g. Senior PRO Officer" value={form.position} onChange={e => set('position', e.target.value)} />
              </div>
            </div>
          </div>
        )}

        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--bg-border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          {created ? (
            <button className="btn-gold" onClick={onClose}>Done</button>
          ) : (
            <>
              <button className="btn-ghost" onClick={onClose}>Cancel</button>
              <button className="btn-gold" onClick={handleSubmit} disabled={isPending || roles.length === 0}>{isPending ? 'Adding...' : 'Add Employee'}</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
