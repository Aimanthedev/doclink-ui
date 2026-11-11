import JSZip from 'jszip'

const DOCUMENT_XML_PATH = 'word/document.xml'
const RELS_PATH = 'word/_rels/document.xml.rels'
const CONTENT_TYPES_PATH = '[Content_Types].xml'
const SIGNATURE_MEDIA_PATH = 'word/media/esign.png'
const SIGNATURE_RELATIONSHIP_ID = 'rIdESign'

const ESIGN_WIDTH_EMU = 2011680
const ESIGN_HEIGHT_EMU = 750570

const ROW_CLOSE_TAG = '</w:tr>'
const RUN_CLOSE_TAG = '</w:r>'

function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function formatPrice(price) {
  return Number(price ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })
}

// Finds the start of the nearest open tag (e.g. <w:tr, <w:p) before `beforeIndex`.
// Uses a lookahead for whitespace/'>' so e.g. <w:tr can't mismatch <w:trPr> (row
// properties), whose tag name also starts with the literal text "<w:tr".
function findTagStartBefore(xml, tagName, beforeIndex) {
  const re = new RegExp(`<${tagName}(?=[\\s>])`, 'g')
  let match
  let lastStart = -1
  while ((match = re.exec(xml))) {
    if (match.index >= beforeIndex) break
    lastStart = match.index
  }
  return lastStart
}

// Word frequently splits a single piece of text (e.g. a {{token}} typed in one
// go) across several sibling <w:r> runs with identical formatting — usually a
// side effect of autocorrect/spellcheck. Token lookups below search for exact
// literal strings like '{{sno}}', so a token split across runs is invisible to
// them. Merge adjacent same-formatting runs within each paragraph back into a
// single run before any token/row processing happens.
function parseRun(runXml) {
  const rPrMatch = runXml.match(/<w:rPr(?:\s[^>]*)?>[\s\S]*?<\/w:rPr>|<w:rPr(?:\s[^>]*)?\/>/)
  const rPr = rPrMatch ? rPrMatch[0] : ''

  const openTagMatch = runXml.match(/^<w:r(?:\s[^>]*)?>/)
  const openTagEnd = openTagMatch ? openTagMatch[0].length : 0
  const afterOpen = runXml.slice(openTagEnd, runXml.length - '</w:r>'.length)
  const afterRPr = rPr ? afterOpen.slice(afterOpen.indexOf(rPr) + rPr.length) : afterOpen

  const textMatch = afterRPr.match(/^<w:t(?:\s[^>]*)?>([\s\S]*)<\/w:t>$/)
  if (textMatch) return { rPr, text: textMatch[1], mergeable: true }

  const emptyTextMatch = afterRPr.match(/^<w:t(?:\s[^>]*)?\/>$/)
  if (emptyTextMatch) return { rPr, text: '', mergeable: true }

  return { rPr, text: '', mergeable: false }
}

// Word sometimes inserts invisible, self-closing markers between sibling runs
// (bookmark anchors, spellcheck proofing marks, comment anchors) that have no
// effect on rendered text or layout. They shouldn't block a merge — but their
// content matters elsewhere (e.g. TOC/cross-refs), so instead of discarding
// them we splice them back in immediately after the merged run.
const IGNORABLE_GAP_RE = /^(?:<w:bookmarkStart\b[^>]*\/>|<w:bookmarkEnd\b[^>]*\/>|<w:proofErr\b[^>]*\/>|<w:commentRangeStart\b[^>]*\/>|<w:commentRangeEnd\b[^>]*\/>)*$/

