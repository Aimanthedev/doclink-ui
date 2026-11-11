import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { getActiveTemplateId, quotationTemplateType } from '../lib/templateLoader'
import { convertLeadToClient } from './useLeads'

// ── Fetch all quotations ──────────────────────────────────────────────────────
export function useQuotations(filters = {}) {
  return useQuery({
    queryKey: ['quotations', filters],
    queryFn: async () => {
      let query = supabase
        .from('quotations')
        .select(`
          *,
          client:clients(id, client_code, company_name, contact_person, phone, email),
          lead:leads!quotations_lead_id_fkey(id, lead_number, company_name, contact_person, phone_country_code, phone_number, email),
          created_by_user:users!quotations_created_by_fkey(id, full_name),
          reviewed_by_user:users!quotations_reviewed_by_fkey(id, full_name),
          quotation_items(*)
        `)
        .order('created_at', { ascending: false })

      if (filters.status) query = query.eq('status', filters.status)
      if (filters.client_id) query = query.eq('client_id', filters.client_id)
      if (filters.createdBy) query = query.eq('created_by', filters.createdBy)

      const { data, error } = await query
      if (error) throw error
      return data ?? []
    },
  })
}

// ── Fetch single quotation ────────────────────────────────────────────────────
export function useQuotation(id) {
  return useQuery({
    queryKey: ['quotation', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotations')
        .select(`
          *,
          client:clients(*),
          lead:leads!quotations_lead_id_fkey(*),
          created_by_user:users!quotations_created_by_fkey(id, full_name, email, signature_url),
          reviewed_by_user:users!quotations_reviewed_by_fkey(id, full_name, signature_url),
          quotation_items(*, service:services(id, name, category))
        `)
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
  })
}

// ── Create quotation ──────────────────────────────────────────────────────────
export function useCreateQuotation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ quotation, items }) => {
      // Always derive created_by from the authenticated Supabase session,
      // not whatever the caller passed in — never a possibly-stale or unset
      // value from client-side app state.
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError
      if (!user) throw new Error('Not authenticated')

      // 1. Insert quotation header
      const { data: qt, error: qtErr } = await supabase
        .from('quotations')
        .insert([{ ...quotation, created_by: user.id }])
        .select()
        .single()
      if (qtErr) throw qtErr

      // 2. Insert line items
      if (items.length > 0) {
        const lineItems = items.map((item, i) => ({
          quotation_id: qt.id,
          service_id: item.service_id || null,
          service_name: item.service_name,
          category: item.category || null,
          description: item.description || null,
          quantity: item.quantity,
          unit_type: item.unit_type || null,
          unit_price: item.unit_price,
          tax_rate: item.tax_rate ?? null,
          discount_amount: item.discount_amount || 0,
          notes: item.notes || null,
          estimated_delivery: item.estimated_delivery || null,
          total_price: item.total_price ?? item.quantity * item.unit_price,
          sort_order: i,
        }))
        const { error: itemErr } = await supabase.from('quotation_items').insert(lineItems)
        if (itemErr) throw itemErr
      }

      // 3. Log creation
      const { error: logErr } = await supabase.from('quotation_logs').insert([{
        quotation_id: qt.id,
        performed_by: user.id,
        action: 'Quotation created',
        new_status: 'draft',
      }])
      if (logErr) console.error('[quotation_logs] failed to log quotation creation:', logErr)

      return qt
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quotations'] }),
  })
}

// ── Submit for approval ───────────────────────────────────────────────────────
export function useSubmitForApproval() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, userId }) => {
      const { error } = await supabase
        .from('quotations')
        .update({ status: 'pending_approval', submitted_for_approval_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error

      const { error: logErr } = await supabase.from('quotation_logs').insert([{
        quotation_id: id,
        performed_by: userId,
        action: 'Submitted for approval',
        previous_status: 'draft',
        new_status: 'pending_approval',
      }])
      if (logErr) console.error('[quotation_logs] failed to log submit for approval:', logErr)
    },
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: ['quotations'] })
      qc.invalidateQueries({ queryKey: ['quotation', id] })
    },
  })
}

