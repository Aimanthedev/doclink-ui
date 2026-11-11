import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, AlignmentType, BorderStyle, WidthType, ImageRun,
} from 'docx'
import { saveAs } from 'file-saver'
import { wasQuotationSigned } from './quotationSignature'

function cell(text, bold = false, align = AlignmentType.LEFT, shade = null) {
  return new TableCell({
    shading: shade ? { fill: shade } : undefined,
    margins: { top: 120, bottom: 120, left: 160, right: 160 },
    children: [
      new Paragraph({
        alignment: align,
        children: [new TextRun({ text: String(text ?? ''), bold, size: 20, font: 'Calibri' })],
      }),
    ],
  })
}

function itemCell(item) {
  const subParts = []
  if (item.category) subParts.push(`Category: ${item.category}`)
  if (item.tax_rate) subParts.push(`Tax ${item.tax_rate}%`)
  if (item.discount_amount) subParts.push(`Discount QAR ${Number(item.discount_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`)
  if (item.estimated_delivery) subParts.push(`Est. delivery: ${item.estimated_delivery}`)
  if (item.notes) subParts.push(item.notes)

  const children = [
    new Paragraph({ children: [new TextRun({ text: item.service_name, bold: true, size: 20, font: 'Calibri' })] }),
  ]
  if (item.description) {
    children.push(new Paragraph({ children: [new TextRun({ text: item.description, size: 18, font: 'Calibri', color: '666666' })] }))
  }
  if (subParts.length > 0) {
    children.push(new Paragraph({ children: [new TextRun({ text: subParts.join(' · '), size: 16, font: 'Calibri', color: '999999' })] }))
  }

  return new TableCell({
    margins: { top: 120, bottom: 120, left: 160, right: 160 },
    children,
  })
}

