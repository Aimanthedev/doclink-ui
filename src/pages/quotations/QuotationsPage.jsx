import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from '@/lib/router-compat'
import { statusFromParams } from '../../lib/urlStatus'
import { Plus, Search, FileSignature, ArrowLeft } from 'lucide-react'
import { useQuotations, useApproveQuotation, useDeleteQuotation } from '../../hooks/useQuotations'
import { useAuth } from '../../lib/AuthContext'
import { useToast } from '../../lib/ToastContext'
import NewQuotationModal from './NewQuotationModal'
import NewFormationQuotationModal from './NewFormationQuotationModal'
import QuotationTypeSelector from './QuotationTypeSelector'
import QuotationDetailDrawer from './QuotationDetailDrawer'
import QuotationPreviewModal from './QuotationPreviewModal'
import DeleteQuotationDialog from './DeleteQuotationDialog'
import { usePermissionsContext } from '../../contexts/PermissionsContext'

const DELETABLE_STATUSES = ['draft', 'pending_approval']

const STATUSES = ['all', 'draft', 'pending_approval', 'approved', 'rejected', 'converted', 'expired', 'superseded']
const STATUS_LABELS = { converted: 'Invoiced' }

function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{status?.replace('_', ' ')}</span>
}

export default function QuotationsPage() {
  const { profile } = useAuth()
  const toast = useToast()
  const { can } = usePermissionsContext()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeStatus, setActiveStatus] = useState(() => statusFromParams(searchParams, STATUSES))
  const [search, setSearch] = useState('')
  // super_admin/manager default to seeing everyone's quotations; everyone else
  // defaults to their own — but the toggle is available to all roles.
  const [scopeFilter, setScopeFilter] = useState(() =>
    ['super_admin', 'manager'].includes(profile?.role) ? 'all' : 'mine'
  )
  const [creationStep, setCreationStep] = useState(null) // null | 'type' | 'standard'
  const [selectedId, setSelectedId] = useState(null)
  const [previewQuotation, setPreviewQuotation] = useState(null)

  const { data: quotations = [], isLoading } = useQuotations({
    ...(activeStatus !== 'all' ? { status: activeStatus } : {}),
    ...(scopeFilter === 'mine' ? { createdBy: profile?.id } : {}),
  })
  // Stat tiles must reflect the whole quotation set, not whichever tab is
  // active, so they're backed by their own unfiltered fetch rather than
  // reusing `quotations` above (which is scoped to activeStatus).
  const { data: allQuotations = [] } = useQuotations({
    ...(scopeFilter === 'mine' ? { createdBy: profile?.id } : {}),
  })
  const { mutateAsync: approve, isPending: approving } = useApproveQuotation()
  const { mutateAsync: deleteQuotation, isPending: deleting } = useDeleteQuotation()
  const [deleteTarget, setDeleteTarget] = useState(null)

  // Deep-link from global search: /quotations?view=quotations&open=QUOTATION_ID
  // opens the quotation drawer. Cleared after so a refresh doesn't re-trigger
  // it; `view` is kept so a refresh still lands back on this sub-view instead
  // of the landing cards. Depends on searchParams (not just mount) so
  // re-searching for a different record while already on this page still
  // opens the new drawer.
  useEffect(() => {
    const openId = searchParams.get('open')
    if (openId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedId(openId)
      setSearchParams({ view: 'quotations' }, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const filtered = quotations.filter(q => {
    if (!search.trim()) return true
    const s = search.toLowerCase()
    return (
      q.quotation_number?.toLowerCase().includes(s) ||
      q.client_name_snapshot?.toLowerCase().includes(s) ||
      q.client_contact_snapshot?.toLowerCase().includes(s) ||
      q.client?.company_name?.toLowerCase().includes(s) ||
      q.client?.contact_person?.toLowerCase().includes(s)
    )
  })

  const stats = {
    total: allQuotations.length,
    pending: allQuotations.filter(q => q.status === 'pending_approval').length,
    approved: allQuotations.filter(q => q.status === 'approved').length,
    draft: allQuotations.filter(q => q.status === 'draft').length,
  }

  async function handleApprove() {
    if (!previewQuotation) return
    try {
      const result = await approve({
        id: previewQuotation.id,
        userId: profile.id,
        signatureUrl: profile.signature_url,
      })
      toast('Quotation approved successfully', 'success')
      if (result?.clientWarning) {
        toast(`Client could not be activated: ${result.clientWarning}`, 'info')
      }
      if (result?.leadWarning) {
        toast(`Lead could not be updated: ${result.leadWarning}`, 'info')
      }
      setPreviewQuotation(null)
      setSelectedId(null)
    } catch (err) { toast(err.message || 'Failed to approve', 'error') }
  }

  const isAdmin = ['super_admin', 'manager'].includes(profile?.role)
  const canApprove = isAdmin && previewQuotation?.status === 'pending_approval' && can('can_approve_quotations')

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteQuotation(deleteTarget.id)
      toast('Quotation deleted', 'success')
      setDeleteTarget(null)
      if (selectedId === deleteTarget.id) setSelectedId(null)
    } catch (err) {
      toast(err.message || 'Failed to delete quotation', 'error')
    }
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
        {can('can_create_quotations') && (
          <button className="btn-gold" onClick={() => setCreationStep('type')} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Plus size={15} /> New Quotation
          </button>
        )}
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

        {isLoading ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading quotations...</div>
        ) : filtered.length === 0 ? (
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
                {can('can_delete_records') && <th></th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map(q => (
                <tr key={q.id} onClick={() => setSelectedId(q.id)} style={{ cursor: 'pointer' }}>
                  <td>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--accent-gold)' }}>
                      {q.quotation_number}
                    </span>
                  </td>
                  <td>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: 13 }}>
                      {q.client_name_snapshot || q.client_contact_snapshot || q.client?.company_name || q.client?.contact_person || 'Unknown'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{q.client_contact_snapshot || q.client?.contact_person}</div>
                  </td>
                  <td style={{ fontSize: 12 }}>
                    {q.quotation_items?.length ?? 0} item{(q.quotation_items?.length ?? 0) !== 1 ? 's' : ''}
                  </td>
                  <td>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                      {Number(q.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td style={{ fontSize: 12 }}>
                    {q.valid_until
                      ? new Date(q.valid_until).toLocaleDateString('en-GB')
                      : <span style={{ color: 'var(--text-muted)' }}>—</span>
                    }
                  </td>
                  <td><StatusBadge status={q.status} /></td>
                  <td style={{ fontSize: 12 }}>{new Date(q.created_at).toLocaleDateString('en-GB')}</td>
                  {can('can_delete_records') && (
                    <td onClick={e => e.stopPropagation()}>
                      {DELETABLE_STATUSES.includes(q.status) && (
                        <button className="btn-ghost" onClick={() => setDeleteTarget(q)} style={{ fontSize: 12, color: '#ef4444' }}>
                          Delete
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {creationStep === 'type' && (
        <QuotationTypeSelector
          onClose={() => setCreationStep(null)}
          onSelect={(type) => setCreationStep(type)}
        />
      )}

      {creationStep === 'standard' && (
        <NewQuotationModal quotationType="standard" onClose={() => setCreationStep(null)} />
      )}

      {creationStep === 'company_formation_expat' && (
        <NewFormationQuotationModal quotationType="company_formation_expat" onClose={() => setCreationStep(null)} />
      )}

      {creationStep === 'company_formation_qatari' && (
        <NewFormationQuotationModal quotationType="company_formation_qatari" onClose={() => setCreationStep(null)} />
      )}

      {selectedId && !previewQuotation && (
        <QuotationDetailDrawer
          quotationId={selectedId}
          onClose={() => setSelectedId(null)}
          onPreview={(q) => setPreviewQuotation(q)}
          onConverted={(inv) => {
            setSelectedId(null)
            navigate(`/quotations?view=invoices&open=${inv.id}`)
          }}
          onNavigate={(id) => setSelectedId(id)}
          onRevised={(newId) => {
            // Route through the same ?open= deep-link mechanism used for global
            // search, rather than setSelectedId directly, so the new draft opens
            // via one consistent code path.
            setSelectedId(null)
            setSearchParams({ view: 'quotations', open: newId }, { replace: true })
          }}
        />
      )}

      {previewQuotation && (
        <QuotationPreviewModal
          quotation={previewQuotation}
          onClose={() => setPreviewQuotation(null)}
          onApprove={handleApprove}
          canApprove={canApprove}
          approving={approving}
        />
      )}

      {deleteTarget && (
        <DeleteQuotationDialog
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          isPending={deleting}
        />
      )}
    </div>
  )
}