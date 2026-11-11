// Which Overview a user role gets. Pure, so routing can be tested without React.
const OVERVIEW_BY_ROLE = {
  super_admin: 'admin',
  manager: 'manager',
  sales_staff: 'sales',
  pro_officer: 'pro',
  accounts_staff: 'accounts',
}

// Returns 'admin' | 'manager' | 'sales' | 'pro' | 'accounts' | null (unknown role).
export function overviewKeyForRole(role) {
  return OVERVIEW_BY_ROLE[role] ?? null
}
