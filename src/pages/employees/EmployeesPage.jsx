import { useState } from 'react'
import { Plus, X, Phone, Mail, MessageCircle, Briefcase, Edit2, Save } from 'lucide-react'
import { useEmployees, useUpdateEmployee } from '../../hooks/useEmployees'
import { useCases } from '../../hooks/useCases'
import { useToast } from '../../lib/ToastContext'
import { useAuth } from '../../lib/AuthContext'
import { usePermissionsContext } from '../../contexts/PermissionsContext'
import AddEmployeeModal from './AddEmployeeModal'
import { canAddEmployees, canSeeAllLeadStats } from './employeeRoles'

const ROLE_LABEL = {
  super_admin: 'Super Admin',
  manager: 'Manager',
  pro_officer: 'PRO Officer',
  accounts_staff: 'Accounts Staff',
  sales_staff: 'Sales Staff',
}
const ROLE_COLOR = {
  super_admin: '#c9a84c',
  manager: '#60a5fa',
  pro_officer: '#3ecf8e',
  accounts_staff: '#a78bfa',
  sales_staff: '#f59e0b',
}
const ROLES = Object.entries(ROLE_LABEL).map(([value, label]) => ({ value, label }))

function formatCompact(value) {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value) || 0)
}

// Role-specific card stats shown on each employee's card. Lead-based tiles show "—"
// for viewers who can't see every lead (the numbers would be misleading zeros).
function getCardStats(e, showLeadStats = true) {
  const leadValue = v => (showLeadStats ? v : '—')
  switch (e.role) {
    case 'sales_staff':
      return {
        stats: [
          { label: 'Leads', value: leadValue(e.leadsAssigned) },
          { label: 'Won', value: leadValue(e.leadsWon) },
          { label: 'Pipeline Value', value: leadValue(formatCompact(e.pipelineValue)), color: '#10b981' },
        ],
      }
    case 'accounts_staff':
      return {
        stats: [
          { label: 'Invoices', value: e.invoicesHandled },
          { label: 'Value', value: formatCompact(e.invoicesValue), color: '#10b981' },
          { label: 'Pending', value: e.pendingApprovals },
        ],
      }
    case 'manager':
    case 'super_admin':
      return {
        stats: [
          { label: 'Cases', value: e.teamCases },
          { label: 'Leads', value: leadValue(e.teamLeads) },
          { label: 'Staff', value: e.staffCount },
        ],
      }
    case 'pro_officer':
    default:
      return {
        stats: [
          { label: 'Cases', value: e.casesAssigned },
          { label: 'Done', value: e.casesCompleted },
          { label: 'On-time', value: e.proOnTimeRate !== null ? `${e.proOnTimeRate}%` : '-', color: '#10b981' },
        ],
      }
  }
}

