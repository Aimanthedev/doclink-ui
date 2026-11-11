import { createContext, useContext, useMemo } from 'react'
import { useMyPermissions, hasPermission } from '../hooks/usePermissions'
import { useAuth } from '../lib/AuthContext'

// Fail-open default so a consumer rendered outside the provider (or on a stray first
// render) never crashes or hides UI — it only matters if PermissionsProvider is missing.
const PermissionsContext = createContext({ permissions: null, can: () => true, isLoading: true })

export function PermissionsProvider({ children }) {
  const { profile } = useAuth()
  const isSuperAdmin = profile?.role === 'super_admin'
  const { data: permissions, isLoading: permissionsLoading } = useMyPermissions()

  // Super admins never wait on the permissions query.
  const isLoading = isSuperAdmin ? false : permissionsLoading

  const value = useMemo(() => ({
    // `permissions` is undefined while the query is in flight — leave it as-is (do NOT
    // coalesce to null) so hasPermission's "null bypass" path stays exclusive to
    // confirmed super_admins, not to "not loaded yet".
    permissions: isSuperAdmin ? null : permissions,
    can: (key) => {
      // super_admin is checked FIRST, before any permissions lookup — always true,
      // independent of whether the permissions query has loaded or what it returned.
      if (isSuperAdmin) return true
      return hasPermission(permissions, key)
    },
    isLoading,
  }), [isSuperAdmin, permissions, isLoading])

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  )
}

export const usePermissionsContext = () => useContext(PermissionsContext)
