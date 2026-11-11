import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useGlobalSearch(search) {
  const trimmed = search.trim()
  const phoneDigits = trimmed.replace(/\D/g, '')
  const leadPhoneStartsWith = phoneDigits.length >= 2 ? `,phone_number.ilike.${phoneDigits}%` : ''
  const leadOrFilter = `company_name.ilike.%${trimmed}%,contact_person.ilike.%${trimmed}%${leadPhoneStartsWith}`

  return useQuery({
    queryKey: ['global-search', trimmed],
    enabled: trimmed.length >= 2,
    queryFn: async () => {
      const [clientsRes, casesRes, quotationsRes, leadsRes] = await Promise.all([
        supabase
          .from('clients')
          .select('id, company_name, contact_person, client_code')
          .is('deleted_at', null)
          .or(`company_name.ilike.%${trimmed}%,contact_person.ilike.%${trimmed}%`)
          .limit(5),
        supabase
          .from('cases')
          .select('id, title, case_number, status')
          .or(`title.ilike.%${trimmed}%,case_number.ilike.%${trimmed}%`)
          .limit(5),
        supabase
          .from('quotations')
          .select('id, quotation_number, status, client_name_snapshot, client_contact_snapshot, client:clients(company_name, contact_person)')
          .ilike('quotation_number', `%${trimmed}%`)
          .limit(5),
        supabase
          .from('leads')
          .select('id, company_name, contact_person, stage, assigned_to_user:users!leads_assigned_to_fkey(full_name)')
          .or(leadOrFilter)
          .limit(5),
      ])

      let leads = leadsRes.data ?? []

      // Phase 1 (starts-with) can miss a mid-string match, e.g. searching the last
      // 4 digits of a number. Only pay for a second round-trip when phase 1 truly
      // found nothing and the query actually contains enough digits to be a phone search.
      if (phoneDigits.length >= 2 && leads.length === 0) {
        const { data: phoneFallback } = await supabase
          .from('leads')
          .select('id, company_name, contact_person, stage, assigned_to_user:users!leads_assigned_to_fkey(full_name)')
          .ilike('phone_number', `%${phoneDigits}%`)
          .limit(5)
        leads = [...leads, ...(phoneFallback ?? [])]
      }

      return {
        clients: clientsRes.data ?? [],
        cases: casesRes.data ?? [],
        quotations: quotationsRes.data ?? [],
        leads,
      }
    },
  })
}
