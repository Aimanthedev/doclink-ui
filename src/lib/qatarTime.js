// Qatar business-date helpers (Asia/Qatar, UTC+3, no DST).
//
// Daily work, follow-ups and deadlines are Qatar calendar days. Never derive a
// "today" with toISOString().slice(0, 10): that is the UTC date and is wrong
// for the first three hours of every Qatar day (00:00-03:00).

export const QATAR_TZ = 'Asia/Qatar'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const dateParts = new Intl.DateTimeFormat('en-CA', {
  timeZone: QATAR_TZ, year: 'numeric', month: '2-digit', day: '2-digit',
})
const hourPart = new Intl.DateTimeFormat('en-GB', { timeZone: QATAR_TZ, hour: '2-digit', hourCycle: 'h23' })

// 'YYYY-MM-DD' for the Qatar calendar day containing `now`.
export function qatarToday(now = new Date()) {
  const p = Object.fromEntries(dateParts.formatToParts(now).map(x => [x.type, x.value]))
  return `${p.year}-${p.month}-${p.day}`
}

export function qatarHour(now = new Date()) {
  return Number(hourPart.format(now))
}

export function greetingFor(now = new Date()) {
  const h = qatarHour(now)
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

// Date-only ISO string arithmetic, done in UTC so it can never shift a day.
function toUtcMs(iso) {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

export function addDaysISO(iso, days) {
  return new Date(toUtcMs(iso) + days * 86400000).toISOString().slice(0, 10)
}

// Whole days from `fromIso` to `toIso` (positive when `toIso` is later).
export function daysBetween(fromIso, toIso) {
  return Math.round((toUtcMs(toIso) - toUtcMs(fromIso)) / 86400000)
}

// '15 Oct' / '15 Oct 2026' from a date-only string or a timestamp.
export function formatDay(value, { year = false } = {}) {
  if (!value) return '—'
  const iso = typeof value === 'string' && value.length === 10 ? value : qatarDateOf(value)
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} ${MONTHS[m - 1]}${year ? ` ${y}` : ''}`
}

// Qatar calendar day ('YYYY-MM-DD') of a timestamp.
export function qatarDateOf(timestamp) {
  return qatarToday(new Date(timestamp))
}

export function formatTimeQatar(timestamp) {
  if (!timestamp) return ''
  return new Intl.DateTimeFormat('en-GB', { timeZone: QATAR_TZ, hour: 'numeric', minute: '2-digit', hour12: true })
    .format(new Date(timestamp)).toUpperCase()
}

export function formatDateLong(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  const weekday = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', weekday: 'long' }).format(new Date(Date.UTC(y, m - 1, d)))
  return `${weekday}, ${d} ${MONTHS[m - 1]} ${y}`
}

// 'Overdue by 3 days' / 'Due today' / 'Due tomorrow' / 'Due in 4 days'.
export function relativeDue(dueIso, todayIso) {
  if (!dueIso) return 'No due date'
  const n = daysBetween(todayIso, dueIso)
  if (n < 0) return `Overdue by ${-n} day${-n === 1 ? '' : 's'}`
  if (n === 0) return 'Due today'
  if (n === 1) return 'Due tomorrow'
  return `Due in ${n} days`
}

export function formatNumber(value) {
  return Number(value || 0).toLocaleString('en-US')
}

// Whole-riyal display for dashboards; pass decimals: 2 for invoice-level amounts.
export function formatQar(value, { decimals = 0 } = {}) {
  const n = Number(value || 0)
  return `QAR ${n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`
}

export function firstName(fullName) {
  return (fullName || '').trim().split(/\s+/)[0] || ''
}

export function plural(n, one, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`
}