function mergeRunsInParagraph(paragraphXml) {
  const runRegex = /<w:r(?=[\s>])[\s\S]*?<\/w:r>/g
  const runs = []
  let match
  while ((match = runRegex.exec(paragraphXml))) {
    runs.push({ start: match.index, end: match.index + match[0].length, xml: match[0] })
  }
  if (runs.length < 2) return paragraphXml

  const parsed = runs.map(r => parseRun(r.xml))

  let result = ''
  let cursor = 0
  let i = 0
  while (i < runs.length) {
    if (!parsed[i].mergeable) {
      i++
      continue
    }
    let j = i
    let gapXml = ''
    while (j + 1 < runs.length && parsed[j + 1].mergeable && parsed[j + 1].rPr === parsed[i].rPr) {
      const gap = paragraphXml.slice(runs[j].end, runs[j + 1].start)
      if (!IGNORABLE_GAP_RE.test(gap)) break
      gapXml += gap
      j++
    }
    if (j > i) {
      const mergedText = parsed.slice(i, j + 1).map(p => p.text).join('')
      const mergedRunXml = `<w:r>${parsed[i].rPr}<w:t xml:space="preserve">${mergedText}</w:t></w:r>${gapXml}`
      result += paragraphXml.slice(cursor, runs[i].start) + mergedRunXml
      cursor = runs[j].end
    }
    i = j + 1
  }
  result += paragraphXml.slice(cursor)
  return result
}

function mergeRuns(xml) {
  return xml.replace(/<w:p(?=[\s>])[\s\S]*?<\/w:p>/g, mergeRunsInParagraph)
}

// Quotation templates: a single row keyed {{service_1}}/{{S1_price}}, cloned
// once per service — same pattern as invoice line items below. Locates both
// the row's own opening <w:tr> and its closing </w:tr>, the same way
// extractLineItemRowTemplate does for invoices.
function extractRow1Template(xml) {
  const tokenIndex = xml.indexOf('{{service_1}}')
  if (tokenIndex === -1) {
    throw new Error('docxTemplateEngine: {{service_1}} placeholder not found in template')
  }
  const rowStart = findTagStartBefore(xml, 'w:tr', tokenIndex)
  if (rowStart === -1) {
    throw new Error('docxTemplateEngine: could not find <w:tr> opening tag before {{service_1}}')
  }
  const closeIndex = xml.indexOf(ROW_CLOSE_TAG, tokenIndex)
  if (closeIndex === -1) {
    throw new Error('docxTemplateEngine: could not find </w:tr> closing tag after {{service_1}}')
  }
  const rowEnd = closeIndex + ROW_CLOSE_TAG.length
  return { rowStart, rowEnd, rowXml: xml.slice(rowStart, rowEnd) }
}

const LEGACY_SERVICE_ROW_TOKEN_RE = /\{\{service_\d+\}\}|\{\{S\d+_price\}\}/

// Older quotation templates hardcoded a run of extra rows ({{service_2}},
// {{service_3}}, ... up to however many) as plain siblings right after the
// {{service_1}} row, instead of relying on row-1 being cloned. Those are
// leftover template artifacts, not real content. Starting right after the
// {{service_1}} row, absorb any immediately-following sibling <w:tr> that
// still carries a numbered service token — however many there happen to be —
// so they get removed along with row 1 instead of surviving as blank rows
// once their tokens are cleared by clearUnresolvedTokens(). Templates that
// only ever had the single {{service_1}} row are unaffected: the loop exits
// on its first iteration since there's no such sibling row to find.
function skipLegacyServiceRows(xml, afterIndex) {
  let cursor = afterIndex
  while (true) {
    const gapLength = /^\s*/.exec(xml.slice(cursor))[0].length
    const rowStart = cursor + gapLength
    const looksLikeRow = xml.slice(rowStart, rowStart + 5) === '<w:tr' && /[\s>]/.test(xml[rowStart + 5] ?? '')
    if (!looksLikeRow) break
    const closeIndex = xml.indexOf(ROW_CLOSE_TAG, rowStart)
    if (closeIndex === -1) break
    const rowEnd = closeIndex + ROW_CLOSE_TAG.length
    if (!LEGACY_SERVICE_ROW_TOKEN_RE.test(xml.slice(rowStart, rowEnd))) break
    cursor = rowEnd
  }
  return cursor
}

