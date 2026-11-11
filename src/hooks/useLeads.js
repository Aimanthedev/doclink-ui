import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

// Sales-tab isolation: `assignedTo` is the belt-and-suspenders filter on top of
// RLS — pass it whenever the caller isn't in an explicit "all staff" view, and
// leave `enabled` false until the real caller id is known (never fire this
// unfiltered while a user id is still resolving, or it briefly returns everyone's
// leads to the client before the filtered refetch lands).
export function useLeads(filters = {}, { enabled = true } = {}) {
  return useQuery({
    queryKey: ['leads', filters.assignedTo ?? 'all'],
    enabled,
    queryFn: async () => {
      let query = supabase
        .from('leads')
        .select('*, assigned_to_user:users!leads_assigned_to_fkey(id, full_name)')
        .order('created_at', { ascending: false })
      if (filters.assignedTo) query = query.eq('assigned_to', filters.assignedTo)
      const { data, error } = await query
      if (error) throw error
      return data ?? []
    },
  })
}

export function useLead(id) {
  return useQuery({
    queryKey: ['lead', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('*, assigned_to_user:users!leads_assigned_to_fkey(id, full_name)')
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
  })
}

// ── Search leads for the quotation client/lead picker ────────────────────────
// Excludes leads that already have a linked client (converted_to_client_id
// set) — those should be found through the client search instead, so the
// picker never offers two entry points for the same underlying entity.
export function useLeadsSearch(search = '') {
  return useQuery({
    queryKey: ['leads-search', search],
    queryFn: async () => {
      let query = supabase
        .from('leads')
        .select('id, lead_number, company_name, contact_person, phone_country_code, phone_number, email, stage')
        .is('converted_to_client_id', null)
        .order('created_at', { ascending: false })
      if (search.trim()) {
        query = query.or(`company_name.ilike.%${search}%,contact_person.ilike.%${search}%`)
      }
      const { data, error } = await query.limit(200)
      if (error) throw error
      return data ?? []
    },
  })
}

export function useCreateLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (leadData) => {
      // Always derive created_by from the authenticated Supabase session,
      // not whatever the caller passed in — this is what RLS keys ownership
      // off, so it must be the real auth.uid(), never a possibly-stale or
      // unset value from client-side app state.
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError
      if (!user) throw new Error('Not authenticated')

      const phone = `${leadData.phone_country_code || '+974'} ${leadData.phone_number || ''}`.trim()
      const { data, error } = await supabase
        .from('leads')
        .insert([{ ...leadData, phone, created_by: user.id }])
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  })
}

export function useUpdateLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      // .select('id') (not .select().single()) closes the silent-RLS-block
      // blind spot: without it, an UPDATE policy silently excluding this row
      // returns error: null and the write looks like it succeeded when it
      // didn't. Using a plain array select and checking its length, rather
      // than .single(), avoids .single()'s own false-positive failure mode
      // if the SELECT policy ever differed from the UPDATE policy for this
      // row. Confirmed via live pg_policies that leads has a SELECT policy
      // with qual = true (unconditionally readable to any authenticated
      // user), so it's strictly broader than any UPDATE policy here, this
      // check cannot produce a false failure on a write that actually succeeded.
      const payload = { ...updates }
      if ('phone_country_code' in updates || 'phone_number' in updates) {
        payload.phone = `${updates.phone_country_code || '+974'} ${updates.phone_number || ''}`.trim()
      }
      console.log('[useUpdateLead] updating lead', id, payload)
      const { data, error } = await supabase.from('leads').update(payload).eq('id', id).select('id')
      console.log('[useUpdateLead] result for', id, 'error:', error)
      if (error) throw error
      if (!data || data.length === 0) {
        throw new Error('Lead was not updated. Check the Row Level Security UPDATE policy on leads for this role.')
      }
    },
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['leads'], refetchType: 'all' })
      qc.resetQueries({ queryKey: ['leads'] })
      qc.invalidateQueries({ queryKey: ['lead', id] })
      qc.invalidateQueries({ queryKey: ['leads-followups'] })
    },
  })
}

export function useDeleteLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { data, error } = await supabase.from('leads').delete().eq('id', id).select('id')
      if (error) throw error
      if (!data || data.length === 0) {
        throw new Error('Lead was not deleted. Check the Row Level Security DELETE policy on leads for this role.')
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] })
      qc.invalidateQueries({ queryKey: ['leads-followups'] })
    },
  })
}

// ── Convert a lead to a client ────────────────────────────────────────────────
// Idempotent: if this lead was already converted (converted_to_client_id
// set), returns the existing client instead of inserting a duplicate. Plain
// async function (not a hook) so it can be called from inside other
// mutations — e.g. useConvertToInvoice resolving a client for a lead-sourced
// quotation — not just from the "Convert to Client" button below.
export async function convertLeadToClient({ lead, userId }) {
  if (lead.converted_to_client_id) {
    const { data: existingClient, error: existingErr } = await supabase
      .from('clients')
      .select()
      .eq('id', lead.converted_to_client_id)
      .single()
    if (existingErr) throw existingErr
    return existingClient
  }

  const { data: client, error: clientErr } = await supabase
    .from('clients')
    .insert([{
      company_name: lead.company_name,
      contact_person: lead.contact_person,
      client_type: 'corporate',
      phone: `${lead.phone_country_code || '+974'} ${lead.phone_number || ''}`.trim(),
      email: lead.email,
      status: 'active',
      notes: `Converted from lead ${lead.lead_number}. Service interest: ${lead.service_interest || 'N/A'}`,
      created_by: userId,
    }])
    .select()
    .single()
  if (clientErr) throw clientErr

  const { data: leadRow, error: leadErr } = await supabase
    .from('leads')
    .update({ stage: 'won', converted_to_client_id: client.id, converted_at: new Date().toISOString() })
    .eq('id', lead.id)
    .select('id')
  if (leadErr) throw leadErr
  if (!leadRow || leadRow.length === 0) {
    throw new Error(`Client "${client.company_name}" was created, but the lead could not be marked as converted. Check the Row Level Security UPDATE policy on leads for this role, then link this lead to the client manually to avoid a duplicate on retry.`)
  }

  return client
}

export function useConvertLeadToClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: convertLeadToClient,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] })
      qc.invalidateQueries({ queryKey: ['clients'] })
    },
  })
}
