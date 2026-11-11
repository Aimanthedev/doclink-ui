import { useAuth } from '@/lib/AuthContext'
import { Navigate } from '@/lib/router-compat'
import DashboardLayout from './DashboardLayout'

export default function AppShell({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="app-loading">DocLink</div>
  if (!user) return <Navigate to="/login" replace />
  return <DashboardLayout>{children}</DashboardLayout>
}
