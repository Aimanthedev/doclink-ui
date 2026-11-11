import { useAuth } from '../../lib/AuthContext'
import { overviewKeyForRole } from './overviewRoles'
import SalesOverview from './SalesOverview'
import ProOfficerOverview from './ProOfficerOverview'
import AccountsOverview from './AccountsOverview'
import ManagerOverview from './ManagerOverview'
import SuperAdminOverview from './SuperAdminOverview'
import { LoadingState } from './components/OverviewUI'

const DASHBOARDS = {
  sales: SalesOverview,
  pro: ProOfficerOverview,
  accounts: AccountsOverview,
  manager: ManagerOverview,
  admin: SuperAdminOverview,
}

function Notice({ title, children, actions }) {
  return (
    <div style={{ padding: '70px 20px', textAlign: 'center' }}>
      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 520, margin: '0 auto' }}>{children}</div>
      {actions && <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'center' }}>{actions}</div>}
    </div>
  )
}

// Picks the Overview from the role in the `users` row (AuthContext.profile),
// never from anything the URL or the client supplies. Until the profile is
// known, only a neutral loading state is rendered: no dashboard component (and
// therefore no data request) is mounted, so nothing privileged can flash.
export default function OverviewRouter() {
  const { user, profile, profileError, loading, fetchProfile, signOut } = useAuth()

  if (loading) return <LoadingState />
  if (!profile) {
    // Two different situations, deliberately not conflated:
    if (profileError) {
      // The lookup itself failed (network, database, permissions): retrying may help.
      return (
        <Notice
          title="We couldn't load your profile"
          actions={<button className="btn-ghost" onClick={() => user?.id && fetchProfile(user.id)}>Try again</button>}
        >
          {profileError.message || 'Something went wrong while loading your account.'}
        </Notice>
      )
    }
    // The lookup worked but there is no staff profile row for this login.
    return (
      <Notice
        title="Your login isn't linked to a staff profile yet"
        actions={<button className="btn-ghost" onClick={() => signOut()}>Sign out</button>}
      >
        {user?.email ? <><strong>{user.email}</strong> is signed in, but </> : 'This login '}
        has no DocLink staff profile, so there's no role to show an Overview for. Ask an administrator to add you as an employee.
      </Notice>
    )
  }
  if (profile.is_active === false) {
    return <Notice title="Your account is inactive">Contact your administrator to regain access.</Notice>
  }

  const Dashboard = DASHBOARDS[overviewKeyForRole(profile.role)]
  if (!Dashboard) {
    return <Notice title="No overview is set up for your role">Contact your administrator.</Notice>
  }
  return <Dashboard />
}
