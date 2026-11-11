import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useServices(filters = {}) {
  return useQuery({
    queryKey: ['services', filters],
    queryFn: async () => {
      let query = supabase
        .from('services')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true })

      if (!filters.includeInactive) query = query.eq('is_active', true)
      if (filters.appliesTo) query = query.contains('applies_to', [filters.appliesTo])

      const { data, error } = await query
      if (error) throw error
      return data ?? []
    },
    staleTime: 1000 * 60 * 10,
  })
}

export function useCreateService() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (serviceData) => {
      const { data, error } = await supabase.from('services').insert([serviceData]).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['services'] }),
  })
}

export function useUpdateService() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const { data, error } = await supabase.from('services').update(updates).eq('id', id).select()
      if (error) throw error
      if (!data || data.length === 0) {
        throw new Error('Service was not updated. Check the Row Level Security UPDATE policy on services for this role.')
      }
      return data[0]
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['services'] }),
  })
}

export function useDeactivateService() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, isActive }) => {
      const { data, error } = await supabase.from('services').update({ is_active: isActive }).eq('id', id).select()
      if (error) throw error
      if (!data || data.length === 0) {
        throw new Error('Service status was not updated. Check the Row Level Security UPDATE policy on services for this role.')
      }
      return data[0]
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['services'] }),
  })
}