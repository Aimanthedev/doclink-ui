import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data, error } = await supabase.from('users').select('id, full_name, role, is_active').eq('is_active', true).order('full_name')
      if (error) throw error
      return data ?? []
    },
    staleTime: 1000 * 60 * 10,
  })
}