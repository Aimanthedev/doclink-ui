const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine']
const TEENS = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
const SCALES = ['', 'Thousand', 'Million', 'Billion']

function threeDigitsToWords(n) {
  const parts = []
  const hundreds = Math.floor(n / 100)
  const remainder = n % 100

  if (hundreds > 0) parts.push(`${ONES[hundreds]} Hundred`)

  if (remainder >= 10 && remainder < 20) {
    parts.push(TEENS[remainder - 10])
  } else {
    const tens = Math.floor(remainder / 10)
    const ones = remainder % 10
    if (tens > 0) parts.push(TENS[tens])
    if (ones > 0) parts.push(ONES[ones])
  }

  return parts.join(' ')
}

export function integerToWords(value) {
  const n = Math.floor(Math.abs(Number(value) || 0))
  if (n === 0) return 'Zero'

  const groups = []
  let remaining = n
  while (remaining > 0) {
    groups.push(remaining % 1000)
    remaining = Math.floor(remaining / 1000)
  }

  const words = []
  for (let i = groups.length - 1; i >= 0; i--) {
    if (groups[i] === 0) continue
    const groupWords = threeDigitsToWords(groups[i])
    words.push(SCALES[i] ? `${groupWords} ${SCALES[i]}` : groupWords)
  }

  return words.join(' ')
}

export function numberToWordsQAR(amount) {
  const rounded = Math.round((Number(amount) || 0) * 100) / 100
  const riyals = Math.floor(rounded)
  const dirhams = Math.round((rounded - riyals) * 100)

  let result = `${integerToWords(riyals)} Qatari Riyal${riyals === 1 ? '' : 's'}`
  if (dirhams > 0) {
    result += ` and ${integerToWords(dirhams)} Dirham${dirhams === 1 ? '' : 's'}`
  }

  return `${result} Only`
}