// ── Full edit (update header + replace all items) ─────────────────────────────
export function useSaveQuotationEdit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, quotation, items, userId }) => {
      const { data: updatedQuotation, error: qtErr } = await supabase
        .from('quotations')
        .update(quotation)
        .eq('id', id)
        .select('id')
      if (qtErr) throw qtErr
      if (!updatedQuotation || updatedQuotation.length === 0) {
        throw new Error('Quotation was not updated. Check the Row Level Security UPDATE policy on quotations for this role.')
      }

      const { data: deletedItems, error: delErr } = await supabase
        .from('quotation_items')
        .delete()
        .eq('quotation_id', id)
        .select('id')
      if (delErr) throw delErr
      if (!deletedItems || deletedItems.length === 0) {
        throw new Error('Could not remove existing quotation items. Check the Row Level Security DELETE policy on quotation_items for this role.')
      }

      if (items.length > 0) {
        const lineItems = items.map((item, i) => ({
          quotation_id: id,
          service_id: item.service_id || null,
          service_name: item.service_name,
          category: item.category || null,
          description: item.description || null,
          quantity: item.quantity,
          unit_type: item.unit_type || null,
          unit_price: item.unit_price,
          tax_rate: item.tax_rate ?? null,
          discount_amount: item.discount_amount || 0,
          notes: item.notes || null,
          estimated_delivery: item.estimated_delivery || null,
          total_price: item.total_price ?? Number(item.quantity) * Number(item.unit_price),
          sort_order: i,
        }))
        const { error: itemErr } = await supabase.from('quotation_items').insert(lineItems)
        if (itemErr) throw itemErr
      }

      const { error: logErr } = await supabase.from('quotation_logs').insert([{
        quotation_id: id,
        performed_by: userId,
        action: 'Quotation edited',
        previous_status: 'draft',
        new_status: quotation.status || 'draft',
      }])
      if (logErr) console.error('[quotation_logs] failed to log quotation edit:', logErr)
    },
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: ['quotations'] })
      qc.invalidateQueries({ queryKey: ['quotation', id] })
    },
  })
}

// ── Generic update (e.g. move a rejected quotation back to draft) ────────────
export function useUpdateQuotation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, updates, userId, logAction, previousStatus }) => {
      const { data, error } = await supabase
        .from('quotations')
        .update(updates)
        .eq('id', id)
        .select('id')
      if (error) throw error
      if (!data || data.length === 0) {
        throw new Error('Quotation was not updated. Check the Row Level Security UPDATE policy on quotations for this role.')
      }

      if (logAction) {
        const { error: logErr } = await supabase.from('quotation_logs').insert([{
          quotation_id: id,
          performed_by: userId,
          action: logAction,
          previous_status: previousStatus,
          new_status: updates.status,
        }])
        if (logErr) console.error('[quotation_logs] failed to log generic update:', logErr)
      }
    },
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: ['quotations'] })
      qc.invalidateQueries({ queryKey: ['quotation', id] })
    },
  })
}

