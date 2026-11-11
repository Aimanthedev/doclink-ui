import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from '@/lib/router-compat'
import { statusFromParams } from '../../lib/urlStatus'
import { Search, Wallet, ArrowLeft } from 'lucide-react'
import { useReceipts } from '../../hooks/useReceipts'
import ReceiptDetailDrawer from './ReceiptDetailDrawer'

const STATUSES = ['all', 'draft', 'pending_approval', 'approved', 'rejected']

const RECEIPT_STATUS_BADGE = {
  draft:            'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
  pending_approval: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  approved:         'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  rejected:         'bg-rose-500/15 text-rose-400 border-rose-500/30',
}

function ReceiptStatusBadge({ status }) {
  const cls = RECEIPT_STATUS_BADGE[status] || 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30'
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${cls}`}>
      {status?.replace('_', ' ')}
    </span>
  )
}

function receiptTotal(receipt) {
  return (receipt.receipt_items ?? []).reduce((s, i) => s + Number(i.amount || 0), 0)
}

export default function ReceiptsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeStatus, setActiveStatus] = useState(() => statusFromParams(searchParams, STATUSES))
  const [search, setSearch] = useState('')
  const [selectedReceiptId, setSelectedReceiptId] = useState(null)

  const { data: receipts = [], isLoading } = useReceipts({
    ...(activeStatus !== 'all' ? { status: activeStatus } : {}),
  })
  // Stat tiles reflect the whole receipt set, not whichever tab is active, so
  // they're backed by their own unfiltered fetch rather than reusing `receipts`
  // above (which is scoped to activeStatus) — same pattern as InvoicesPage.
  const { data: allReceipts = [] } = useReceipts()

  useEffect(() => {
    const openId = searchParams.get('open')
    if (openId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedReceiptId(openId)
      setSearchParams({ view: 'receipts' }, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const filtered = receipts.filter(r => {
    if (!search.trim()) return true
    const s = search.toLowerCase()
    return (
      r.receipt_number?.toLowerCase().includes(s) ||
      r.invoice?.invoice_number?.toLowerCase().includes(s) ||
      r.invoice?.client?.company_name?.toLowerCase().includes(s) ||
      r.invoice?.client?.contact_person?.toLowerCase().includes(s)
    )
  })

  const stats = {
    total: allReceipts.length,
    pending: allReceipts.filter(r => r.status === 'pending_approval').length,
    approved: allReceipts.filter(r => r.status === 'approved').length,
    draft: allReceipts.filter(r => r.status === 'draft').length,
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
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
          Receipts
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          Track and issue payment receipts against approved invoices
        </p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total Receipts', value: stats.total, color: 'var(--text-primary)' },
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
              placeholder="Search by receipt number, invoice, or client..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading receipts...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <Wallet size={36} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
            <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>No receipts found</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>
              Receipts are created from approved invoices
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
          <table className="data-table" style={{ minWidth: 750 }}>
            <thead>
              <tr>
                <th>Receipt #</th>
                <th>Invoice #</th>
                <th>Client</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} onClick={() => setSelectedReceiptId(r.id)} style={{ cursor: 'pointer' }}>
                  <td>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#3b82f6' }}>
                      {r.receipt_number}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace' }}>
                    {r.invoice?.invoice_number || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  <td>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: 13 }}>
                      {r.invoice?.client?.company_name || r.invoice?.client?.contact_person || 'Unknown'}
                    </div>
                  </td>
                  <td>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                      QAR {receiptTotal(r).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td><ReceiptStatusBadge status={r.status} /></td>
                  <td style={{ fontSize: 12 }}>{new Date(r.created_at).toLocaleDateString('en-GB')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {selectedReceiptId && (
        <ReceiptDetailDrawer
          receiptId={selectedReceiptId}
          onClose={() => setSelectedReceiptId(null)}
        />
      )}
    </div>
  )
}
