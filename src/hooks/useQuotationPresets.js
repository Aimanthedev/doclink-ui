import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useQuotationPreset(quotationType) {
  return useQuery({
    queryKey: ['quotation_preset', quotationType],
    enabled: !!quotationType,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotation_presets')
        .select('*, updated_by_user:users(full_name)')
        .eq('quotation_type', quotationType)
        .maybeSingle()
      if (error) throw error
      return data ?? null
    },
  })
}

export function useUpdateQuotationPreset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ quotationType, updates, userId }) => {
      const { data, error } = await supabase
        .from('quotation_presets')
        .upsert(
          { quotation_type: quotationType, ...updates, updated_by: userId, updated_at: new Date().toISOString() },
          { onConflict: 'quotation_type' }
        )
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_d, { quotationType }) => qc.invalidateQueries({ queryKey: ['quotation_preset', quotationType] }),
  })
}