function buildQuotationRowFromTemplate(row1Xml, item) {
  const description = (item.description || '').trim()
  let xml = row1Xml
  if (description) {
    xml = xml.split('{{description}}').join(escapeXml(description))
  } else {
    const descIdx = xml.indexOf('{{description}}')
    if (descIdx !== -1) {
      const descRunStart = xml.lastIndexOf('<w:r>', descIdx)
      const descRunEnd = xml.indexOf('</w:r>', descIdx) + '</w:r>'.length
      const beforeRunStart = xml.lastIndexOf('<w:r>', descRunStart - 1)
      const between = xml.slice(beforeRunStart, descRunStart)
      if (between.includes('<w:br')) {
        xml = xml.slice(0, beforeRunStart) + xml.slice(descRunEnd)
      } else {
        xml = xml.slice(0, descRunStart) + xml.slice(descRunEnd)
      }
    }
  }
  return xml
    .split('{{service_1}}').join(escapeXml(item.name))
    .split('{{S1_price}}').join(escapeXml(formatPrice(item.price)))
}

function injectServiceRows(xml, services) {
  const { rowStart, rowEnd, rowXml: row1Xml } = extractRow1Template(xml)
  const blockEnd = skipLegacyServiceRows(xml, rowEnd)

  const newRows = (services || []).map(item => buildQuotationRowFromTemplate(row1Xml, item)).join('')

  return xml.slice(0, rowStart) + newRows + xml.slice(blockEnd)
}

// Invoice template: a single row keyed {{sno}}, {{sevice_1}}, {{qty}},
// {{s1_unit_price}}, {{s1_price}}, cloned once per line item.
function extractLineItemRowTemplate(xml) {
  const tokenIndex = xml.indexOf('{{sevice_1}}')
  if (tokenIndex === -1) {
    throw new Error('docxTemplateEngine: {{sevice_1}} placeholder not found in template')
  }
  const rowStart = findTagStartBefore(xml, 'w:tr', tokenIndex)
  if (rowStart === -1) {
    throw new Error('docxTemplateEngine: could not find <w:tr> opening tag before {{sevice_1}}')
  }
  const closeIndex = xml.indexOf(ROW_CLOSE_TAG, tokenIndex)
  if (closeIndex === -1) {
    throw new Error('docxTemplateEngine: could not find </w:tr> closing tag after {{sevice_1}}')
  }
  const rowEnd = closeIndex + ROW_CLOSE_TAG.length
  return { rowStart, rowEnd, rowXml: xml.slice(rowStart, rowEnd) }
}

function buildInvoiceRowFromTemplate(rowXml, item, index) {
  return rowXml
    .split('{{sno}}').join(escapeXml(index + 1))
    .split('{{sevice_1}}').join(escapeXml(item.service_name))
    .split('{{qty}}').join(escapeXml(item.quantity))
    .split('{{s1_unit_price}}').join(escapeXml(formatPrice(item.unit_price)))
    .split('{{s1_price}}').join(escapeXml(formatPrice(item.total_price)))
}

function injectLineItemRows(xml, items) {
  const { rowStart, rowEnd, rowXml } = extractLineItemRowTemplate(xml)

  const newRows = (items || []).map((item, index) => buildInvoiceRowFromTemplate(rowXml, item, index)).join('')

  return xml.slice(0, rowStart) + newRows + xml.slice(rowEnd)
}

// Receipt templates: a single row keyed {{item_amount_1}}, cloned once per
// receipt item — same row-cloning mechanism as the invoice/quotation rows above.
function extractReceiptRowTemplate(xml) {
  const tokenIndex = xml.indexOf('{{item_amount_1}}')
  if (tokenIndex === -1) {
    throw new Error('docxTemplateEngine: {{item_amount_1}} placeholder not found in template')
  }
  const rowStart = findTagStartBefore(xml, 'w:tr', tokenIndex)
  if (rowStart === -1) {
    throw new Error('docxTemplateEngine: could not find <w:tr> opening tag before {{item_amount_1}}')
  }
  const closeIndex = xml.indexOf(ROW_CLOSE_TAG, tokenIndex)
  if (closeIndex === -1) {
    throw new Error('docxTemplateEngine: could not find </w:tr> closing tag after {{item_amount_1}}')
  }
  const rowEnd = closeIndex + ROW_CLOSE_TAG.length
  return { rowStart, rowEnd, rowXml: xml.slice(rowStart, rowEnd) }
}

