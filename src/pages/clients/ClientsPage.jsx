import { useState, useEffect } from 'react'
import { useSearchParams } from '@/lib/router-compat'
import { Plus, Search, Pencil, Users } from 'lucide-react'
import { useClients, useDeletedClients, useRestoreClient } from '../../hooks/useClients'
import { usePermissionsContext } from '../../contexts/PermissionsContext'
import { useToast } from '../../lib/ToastContext'
import ClientDetailDrawer from './ClientDetailDrawer'
import NewClientModal from './NewClientModal'
import EditClientModal from './EditClientModal'

const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

function getInitials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return parts.slice(0, 2).map(p => p[0]?.toUpperCase()).join('')
}

function formatQAR(amount) {
  return `QAR ${Math.round(Number(amount) || 0).toLocaleString('en-US')}`
}

function daysSince(dateStr) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

export default function ClientsPage() {
  const { can } = usePermissionsContext()
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [selectedId, setSelectedId] = useState(null)
  const [showNew, setShowNew] = useState(false)
  const [editingClient, setEditingClient] = useState(null)
  const [showRecycleBin, setShowRecycleBin] = useState(false)

  const { data: clients = [], isLoading } = useClients(search, {
    ...(filterType !== 'all' && { client_type: filterType }),
    ...(filterStatus !== 'all' && { status: filterStatus }),
  }, { enabled: !showRecycleBin })

  const { data: deletedClients = [], isLoading: loadingDeleted, refetch: refetchDeleted } = useDeletedClients(search, { enabled: showRecycleBin })
  const { mutateAsync: restoreClient, isPending: restoring } = useRestoreClient()

  async function handleRestore(id) {
    try {
      await restoreClient(id)
      const { data: refreshed } = await refetchDeleted()
      const stillThere = (refreshed ?? []).some(c => c.id === id)
      if (stillThere) {
        toast('This client is past the 30 day restore window and can no longer be restored', 'error')
      } else {
        toast('Client restored', 'success')
      }
    } catch (err) {
      toast(err.message || 'Failed to restore client', 'error')
    }
  }

  // Deep-link from global search — /clients?open=CLIENT_ID opens the drawer
  // directly, then the param is cleared so a refresh doesn't re-trigger it.
  // Depends on searchParams (not just mount) so re-searching for a different
  // client while already on this page still opens the new drawer.
  useEffect(() => {
    const openId = searchParams.get('open')
    if (openId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedId(openId)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4, letterSpacing: '-0.02em' }}>Clients</h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Your full client directory</p>
        </div>
        {can('can_manage_clients') && (
          <button
            className="btn-glow"
            onClick={() => setShowNew(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, borderRadius: 10,
              background: 'linear-gradient(135deg, #3b82f6, #6366f1)', color: '#fff', border: 'none',
              padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            <Plus size={15} /> Add Client
          </button>
        )}
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 20, maxWidth: 448 }}>
        <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          className="input-base"
          style={{
            paddingLeft: 36,
            background: 'var(--bg-elevated)',
            border: `1px solid ${searchFocused ? '#2563eb' : 'var(--bg-border)'}`,
            borderRadius: 10,
          }}
          placeholder="Search by name, code, or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
        />
      </div>

      {/* Status filter tabs + type filter */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 24 }}>
        <div style={{ display: 'inline-flex', background: 'var(--bg-elevated)', borderRadius: 10, padding: 4, gap: 2 }}>
          {STATUS_TABS.map(t => {
            const active = !showRecycleBin && filterStatus === t.value
            return (
              <button
                key={t.value}
                onClick={() => { setShowRecycleBin(false); setFilterStatus(t.value) }}
                style={{
                  padding: '7px 16px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 500,
                  border: 'none',
                  cursor: 'pointer',
                  background: active ? 'var(--bg-card)' : 'transparent',
                  color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                  boxShadow: active ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
                }}
              >
                {t.label}
              </button>
            )
          })}
          <button
            onClick={() => setShowRecycleBin(true)}
            style={{
              padding: '7px 16px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer',
              background: showRecycleBin ? 'var(--bg-card)' : 'transparent',
              color: showRecycleBin ? 'var(--text-primary)' : 'var(--text-muted)',
              boxShadow: showRecycleBin ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
            }}
          >
            Recycle Bin
          </button>
        </div>
        {!showRecycleBin && (
          <select className="input-base" style={{ width: 150 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="all">All Types</option>
            <option value="corporate">Corporate</option>
            <option value="individual">Individual</option>
          </select>
        )}
      </div>

      {/* Client card grid */}
      {showRecycleBin ? (
        loadingDeleted ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>Loading recycle bin...</div>
        ) : deletedClients.length === 0 ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>Recycle bin is empty</div>
        ) : (
          <div className="client-grid">
            {deletedClients.map(c => {
              const daysAgo = daysSince(c.deleted_at)
              const daysRemaining = Math.max(0, 30 - daysAgo)

              return (
                <div
                  key={c.id}
                  className="glass"
                  style={{ borderRadius: 12, padding: 20, opacity: 0.7 }}
                >
                  {/* Top row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                      background: 'linear-gradient(135deg, #6366f1, #3b82f6)', color: '#ffffff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 16, fontWeight: 700, opacity: 0.6,
                    }}>
                      {getInitials(c.company_name || c.contact_person)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.company_name || c.contact_person}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.contact_person} <span style={{ textTransform: 'capitalize' }}>· {c.client_type}</span>
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div style={{ height: 1, background: 'var(--bg-border)', margin: '16px 0 12px' }} />

                  {/* Deletion info */}
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Deleted {daysAgo} day{daysAgo !== 1 ? 's' : ''} ago by {c.deleted_by_user?.full_name || 'Unknown'}
                  </div>
                  <div style={{ fontSize: 12, color: daysRemaining <= 5 ? '#ef4444' : 'var(--text-muted)', marginTop: 4 }}>
                    {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining
                  </div>

                  <button
                    onClick={() => handleRestore(c.id)}
                    disabled={restoring}
                    className="btn-ghost"
                    style={{ marginTop: 14, width: '100%', color: '#3b82f6', borderColor: 'rgba(59,130,246,0.3)' }}
                  >
                    {restoring ? 'Restoring...' : 'Restore'}
                  </button>
                </div>
              )
            })}
          </div>
        )
      ) : isLoading ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>Loading clients...</div>
      ) : clients.length === 0 ? (
        <div className="card empty-state"><div className="empty-state-art"><Users size={34} /></div><div className="empty-state-title">No clients yet</div><div className="empty-state-text">Your client companies and their contacts will appear here as elegant profile cards.</div></div>
      ) : (
        <div className="client-grid">
          {clients.map(c => {
            const totalBilled = (c.invoices ?? []).reduce((s, i) => s + Number(i.total_amount || 0), 0)
            const outstanding = (c.invoices ?? []).reduce((s, i) => s + Number(i.amount_due || 0), 0)
            const activeCases = c.cases?.[0]?.count ?? 0
            const isActive = c.status === 'active'

            return (
              <div
                key={c.id}
                className="glass card-hover"
                onClick={() => setSelectedId(c.id)}
                style={{ borderRadius: 12, padding: 20, cursor: 'pointer' }}
              >
                {/* Top row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                    background: 'linear-gradient(135deg, #6366f1, #3b82f6)', color: '#ffffff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, fontWeight: 700,
                  }}>
                    {getInitials(c.company_name || c.contact_person)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.company_name || c.contact_person}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.contact_person} <span style={{ textTransform: 'capitalize' }}>· {c.client_type}</span>
                    </div>
                  </div>
                  <span style={{
                    fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 500, textTransform: 'capitalize', flexShrink: 0,
                    background: isActive ? 'rgba(16,185,129,0.15)' : 'rgba(148,163,184,0.15)',
                    color: isActive ? '#10b981' : '#94a3b8',
                    border: `1px solid ${isActive ? 'rgba(16,185,129,0.3)' : 'rgba(148,163,184,0.3)'}`,
                  }}>
                    {c.status}
                  </span>
                  {can('can_edit_clients') && (
                    <button
                      onClick={e => { e.stopPropagation(); setEditingClient(c) }}
                      title="Edit Client"
                      style={{ background: 'none', border: '1px solid var(--bg-border)', borderRadius: 8, padding: 6, cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', flexShrink: 0 }}
                    >
                      <Pencil size={14} />
                    </button>
                  )}
                </div>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, margin: '16px 0' }}>
                  <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', borderRadius: 8, padding: '8px 12px' }}>
                    <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 4 }}>Cases</div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{activeCases}</div>
                  </div>
                  <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', borderRadius: 8, padding: '8px 12px' }}>
                    <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 4 }}>Total Billed</div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{formatQAR(totalBilled)}</div>
                  </div>
                  <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', borderRadius: 8, padding: '8px 12px' }}>
                    <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 4 }}>Outstanding</div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: outstanding > 0 ? '#f59e0b' : '#10b981' }}>{formatQAR(outstanding)}</div>
                  </div>
                </div>

                {/* Divider */}
                <div style={{ height: 1, background: 'var(--bg-border)', marginBottom: 12 }} />

                {/* Bottom row */}
                <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{c.client_code}</div>
              </div>
            )
          })}
        </div>
      )}

      {showNew && <NewClientModal onClose={() => setShowNew(false)} />}
      {selectedId && <ClientDetailDrawer clientId={selectedId} onClose={() => setSelectedId(null)} />}
      {editingClient && <EditClientModal client={editingClient} onClose={() => setEditingClient(null)} />}
    </div>
  )
}
