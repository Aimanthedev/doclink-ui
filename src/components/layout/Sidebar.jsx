import { NavLink } from '@/lib/router-compat'
import { LogOut, Sparkles } from 'lucide-react'
import { useAuth } from '../../lib/AuthContext'
import { usePermissionsContext } from '../../contexts/PermissionsContext'
import { NAV } from './navConfig'

// Grouping is visual only: same items, same order, same permission filtering.
const GROUPS = [
  { label: 'Workspace', paths: ['/', '/cases', '/clients', '/renewals', '/documents', '/employees'] },
  { label: 'Finance & Growth', paths: ['/quotations', '/sales', '/accounts'] },
  { label: 'Insights', paths: ['/calendar', '/reports', '/settings'] },
]

function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase() || 'U'
}

export default function Sidebar({ isOpen = false, onClose }) {
  const { profile, signOut } = useAuth()
  const { can, isLoading } = usePermissionsContext()
  // Don't filter until permissions have actually loaded — otherwise every tab briefly
  // disappears on first render for anyone whose permissions haven't resolved yet.
  const visibleNav = isLoading ? NAV : NAV.filter(item => !item.permission || can(item.permission))

  return (
    <>
      <div
        className="sidebar-mobile-backdrop"
        onClick={onClose}
        style={{ display: isOpen ? 'block' : 'none' }}
      />

      <aside className={`sidebar${isOpen ? ' is-open' : ''}`}>
        <div className="sidebar-brand">
          <div className="sidebar-logo">DL</div>
          <div style={{ minWidth: 0 }}>
            <div className="sidebar-title">DocLink</div>
            <div className="sidebar-sub">Global Services</div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: '0 12px 8px', overflowY: 'auto' }}>
          {GROUPS.map(group => {
            const items = visibleNav.filter(i => group.paths.includes(i.to))
            if (!items.length) return null
            return (
              <div key={group.label}>
                <div className="sidebar-section">{group.label}</div>
                {items.map(({ to, icon: Icon, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/'}
                    onClick={onClose}
                    className={({ isActive }) => `sidebar-nav-link${isActive ? ' is-active' : ''}`}
                  >
                    <Icon size={18} strokeWidth={1.9} />
                    {label}
                  </NavLink>
                ))}
              </div>
            )
          })}
        </nav>

        <div className="sidebar-promo">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#fff', fontWeight: 600, fontSize: 13 }}>
            <Sparkles size={15} /> Qatar business hub
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--sidebar-text-muted)', marginTop: 6, lineHeight: 1.5 }}>
            Cases, renewals and finance in one secure workspace.
          </div>
        </div>

        <div className="sidebar-user">
          <div className="sidebar-avatar">{initials(profile?.full_name)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, color: '#fff', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {profile?.full_name || 'User'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--sidebar-text-muted)', textTransform: 'capitalize' }}>
              {profile?.role?.replace('_', ' ') || 'Staff'}
            </div>
          </div>
          <button className="sidebar-signout" onClick={signOut} title="Sign out" aria-label="Sign out">
            <LogOut size={15} />
          </button>
        </div>
      </aside>
    </>
  )
}
