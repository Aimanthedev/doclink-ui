import { saveAs } from 'file-saver'
import { fillDocxTemplate } from './docxTemplateEngine'
import { numberToWordsQAR } from './numberToWords'
import { loadTemplateForDocument, TemplateLoadError } from './templateLoader'

export async function exportInvoiceFromTemplate(invoice, companySettings = {}, { returnBlob = false } = {}) {
  const inv = invoice
  const items = inv.items ?? inv.invoice_items ?? []

  // Approved invoices use the template they were approved with; drafts use the
  // active invoice template. Throws a TemplateLoadError (no silent fallback).
  const templateArrayBuffer = await loadTemplateForDocument('invoice', inv, 'standard')

  const isApproved = inv.status === 'approved'
  const total = Number(inv.total_amount ?? 0)
  const client = inv.client ?? {}
  const settings = companySettings ?? {}
  // When bill_to_name is set, it is the ONLY thing that may appear in the
  // Bill To area â€” no client contact person or address alongside it.
  const hasBillTo = !!inv.bill_to_name

  const data = {
    inv_reference_number: inv.invoice_number,
    date: new Date(inv.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
    payment_terms: inv.payment_terms || 'Due on receipt',
    company_name: hasBillTo ? inv.bill_to_name : (client.company_name || client.contact_person || ''),
    client_name: hasBillTo ? '' : (client.contact_person || ''),
    address: hasBillTo ? '' : (client.address || ''),
    total: total.toLocaleString('en-US', { minimumFractionDigits: 2 }),
    total_in_words: numberToWordsQAR(total),
    e_sign: '',
    // null (not '') when unapproved or unsigned â€” fillDocxTemplate treats a
    // falsy e_sign_url as "no image", skips embedding entirely, and just
    // clears the {{e_sign}} text token. Never throws for a missing signature.
    e_sign_url: isApproved ? (inv.signature_url || null) : null,
    ac_name: settings.bank_ac_name || '',
    ac_number: settings.bank_ac_number || '',
    iban: settings.bank_iban || '',
    bank_name: settings.bank_name || '',
    swift_code: settings.bank_swift_code || '',
    'Fawran Alias': settings.bank_fawran_alias || '',
    items,
  }

  let blob
  try {
    blob = await fillDocxTemplate(templateArrayBuffer, data)
  } catch (fillErr) {
    // A malformed/edited template (missing token, broken row markup, etc.)
    // must fail loudly, never produce a different-looking invoice.
    console.error('[exportInvoice] fillDocxTemplate failed:', fillErr)
    throw new TemplateLoadError(`The invoice template could not be filled in (${fillErr?.message || 'unknown error'}).`)
  }

  if (returnBlob) return blob
  saveAs(blob, `${inv.invoice_number}.docx`)
}
