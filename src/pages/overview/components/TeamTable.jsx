import { formatNumber, formatQar } from '../../../lib/qatarTime'
import { ROLE_LABELS } from '../overviewLabels'
import { EmptyNote } from './OverviewUI'

// Employees are only compared using metrics that fit their role, so each role
// group defines its own columns (and omits ones that don't apply).
const num = v => (v == null ? '—' : formatNumber(v))
const overdue = v => (
  <span style={{ color: v > 0 ? '#ef4444' : undefined, fontWeight: v > 0 ? 600 : undefined }}>{num(v)}</span>
)

const GROUPS = [
  {
    role: 'sales_staff', title: 'Sales team',
    cols: [
      { h: 'Active leads', r: x => num(x.active) },
      { h: 'Overdue follow-ups', r: x => overdue(x.overdue) },
      { h: 'Won this month', r: x => num(x.completed) },
      { h: 'Won value this month', r: x => formatQar(x.indicator_value) },
    ],
  },
  {
    role: 'pro_officer', title: 'PRO officers',
    cols: [
      { h: 'Active cases', r: x => num(x.active) },
      { h: 'Overdue cases', r: x => overdue(x.overdue) },
      { h: 'Completed this month', r: x => num(x.completed) },
      { h: 'On-time completion', r: x => (x.indicator_value == null ? '—' : `${x.indicator_value}%`) },
    ],
  },
  {
    role: 'accounts_staff', title: 'Accounts team',
    cols: [
      { h: 'Drafts & pending approval', r: x => num(x.active) },
      { h: 'Approved this month', r: x => num(x.completed) },
    ],
  },
]

export default function TeamTable({ rows }) {
  if (!rows || rows.length === 0) return <EmptyNote>No active team members found.</EmptyNote>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {GROUPS.map(g => {
        const group = rows.filter(r => r.role === g.role)
        if (group.length === 0) return null
        return (
          <div key={g.role} style={{ overflowX: 'auto' }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 6 }}>{g.title}</div>
            <table className="data-table" style={{ minWidth: 520 }}>
              <thead>
                <tr>
                  <th>Employee</th>
                  {g.cols.map(c => <th key={c.h} style={{ textAlign: 'right' }}>{c.h}</th>)}
                </tr>
              </thead>
              <tbody>
                {group.map(row => (
                  <tr key={row.id}>
                    <td>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{row.full_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{ROLE_LABELS[row.role]}</div>
                    </td>
                    {g.cols.map(c => <td key={c.h} style={{ textAlign: 'right' }}>{c.r(row)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      })}
    </div>
  )
}
