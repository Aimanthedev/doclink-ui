// OFFLINE MOCK — this file replaces the real Supabase client in the Lovable-safe copy.
// It performs NO network requests and contains no URLs, keys or credentials.
// Every query resolves to empty data; auth is a fixed fake "Demo User" (super_admin)
// so every page and layout renders. Replace with real data/mock data as needed for the redesign.

export const REMEMBER_ME_KEY = 'doclink_remember_me'

const DEMO_USER = { id: 'demo-user-id', email: 'demo@example.com' }
const DEMO_PROFILE = {
  id: DEMO_USER.id,
  email: DEMO_USER.email,
  full_name: 'Demo User',
  role: 'super_admin',
  is_active: true,
  phone: '',
  whatsapp: '',
  department: 'Management',
  position: 'Administrator',
  employee_code: 'DEMO-001',
  signature_url: null,
}
const DEMO_SESSION = { access_token: 'demo-offline-token', user: DEMO_USER }

// Chainable, awaitable query builder that always resolves to empty data.
function queryBuilder(table) {
  let single = false
  let isCount = false
  const result = () => {
    if (table === 'users' && single) return { data: DEMO_PROFILE, error: null }
    if (table === 'user_permissions' && single) return { data: null, error: null }
    if (single) return { data: null, error: null }
    return { data: [], error: null, count: isCount ? 0 : null }
  }
  const builder = new Proxy(function () {}, {
    get(_t, prop) {
      if (prop === 'then') return (res, rej) => Promise.resolve(result()).then(res, rej)
      if (prop === 'maybeSingle' || prop === 'single') {
        return () => { single = true; return builder }
      }
      if (prop === 'select') {
        return (_cols, opts) => { if (opts && opts.count) isCount = true; return builder }
      }
      return () => builder
    },
  })
  return builder
}

const noopSub = { data: { subscription: { unsubscribe() {} } } }

export const supabase = {
  from: (table) => queryBuilder(table),
  rpc: () => Promise.resolve({ data: null, error: { message: 'Offline demo: no live data in this design copy' } }),
  auth: {
    getSession: () => Promise.resolve({ data: { session: DEMO_SESSION }, error: null }),
    getUser: () => Promise.resolve({ data: { user: DEMO_USER }, error: null }),
    signInWithPassword: () => Promise.resolve({ data: { session: DEMO_SESSION, user: DEMO_USER }, error: null }),
    signOut: () => Promise.resolve({ error: null }),
    onAuthStateChange: () => noopSub,
    updateUser: () => Promise.resolve({ data: { user: DEMO_USER }, error: null }),
  },
  storage: {
    from: () => ({
      upload: () => Promise.resolve({ data: null, error: { message: 'Offline demo: storage disabled' } }),
      remove: () => Promise.resolve({ data: [], error: null }),
      createSignedUrl: () => Promise.resolve({ data: null, error: { message: 'Offline demo: storage disabled' } }),
      getPublicUrl: () => ({ data: { publicUrl: '' } }),
      download: () => Promise.resolve({ data: null, error: { message: 'Offline demo: storage disabled' } }),
    }),
  },
  functions: {
    invoke: () => Promise.resolve({ data: null, error: { message: 'Offline demo: edge functions disabled' } }),
  },
  channel: () => ({ on() { return this }, subscribe() { return this }, unsubscribe() {} }),
  removeChannel: () => {},
}
