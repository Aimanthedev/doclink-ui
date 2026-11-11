import {
  LayoutDashboard, FolderOpen, Users, RefreshCw,
  FileText, UserCheck, TrendingUp, CreditCard,
  Calendar, BarChart3, Settings, FileSignature
} from 'lucide-react'

export const NAV = [
  // Overview has no permission: every signed-in user gets the Overview for their
  // role. (The can_access_overview column is kept in the database but unused.)
  { to: '/',           icon: LayoutDashboard, label: 'Overview',   permission: null },
  { to: '/cases',      icon: FolderOpen,       label: 'Cases',      permission: 'can_access_cases' },
  { to: '/clients',    icon: Users,            label: 'Clients',    permission: 'can_access_clients' },
  { to: '/renewals',   icon: RefreshCw,        label: 'Renewals',   permission: 'can_access_renewals' },
  { to: '/documents',  icon: FileText,         label: 'Documents',  permission: 'can_access_documents' },
  { to: '/employees',  icon: UserCheck,        label: 'Employees',  permission: 'can_access_employees' },
  { to: '/quotations', icon: FileSignature,    label: 'Quotations', permission: 'can_access_quotations' },
  { to: '/sales',      icon: TrendingUp,       label: 'Sales',      permission: 'can_access_sales' },
  { to: '/accounts',   icon: CreditCard,       label: 'Accounts',   permission: 'can_access_accounts' },
  { to: '/calendar',   icon: Calendar,         label: 'Calendar',   permission: 'can_access_calendar' },
  { to: '/reports',    icon: BarChart3,        label: 'Reports',    permission: 'can_access_reports' },
  { to: '/settings',   icon: Settings,         label: 'Settings',   permission: 'can_access_settings' },
]
