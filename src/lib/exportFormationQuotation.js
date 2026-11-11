import { saveAs } from 'file-saver'
import { fillDocxTemplate } from './docxTemplateEngine'
import { numberToWordsQAR } from './numberToWords'
import { loadTemplateForDocument, quotationTemplateType } from './templateLoader'
import { wasQuotationSigned } from './quotationSignature'

const DEFAULT_PAYMENT_TERMS = 'Full advance payment of our service charges upon signing agreement, being nonrefundable in case of withdrawal from the application process at any stage and does not include government related fees. Other fees payable in full upon maturity of the application stage as applicable.'

function getFeature(featuresNotes, field, fallback) {
  const match = (featuresNotes || []).find(f => f.field === field)
  return match?.value ?? fallback
}

export async function exportFormationQuotationFromTemplate(quotation, { returnBlob = false } = {}) {
  const q = quotation
  const items = q.quotation_items ?? []
  const features = q.features_notes ?? []

  // Approved quotations use the template they were approved with; drafts use
  // the active template for their type. Throws a TemplateLoadError (no silent
  // fallback to a bundled template).
  const templateArrayBuffer = await loadTemplateForDocument('quotation', q, quotationTemplateType(q.quotation_type))

  const data = {
    date: new Date(q.issue_date || q.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
    reference_number: q.quotation_number,
    client_name: q.client_name_snapshot || q.client_contact_snapshot || q.client?.company_name || q.client?.contact_person || 'N/A',
    client_no: q.client_phone_snapshot || q.client?.phone || 'N/A',
    ownership: getFeature(features, 'Legal form of business', q.quotation_type === 'company_formation_expat'
      ? '100% Expat Owned (non-Qatari) Limited Liability Company'
      : 'Qatari Owned Limited Liability Company'),
    shareholders: getFeature(features, 'Shareholders', '01 nos.'),
    capital: getFeature(features, 'Capital Declaration', 'QAR 200,000.00'),
    regulatory_body: getFeature(features, 'Regulatory Body', 'Ministry of Commerce and Industry (MoCI)'),
    nature_of_business: getFeature(features, 'Nature of Business', 'TRADING'),
    activities: getFeature(features, 'Business Activities', ''),
    number_of_activities: getFeature(features, 'Number of Activities', '02'),
    payment_terms: getFeature(features, 'Payment Terms', DEFAULT_PAYMENT_TERMS),
    quotation_validity: getFeature(features, 'Quotation Validity', '7 days'),
    tax_liability: getFeature(features, 'Tax Liability', '10% Tax from annual net profits earned for Expat shareholders (Zero liability for Personal income tax) 0% Tax for Qatari shareholders (if any)'),
    statutory_requirements: getFeature(features, 'Statutory Requirements', 'Annual audit reports submission mandatory for WLL/LLC as per the articles of association'),
    employee_visas: getFeature(features, 'Employee Visas', 'Initial 10 nos. allocation with additional subject to labor law compliance'),
    disclaimer: getFeature(features, 'Disclaimer', 'Final outcome of application is solely at the discretion of the relevant ministries, hence, we will not be held liable for any delays, rejections or restrictions imposed by the governing authorities including changes to the incorporation related laws implemented at any stage of the application process. All stated government related fees subject to actual at the time of payment.'),
    total_in_words: numberToWordsQAR(q.total_amount),
    total: Number(q.total_amount ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 }),
    e_sign: (wasQuotationSigned(q) && q.reviewed_by_user?.full_name) || q.signatory_name || '',
    e_sign_url: wasQuotationSigned(q) ? (q.signature_url || q.reviewed_by_user?.signature_url || null) : null,
    services: items.map(item => ({ name: item.service_name, price: item.total_price })),
  }

  const blob = await fillDocxTemplate(templateArrayBuffer, data)
  if (returnBlob) return blob
  saveAs(blob, `${q.quotation_number}.docx`)
}