// ── Approve quotation ─────────────────────────────────────────────────────────
export function useApproveQuotation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, userId, signatureUrl }) => {
      // Read client_id/lead_id straight off the row rather than trusting a
      // caller-supplied clientId — the only existing caller (QuotationsPage)
      // never passed one, which silently dead-coded the client-activation
      // branch below. Fetching fresh here fixes that and gives us lead_id
      // for the new stage-push, without depending on every call site to wire
      // both ids through by hand.
      const { data: quotationRow, error: fetchErr } = await supabase
        .from('quotations')
        .select('client_id, lead_id, quotation_type')
        .eq('id', id)
        .single()
      if (fetchErr) throw fetchErr

      // Pin the template this quotation is approved with, so every later
      // download (by anyone) uses exactly it. Only template-based types are
      // pinned; an unknown legacy type has no template to pin. Throws a clear
      // TemplateLoadError (aborting the approval) if no active template exists.
      const isTemplatedType = ['standard', 'company_formation_expat', 'company_formation_qatari'].includes(quotationRow.quotation_type)
      const templateId = isTemplatedType
        ? await getActiveTemplateId('quotation', quotationTemplateType(quotationRow.quotation_type))
        : null

      if (quotationRow.client_id) {
        const { data: clientRow, error: clientFetchErr } = await supabase
          .from('clients')
          .select('deleted_at')
          .eq('id', quotationRow.client_id)
          .single()
        if (clientFetchErr) throw clientFetchErr
        if (clientRow?.deleted_at) {
          throw new Error('This client has been deleted. Restore the client before approving this quotation.')
        }
      }

      const { data: approvedRow, error } = await supabase
        .from('quotations')
        .update({
          status: 'approved',
          reviewed_by: userId,
          reviewed_at: new Date().toISOString(),
          signature_url: signatureUrl || null,
          signed_at: new Date().toISOString(),
          template_id: templateId,
        })
        .eq('id', id)
        .select('id')
      if (error) throw error
      if (!approvedRow || approvedRow.length === 0) {
        throw new Error('Quotation was not approved. Check the Row Level Security UPDATE policy on quotations for this role.')
      }

      // Client activation is best-effort: the quotation row is already
      // approved at this point, so a failure here (RLS block, etc.) must
      // never surface as an approval failure. An update (not upsert) avoids
      // tripping NOT NULL constraints meant for the insert path.
      let clientActivated = false
      let clientWarning = null
      if (quotationRow.client_id) {
        try {
          const { data: activatedRow, error: clientActivateErr } = await supabase
            .from('clients')
            .update({ status: 'active' })
            .eq('id', quotationRow.client_id)
            .select('id')
          if (clientActivateErr) {
            clientWarning = clientActivateErr.message
          } else if (!activatedRow || activatedRow.length === 0) {
            clientWarning = 'Client could not be marked active (no rows updated, possibly blocked by Row Level Security).'
          } else {
            clientActivated = true
          }
        } catch (err) {
          clientWarning = err?.message || 'Client could not be marked active.'
        }
      }

      // Lead-sourced quotations move the lead forward in the pipeline on
      // approval — but never drag a closed lead (won/lost) back into an
      // open stage. Same best-effort pattern as client activation: the
      // quotation is already approved at this point, so a failure here
      // must never surface as an approval failure.
      let leadWarning = null
      if (quotationRow.lead_id) {
        try {
          const { data: lead, error: leadFetchErr } = await supabase
            .from('leads')
            .select('stage')
            .eq('id', quotationRow.lead_id)
            .single()
          if (leadFetchErr) {
            leadWarning = leadFetchErr.message
          } else if (lead && lead.stage !== 'won' && lead.stage !== 'lost') {
            const { data: leadRow, error: leadUpdateErr } = await supabase
              .from('leads')
              .update({ stage: 'proposal_sent' })
              .eq('id', quotationRow.lead_id)
              .select('id')
            if (leadUpdateErr) {
              leadWarning = leadUpdateErr.message
            } else if (!leadRow || leadRow.length === 0) {
              leadWarning = 'Lead could not be moved to proposal sent (no rows updated, possibly blocked by Row Level Security).'
            }
          }
        } catch (err) {
          leadWarning = err?.message || 'Lead could not be moved to proposal sent.'
        }
      }

      const { error: logErr } = await supabase.from('quotation_logs').insert([{
        quotation_id: id,
        performed_by: userId,
        action: 'Quotation approved',
        previous_status: 'pending_approval',
        new_status: 'approved',
      }])
      if (logErr) console.error('[quotation_logs] failed to log quotation approval:', logErr)

      return { clientActivated, clientWarning, leadWarning }
    },
    onSettled: (_d, _err, { id }) => {
      qc.invalidateQueries({ queryKey: ['quotations'] })
      qc.invalidateQueries({ queryKey: ['quotation', id] })
      qc.invalidateQueries({ queryKey: ['clients'] })
      qc.invalidateQueries({ queryKey: ['leads'] })
    },
  })
}

