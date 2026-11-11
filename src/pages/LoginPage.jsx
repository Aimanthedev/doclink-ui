import { useState } from 'react'
import { Eye, EyeOff, Mail, Lock, ArrowRight } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { useNavigate } from '@/lib/router-compat'

export default function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await signIn(email, password, remember)
    if (error) { setError(error.message); setLoading(false) }
    else navigate('/')
  }

  return (
    <div className="auth-shell">
      <div className="auth-brand">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="sidebar-logo">DL</div>
          <div>
            <div className="sidebar-title">DocLink</div>
            <div className="sidebar-sub">Global Services</div>
          </div>
        </div>

        <div>
          <div className="cc-eyebrow" style={{ color: '#7fb0ff' }}>Business operations platform</div>
          <h1 className="auth-headline" style={{ marginTop: 14 }}>
            Powering <span>Qatar's business</span> operations.
          </h1>
          <p style={{ color: '#a9b6dc', fontSize: 15, marginTop: 16, maxWidth: 440, lineHeight: 1.6 }}>
            Cases, clients, renewals, quotations and finance — managed from one secure command center.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 28, color: '#a9b6dc', fontSize: 12 }}>
          <span>Bank-grade security</span><span>Role-based access</span><span>Bilingual ready</span>
        </div>

        <div className="auth-float" style={{ right: 48, top: '22%', width: 220 }} aria-hidden="true">
          <div style={{ fontSize: 11, color: '#8391b8' }}>Renewals this month</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, marginTop: 4 }}>24</div>
          <div style={{ height: 6, borderRadius: 9, background: 'rgba(255,255,255,0.08)', marginTop: 10 }}>
            <div style={{ width: '68%', height: '100%', borderRadius: 9, background: 'linear-gradient(90deg,#3d7bff,#22d3ee)' }} />
          </div>
        </div>
        <div className="auth-float" style={{ right: 120, bottom: '20%', width: 200 }} aria-hidden="true">
          <div style={{ fontSize: 11, color: '#8391b8' }}>Invoices paid</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, marginTop: 4, color: '#2dd4a0' }}>+12.4%</div>
        </div>
      </div>

      <div className="auth-panel">
        <div className="auth-card">
          <div className="hide-desktop" style={{ marginBottom: 28, alignItems: 'center', gap: 12 }}>
            <div className="sidebar-logo">DL</div>
            <div className="sidebar-title" style={{ color: 'var(--text-primary)' }}>DocLink</div>
          </div>

          <h2 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)' }}>Welcome back</h2>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 6, marginBottom: 32 }}>
            Sign in to your DocLink dashboard
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 18 }}>
              <label className="auth-label" htmlFor="login-email">Email address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} className="auth-icon" />
                <input
                  id="login-email"
                  className="input-base auth-input"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@company.qa"
                />
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="auth-label" htmlFor="login-password">Password</label>
                <span style={{ fontSize: 12, color: 'var(--accent-blue-bright)', marginBottom: 8, fontWeight: 500 }}>Forgot password?</span>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={16} className="auth-icon" />
                <input
                  id="login-password"
                  className="input-base auth-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword(v => !v)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, lineHeight: 0 }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 22, cursor: 'pointer' }}>
              <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--accent-blue)' }} />
              Keep me signed in
            </label>

            {error && <div className="auth-error">{error}</div>}

            <button type="submit" disabled={loading} className="btn-gold auth-submit">
              {loading ? 'Signing in...' : 'Sign in'}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>

          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 28, textAlign: 'center' }}>
            Protected workspace · Access is managed by your administrator
          </p>
        </div>
      </div>
    </div>
  )
}
