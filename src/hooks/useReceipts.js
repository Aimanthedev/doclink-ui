import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { getActiveTemplateId } from '../lib/templateLoader'

// ── Fetch all receipts ────────────────────────────────────────────────────────
export function useReceipts(filters = {}) {
  return useQuery({
    queryKey: ['receipts', filters],
    queryFn: async () => {
      let query = supabase
        .from('receipts')
        .select(`
          *,
          invoice:invoices(id, invoice_number, bill_to_name, client:clients(id, company_name, contact_person)),
          receipt_items(*),
          created_by_user:users!receipts_created_by_fkey(id, full_name),
          approved_by_user:users!receipts_approved_by_fkey(id, full_name)
        `)
        .order('created_at', { ascending: false })

      if (filters.status) query = query.eq('status', filters.status)
      if (filters.invoice_id) query = query.eq('invoice_id', filters.invoice_id)

      const { data, error } = await query.limit(200)
      if (error) throw error
      return data ?? []
    },
  })
}

// ── Fetch single receipt ──────────────────────────────────────────────────────
export function useReceipt(id) {
  return useQuery({
    queryKey: ['receipt', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('receipts')
        .select(`
          *,
          invoice:invoices(*, client:clients(*)),
          receipt_items(*),
          created_by_user:users!receipts_created_by_fkey(id, full_name),
          approved_by_user:users!receipts_approved_by_fkey(id, full_name)
        `)
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
  })
}

// ── Balances for an invoice, feeds the receipt creation UI ────────────────────
export function useInvoiceItemBalances(invoiceId) {
  return useQuery({
    queryKey: ['invoice_item_balances', invoiceId],
    enabled: !!invoiceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoice_item_balances')
        .select('*')
        .eq('invoice_id', invoiceId)
      if (error) throw error
      return data ?? []
    },
  })
}

// ── Create draft receipt ───────────────────────────────────────────────────────
export function useCreateReceipt() {
  const qc = useQueryClient()
  return useMutation({
    // items: [{ invoice_item_id, amount, description_snapshot }]
    mutationFn: async ({ invoiceId, items, userId, issueDate, paymentTerms }) => {
      const { data: receipt, error: receiptErr } = await supabase
        .from('receipts')
        .insert([{
          invoice_id: invoiceId,
          status: 'draft',
          issue_date: issueDate || new Date().toISOString().slice(0, 10),
          payment_terms: paymentTerms || null,
          created_by: userId,
        }])
        .select()
        .single()
      if (receiptErr) throw receiptErr

      const receiptItems = items.map(i => ({
        receipt_id: receipt.id,
        invoice_item_id: i.invoice_item_id,
        amount: i.amount,
        description_snapshot: i.description_snapshot,
      }))
      const { error: itemsErr } = await supabase.from('receipt_items').insert(receiptItems)
      if (itemsErr) throw itemsErr

      return receipt
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['receipts'] }),
  })
}

// ── Edit a draft receipt ───────────────────────────────────────────────────────
// receipt_items has no update-in-place pattern in this codebase, so the item
// set is replaced wholesale: delete then reinsert, same sequential
// awaited-with-error-check style as useCreateReceipt above. Only ever called
// on draft receipts, so a failure between the delete and the reinsert
// (leaving the receipt with zero items briefly) is low-risk, but it still
// throws so the caller's catch block surfaces the failure instead of the
// receipt silently looking valid with no items.
export function useUpdateReceipt() {
  const qc = useQueryClient()
  return useMutation({
    // items: [{ invoice_item_id, amount, description_snapshot }]
    mutationFn: async ({ id, issueDate, paymentTerms, items }) => {
      const { error: receiptErr } = await supabase
        .from('receipts')
        .update({
          issue_date: issueDate || new Date().toISOString().slice(0, 10),
          payment_terms: paymentTerms || null,
        })
        .eq('id', id)
      if (receiptErr) throw receiptErr

      // .select() is required here to detect a zero-row delete, same blind
      // spot as the invoice status update bug: without it, an RLS DELETE
      // policy silently excluding these rows returns error: null, execution
      // falls through into the insert below, and the new items land on top
      // of the old ones instead of replacing them.
      const { data: deletedRows, error: deleteErr } = await supabase
        .from('receipt_items')
        .delete()
        .eq('receipt_id', id)
        .select('id')
      if (deleteErr) throw deleteErr
      // A receipt reaching this edit path always has at least one existing
      // item (creation requires at least one), so an empty result here means
      // the delete matched nothing, not that there was nothing to delete.
      if (!deletedRows || deletedRows.length === 0) {
        throw new Error('Could not remove existing receipt items. Check the Row Level Security DELETE policy on receipt_items for this role.')
      }

      const receiptItems = items.map(i => ({
        receipt_id: id,
        invoice_item_id: i.invoice_item_id,
        amount: i.amount,
        description_snapshot: i.description_snapshot,
      }))
      const { error: insertErr } = await supabase.from('receipt_items').insert(receiptItems)
      if (insertErr) throw insertErr
    },
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: ['receipts'] })
      qc.invalidateQueries({ queryKey: ['receipt', id] })
    },
  })
}

