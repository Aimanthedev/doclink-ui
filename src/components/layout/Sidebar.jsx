import { NavLink } from '@/lib/router-compat'
import { LogOut } from 'lucide-react'
import { useAuth } from '../../lib/AuthContext'
import { usePermissionsContext } from '../../contexts/PermissionsContext'
import { NAV } from './navConfig'

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
        {/* Logo */}
        <div style={{ padding: '24px 20px 18px', borderBottom: '1px solid var(--bg-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: 'linear-gradient(135deg, #2563eb, #6366f1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 800, color: '#ffffff',
          }}>
            DL
          </div>
          <div>
            <div style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.04em' }}>
              DocLink
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Global Services</div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
          {visibleNav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onClose}
              className={({ isActive }) => `sidebar-nav-link${isActive ? ' is-active' : ''}`}
            >
              <Icon size={20} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User info */}
        <div style={{ padding: '16px 16px', borderTop: '1px solid var(--bg-border)' }}>
          <div style={{ fontSize: 13, color: 'var(--sidebar-text)', fontWeight: 600, marginBottom: 2 }}>
            {profile?.full_name || 'User'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--sidebar-text-muted)', marginBottom: 12, textTransform: 'capitalize' }}>
            {profile?.role?.replace('_', ' ') || 'Staff'}
          </div>
          <button
            onClick={signOut}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--sidebar-text-muted)', fontSize: 12 }}
          >
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </aside>
    </>
  )
}
