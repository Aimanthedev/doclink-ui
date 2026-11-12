import { useRef, useState } from 'react'
import MobileNav from './MobileNav'
import { useMobileTables } from '../../lib/useMobileTables'
import { ShieldAlert } from 'lucide-react'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import AnnouncementModal from './AnnouncementModal'
import WhatsNewPopup from './WhatsNewPopup'
import { useLocation } from '@/lib/router-compat'
import { usePermissionsContext } from '../../contexts/PermissionsContext'
import { NAV } from './navConfig'

function AccessDenied() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 400, textAlign: 'center', color: 'var(--text-muted)' }}>
      <ShieldAlert size={40} style={{ marginBottom: 16, color: 'var(--status-overdue)' }} />
      <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>Access Denied</div>
      <div style={{ fontSize: 13 }}>You don't have permission to view this page. Contact your administrator if you believe this is a mistake.</div>
    </div>
  )
}

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const mainRef = useRef(null)
  useMobileTables(mainRef)
  const { can, isLoading } = usePermissionsContext()

  const currentNavItem = NAV.find(item => item.to === location.pathname)
  const isDenied = !isLoading && currentNavItem && currentNavItem.permission && !can(currentNavItem.permission)

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="dashboard-content">
        <TopBar onMenuClick={() => setSidebarOpen(open => !open)} />
        <main className="dashboard-main" ref={mainRef}>
          {isDenied ? <AccessDenied /> : children}
        </main>
      </div>
      <MobileNav onMore={() => setSidebarOpen(o => !o)} moreOpen={sidebarOpen} />
      <AnnouncementModal />
      <WhatsNewPopup />
    </div>
  )
}
