import { useState } from 'react'
import { useNavigate } from '@/lib/router-compat'
import { Plus, Search, FileSignature, ArrowLeft } from 'lucide-react'
import { MOCK_QUOTATIONS } from './mockData'
import TestQuotationDrawer from './TestQuotationDrawer'
import TestQuotationPreview from './TestQuotationPreview'

// Visual clone of QuotationsPage backed only by hardcoded mock data.
// No Supabase, no data hooks, no auth/permission/toast contexts.
// Only local, visual state: status tab, search box, scope toggle, and
// opening/closing the drawer and preview. Every action button is a no-op.

const noop = () => {}

const STATUSES = ['all', 'draft', 'pending_approval', 'approved', 'rejected', 'converted', 'expired', 'superseded']
const STATUS_LABELS = { converted: 'Invoiced' }

function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{status?.replace('_', ' ')}</span>
}

export default function TestQuotationsPage() {
  const navigate = useNavigate()
  const [activeStatus, setActiveStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [scopeFilter, setScopeFilter] = useState('all')
  const [selected, setSelected] = useState(null)
  const [previewQuotation, setPreviewQuotation] = useState(null)

  const filtered = MOCK_QUOTATIONS.filter(q => {
    if (activeStatus !== 'all' && q.status !== activeStatus) return false
    if (!search.trim()) return true
    const s = search.toLowerCase()
    return (
      q.quotation_number.toLowerCase().includes(s) ||
      q.client_name_snapshot.toLowerCase().includes(s) ||
      q.client_contact_snapshot.toLowerCase().includes(s)
    )
  })

  const stats = {
    total: MOCK_QUOTATIONS.length,
    pending: MOCK_QUOTATIONS.filter(q => q.status === 'pending_approval').length,
    approved: MOCK_QUOTATIONS.filter(q => q.status === 'approved').length,
    draft: MOCK_QUOTATIONS.filter(q => q.status === 'draft').length,
  }

  return (
    <div>
      <button
        onClick={() => navigate('/quotations')}
        className="back-nav-link"
        style={{ marginBottom: 12, marginLeft: -14 }}
      >
        <ArrowLeft size={16} /> Quotations
      </button>

      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
            Quotations
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Create, manage, and approve service quotations for clients
          </p>
        </div>
        <button className="btn-gold" onClick={noop} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Plus size={15} /> New Quotation
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total Quotations', value: stats.total, color: 'var(--text-primary)' },
          { label: 'Pending Approval', value: stats.pending, color: 'var(--status-pending)' },
          { label: 'Approved', value: stats.approved, color: 'var(--status-active)' },
          { label: 'Drafts', value: stats.draft, color: 'var(--text-secondary)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color, fontFamily: 'var(--font-display)' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters + Search */}
      <div className="card" style={{ marginBottom: 16, overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--bg-border)', padding: '0 16px', overflowX: 'auto' }}>
          {STATUSES.map(s => (
            <button
              key={s}
              onClick={() => setActiveStatus(s)}
              style={{
                padding: '12px 16px',
                background: 'none',
                border: 'none',
                borderBottom: activeStatus === s ? '2px solid var(--accent-gold)' : '2px solid transparent',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: activeStatus === s ? 600 : 400,
                color: activeStatus === s ? 'var(--accent-gold)' : 'var(--text-muted)',
                textTransform: 'capitalize',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s',
              }}
            >
              {STATUS_LABELS[s] || s.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ position: 'relative', maxWidth: 360, flex: 1, minWidth: 220 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="input-base"
              style={{ paddingLeft: 36 }}
              placeholder="Search by quotation number or client..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div style={{ display: 'inline-flex', background: 'var(--bg-elevated)', borderRadius: 8, padding: 3, gap: 2 }}>
            {[{ key: 'all', label: 'All Quotations' }, { key: 'mine', label: 'My Quotations' }].map(v => (
              <button
                key={v.key}
                onClick={() => setScopeFilter(v.key)}
                style={{
                  padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
                  background: scopeFilter === v.key ? 'var(--accent-gold-dim)' : 'transparent',
                  color: scopeFilter === v.key ? 'var(--accent-gold)' : 'var(--text-muted)',
                  transition: 'all 0.15s',
                }}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-art"><FileSignature size={34} /></div>
            <div className="empty-state-title">No quotations found</div>
            <div className="empty-state-text">Create your first quotation using the button above</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
            <table className="data-table" style={{ minWidth: 750 }}>
              <thead>
                <tr>
                  <th>Quotation #</th>
                  <th>Client</th>
                  <th>Services</th>
                  <th>Total (QAR)</th>
                  <th>Valid Until</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(q => (
                  <tr key={q.id} onClick={() => setSelected(q)} style={{ cursor: 'pointer' }}>
                    <td>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--accent-gold)' }}>
                        {q.quotation_number}
                      </span>
                    </td>
                    <td>
                      <div style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: 13 }}>{q.client_name_snapshot}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{q.client_contact_snapshot}</div>
                    </td>
                    <td style={{ fontSize: 12 }}>
                      {q.quotation_items.length} item{q.quotation_items.length !== 1 ? 's' : ''}
                    </td>
                    <td>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                        {Number(q.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td style={{ fontSize: 12 }}>{new Date(q.valid_until).toLocaleDateString('en-GB')}</td>
                    <td><StatusBadge status={q.status} /></td>
                    <td style={{ fontSize: 12 }}>{new Date(q.created_at).toLocaleDateString('en-GB')}</td>
                    <td onClick={e => e.stopPropagation()}>
                      {(q.status === 'draft' || q.status === 'pending_approval') && (
                        <button className="btn-ghost" onClick={noop} style={{ fontSize: 12, color: '#ef4444' }}>
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && !previewQuotation && (
        <TestQuotationDrawer
          quotation={selected}
          onClose={() => setSelected(null)}
          onPreview={q => setPreviewQuotation(q)}
        />
      )}

      {previewQuotation && (
        <TestQuotationPreview
          quotation={previewQuotation}
          onClose={() => setPreviewQuotation(null)}
        />
      )}
    </div>
  )
}
