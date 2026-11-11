import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useCompanySettings() {
  return useQuery({
    queryKey: ['company_settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*, updated_by_user:users(full_name)')
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function useUpdateCompanySettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, logoFile, updatedBy, ...fields }) => {
      const payload = { ...fields, updated_by: updatedBy, updated_at: new Date().toISOString() }

      if (logoFile) {
        const ext = logoFile.name.split('.').pop()
        const fileName = `logo.${ext}`

        const { error: uploadError } = await supabase.storage
          .from('company-assets')
          .upload(fileName, logoFile, { upsert: true, contentType: logoFile.type })
        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage.from('company-assets').getPublicUrl(fileName)
        payload.logo_url = publicUrl
      }

      // Bootstrap fallback: if no settings row exists yet, create it instead of updating.
      if (!id) {
        const { data, error } = await supabase.from('company_settings').insert([payload]).select().single()
        if (error) throw error
        return data
      }

      const { data, error } = await supabase.from('company_settings').update(payload).eq('id', id).select()
      if (error) throw error
      if (!data || data.length === 0) {
        throw new Error('Company settings were not updated. Check the Row Level Security UPDATE policy on company_settings for this role.')
      }
      return data[0]
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['company_settings'] }),
  })
}