function EmployeeDrawer({ employee, onClose }) {
  const toast = useToast()
  const { data: cases = [] } = useCases({ assigned_to: employee.id })
  const { mutateAsync: updateEmployee, isPending } = useUpdateEmployee()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    full_name: employee.full_name || '',
    phone: employee.phone || '',
    whatsapp: employee.whatsapp || '',
    role: employee.role,
    employee_code: employee.employee_code || '',
    department: employee.department || '',
    position: employee.position || '',
    is_active: employee.is_active,
  })
  const set = (f, v) => setForm(p => ({ ...p, [f]: v }))

  async function handleSave() {
    try {
      await updateEmployee({ id: employee.id, employeeProfileId: employee.employeeProfileId, ...form })
      toast('Employee updated', 'success')
      setEditing(false)
    } catch (err) { toast(err.message || 'Failed to update', 'error') }
  }

  async function toggleActive() {
    const newStatus = !form.is_active
    try {
      await updateEmployee({ id: employee.id, employeeProfileId: employee.employeeProfileId, ...form, is_active: newStatus })
      set('is_active', newStatus)
      toast(newStatus ? 'Employee reactivated' : 'Employee deactivated', 'success')
    } catch (err) { toast(err.message || 'Failed to update status', 'error') }
  }

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer-panel">
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--bg-border)', position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>{employee.full_name}</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: `${ROLE_COLOR[employee.role]}22`, color: ROLE_COLOR[employee.role], fontWeight: 500 }}>
                  {ROLE_LABEL[employee.role] || employee.role}
                </span>
                <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: form.is_active ? '#3ecf8e22' : '#9896a422', color: form.is_active ? '#3ecf8e' : '#9896a4', fontWeight: 500, cursor: 'pointer' }} onClick={toggleActive}>
                  {form.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setEditing(!editing)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: editing ? 'var(--accent-gold)' : 'var(--text-muted)' }}><Edit2 size={16} /></button>
              <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>
          </div>
          {!editing && (
            <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
              {employee.email && <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-muted)' }}><Mail size={12} />{employee.email}</div>}
              {employee.phone && <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-muted)' }}><Phone size={12} />{employee.phone}</div>}
              {employee.whatsapp && <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-muted)' }}><MessageCircle size={12} />{employee.whatsapp}</div>}
            </div>
          )}
        </div>

        <div style={{ padding: 24 }}>
          {editing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Full Name</label>
                  <input className="input-base" value={form.full_name} onChange={e => set('full_name', e.target.value)} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Role</label>
                  <select className="input-base" value={form.role} onChange={e => set('role', e.target.value)}>
                    {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Phone</label>
                  <input className="input-base" value={form.phone} onChange={e => set('phone', e.target.value)} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>WhatsApp</label>
                  <input className="input-base" value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Employee Code</label>
                  <input className="input-base" value={form.employee_code} onChange={e => set('employee_code', e.target.value)} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Department</label>
                  <input className="input-base" value={form.department} onChange={e => set('department', e.target.value)} />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Position</label>
                  <input className="input-base" value={form.position} onChange={e => set('position', e.target.value)} />
                </div>
              </div>
              <button className="btn-gold" onClick={handleSave} disabled={isPending} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Save size={14} /> {isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          ) : (
            <>
              {(employee.department || employee.position || employee.employee_code) && (
                <div className="card" style={{ padding: 16, marginBottom: 20 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {employee.position && (
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>Position</div>
                        <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{employee.position}</div>
                      </div>
                    )}
                    {employee.department && (
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>Department</div>
                        <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{employee.department}</div>
                      </div>
                    )}
                    {employee.employee_code && (
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>Employee Code</div>
                        <div style={{ fontSize: 13, color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace' }}>{employee.employee_code}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
                {[
                  { label: 'Active Cases', value: employee.activeCases, color: 'var(--status-active)' },
                  { label: 'Completed', value: employee.completedCases, color: 'var(--text-primary)' },
                  { label: 'Overdue', value: employee.overdueCases, color: 'var(--status-overdue)' },
                ].map(s => (
                  <div key={s.label} className="card" style={{ padding: '14px 16px', textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: s.color, fontFamily: 'Inter, system-ui, sans-serif', marginBottom: 4 }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {employee.onTimeRate !== null && (
                <div className="card" style={{ padding: 16, marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>On-Time Completion Rate</span>
                    <span style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 600 }}>{employee.onTimeRate}%</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--bg-elevated)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${employee.onTimeRate}%`, background: employee.onTimeRate >= 80 ? 'var(--status-active)' : employee.onTimeRate >= 50 ? 'var(--status-pending)' : 'var(--status-overdue)', borderRadius: 4 }} />
                  </div>
                </div>
              )}

              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 12 }}>Assigned Cases</div>
              {cases.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: 13 }}>No cases assigned</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {cases.map(c => (
                    <div key={c.id} className="card" style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{c.title}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{c.client?.company_name || c.client?.contact_person}</div>
                        </div>
                        <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, background: 'var(--bg-elevated)', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{c.status?.replace('_', ' ')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}

function getInitials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return parts.slice(0, 2).map(p => p[0]?.toUpperCase()).join('')
}

function ActionLink({ href, icon: Icon, label, external }) {
  const disabled = !href
  return (
    <a
      href={href || undefined}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      onClick={ev => ev.stopPropagation()}
      style={{
        flex: 1, background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', borderRadius: 8,
        padding: 8, fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        textDecoration: 'none', cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? 'none' : 'auto',
      }}
    >
      <Icon size={14} /> {label}
    </a>
  )
}

export default function EmployeesPage() {
  const { profile } = useAuth()
  const { can } = usePermissionsContext()
  const [showInactive, setShowInactive] = useState(false)
  const { data: employees = [], isLoading } = useEmployees(showInactive)
  const [selected, setSelected] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const showLeadStats = canSeeAllLeadStats(profile?.role, can)

  const activeEmployees = employees.filter(e => e.is_active)

  const totalActive = activeEmployees.reduce((s, e) => s + e.activeCases, 0)
  const totalCompleted = activeEmployees.reduce((s, e) => s + e.completedCases, 0)
  const avgOnTime = activeEmployees.filter(e => e.onTimeRate !== null)
  const avgRate = avgOnTime.length > 0 ? Math.round(avgOnTime.reduce((s, e) => s + e.onTimeRate, 0) / avgOnTime.length) : null

  const kpis = [
    { label: 'Team Members', value: activeEmployees.length, color: 'var(--text-primary)' },
    { label: 'Active Workload', value: totalActive, color: '#3b82f6' },
    { label: 'Completed Cases', value: totalCompleted, color: '#10b981' },
    { label: 'Avg On-Time Rate', value: avgRate !== null ? `${avgRate}%` : '—', color: '#10b981' },
  ]

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Employees</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Team workload, performance, and availability</p>
        </div>
        {canAddEmployees(profile?.role) && (
          <button className="btn-gold" onClick={() => setShowAdd(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, borderRadius: 10 }}>
            <Plus size={15} /> Add Employee
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 24 }}>
        {kpis.map(s => (
          <div key={s.label} style={{ background: 'var(--bg-card)', borderRadius: 10, padding: '16px 18px' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer' }}>
          <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
          Show inactive employees
        </label>
      </div>

      {isLoading ? (
        <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading team...</div>
      ) : employees.length === 0 ? (
        <div className="card" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <Briefcase size={36} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
          <div style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 4 }}>No team members yet</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{canAddEmployees(profile?.role) ? 'Add your first employee using the button above' : 'No staff profiles to show yet'}</div>
        </div>
      ) : (
        <div className="employee-grid">
          {employees.map(e => {
            const { stats } = getCardStats(e, showLeadStats)
            return (
              <div
                key={e.id}
                onClick={() => setSelected(e)}
                style={{
                  background: 'var(--bg-card)', border: '1px solid var(--bg-border)', borderRadius: 14, padding: 20,
                  cursor: 'pointer', transition: 'all 0.2s', opacity: e.is_active ? 1 : 0.4,
                }}
                onMouseEnter={ev => { ev.currentTarget.style.borderColor = 'var(--bg-border-hover)'; ev.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={ev => { ev.currentTarget.style.borderColor = 'var(--bg-border)'; ev.currentTarget.style.transform = 'translateY(0)' }}
              >
                {/* Top row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                    <div style={{
                      width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
                      background: `${ROLE_COLOR[e.role]}33`, color: ROLE_COLOR[e.role],
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18, fontWeight: 700, fontFamily: 'Inter, system-ui, sans-serif',
                    }}>
                      {getInitials(e.full_name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{e.full_name}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{e.position || ROLE_LABEL[e.role] || e.role}</div>
                    </div>
                  </div>
                </div>

                {/* Stats row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderTop: '1px solid var(--bg-border)', paddingTop: 14, marginBottom: 14 }}>
                  {stats.map(s => (
                    <div key={s.label} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 4 }}>{s.label}</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: s.color || 'var(--text-primary)' }}>{s.value}</div>
                    </div>
                  ))}
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <ActionLink
                    href={(e.phone || e.whatsapp) ? `tel:${e.phone || e.whatsapp}` : null}
                    icon={Phone}
                    label="Call"
                  />
                  <ActionLink
                    href={e.email ? `mailto:${e.email}` : null}
                    icon={Mail}
                    label="Email"
                  />
                  <ActionLink
                    href={(e.whatsapp || e.phone) ? `https://wa.me/${(e.whatsapp || e.phone || '').replace(/[^0-9]/g, '')}` : null}
                    icon={MessageCircle}
                    label="Chat"
                    external
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {selected && <EmployeeDrawer employee={selected} onClose={() => setSelected(null)} />}
      {showAdd && <AddEmployeeModal onClose={() => setShowAdd(false)} />}
    </div>
  )
}