import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

// Leads with a follow-up due today or overdue, still active in the pipeline.
// RLS already scopes non-admin users to their own/assigned leads, but the
// explicit .eq('assigned_to', assignedToId) filter mirrors the Sales page's
// My Sales / All Staff toggle for clarity — pass null/undefined for All Staff.
// `enabled` should stay false until the caller's real id is resolved for a
// non-admin/"my sales" view, otherwise this briefly runs unfiltered.
export function useTodaysFollowUps(assignedToId, { enabled = true } = {}) {
  return useQuery({
    queryKey: ['leads-followups', assignedToId ?? 'all'],
    enabled,
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0]
      let query = supabase
        .from('leads')
        .select('id, company_name, contact_person, service_interest, follow_up_date, assigned_to, estimated_value, assigned_to_user:users!leads_assigned_to_fkey(full_name)')
        .not('follow_up_date', 'is', null)
        .is('follow_up_completed_at', null)
        .lte('follow_up_date', today)
        .neq('stage', 'won')
        .neq('stage', 'lost')
        .order('follow_up_date', { ascending: true })
      if (assignedToId) query = query.eq('assigned_to', assignedToId)
      const { data, error } = await query
      if (error) throw error
      return data ?? []
    },
  })
}

export function useMarkFollowUpDone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { data, error } = await supabase
        .from('leads')
        .update({ follow_up_completed_at: new Date().toISOString() })
        .eq('id', id)
        .select('id')
      if (error) throw error
      if (!data || data.length === 0) {
        throw new Error('Follow-up was not marked done. Check the Row Level Security UPDATE policy on leads for this role.')
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads-followups'] })
      qc.invalidateQueries({ queryKey: ['leads'] })
    },
  })
}