export async function exportQuotationDocx(quotation, { returnBlob = false } = {}) {
  const q = quotation
  const client = q.client
  const items = q.quotation_items ?? []

  const clientName = client?.company_name || client?.contact_person || 'N/A'
  const now = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
  const validUntil = q.valid_until
    ? new Date(q.valid_until).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
    : 'N/A'
  const preparedBy = q.prepared_by_override || q.created_by_user?.full_name || 'N/A'
  const tax = Number(q.tax_amount ?? 0)
  const additionalCharges = Number(q.additional_charges ?? 0)

  // Line items table rows
  const headerRow = new TableRow({
    children: [
      cell('#', true, AlignmentType.CENTER, 'C9A84C'),
      cell('Service / Description', true, AlignmentType.LEFT, 'C9A84C'),
      cell('Qty', true, AlignmentType.CENTER, 'C9A84C'),
      cell('Unit Price (QAR)', true, AlignmentType.RIGHT, 'C9A84C'),
      cell('Total (QAR)', true, AlignmentType.RIGHT, 'C9A84C'),
    ],
  })

  const itemRows = items.map((item, i) =>
    new TableRow({
      children: [
        cell(i + 1, false, AlignmentType.CENTER),
        itemCell(item),
        cell(`${item.quantity}${item.unit_type ? ` ${item.unit_type}` : ''}`, false, AlignmentType.CENTER),
        cell(Number(item.unit_price).toLocaleString('en-US', { minimumFractionDigits: 2 }), false, AlignmentType.RIGHT),
        cell(Number(item.total_price).toLocaleString('en-US', { minimumFractionDigits: 2 }), false, AlignmentType.RIGHT),
      ],
    })
  )

  const subtotalRow = new TableRow({
    children: [
      cell(''), cell(''), cell(''),
      cell('Subtotal', true, AlignmentType.RIGHT),
      cell(`QAR ${Number(q.subtotal).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, true, AlignmentType.RIGHT),
    ],
  })

  const discountRow = q.discount_amount > 0
    ? new TableRow({
        children: [
          cell(''), cell(''), cell(''),
          cell('Discount', false, AlignmentType.RIGHT),
          cell(`- QAR ${Number(q.discount_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, false, AlignmentType.RIGHT),
        ],
      })
    : null

  const taxRow = tax > 0
    ? new TableRow({
        children: [
          cell(''), cell(''), cell(''),
          cell('Tax', false, AlignmentType.RIGHT),
          cell(`+ QAR ${tax.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, false, AlignmentType.RIGHT),
        ],
      })
    : null

  const additionalChargesRow = additionalCharges > 0
    ? new TableRow({
        children: [
          cell(''), cell(''), cell(''),
          cell('Additional Charges', false, AlignmentType.RIGHT),
          cell(`+ QAR ${additionalCharges.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, false, AlignmentType.RIGHT),
        ],
      })
    : null

  const totalRow = new TableRow({
    children: [
      cell(''), cell(''), cell(''),
      cell('GRAND TOTAL', true, AlignmentType.RIGHT),
      cell(`QAR ${Number(q.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, true, AlignmentType.RIGHT),
    ],
  })

  const tableRows = [
    headerRow, ...itemRows, subtotalRow,
    ...(discountRow ? [discountRow] : []),
    ...(taxRow ? [taxRow] : []),
    ...(additionalChargesRow ? [additionalChargesRow] : []),
    totalRow,
  ]

  // Fetch signature image if this quotation was ever signed (currently approved,
  // or superseded-but-was-approved — see wasQuotationSigned)
  let signatureImageRun = null
  if (wasQuotationSigned(q) && q.signature_url) {
    try {
      const sep = q.signature_url.includes('?') ? '&' : '?'
      const response = await fetch(`${q.signature_url}${sep}t=${Date.now()}`)
      const arrayBuffer = await response.arrayBuffer()
      signatureImageRun = new ImageRun({
        data: arrayBuffer,
        transformation: { width: 180, height: 80 },
        type: 'png',
      })
    } catch (e) {
      console.warn('Could not load signature image', e)
    }
  }

  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        // Header
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
          children: [new TextRun({ text: 'DocLink Global Services', bold: true, size: 36, font: 'Calibri', color: '1a1a2e' })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 60 },
          children: [new TextRun({ text: 'Business Setup & PRO Services | Doha, Qatar', size: 20, font: 'Calibri', color: '666666' })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
          children: [new TextRun({ text: '─────────────────────────────────────────', size: 18, color: 'C9A84C' })],
        }),

        // Title
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
          children: [new TextRun({ text: 'QUOTATION', bold: true, size: 48, font: 'Calibri', color: 'C9A84C' })],
        }),

        // Meta info table
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
            left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
            insideH: { style: BorderStyle.NONE }, insideV: { style: BorderStyle.NONE }
          },
          rows: [
            new TableRow({ children: [cell('Quotation No:', true), cell(q.quotation_number, false), cell('Date:', true, AlignmentType.RIGHT), cell(now, false, AlignmentType.RIGHT)] }),
            new TableRow({ children: [cell('Client:', true), cell(clientName, false), cell('Valid Until:', true, AlignmentType.RIGHT), cell(validUntil, false, AlignmentType.RIGHT)] }),
            new TableRow({ children: [cell('Contact:', true), cell(client?.contact_person || 'N/A', false), cell('Status:', true, AlignmentType.RIGHT), cell(q.status?.toUpperCase(), false, AlignmentType.RIGHT)] }),
            new TableRow({ children: [cell('Email:', true), cell(client?.email || 'N/A', false), cell('Prepared By:', true, AlignmentType.RIGHT), cell(preparedBy, false, AlignmentType.RIGHT)] }),
          ],
        }),

        new Paragraph({ spacing: { after: 200 }, children: [new TextRun('')] }),

        // Subject
        ...(q.subject ? [
          new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: 'SUBJECT', bold: true, size: 16, font: 'Calibri', color: '999999' })] }),
          new Paragraph({ spacing: { after: 300 }, children: [new TextRun({ text: q.subject, bold: true, size: 24, font: 'Calibri', color: '1a1a2e' })] }),
        ] : [
          new Paragraph({ spacing: { after: 200 }, children: [new TextRun('')] }),
        ]),

        // Services table
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: tableRows,
        }),

        new Paragraph({ spacing: { after: 400 }, children: [new TextRun('')] }),

        // Terms
        ...(q.terms ? [
          new Paragraph({ children: [new TextRun({ text: 'Terms & Conditions', bold: true, size: 22, font: 'Calibri' })] }),
          new Paragraph({ spacing: { after: 300 }, children: [new TextRun({ text: q.terms, size: 18, font: 'Calibri', color: '444444' })] }),
        ] : []),

        // Notes
        ...(q.notes ? [
          new Paragraph({ children: [new TextRun({ text: 'Notes', bold: true, size: 22, font: 'Calibri' })] }),
          new Paragraph({ spacing: { after: 300 }, children: [new TextRun({ text: q.notes, size: 18, font: 'Calibri', color: '444444' })] }),
        ] : []),

        // Closing message
        ...(q.closing_message ? [
          new Paragraph({ spacing: { before: 200, after: 200 }, children: [new TextRun({ text: q.closing_message, italics: true, size: 18, font: 'Calibri', color: '555555' })] }),
        ] : []),

        // Signature block
        new Paragraph({ spacing: { before: 200, after: 200 }, children: [new TextRun({ text: '─────────────────────────────────────────', size: 18, color: 'C9A84C' })] }),

        ...(wasQuotationSigned(q) ? [
          new Paragraph({ children: [new TextRun({ text: 'APPROVED', bold: true, size: 28, color: '3ecf8e', font: 'Calibri' })] }),
          new Paragraph({ children: [new TextRun({ text: `Approved by: ${q.reviewed_by_user?.full_name || q.signatory_name || 'Authorised Signatory'}`, size: 20, font: 'Calibri' })] }),
          new Paragraph({ children: [new TextRun({ text: `Approval Date: ${q.reviewed_at ? new Date(q.reviewed_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : now}`, size: 20, font: 'Calibri' })] }),
        ] : []),

        new Paragraph({ spacing: { before: 300 }, children: [new TextRun({ text: 'Authorised Signature:', size: 18, color: '666666', font: 'Calibri' })] }),

        ...(wasQuotationSigned(q) && signatureImageRun ? [
          new Paragraph({ children: [signatureImageRun] }),
        ] : [
          new Paragraph({ spacing: { before: 200, after: 60 }, children: [new TextRun({ text: '____________________________', size: 18, color: '999999', font: 'Calibri' })] }),
        ]),

        new Paragraph({ children: [new TextRun({
          text: (wasQuotationSigned(q) && q.reviewed_by_user?.full_name) || q.signatory_name || 'Authorised Signatory',
          bold: true, size: 18, font: 'Calibri',
        })] }),
        new Paragraph({ children: [new TextRun({ text: q.signatory_position || 'DocLink Global Services', size: 16, color: '999999', font: 'Calibri' })] }),
        ...(wasQuotationSigned(q) && q.signed_at ? [
          new Paragraph({ children: [new TextRun({ text: new Date(q.signed_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }), size: 16, color: '999999', font: 'Calibri' })] }),
        ] : []),

        // Footer
        new Paragraph({
          spacing: { before: 600 },
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: 'DocLink Global Services — Doha, Qatar | This quotation is computer generated', size: 16, color: '999999', font: 'Calibri' })],
        }),
      ],
    }],
  })

  const blob = await Packer.toBlob(doc)
  if (returnBlob) return blob
  saveAs(blob, `${q.quotation_number}.docx`)
}