function buildReceiptRowFromTemplate(rowXml, item, index) {
  return rowXml
    .split('{{item_no_1}}').join(escapeXml(index + 1))
    .split('{{item_description_1}}').join(escapeXml(item.description ?? ''))
    // Full listed value (qty x unit price), not the partial amount actually
    // received for this item. See exportReceipt.js's `full_value` field.
    .split('{{item_amount_1}}').join(escapeXml(formatPrice(item.full_value)))
    .split('{{item_remaining_1}}').join(escapeXml(formatPrice(item.remaining_balance ?? 0)))
    .split('{{item_qty_1}}').join(escapeXml(item.quantity ?? ''))
    .split('{{item_unit_price_1}}').join(escapeXml(formatPrice(item.unit_price)))
}

function injectReceiptRows(xml, items) {
  const { rowStart, rowEnd, rowXml } = extractReceiptRowTemplate(xml)

  const newRows = (items || []).map((item, index) => buildReceiptRowFromTemplate(rowXml, item, index)).join('')

  return xml.slice(0, rowStart) + newRows + xml.slice(rowEnd)
}

function replaceSimpleTokens(xml, tokens) {
  let out = xml
  for (const [key, value] of Object.entries(tokens || {})) {
    const tokenRegex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
    out = out.replace(tokenRegex, escapeXml(value))
  }
  return out
}

// Safety net: any {{token}} the caller didn't supply a value for (typo, a
// token added to the template that the export code doesn't know about yet,
// etc.) should disappear rather than show up literally on the invoice.
function clearUnresolvedTokens(xml) {
  return xml.replace(/\{\{[^{}]*\}\}/g, '')
}

function buildSignatureDrawingXml(cx, cy) {
  return `<w:drawing><wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="1" name="Signature"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="1" name="Signature"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${SIGNATURE_RELATIONSHIP_ID}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing>`
}

// Reads width/height straight out of a PNG's IHDR chunk (bytes 16-23, after
// the 8-byte signature + 4-byte length + 4-byte "IHDR" type). Returns null
// for anything that isn't a valid PNG so callers can fall back to a fixed size.
function readPngDimensions(bytes) {
  if (!bytes || bytes.length < 24) return null
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
    && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  if (!isPng) return null
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const width = view.getUint32(16, false)
  const height = view.getUint32(20, false)
  if (!width || !height) return null
  return { width, height }
}

// Fits the signature inside the ESIGN_WIDTH_EMU x ESIGN_HEIGHT_EMU box
// preserving the source PNG's aspect ratio; falls back to the fixed box
// dimensions when the bytes aren't a readable PNG.
function computeSignatureDrawingSize(bytes) {
  const dims = readPngDimensions(bytes)
  if (!dims) return { cx: ESIGN_WIDTH_EMU, cy: ESIGN_HEIGHT_EMU }
  const boxAspect = ESIGN_WIDTH_EMU / ESIGN_HEIGHT_EMU
  const imgAspect = dims.width / dims.height
  if (imgAspect >= boxAspect) {
    return { cx: ESIGN_WIDTH_EMU, cy: Math.round(ESIGN_WIDTH_EMU / imgAspect) }
  }
  return { cx: Math.round(ESIGN_HEIGHT_EMU * imgAspect), cy: ESIGN_HEIGHT_EMU }
}

