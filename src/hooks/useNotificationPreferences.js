import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useNotificationPreferences(userId) {
  return useQuery({
    queryKey: ['notification_preferences', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function useUpdateNotificationPreferences() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId, ...updates }) => {
      const { data, error } = await supabase
        .from('notification_preferences')
        .upsert([{ user_id: userId, ...updates }], { onConflict: 'user_id' })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_data, { userId }) => {
      qc.invalidateQueries({ queryKey: ['notification_preferences', userId] })
    },
  })
}
