import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useEvents(monthDate, filters = {}) {
  const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
  const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59)

  return useQuery({
    queryKey: ['events', start.toISOString(), end.toISOString(), filters.createdBy ?? 'all'],
    queryFn: async () => {
      let query = supabase
        .from('events')
        .select('*, client:clients(id, company_name, contact_person), assigned_to_user:users!events_assigned_to_fkey(id, full_name), created_by_user:users!events_created_by_fkey(id, full_name), case:cases(id, case_number, title)')
        .gte('start_time', start.toISOString())
        .lte('start_time', end.toISOString())
        .order('start_time', { ascending: true })
      if (filters.createdBy) query = query.eq('created_by', filters.createdBy)
      const { data, error } = await query
      if (error) throw error
      return data ?? []
    },
  })
}

// One event by id, with the same joins the calendar list uses. Used to open an
// event directly from a link (e.g. the Overview), regardless of which month or
// owner filter the calendar is currently showing.
export async function fetchEventById(id) {
  const { data, error } = await supabase
    .from('events')
    .select('*, client:clients(id, company_name, contact_person), assigned_to_user:users!events_assigned_to_fkey(id, full_name), created_by_user:users!events_created_by_fkey(id, full_name), case:cases(id, case_number, title)')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data
}

export function useCreateEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (eventData) => {
      const { data, error } = await supabase.from('events').insert([eventData]).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  })
}

export function useUpdateEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const { data, error } = await supabase.from('events').update(updates).eq('id', id).select()
      if (error) throw error
      if (!data || data.length === 0) {
        throw new Error('Event was not updated. Check the Row Level Security UPDATE policy on events for this role.')
      }
      return data[0]
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  })
}

export function useDeleteEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { data, error } = await supabase.from('events').delete().eq('id', id).select('id')
      if (error) throw error
      if (!data || data.length === 0) {
        throw new Error('Event was not deleted. Check the Row Level Security DELETE policy on events for this role.')
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  })
}