// Returns the updated xml with a signature drawing spliced in place of just
// the <w:r> run that holds the {{e_sign}} text, or null if there's no usable
// anchor to splice into (missing token, or the surrounding <w:r> tags can't
// be located) — the caller treats null as "couldn't inject here, skip".
//
// Deliberately scoped to the run, not the enclosing <w:p> paragraph: some
// templates (invoices) place another drawing — e.g. the company stamp — as
// a sibling run in the same paragraph as {{e_sign}}. Removing the whole
// paragraph would delete that sibling drawing along with the token. Runs
// never nest, so xml.indexOf for the closing tag is safe the same way it is
// for rows/paragraphs elsewhere in this file — as long as the search starts
// at the token's end, not its start, it lands on the run that actually
// contains the token even if the token itself is split across runs by
// Word's autocorrect fragmentation. mergeRuns() already coalesces same-
// formatting fragments across the whole document before this runs, so in
// the common case the token is already a single run by the time we get here;
// this is a second line of defense for the case where fragment formatting
// differs and merging couldn't combine them.
function injectSignatureImage(xml, cx, cy) {
  const token = '{{e_sign}}'
  const tokenIndex = xml.indexOf(token)
  if (tokenIndex === -1) {
    console.warn('docxTemplateEngine: {{e_sign}} placeholder not found in template (cannot embed signature image)')
    return null
  }
  const tokenEnd = tokenIndex + token.length

  const runStart = findTagStartBefore(xml, 'w:r', tokenIndex)
  if (runStart === -1) {
    console.warn('docxTemplateEngine: could not find <w:r> opening tag before {{e_sign}} — skipping drawing injection')
    return null
  }
  const closeIndex = xml.indexOf(RUN_CLOSE_TAG, tokenEnd)
  if (closeIndex === -1) {
    console.warn('docxTemplateEngine: could not find </w:r> closing tag after {{e_sign}} — skipping drawing injection')
    return null
  }
  const runEnd = closeIndex + RUN_CLOSE_TAG.length

  return xml.slice(0, runStart) + `<w:r>${buildSignatureDrawingXml(cx, cy)}</w:r>` + xml.slice(runEnd)
}

function addSignatureRelationship(relsXml) {
  const relationship = `<Relationship Id="${SIGNATURE_RELATIONSHIP_ID}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/esign.png"/>`
  return relsXml.replace('</Relationships>', `${relationship}</Relationships>`)
}

// Finds the nearest enclosing <tagName>...</tagName> block around `tokenIndex`,
// e.g. the <w:tc> table cell containing a token. Assumes the tag doesn't nest
// inside itself between the found open tag and tokenIndex (true for w:tc/w:p).
function findEnclosingBlock(xml, tagName, tokenIndex) {
  const start = findTagStartBefore(xml, tagName, tokenIndex)
  if (start === -1) return null
  const closeTag = `</${tagName}>`
  const closeIndex = xml.indexOf(closeTag, tokenIndex)
  if (closeIndex === -1) return null
  return { start, end: closeIndex + closeTag.length }
}

// Some invoice templates place a placeholder signature image right next to
// {{e_sign}} (in the same table cell or paragraph) instead of leaving a bare
// text anchor. When one exists, we replace that image's bytes in place rather
// than injecting a whole new <w:drawing> — it preserves the template's exact
// positioning/sizing/styling around the image.
function findAdjacentImageRelId(xml, tokenIndex) {
  const cellBlock = findEnclosingBlock(xml, 'w:tc', tokenIndex)
  const paragraphBlock = findEnclosingBlock(xml, 'w:p', tokenIndex)
  const searchBlock = cellBlock || paragraphBlock
  if (!searchBlock) return null

  const searchXml = xml.slice(searchBlock.start, searchBlock.end)
  const blipMatch = searchXml.match(/<a:blip[^>]*r:embed="([^"]+)"/)
  return blipMatch ? blipMatch[1] : null
}

function resolveRelationshipTarget(relsXml, relId) {
  const re = new RegExp(`<Relationship\\b[^>]*\\bId="${relId}"[^>]*\\bTarget="([^"]+)"|<Relationship\\b[^>]*\\bTarget="([^"]+)"[^>]*\\bId="${relId}"`)
  const m = relsXml.match(re)
  return m ? (m[1] || m[2]) : null
}

function ensurePngContentType(contentTypesXml) {
  if (contentTypesXml.includes('Extension="png"')) return contentTypesXml
  const defaultEntry = '<Default Extension="png" ContentType="image/png"/>'
  return contentTypesXml.replace('</Types>', `${defaultEntry}</Types>`)
}

