import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase, REMEMBER_ME_KEY } from './supabase'

const AuthContext = createContext(null)

async function logAuthEvent(authUser, eventType) {
  if (!authUser) return
  try {
    const { error } = await supabase.from('login_events').insert({
      user_id: authUser.id,
      user_email: authUser.email,
      event_type: eventType,
    })
    if (error) console.error('[AuthContext] failed to log auth event:', error)
  } catch (err) {
    console.error('[AuthContext] failed to log auth event:', err)
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [profileError, setProfileError] = useState(null)
  const [loading, setLoading] = useState(true)
  const lastUserRef = useRef(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      // getSession() reads the locally stored session — it can be stale (e.g. the
      // refresh token itself was revoked server-side). Force sign-out rather than
      // trust it on any load where Supabase can't confirm a valid session.
      if (error || !session) {
        await supabase.auth.signOut()
        setUser(null)
        lastUserRef.current = null
        setLoading(false)
        return
      }
      setUser(session.user)
      lastUserRef.current = session.user
      fetchProfile(session.user.id)
    })

    // SIGNED_IN/SIGNED_OUT only fire on explicit sign-in/out, not on session
    // restore from storage (that's INITIAL_SESSION) — so this can't double-log
    // a login on every page refresh.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else { setProfile(null); setLoading(false) }

      if (event === 'SIGNED_IN' && session?.user) {
        logAuthEvent(session.user, 'login')
      } else if (event === 'SIGNED_OUT') {
        logAuthEvent(lastUserRef.current, 'logout')
      }
      lastUserRef.current = session?.user ?? null
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    // maybeSingle: "no row" is data=null with no error, which is different from a
    // real failure (network/RLS/db). `profileError` lets the UI tell them apart.
    const { data, error } = await supabase.from('users').select('*').eq('id', userId).maybeSingle()
    if (error) console.error('[AuthContext] failed to load profile:', error)
    setProfile(data ?? null)
    setProfileError(error ?? null)
    setLoading(false)
  }

  const signIn = (email, password, rememberMe = true) => {
    // Must be set before signInWithPassword writes the session — the storage
    // adapter in supabase.js reads this flag at write-time to decide whether
    // the session goes to localStorage (persists) or sessionStorage (tab-only).
    localStorage.setItem(REMEMBER_ME_KEY, rememberMe ? 'true' : 'false')
    return supabase.auth.signInWithPassword({ email, password })
  }

  const signOut = async () => {
    const result = await supabase.auth.signOut()
    localStorage.removeItem(REMEMBER_ME_KEY)
    return result
  }

  return (
    <AuthContext.Provider value={{ user, profile, profileError, loading, signIn, signOut, fetchProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)