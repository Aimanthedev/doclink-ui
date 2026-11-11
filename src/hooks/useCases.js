import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useCases(filters = {}) {
  return useQuery({
    queryKey: ['cases', filters],
    queryFn: async () => {
      let query = supabase
        .from('cases')
        .select('*, client:clients(id, client_code, company_name, contact_person, phone), assigned_to_user:users!cases_assigned_to_fkey(id, full_name), service:services(id, name, category)')
        .order('created_at', { ascending: false })

      if (filters.status) query = query.eq('status', filters.status)
      if (filters.priority) query = query.eq('priority', filters.priority)
      if (filters.assigned_to) query = query.eq('assigned_to', filters.assigned_to)
      if (filters.client_id) query = query.eq('client_id', filters.client_id)
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,case_number.ilike.%${filters.search}%`)
      }

      const { data, error } = await query.limit(200)
      if (error) throw error
      return data ?? []
    },
  })
}

export function useCase(id) {
  return useQuery({
    queryKey: ['case', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cases')
        .select('*, client:clients(*), assigned_to_user:users!cases_assigned_to_fkey(id, full_name, email), service:services(*), case_activities(*, performed_by_user:users(full_name)), case_checklist_items(*)')
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
  })
}

export function useCreateCase() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (caseData) => {
      const { data, error } = await supabase.from('cases').insert([caseData]).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cases'] }),
  })
}

export function useUpdateCase() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const { data, error } = await supabase.from('cases').update(updates).eq('id', id).select()
      if (error) throw error
      if (!data || data.length === 0) {
        throw new Error('Case was not updated. Check the Row Level Security UPDATE policy on cases for this role.')
      }
      return data[0]
    },
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: ['cases'] })
      qc.invalidateQueries({ queryKey: ['case', id] })
    },
  })
}

export function useAddCaseActivity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (activity) => {
      const { error } = await supabase.from('case_activities').insert([activity])
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['case'] }),
  })
}