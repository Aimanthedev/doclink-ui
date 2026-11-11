import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { getActiveTemplateId } from '../lib/templateLoader'

export function useInvoices(filters = {}) {
  return useQuery({
    queryKey: ['invoices', filters],
    queryFn: async () => {
      let query = supabase
        .from('invoices')
        .select('*, client:clients(id, client_code, company_name, contact_person), invoice_items(*), payments(*)')
        .order('created_at', { ascending: false })

      if (filters.status) query = query.eq('status', filters.status)
      if (filters.client_id) query = query.eq('client_id', filters.client_id)

      const { data, error } = await query.limit(200)
      if (error) throw error
      return data ?? []
    },
  })
}

export function useRecordPayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ invoiceId, payment }) => {
      const { error: payErr } = await supabase.from('payments').insert([{ ...payment, invoice_id: invoiceId }])
      if (payErr) throw payErr

      const { data: inv, error: fetchErr } = await supabase.from('invoices').select('amount_paid, total_amount').eq('id', invoiceId).single()
      if (fetchErr) throw new Error(`Payment was recorded, but the invoice totals could not be read to update its status: ${fetchErr.message}. Check the invoice's amount_paid manually.`)
      const newPaid = Number(inv.amount_paid) + Number(payment.amount)
      const newStatus = newPaid >= Number(inv.total_amount) ? 'paid' : 'partially_paid'

      const { data: updated, error: updateErr } = await supabase
        .from('invoices')
        .update({ amount_paid: newPaid, status: newStatus, paid_at: newStatus === 'paid' ? new Date().toISOString() : null })
        .eq('id', invoiceId)
        .select('id')
      if (updateErr) throw updateErr
      if (!updated || updated.length === 0) {
        throw new Error('Invoice payment was not recorded. Check the Row Level Security UPDATE policy on invoices for this role.')
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] }),
  })
}

// ── Update arbitrary invoice fields (e.g. bill_to_name) ───────────────────────
export function useUpdateInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, fields }) => {
      const { data, error } = await supabase.from('invoices').update(fields).eq('id', id).select('id')
      if (error) throw error
      if (!data || data.length === 0) {
        throw new Error('Invoice was not updated. Check the Row Level Security UPDATE policy on invoices for this role.')
      }
    },
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: ['invoices'] })
      qc.invalidateQueries({ queryKey: ['invoice', id] })
    },
  })
}

export function useUpdateInvoiceStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }) => {
      const { data, error } = await supabase.from('invoices').update({ status }).eq('id', id).select('id')
      if (error) throw error
      if (!data || data.length === 0) {
        throw new Error('Invoice status was not updated. Check the Row Level Security UPDATE policy on invoices for this role.')
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] }),
  })
}

// ── Fetch single invoice ──────────────────────────────────────────────────────
export function useInvoice(id) {
  return useQuery({
    queryKey: ['invoice', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          client:clients(*),
          items:invoice_items(*),
          reviewed_by_user:users!invoices_reviewed_by_fkey(full_name),
          created_by_user:users!invoices_created_by_fkey(full_name)
        `)
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
  })
}

// ── Submit for approval ───────────────────────────────────────────────────────
export function useSubmitInvoiceForApproval() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }) => {
      // .select() is required here to detect a zero-row update — without it,
      // an RLS UPDATE policy silently excluding this row returns error: null
      // and no way to tell "updated" from "matched nothing", which is exactly
      // how this bug (success toast, status never actually changes) happens.
      const { data, error } = await supabase
        .from('invoices')
        .update({ status: 'pending_approval' })
        .eq('id', id)
        .select('id')
      if (error) throw error
      if (!data || data.length === 0) {
        throw new Error('Invoice status was not updated. Check the Row Level Security UPDATE policy on invoices for this role.')
      }
    },
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: ['invoices'] })
      qc.invalidateQueries({ queryKey: ['invoice', id] })
    },
  })
}

// ── Approve invoice ───────────────────────────────────────────────────────────
export function useApproveInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ invoiceId, reviewerId, signatureUrl, signatoryName, signatoryPosition }) => {
      // Pin the template this invoice is approved with (throws a clear
      // TemplateLoadError, aborting the approval, if none is active).
      const templateId = await getActiveTemplateId('invoice', 'standard')

      const { data, error } = await supabase
        .from('invoices')
        .update({
          status: 'approved',
          reviewed_by: reviewerId,
          signature_url: signatureUrl || null,
          signed_at: new Date().toISOString(),
          signatory_name: signatoryName || null,
          signatory_position: signatoryPosition || null,
          template_id: templateId,
        })
        .eq('id', invoiceId)
        .select('id')
      if (error) throw error
      if (!data || data.length === 0) {
        throw new Error('Invoice was not approved. Check the Row Level Security UPDATE policy on invoices for this role.')
      }
    },
    onSuccess: (_d, { invoiceId }) => {
      qc.invalidateQueries({ queryKey: ['invoices'] })
      qc.invalidateQueries({ queryKey: ['invoice', invoiceId] })
    },
  })
}

// ── Reject invoice ────────────────────────────────────────────────────────────
export function useRejectInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, userId, reason }) => {
      const { data, error } = await supabase
        .from('invoices')
        .update({
          status: 'rejected',
          reviewed_by: userId,
          reviewed_at: new Date().toISOString(),
          rejection_reason: reason || null,
        })
        .eq('id', id)
        .select('id')
      if (error) throw error
      if (!data || data.length === 0) {
        throw new Error('Invoice was not rejected. Check the Row Level Security UPDATE policy on invoices for this role.')
      }
    },
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: ['invoices'] })
      qc.invalidateQueries({ queryKey: ['invoice', id] })
    },
  })
}