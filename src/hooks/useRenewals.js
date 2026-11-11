import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useRenewals(filters = {}) {
  return useQuery({
    queryKey: ['renewals', filters],
    queryFn: async () => {
      let query = supabase
        .from('renewals')
        .select('*, client:clients(id, client_code, company_name, contact_person, phone), assigned_to_user:users!renewals_assigned_to_fkey(id, full_name)')
        .order('expiry_date', { ascending: true })

      if (filters.status) query = query.eq('status', filters.status)
      if (filters.days) {
        const future = new Date()
        future.setDate(future.getDate() + Number(filters.days))
        query = query.lte('expiry_date', future.toISOString().split('T')[0])
        query = query.gte('expiry_date', new Date().toISOString().split('T')[0])
      }

      const { data, error } = await query.limit(200)
      if (error) throw error
      return data ?? []
    },
  })
}

export function useCreateRenewal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (renewalData) => {
      const { data, error } = await supabase.from('renewals').insert([renewalData]).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['renewals'] }),
  })
}

export function useUpdateRenewal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const { data, error } = await supabase.from('renewals').update(updates).eq('id', id).select()
      if (error) throw error
      if (!data || data.length === 0) {
        throw new Error('Renewal was not updated. Check the Row Level Security UPDATE policy on renewals for this role.')
      }
      return data[0]
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['renewals'] }),
  })
}