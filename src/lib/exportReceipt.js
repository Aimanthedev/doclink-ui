import { saveAs } from 'file-saver'
import { fillDocxTemplate } from './docxTemplateEngine'
import { numberToWordsQAR } from './numberToWords'
import { loadTemplateForDocument, TemplateLoadError } from './templateLoader'
import { supabase } from './supabase'

export async function exportReceiptFromTemplate(receipt, { returnBlob = false } = {}) {
  const rawItems = receipt.receipt_items ?? []
  const invoice = receipt.invoice ?? {}
  const client = invoice.client ?? {}

  // remaining_balance isn't joined onto useReceipt (invoice_item_balances is a
  // view, not embeddable via the normal FK-join syntax), so it's fetched here
  // as a small live lookup for the per-row item_remaining_1 token.
  let allBalances = []
  if (invoice.id) {
    const { data: balances } = await supabase
      .from('invoice_item_balances')
      .select('invoice_item_id, remaining_balance')
      .eq('invoice_id', invoice.id)
    allBalances = balances ?? []
  }
  const balancesById = Object.fromEntries(allBalances.map(b => [b.invoice_item_id, b.remaining_balance]))

  // quantity/unit_price are static reference values off the original
  // invoice_items row (they don't change after the invoice is created,
  // unlike remaining_balance) â€” same live-lookup-by-invoice_item_id
  // mechanism as the balance fetch above.
  let invoiceItemsById = {}
  const invoiceItemIds = rawItems.map(i => i.invoice_item_id).filter(Boolean)
  if (invoiceItemIds.length > 0) {
    const { data: invoiceItems } = await supabase
      .from('invoice_items')
      .select('id, quantity, unit_price')
      .in('id', invoiceItemIds)
    invoiceItemsById = Object.fromEntries((invoiceItems ?? []).map(i => [i.id, i]))
  }

  const items = rawItems.map(i => {
    const invoiceItem = invoiceItemsById[i.invoice_item_id]
    const quantity = invoiceItem?.quantity ?? ''
    const unitPrice = invoiceItem?.unit_price ?? 0
    return {
      description: i.description_snapshot,
      amount: i.amount,
      // full listed value of the item (qty x unit price), not the partial
      // amount actually received for it. Feeds item_amount_1 and the
      // {{total}} sum below. The actual amount received stays visible only
      // in total_received, computed separately from `amount` above.
      full_value: Number(quantity || 0) * Number(unitPrice || 0),
      remaining_balance: balancesById[i.invoice_item_id] ?? 0,
      quantity,
      unit_price: unitPrice,
    }
  })

  // Approved receipts use the template they were approved with; drafts use the
  // active receipt template. Throws a TemplateLoadError (no silent fallback).
  const templateArrayBuffer = await loadTemplateForDocument('receipt', receipt)

  const isApproved = receipt.status === 'approved'
  const total = items.reduce((s, i) => s + Number(i.amount || 0), 0)

  // Full listed value of this receipt's own items (qty x unit price, summed),
  // not the invoice-wide total_amount. {{total}} reflects what these items
  // are worth in full, separate from total_received which reflects what was
  // actually paid.
  const receiptItemsFullTotal = items.reduce((s, i) => s + Number(i.full_value || 0), 0)

  // Receipt-scoped balance: what's left of THIS receipt's own items after
  // what was actually received, not an invoice-wide figure. receiptItemsFullTotal
  // is the full listed value of this receipt's items, total is what was received.
  const balanceAfterReceipt = receiptItemsFullTotal - total

  const data = {
    receipt_number: receipt.receipt_number,
    date: receipt.issue_date
      ? new Date(receipt.issue_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
      : '',
    inv_reference_number: invoice.invoice_number || '',
    company_name: invoice.bill_to_name || client.company_name || client.contact_person || '',
    client_name: invoice.bill_to_name ? '' : (client.contact_person || ''),
    payment_terms: receipt.payment_terms || '',
    total_received: total.toLocaleString('en-US', { minimumFractionDigits: 2 }),
    total_received_in_words: numberToWordsQAR(total),
    total: receiptItemsFullTotal.toLocaleString('en-US', { minimumFractionDigits: 2 }),
    total_in_words: numberToWordsQAR(receiptItemsFullTotal),
    balance: balanceAfterReceipt.toLocaleString('en-US', { minimumFractionDigits: 2 }),
    total_balance_in_words: numberToWordsQAR(balanceAfterReceipt),
    e_sign: '',
    // null (not '') when unapproved or unsigned â€” strict ternary, no fallback
    // chain, same gating used for invoices and quotations.
    e_sign_url: isApproved ? (receipt.signature_url || null) : null,
    receiptItems: items,
  }

  let blob
  try {
    blob = await fillDocxTemplate(templateArrayBuffer, data)
  } catch (fillErr) {
    console.error('[exportReceipt] fillDocxTemplate failed:', fillErr)
    throw new TemplateLoadError(`The receipt template could not be filled in (${fillErr?.message || 'unknown error'}).`)
  }

  if (returnBlob) return blob
  saveAs(blob, `${receipt.receipt_number}.docx`)
}
