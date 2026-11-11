// Invoices and receipts are "signed" once approved. Once signed, PDF is the
// only downloadable format. For quotations use wasQuotationSigned.
export function isInvoiceSigned(inv) {
  return inv?.status === 'approved'
}

export function isReceiptSigned(receipt) {
  return receipt?.status === 'approved'
}