// ── Reject quotation ──────────────────────────────────────────────────────────
export function useRejectQuotation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, userId, reason }) => {
      const { data: rejectedRow, error } = await supabase
        .from('quotations')
        .update({
          status: 'rejected',
          reviewed_by: userId,
          reviewed_at: new Date().toISOString(),
          rejection_reason: reason,
        })
        .eq('id', id)
        .select('id')
      if (error) throw error
      if (!rejectedRow || rejectedRow.length === 0) {
        throw new Error('Quotation was not rejected. Check the Row Level Security UPDATE policy on quotations for this role.')
      }

      const { error: logErr } = await supabase.from('quotation_logs').insert([{
        quotation_id: id,
        performed_by: userId,
        action: `Quotation rejected: ${reason}`,
        previous_status: 'pending_approval',
        new_status: 'rejected',
      }])
      if (logErr) console.error('[quotation_logs] failed to log quotation rejection:', logErr)
    },
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: ['quotations'] })
      qc.invalidateQueries({ queryKey: ['quotation', id] })
    },
  })
}

// ── Convert to invoice (partial selection supported) ──────────────────────────
export function useConvertToInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ quotationId, selectedItemIds, quotation, userId, subject, billToName }) => {
      let clientId = quotation.client_id

      // Lead-sourced quotations don't have a client yet — resolve or create
      // one now, at the point money actually changes hands, instead of at
      // quotation creation. convertLeadToClient is idempotent: if this lead
      // (or another quotation against the same lead) already converted, it
      // returns the existing client instead of creating a duplicate.
      if (!clientId && quotation.lead_id) {
        const { data: lead, error: leadFetchErr } = await supabase
          .from('leads')
          .select('*')
          .eq('id', quotation.lead_id)
          .single()
        if (leadFetchErr) throw leadFetchErr

        const client = await convertLeadToClient({ lead, userId })
        clientId = client.id

        // Backfill client_id so future actions on this quotation don't need
        // to re-resolve the lead. The client_id/lead_id CHECK constraint is
        // strict XOR, so lead_id has to clear as client_id is set — the
        // origin is preserved separately in converted_from_lead_id instead.
        const { data: clientBackfillRow, error: quotationClientErr } = await supabase
          .from('quotations')
          .update({ client_id: clientId, lead_id: null, converted_from_lead_id: quotation.lead_id })
          .eq('id', quotationId)
          .select('id')
        if (quotationClientErr) throw quotationClientErr
        if (!clientBackfillRow || clientBackfillRow.length === 0) {
          throw new Error('Could not link the new client to this quotation. Check the Row Level Security UPDATE policy on quotations for this role.')
        }
      }

      const selectedItems = (quotation.quotation_items || []).filter(i => selectedItemIds.includes(i.id))
      const subtotal = selectedItems.reduce((s, i) => s + Number(i.total_price), 0)

      // 1. Create invoice — totals reflect only the selected items
      const { data: inv, error: invErr } = await supabase
        .from('invoices')
        .insert([{
          client_id: clientId,
          quotation_id: quotation.id,
          converted_from_quotation_id: quotation.id,
          subject: subject || null,
          bill_to_name: billToName || null,
          status: 'draft',
          subtotal,
          discount_amount: 0,
          tax_amount: 0,
          total_amount: subtotal,
          currency: quotation.currency,
          notes: quotation.notes,
          terms: quotation.terms,
          created_by: userId,
        }])
        .select()
        .single()
      if (invErr) throw invErr

      // 2. Copy only the selected line items to the invoice
      if (selectedItems.length > 0) {
        const invItems = selectedItems.map(item => ({
          invoice_id: inv.id,
          service_id: item.service_id,
          service_name: item.service_name,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          sort_order: item.sort_order,
        }))
        const { error: invItemsErr } = await supabase.from('invoice_items').insert(invItems)
        if (invItemsErr) throw invItemsErr
      }

      // 3. Mark just the selected quotation_items as invoiced
      const { data: markedItems, error: markErr } = await supabase
        .from('quotation_items')
        .update({ invoiced: true, invoiced_at: new Date().toISOString(), invoice_id: inv.id })
        .in('id', selectedItemIds)
        .select('id')
      if (markErr) throw markErr
      if (!markedItems || markedItems.length !== selectedItemIds.length) {
        throw new Error(`Invoice ${inv.invoice_number} was created, but only ${markedItems?.length ?? 0} of ${selectedItemIds.length} quotation items could be marked as invoiced. Check the Row Level Security UPDATE policy on quotation_items for this role.`)
      }

      // 4. Only flip the quotation itself once nothing is left to invoice
      const { data: remaining, error: remainingErr } = await supabase
        .from('quotation_items')
        .select('id')
        .eq('quotation_id', quotationId)
        .eq('invoiced', false)
      if (remainingErr) throw remainingErr
      const allInvoiced = (remaining ?? []).length === 0

      if (allInvoiced) {
        const { data: convertedRow, error: updateErr } = await supabase
          .from('quotations')
          .update({
            status: 'converted',
            converted_to_invoice_id: inv.id,
            converted_at: new Date().toISOString(),
          })
          .eq('id', quotationId)
          .select('id')
        if (updateErr) throw updateErr
        if (!convertedRow || convertedRow.length === 0) {
          throw new Error(`Invoice ${inv.invoice_number} was created, but the quotation could not be marked as converted. Check the Row Level Security UPDATE policy on quotations for this role.`)
        }
      }

      const { error: logErr } = await supabase.from('quotation_logs').insert([{
        quotation_id: quotationId,
        performed_by: userId,
        action: `Converted ${selectedItems.length} item(s) to invoice ${inv.invoice_number}`,
        previous_status: 'approved',
        new_status: allInvoiced ? 'converted' : 'approved',
      }])
      if (logErr) console.error('[quotation_logs] failed to log convert to invoice:', logErr)

      return inv
    },
    onSuccess: (_d, { quotationId }) => {
      qc.invalidateQueries({ queryKey: ['quotations'] })
      qc.invalidateQueries({ queryKey: ['quotation', quotationId] })
      qc.invalidateQueries({ queryKey: ['leads'] })
      qc.invalidateQueries({ queryKey: ['clients'] })
    },
  })
}