// ── Generic status update (e.g. move a rejected receipt back to draft) ───────
export function useUpdateReceiptStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }) => {
      const { error } = await supabase.from('receipts').update({ status }).eq('id', id)
      if (error) throw error
    },
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: ['receipts'] })
      qc.invalidateQueries({ queryKey: ['receipt', id] })
    },
  })
}

// ── Submit for approval ───────────────────────────────────────────────────────
export function useSubmitReceiptForApproval() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }) => {
      const { error } = await supabase
        .from('receipts')
        .update({ status: 'pending_approval' })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: ['receipts'] })
      qc.invalidateQueries({ queryKey: ['receipt', id] })
    },
  })
}

// ── Approve receipt ────────────────────────────────────────────────────────────
// The one place money can be double-counted if this check is skipped: re-reads
// remaining_balance from invoice_item_balances right before flipping status,
// since that view only counts already-approved receipts toward amount_received
// (this receipt is still pending_approval at the time of this read, so its own
// amount is correctly excluded from the balance being checked against).
export function useApproveReceipt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, userId, signatureUrl }) => {
      const { data: receiptItems, error: itemsErr } = await supabase
        .from('receipt_items')
        .select('invoice_item_id, amount')
        .eq('receipt_id', id)
      if (itemsErr) throw itemsErr
      if (!receiptItems || receiptItems.length === 0) {
        throw new Error('This receipt has no items and cannot be approved')
      }

      const invoiceItemIds = receiptItems.map(i => i.invoice_item_id)
      const { data: balances, error: balErr } = await supabase
        .from('invoice_item_balances')
        .select('invoice_item_id, remaining_balance')
        .in('invoice_item_id', invoiceItemIds)
      if (balErr) throw balErr

      for (const item of receiptItems) {
        const balance = balances?.find(b => b.invoice_item_id === item.invoice_item_id)
        const remaining = Number(balance?.remaining_balance ?? 0)
        if (Number(item.amount) > remaining) {
          throw new Error('This receipt would exceed the remaining balance on one or more invoice items. Refresh and check the amounts before approving.')
        }
      }

      // Pin the template this receipt is approved with (throws a clear
      // TemplateLoadError, aborting the approval, if none is active).
      const templateId = await getActiveTemplateId('receipt')

      const { error } = await supabase
        .from('receipts')
        .update({
          status: 'approved',
          approved_by: userId,
          approved_at: new Date().toISOString(),
          signature_url: signatureUrl || null,
          template_id: templateId,
        })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: ['receipts'] })
      qc.invalidateQueries({ queryKey: ['receipt', id] })
      qc.invalidateQueries({ queryKey: ['invoice_item_balances'] })
    },
  })
}

// ── Reject receipt ────────────────────────────────────────────────────────────
export function useRejectReceipt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, userId, reason }) => {
      const { error } = await supabase
        .from('receipts')
        .update({
          status: 'rejected',
          approved_by: userId,
          rejection_reason: reason || null,
        })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: ['receipts'] })
      qc.invalidateQueries({ queryKey: ['receipt', id] })
    },
  })
}
