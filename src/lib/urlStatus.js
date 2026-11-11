// Reads a status filter from ?status=... so other pages can be opened already
// filtered (used by Overview KPI/attention links). Unknown values are ignored.
export function statusFromParams(searchParams, allowed, fallback = 'all') {
  const value = searchParams.get('status')
  return value && allowed.includes(value) ? value : fallback
}