// ── Revise an approved quotation ──────────────────────────────────────────────
// Header fields carried over onto the new draft copy. Deliberately excludes
// quotation_number (regenerated by trg_set_quotation_reference), and anything
// tied to the original's approval/rejection/conversion history — that stays
// behind on the superseded row as the historical record.
const REVISABLE_HEADER_FIELDS = [
  'client_id', 'lead_id', 'case_id', 'subtotal', 'discount_type', 'discount_value', 'discount_amount',
  'tax_rate', 'tax_amount', 'total_amount', 'currency', 'valid_until', 'notes', 'terms',
  'quotation_type', 'features_notes', 'fees_timelines', 'subject', 'closing_message',
  'signatory_name', 'signatory_position', 'additional_charges', 'prepared_by_override',
  'issue_date', 'tax_liability', 'statutory_requirements', 'employee_visas', 'disclaimer',
  'client_name_snapshot', 'client_contact_snapshot', 'client_phone_snapshot', 'client_email_snapshot',
]

export function useReviseQuotation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, userId }) => {
      const { data: original, error: fetchErr } = await supabase
        .from('quotations')
        .select('*, quotation_items(*)')
        .eq('id', id)
        .single()
      if (fetchErr) throw fetchErr

      const header = {}
      for (const field of REVISABLE_HEADER_FIELDS) header[field] = original[field]

      const { data: revision, error: insertErr } = await supabase
        .from('quotations')
        .insert([{
          ...header,
          status: 'draft',
          created_by: userId,
          revised_from_quotation_id: original.id,
        }])
        .select()
        .single()
      if (insertErr) throw insertErr

      const items = original.quotation_items || []
      if (items.length > 0) {
        const lineItems = items.map(item => ({
          quotation_id: revision.id,
          service_id: item.service_id,
          service_name: item.service_name,
          category: item.category,
          description: item.description,
          quantity: item.quantity,
          unit_type: item.unit_type,
          unit_price: item.unit_price,
          tax_rate: item.tax_rate,
          discount_amount: item.discount_amount,
          notes: item.notes,
          estimated_delivery: item.estimated_delivery,
          total_price: item.total_price,
          sort_order: item.sort_order,
        }))
        const { error: itemsErr } = await supabase.from('quotation_items').insert(lineItems)
        if (itemsErr) {
          throw new Error(
            `Revision ${revision.quotation_number} was created, but copying its line items failed: ${itemsErr.message}. The original quotation was left untouched — please delete the incomplete draft and try again.`
          )
        }
      }

      // Original is only flipped to 'superseded' once the new draft (header + items)
      // fully exists — if this fails, the new draft is still a valid, usable quotation;
      // it just needs the original's status fixed up by hand.
      const { data: supersededRow, error: updateErr } = await supabase
        .from('quotations')
        .update({ status: 'superseded' })
        .eq('id', original.id)
        .select('id')
      if (updateErr) {
        throw new Error(
          `Revision ${revision.quotation_number} was created successfully, but the original quotation ${original.quotation_number} could not be marked as superseded: ${updateErr.message}. Please update its status manually to avoid two active-looking versions.`
        )
      }
      if (!supersededRow || supersededRow.length === 0) {
        throw new Error(
          `Revision ${revision.quotation_number} was created successfully, but the original quotation ${original.quotation_number} was not marked as superseded. Check the Row Level Security UPDATE policy on quotations for this role. Please update its status manually to avoid two active-looking versions.`
        )
      }

      const { error: logErr } = await supabase.from('quotation_logs').insert([
        {
          quotation_id: original.id,
          performed_by: userId,
          action: `Revised into ${revision.quotation_number}`,
          previous_status: 'approved',
          new_status: 'superseded',
        },
        {
          quotation_id: revision.id,
          performed_by: userId,
          action: `Created as revision of ${original.quotation_number}`,
          new_status: 'draft',
        },
      ])
      if (logErr) console.error('[quotation_logs] failed to log quotation revision:', logErr)

      return revision
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quotations'] }),
  })
}

