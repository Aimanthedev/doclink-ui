import { NavLink } from '@/lib/router-compat'
import { MoreHorizontal } from 'lucide-react'
import { useRouterState } from '@tanstack/react-router'
import { usePermissionsContext } from '../../contexts/PermissionsContext'
import { NAV } from './navConfig'

// Bottom navigation for phones: the four most-used modules + "More", which opens
// the full (permission-filtered) menu drawer. Hidden on tablet/desktop via CSS.
const PRIMARY = ['/', '/cases', '/clients', '/sales']

export default function MobileNav({ onMore, moreOpen }) {
  const { can, isLoading } = usePermissionsContext()
  const pathname = useRouterState({ select: s => s.location.pathname })
  const allowed = isLoading ? NAV : NAV.filter(i => !i.permission || can(i.permission))
  const primary = allowed.filter(i => PRIMARY.includes(i.to))
  const moreActive = !primary.some(i => i.to === pathname)

  return (
    <nav className="mobile-nav" aria-label="Main">
      {primary.map(({ to, icon: Icon, label }) => (
        <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `mobile-nav-item${isActive ? ' is-active' : ''}`}>
          <span className="mobile-nav-icon"><Icon size={20} strokeWidth={1.9} /></span>
          <span>{label}</span>
        </NavLink>
      ))}
      <button type="button" onClick={onMore} aria-expanded={moreOpen} className={`mobile-nav-item${moreActive || moreOpen ? ' is-active' : ''}`}>
        <span className="mobile-nav-icon"><MoreHorizontal size={20} /></span>
        <span>More</span>
      </button>
    </nav>
  )
}
