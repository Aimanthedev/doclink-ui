import { useCallback } from 'react'
import { useNavigate } from '@/lib/router-compat'
import { usePermissionsContext } from '../../contexts/PermissionsContext'
import { canNavigateTo } from './overviewNav'

// Returns { allowed(path), go(path) }. Components render an action only when
// allowed(path) is true, so no Overview button leads to an "Access Denied" page.
export function useOverviewNav() {
  const navigate = useNavigate()
  const { can, isLoading } = usePermissionsContext()
  // While permissions are loading nothing is clickable (fail closed).
  const allowed = useCallback(path => !isLoading && canNavigateTo(path, can), [can, isLoading])
  const go = useCallback(path => { if (allowed(path)) navigate(path) }, [allowed, navigate])
  return { allowed, go }
}