// ── Delete quotation (draft / pending_approval only — enforced by callers) ────
export function useDeleteQuotation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { data: deletedItems, error: itemsErr } = await supabase
        .from('quotation_items')
        .delete()
        .eq('quotation_id', id)
        .select('id')
      if (itemsErr) throw itemsErr
      if (!deletedItems || deletedItems.length === 0) {
        throw new Error('Could not remove quotation items. Check the Row Level Security DELETE policy on quotation_items for this role.')
      }

      const { data: deletedQuotation, error: qtErr } = await supabase
        .from('quotations')
        .delete()
        .eq('id', id)
        .select('id')
      if (qtErr) throw qtErr
      if (!deletedQuotation || deletedQuotation.length === 0) {
        throw new Error('Quotation items were removed, but the quotation itself could not be deleted. Check the Row Level Security DELETE policy on quotations for this role.')
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quotations'] }),
  })
}

// ── Lightweight lookup for revision-chain badges (id/number/status only) ──────
export function useQuotationSummary(id) {
  return useQuery({
    queryKey: ['quotation-summary', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotations')
        .select('id, quotation_number, status')
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
  })
}

// ── Reverse lookup: which quotation (if any) superseded this one ─────────────
export function useSupersededBy(quotationId) {
  return useQuery({
    queryKey: ['quotation-superseded-by', quotationId],
    enabled: !!quotationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotations')
        .select('id, quotation_number')
        .eq('revised_from_quotation_id', quotationId)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

// ── Fetch quotation logs ──────────────────────────────────────────────────────
export function useQuotationLogs(quotationId) {
  return useQuery({
    queryKey: ['quotation_logs', quotationId],
    enabled: !!quotationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotation_logs')
        .select('*, performed_by_user:users(full_name)')
        .eq('quotation_id', quotationId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}
