import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export const PAGE_SIZE = 10

// DEBUG: date filtering (.gte/.lte) temporarily removed to confirm the base
// query works — re-add before shipping.
export async function fetchLoginEvents(filters = {}) {
  const { offset = 0, limit = PAGE_SIZE } = filters

  const query = supabase
    .from('login_events')
    .select('id, user_id, user_email, event_type, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  const response = await query
  console.log('[useAuditLogs] fetchLoginEvents data:', JSON.stringify(response.data?.slice(0, 3)), 'error:', JSON.stringify(response.error))
  if (response.error) throw response.error
  return { data: response.data ?? [], count: response.count ?? 0 }
}

// DEBUG: date filtering (.gte/.lte) temporarily removed to confirm the base
// query works — re-add before shipping.
export async function fetchActivityLogs(filters = {}) {
  const { userId, offset = 0, limit = PAGE_SIZE } = filters

  let query = supabase
    .from('audit_logs')
    .select('id, user_id, user_email, action, table_name, record_id, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (userId) query = query.eq('user_id', userId)

  const response = await query
  console.log('[useAuditLogs] fetchActivityLogs data:', JSON.stringify(response.data?.slice(0, 3)), 'error:', JSON.stringify(response.error))
  if (response.error) throw response.error
  const logs = response.data ?? []

  // audit_logs.user_email is null — the DB trigger that writes these rows has
  // no access to auth.users. Backfill it from login_events, which does capture
  // the email at sign-in time, keyed by the same user_id.
  const userIds = [...new Set(logs.map(l => l.user_id).filter(Boolean))]
  if (userIds.length > 0) {
    const { data: emailRows, error: emailError } = await supabase
      .from('login_events')
      .select('user_id, user_email')
      .in('user_id', userIds)
    if (emailError) throw emailError

    const emailByUserId = new Map()
    for (const row of emailRows ?? []) {
      if (!emailByUserId.has(row.user_id)) emailByUserId.set(row.user_id, row.user_email)
    }
    for (const log of logs) {
      if (!log.user_email) log.user_email = emailByUserId.get(log.user_id) ?? log.user_email
    }
  }

  return { data: logs, count: response.count ?? 0 }
}

// Accepts primitive args (not a filters object) so the query key never
// depends on object identity — an inline `{ fromDate, toDate }` literal at
// the call site would otherwise be a new reference on every render.
export function useLoginEvents(fromDate, toDate, page) {
  const offset = (page - 1) * PAGE_SIZE
  return useQuery({
    queryKey: ['login_events', fromDate, toDate, page],
    queryFn: () => fetchLoginEvents({ fromDate, toDate, offset, limit: PAGE_SIZE }),
    keepPreviousData: true,
  })
}

export function useActivityLogs(fromDate, toDate, userId, page) {
  const offset = (page - 1) * PAGE_SIZE
  return useQuery({
    queryKey: ['audit_logs', fromDate, toDate, userId, page],
    queryFn: () => fetchActivityLogs({ fromDate, toDate, userId, offset, limit: PAGE_SIZE }),
    keepPreviousData: true,
  })
}

// Distinct users that appear in audit_logs, for the Activity Log user filter dropdown.
export function useActivityLogUsers() {
  return useQuery({
    queryKey: ['audit_logs_users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('user_id, user_email')
        .not('user_id', 'is', null)
        .order('user_email', { ascending: true })
      if (error) throw error

      const seen = new Map()
      for (const row of data ?? []) {
        if (!seen.has(row.user_id)) seen.set(row.user_id, row.user_email)
      }
      return [...seen.entries()].map(([id, email]) => ({ id, email }))
    },
  })
}
