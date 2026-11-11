import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

// Overview data comes from role-checked database functions (see
// supabase/migrations/20261110000000_overview_rpcs.sql). They identify the
// caller from the session (auth.uid()) and take NO user id, so the client cannot
// request another person's data. Query keys include the signed-in user's id so a
// cached result can never be shown to a different user in the same browser.

async function callRpc(fn, args) {
  const { data, error } = await supabase.rpc(fn, args)
  if (error) {
    const err = new Error(error.message)
    err.code = error.code
    err.hint = error.hint
    throw err
  }
  return data
}

function useOverviewQuery(role, fn, args, extraKey = []) {
  const { profile } = useAuth()
  const userId = profile?.id
  return useQuery({
    queryKey: ['overview', role, userId, ...extraKey],
    enabled: !!userId && profile?.is_active !== false,
    queryFn: () => callRpc(fn, args),
    staleTime: 1000 * 60,
    refetchInterval: 1000 * 60 * 5,
    // Permission errors will not fix themselves; everything else gets one retry.
    retry: (count, err) => err?.code !== '42501' && count < 1,
    // Keep the previous result while a period selector refetches, but only for
    // the same user (key position 2) - never carry data across users.
    placeholderData: (prev, prevQuery) => (prevQuery?.queryKey?.[2] === userId ? prev : undefined),
  })
}

export const useSalesOverview = period =>
  useOverviewQuery('sales', 'overview_sales', { p_period: period }, [period])

export const useProOverview = () => useOverviewQuery('pro', 'overview_pro')
export const useAccountsOverview = () => useOverviewQuery('accounts', 'overview_accounts')
export const useManagerOverview = () => useOverviewQuery('manager', 'overview_manager')
export const useAdminOverview = () => useOverviewQuery('admin', 'overview_admin')
