import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useClients(search = '', filters = {}, options = {}) {
  return useQuery({
    queryKey: ['clients', search, filters],
    enabled: options.enabled ?? true,
    queryFn: async () => {
      let query = supabase
        .from('clients')
        .select('*, cases:cases(count), invoices:invoices(total_amount, amount_due, status)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (filters.status) query = query.eq('status', filters.status)
      if (filters.client_type) query = query.eq('client_type', filters.client_type)
      if (search.trim()) {
        query = query.or(
          `company_name.ilike.%${search}%,contact_person.ilike.%${search}%,client_code.ilike.%${search}%,email.ilike.%${search}%`
        )
      }

      const { data, error } = await query.limit(200)
      if (error) throw error
      return data ?? []
    },
  })
}

// ── Deleted clients (recycle bin) ─────────────────────────────────────────────
export function useDeletedClients(search = '', options = {}) {
  return useQuery({
    queryKey: ['clients', 'deleted', search],
    enabled: options.enabled ?? true,
    queryFn: async () => {
      let query = supabase
        .from('clients')
        .select('*, deleted_by_user:users!clients_deleted_by_fkey(full_name)')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false })

      if (search.trim()) {
        query = query.or(
          `company_name.ilike.%${search}%,contact_person.ilike.%${search}%,client_code.ilike.%${search}%,email.ilike.%${search}%`
        )
      }

      const { data, error } = await query.limit(200)
      if (error) throw error
      return data ?? []
    },
  })
}

export function useClient(id) {
  return useQuery({
    queryKey: ['client', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*, cases:cases(*, assigned_to_user:users!cases_assigned_to_fkey(full_name)), documents:documents(id, file_name, category, created_at), invoices:invoices(*, invoice_items(*))')
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
  })
}

export function useCreateClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (clientData) => {
      const { data, error } = await supabase.from('clients').insert([clientData]).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }),
  })
}

export function useUpdateClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      // .select('id') (not .select().single()) closes the silent-RLS-block
      // blind spot: without it, an UPDATE policy silently excluding this row
      // returns error: null and the write looks like it succeeded when it
      // didn't. Using a plain array select and checking its length, rather
      // than .single(), avoids .single()'s own false-positive failure mode
      // if the SELECT policy ever differed from the UPDATE policy for this
      // row. Confirmed via live pg_policies that clients has a SELECT policy
      // with qual = true (unconditionally readable to any authenticated
      // user), so it's strictly broader than any UPDATE policy here, this
      // check cannot produce a false failure on a write that actually succeeded.
      console.log('[useUpdateClient] updating client', id, updates)
      const { data, error } = await supabase.from('clients').update(updates).eq('id', id).select('id')
      console.log('[useUpdateClient] result for', id, 'error:', error)
      if (error) throw error
      if (!data || data.length === 0) {
        throw new Error('Client was not updated. Check the Row Level Security UPDATE policy on clients for this role.')
      }
    },
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: ['clients'], refetchType: 'all' })
      qc.resetQueries({ queryKey: ['clients'] })
      qc.invalidateQueries({ queryKey: ['client', id] })
    },
  })
}

// ── Soft delete / restore (super_admin only, enforced by the RPC itself) ──────
export function useDeleteClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.rpc('soft_delete_client', { target_id: id })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }),
  })
}

export function useRestoreClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.rpc('restore_client', { target_id: id })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }),
  })
}