import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useGetTimeline(caseId) {
  return useQuery({
    queryKey: ['case-timeline', caseId],
    enabled: !!caseId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('case_timeline_entries')
        .select('*, performed_by_user:users(full_name)')
        .eq('case_id', caseId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}

export function useAddTimelineEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (entry) => {
      const { data, error } = await supabase.from('case_timeline_entries').insert([entry]).select().single()
      if (error) throw error
      return data
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['case-timeline', variables.case_id] })
    },
  })
}
