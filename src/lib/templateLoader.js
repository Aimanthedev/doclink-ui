import { supabase } from './supabase'

// Single template loader for quotations, invoices and receipts.
//
// Rules:
//  - An approved document is pinned to the exact template row it was approved
//    with (documents.template_id), regardless of who downloads it or which
//    template is active now.
//  - A draft, or an approved document with no pinned template (approved before
//    pinning existed), uses the currently active template of its OWN type.
//  - Nothing here ever falls back silently: if the template cannot be found,
//    read, signed or fetched, a TemplateLoadError is thrown with a message that
//    is safe to show to the user. Callers must surface it, not swallow it.

export class TemplateLoadError extends Error {
  constructor(message) {
    super(message)
    this.name = 'TemplateLoadError'
  }
}

// Message to show for a failed export: template problems are shown verbatim,
// anything else keeps the caller's generic wording.
export function exportErrorMessage(err, fallback) {
  return err instanceof TemplateLoadError ? err.message : fallback
}

const KINDS = {
  quotation: { table: 'quotation_templates', bucket: 'quotation-templates', label: 'quotation', typeColumn: 'quotation_type' },
  invoice:   { table: 'invoice_templates',   bucket: 'invoice-templates',   label: 'invoice',   typeColumn: 'template_type' },
  receipt:   { table: 'receipt_templates',   bucket: 'receipt-templates',   label: 'receipt',   typeColumn: null },
}

// Qatari formation quotations are served by the expat formation template
// (unchanged from the previous behaviour).
export function quotationTemplateType(quotationType) {
  return quotationType === 'company_formation_qatari' ? 'company_formation_expat' : quotationType
}

const DOC_TABLES = { quotation: 'quotations', invoice: 'invoices', receipt: 'receipts' }

// The pinned template_id is read fresh from the database rather than trusted
// from a (possibly stale, pre-approval) cached object.
async function getPinnedTemplateId(kind, doc) {
  if (!doc?.id) return doc?.template_id ?? null
  const { data, error } = await supabase
    .from(DOC_TABLES[kind])
    .select('template_id')
    .eq('id', doc.id)
    .maybeSingle()
  if (error) {
    throw new TemplateLoadError(`Could not check which ${KINDS[kind].label} template this document uses (${error.message}).`)
  }
  return data?.template_id ?? null
}

async function fetchActiveRow(kind, type) {
  const { table, label, typeColumn } = KINDS[kind]
  let query = supabase.from(table).select('*').eq('is_active', true)
  if (typeColumn) query = query.eq(typeColumn, type)
  const { data, error } = await query
  if (error) {
    throw new TemplateLoadError(`Could not load the active ${label} template (${error.message}).`)
  }
  if (!data || data.length === 0) {
    throw new TemplateLoadError(`No active ${label} template is set up. Upload one in Settings before exporting.`)
  }
  if (data.length > 1) {
    throw new TemplateLoadError(`More than one active ${label} template exists. Fix this in Settings before exporting.`)
  }
  return data[0]
}

// Used at approval time to decide which template the document is pinned to.
export async function getActiveTemplateId(kind, type) {
  return (await fetchActiveRow(kind, type)).id
}

async function fetchPinnedRow(kind, type, templateId) {
  const { table, label, typeColumn } = KINDS[kind]
  const { data, error } = await supabase.from(table).select('*').eq('id', templateId).maybeSingle()
  if (error) {
    throw new TemplateLoadError(`Could not load the ${label} template this document was approved with (${error.message}).`)
  }
  if (!data) {
    throw new TemplateLoadError(`The ${label} template this document was approved with could not be found or read.`)
  }
  // Never serve another type's template, even if the pin points at one.
  if (typeColumn && data[typeColumn] !== type) {
    throw new TemplateLoadError(`The stored ${label} template does not match this document's type.`)
  }
  return data
}

async function downloadRow(kind, row) {
  const { bucket, label } = KINDS[kind]
  if (!row.storage_path) {
    throw new TemplateLoadError(`The ${label} template record has no file attached.`)
  }
  const { data: signed, error: signError } = await supabase.storage
    .from(bucket)
    .createSignedUrl(row.storage_path, 3600)
  if (signError || !signed?.signedUrl) {
    throw new TemplateLoadError(`Could not open the ${label} template file${signError ? ` (${signError.message})` : ''}.`)
  }
  let res
  try {
    res = await fetch(signed.signedUrl)
  } catch (err) {
    throw new TemplateLoadError(`Could not download the ${label} template file (${err?.message || 'network error'}).`)
  }
  if (!res.ok) {
    throw new TemplateLoadError(`Could not download the ${label} template file (HTTP ${res.status}).`)
  }
  return res.arrayBuffer()
}

// kind: 'quotation' | 'invoice' | 'receipt'
// type: quotation_type (already mapped via quotationTemplateType) or
//       'standard' for invoices; ignored for receipts.
export async function loadTemplateForDocument(kind, doc, type) {
  const pinnedId = await getPinnedTemplateId(kind, doc)
  const row = pinnedId
    ? await fetchPinnedRow(kind, type, pinnedId)
    : await fetchActiveRow(kind, type)
  return downloadRow(kind, row)
}
