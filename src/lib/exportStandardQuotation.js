import { saveAs } from 'file-saver'
import { fillDocxTemplate } from './docxTemplateEngine'
import { numberToWordsQAR } from './numberToWords'
import { loadTemplateForDocument, quotationTemplateType } from './templateLoader'
import { wasQuotationSigned } from './quotationSignature'

export async function exportStandardQuotationFromTemplate(quotation, { returnBlob = false } = {}) {
  const q = quotation
  const items = q.quotation_items ?? []

  // Approved quotations use the template they were approved with; drafts use
  // the active template for their type. Throws a TemplateLoadError (no silent
  // fallback to a bundled template).
  const templateArrayBuffer = await loadTemplateForDocument('quotation', q, quotationTemplateType('standard'))

  const data = {
    date: new Date(q.issue_date || q.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
    reference_number: q.quotation_number,
    subject: (q.subject && q.subject.trim()) ? q.subject.trim() : 'Quotation',
    valid_until: q.valid_until
      ? new Date(q.valid_until).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
      : '',
    client_name: q.client_name_snapshot || q.client_contact_snapshot || q.client?.company_name || q.client?.contact_person || 'N/A',
    client_no: q.client_phone_snapshot || q.client?.phone || 'N/A',
    total_in_words: numberToWordsQAR(q.total_amount),
    total: Number(q.total_amount ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 }),
    e_sign: (wasQuotationSigned(q) && q.reviewed_by_user?.full_name) || q.signatory_name || '',
    e_sign_url: wasQuotationSigned(q) ? (q.signature_url || q.reviewed_by_user?.signature_url || null) : null,
    services: items.map(item => ({
      name: item.service_name,
      description: item.description || '',
      price: item.total_price,
    })),
  }

  const blob = await fillDocxTemplate(templateArrayBuffer, data)
  if (returnBlob) return blob
  saveAs(blob, `${q.quotation_number}.docx`)
}
