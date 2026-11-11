import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from '@/lib/router-compat'
import { statusFromParams } from '../../lib/urlStatus'
import { Search, Receipt, ArrowLeft } from 'lucide-react'
import { useInvoices } from '../../hooks/useInvoices'
import InvoiceDetailDrawer from './InvoiceDetailDrawer'

const STATUSES = ['all', 'draft', 'pending_approval', 'approved', 'rejected']

const INVOICE_STATUS_BADGE = {
  draft:            'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
  pending_approval: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  approved:         'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  rejected:         'bg-rose-500/15 text-rose-400 border-rose-500/30',
  paid:             'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  partially_paid:   'bg-blue-500/15 text-blue-400 border-blue-500/30',
  overdue:          'bg-red-500/15 text-red-400 border-red-500/30',
}

function InvoiceStatusBadge({ status }) {
  const cls = INVOICE_STATUS_BADGE[status] || 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30'
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${cls}`}>
      {status?.replace('_', ' ')}
    </span>
  )
}

export default function InvoicesPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeStatus, setActiveStatus] = useState(() => statusFromParams(searchParams, STATUSES))
  const [search, setSearch] = useState('')
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null)

  const { data: invoices = [], isLoading } = useInvoices({
    ...(activeStatus !== 'all' ? { status: activeStatus } : {}),
  })
  // Stat tiles must reflect the whole invoice set, not whichever tab is
  // active, so they're backed by their own unfiltered fetch rather than
  // reusing `invoices` above (which is scoped to activeStatus).
  const { data: allInvoices = [] } = useInvoices()

  // Deep-link from global search: /quotations?view=invoices&open=INVOICE_ID
  // opens the invoice drawer. Cleared after so a refresh doesn't re-trigger it;
  // `view` is kept so a refresh still lands back on this sub-view instead of
  // the landing cards.
  useEffect(() => {
    const openId = searchParams.get('open')
    if (openId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedInvoiceId(openId)
      setSearchParams({ view: 'invoices' }, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const filtered = invoices.filter(inv => {
    if (!search.trim()) return true
    const s = search.toLowerCase()
    return (
      inv.invoice_number?.toLowerCase().includes(s) ||
      inv.client?.company_name?.toLowerCase().includes(s) ||
      inv.client?.contact_person?.toLowerCase().includes(s) ||
      inv.bill_to_name?.toLowerCase().includes(s)
    )
  })

  const stats = {
    total: allInvoices.length,
    pending: allInvoices.filter(i => i.status === 'pending_approval').length,
    approved: allInvoices.filter(i => i.status === 'approved').length,
    draft: allInvoices.filter(i => i.status === 'draft').length,
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
      <div className="page-header" style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: 30, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
          Invoices
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          View and manage invoices generated from approved quotations
        </p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total Invoices', value: stats.total, color: 'var(--text-primary)' },
          { label: 'Pending Approval', value: stats.pending, color: 'var(--status-pending)' },
          { label: 'Approved', value: stats.approved, color: 'var(--status-active)' },
          { label: 'Drafts', value: stats.draft, color: 'var(--text-secondary)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color, fontFamily: 'Inter, system-ui, sans-serif' }}>{s.value}</div>
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
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ position: 'relative', maxWidth: 360, flex: 1, minWidth: 220 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="input-base"
              style={{ paddingLeft: 36 }}
              placeholder="Search by invoice number or client..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading invoices...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <Receipt size={36} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
            <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>No invoices found</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>
              Invoices are created by converting approved quotations
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
          <table className="data-table" style={{ minWidth: 750 }}>
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Client</th>
                <th>Subject</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(inv => (
                <tr key={inv.id} onClick={() => setSelectedInvoiceId(inv.id)} style={{ cursor: 'pointer' }}>
                  <td>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#3b82f6' }}>
                      {inv.invoice_number}
                    </span>
                  </td>
                  <td>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: 13 }}>
                      {inv.client?.company_name || inv.client?.contact_person || 'Unknown'}
                    </div>
                    {inv.bill_to_name && inv.bill_to_name !== (inv.client?.company_name || inv.client?.contact_person) && (
                      <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 1 }}>
                        Billed as: {inv.bill_to_name}
                      </div>
                    )}
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {inv.subject || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  <td>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                      QAR {Number(inv.total_amount ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td><InvoiceStatusBadge status={inv.status} /></td>
                  <td style={{ fontSize: 12 }}>{new Date(inv.created_at).toLocaleDateString('en-GB')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {selectedInvoiceId && (
        <InvoiceDetailDrawer
          invoiceId={selectedInvoiceId}
          onClose={() => setSelectedInvoiceId(null)}
        />
      )}
    </div>
  )
}
