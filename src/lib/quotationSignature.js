// A quotation counts as "signed" if it's currently approved, if it has been
// converted to an invoice (only reachable from 'approved', so it was always
// signed, no signature_url guard needed here unlike superseded), or if it
// was approved and has since been revised (status flipped to 'superseded')
// with the original signature_url/signed_at/reviewed_by fields still intact
// on the superseded row as the historical record.
export function wasQuotationSigned(q) {
  return q?.status === 'approved' || q?.status === 'converted' || (q?.status === 'superseded' && !!q?.signature_url)
}
