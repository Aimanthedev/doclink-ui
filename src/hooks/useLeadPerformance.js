import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

function getRangeBounds(rangeKey) {
  const now = new Date()
  if (rangeKey === 'this_month') {
    return { start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(), end: null }
  }
  if (rangeKey === 'last_month') {
    return {
      start: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString(),
      end: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
    }
  }
  return { start: null, end: null } // all_time
}

// Raw lead rows (assigned_to, stage, estimated_value) for the given date-range
// preset — grouping by employee and sorting happens in the component so the
// same fetch can serve either sort order without a refetch.
export function useLeadPerformance(rangeKey) {
  return useQuery({
    queryKey: ['lead-performance', rangeKey],
    queryFn: async () => {
      const { start, end } = getRangeBounds(rangeKey)
      let query = supabase
        .from('leads')
        .select('assigned_to, stage, estimated_value, created_at, assigned_to_user:users!leads_assigned_to_fkey(full_name)')
      if (start) query = query.gte('created_at', start)
      if (end) query = query.lt('created_at', end)
      const { data, error } = await query
      if (error) throw error
      return data ?? []
    },
  })
}
