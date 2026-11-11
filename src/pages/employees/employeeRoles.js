export const ALL_ROLES = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'pro_officer', label: 'PRO Officer' },
  { value: 'accounts_staff', label: 'Accounts Staff' },
  { value: 'sales_staff', label: 'Sales Staff' },
]
const STAFF_ROLE_VALUES = ['pro_officer', 'accounts_staff', 'sales_staff']

// Which roles the Add Employee form offers. The create-employee edge function enforces
// the same rule on the server: a super_admin may add any role; a manager may add staff
// roles only; nobody else may add anyone. The form just avoids offering what would be refused.
export function rolesCreatableBy(callerRole) {
  if (callerRole === 'super_admin') return ALL_ROLES
  if (callerRole === 'manager') return ALL_ROLES.filter(r => STAFF_ROLE_VALUES.includes(r.value))
  return []
}

// Only managers and super admins see the Add Employee button.
export const canAddEmployees = callerRole => rolesCreatableBy(callerRole).length > 0

// Lead counts on employee cards come from the leads table, which (after the RLS
// tightening) only returns every lead to managers, super admins and anyone with the
// Reports tab. Everyone else would see misleading zeros for colleagues.
export function canSeeAllLeadStats(role, can) {
  return role === 'manager' || role === 'super_admin' || can('can_access_reports') === true
}