function withCacheBust(url) {
  // data: URLs embed the content inline (used in tests) — appending a query
  // string after the base64 payload corrupts them, and they need no cache
  // busting anyway since they were never fetched from a cache in the first place.
  if (url.startsWith('data:')) return url
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}t=${Date.now()}`
}

async function fetchSignatureImageBytes(url) {
  // Null/empty signature_url (unapproved, unsigned, etc.) short-circuits here
  // — fillDocxTemplate's entire signature block below is gated on this
  // return value being truthy, so no image or {{e_sign}} drawing logic runs
  // at all in that case, and the token just clears to '' like any other token.
  if (!url) return null
  try {
    const res = await fetch(withCacheBust(url))
    if (!res.ok) return null
    const buf = await res.arrayBuffer()
    return new Uint8Array(buf)
  } catch {
    return null
  }
}

export async function fillDocxTemplate(templateArrayBuffer, data) {
  const { services = [], items = [], receiptItems = [], e_sign_url, ...simpleTokens } = data || {}

  const signatureImageBytes = await fetchSignatureImageBytes(e_sign_url)

  const zip = await JSZip.loadAsync(templateArrayBuffer)
  const documentXmlFile = zip.file(DOCUMENT_XML_PATH)
  if (!documentXmlFile) {
    throw new Error(`docxTemplateEngine: ${DOCUMENT_XML_PATH} not found in template`)
  }

  let xml = await documentXmlFile.async('string')
  xml = mergeRuns(xml)

  const isInvoiceTemplate = xml.includes('{{sevice_1}}')
  const isReceiptTemplate = !isInvoiceTemplate && xml.includes('{{item_amount_1}}')

  if (isInvoiceTemplate) {
    xml = injectLineItemRows(xml, items)
  } else if (isReceiptTemplate) {
    xml = injectReceiptRows(xml, receiptItems)
  } else if (xml.includes('{{service_1}}')) {
    xml = injectServiceRows(xml, services)
  }

  if (signatureImageBytes) {
    const { cx, cy } = computeSignatureDrawingSize(signatureImageBytes)
    const eSignTokenIndex = xml.indexOf('{{e_sign}}')

    // Invoice templates have the DocLink stamp image sitting right next to
    // {{e_sign}}, not a dedicated signature placeholder — adjacency lookup
    // would grab the stamp's relId and overwrite the stamp itself. Invoices
    // always inject a brand new image instead; quotations keep using
    // adjacency since their templates have a real placeholder there. Receipt
    // templates are new and unverified against a real uploaded file, so they
    // default to the same always-inject behavior as invoices rather than
    // risk grabbing an unrelated image's relId.
    const existingImageRelId = !isInvoiceTemplate && !isReceiptTemplate && eSignTokenIndex !== -1
      ? findAdjacentImageRelId(xml, eSignTokenIndex)
      : null
    const relsFile = zip.file(RELS_PATH)
    const relsXml = relsFile ? await relsFile.async('string') : null
    const existingImageTarget = existingImageRelId && relsXml
      ? resolveRelationshipTarget(relsXml, existingImageRelId)
      : null

    if (existingImageTarget) {
      // Overwrite the existing placeholder image's bytes in place. The
      // {{e_sign}} text token itself still gets cleared to '' below via
      // replaceSimpleTokens (data.e_sign is always passed as '').
      const mediaPath = existingImageTarget.startsWith('/')
        ? existingImageTarget.slice(1)
        : `word/${existingImageTarget.replace(/^\.?\//, '')}`
      zip.file(mediaPath, signatureImageBytes)
    } else {
      const injectedXml = injectSignatureImage(xml, cx, cy)
      if (injectedXml !== null) {
        xml = injectedXml
        zip.file(SIGNATURE_MEDIA_PATH, signatureImageBytes)

        if (relsFile) {
          zip.file(RELS_PATH, addSignatureRelationship(relsXml))

          const contentTypesFile = zip.file(CONTENT_TYPES_PATH)
          if (contentTypesFile) {
            const contentTypesXml = await contentTypesFile.async('string')
            zip.file(CONTENT_TYPES_PATH, ensurePngContentType(contentTypesXml))
          }
        } else {
          console.warn(`docxTemplateEngine: ${RELS_PATH} not found — cannot register signature image relationship, skipping`)
        }
      }
    }
  }

  xml = replaceSimpleTokens(xml, simpleTokens)
  xml = clearUnresolvedTokens(xml)

  zip.file(DOCUMENT_XML_PATH, xml)

  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })
}
