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
    <div style={{ minHeight: '100vh', display: 'flex' }}>
      {/* Left panel — brand side, hidden below 768px */}
      <div
        className="hide-mobile"
        style={{
          flex: '1 1 50%',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(135% 90% at 15% 10%, #1a4a6b 0%, #0d2d45 50%, #091e2e 100%)',
        }}
      >
        {/* Grid overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
          opacity: 0.06,
        }} />

        {/* Glow blob */}
        <div style={{
          position: 'absolute',
          width: 300, height: 300, borderRadius: '50%',
          background: 'rgba(255,255,255,0.06)',
          filter: 'blur(80px)',
        }} />

        {/* Logo + tagline */}
        <div style={{ position: 'relative', textAlign: 'center', padding: 20 }}>
          <img src="/doclink-logo.png" alt="DocLink" style={{ height: 144, filter: 'brightness(0) invert(1)' }} />
          <div style={{ color: '#ffffff', opacity: 0.7, fontSize: 14, marginTop: 16 }}>
            Powering Qatar's Business Operations
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div
        className="login-right-panel"
        style={{
          flex: '1 1 50%',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f8fafc',
          padding: 20,
        }}
      >
        <div
          className="login-card"
          style={{
            width: '100%',
            maxWidth: 400,
            background: '#ffffff',
            borderRadius: 24,
            padding: 40,
            boxShadow: '0 20px 60px rgba(0,0,0,0.08)',
          }}
        >
          <img src="/doclink-logo.png" alt="DocLink" style={{ height: 36, display: 'block', margin: '0 auto 28px' }} />

          <h2 style={{ fontSize: 22, fontWeight: 600, color: '#0d2d45', textAlign: 'center', marginBottom: 4 }}>
            Welcome back
          </h2>
          <p style={{ fontSize: 13, color: '#64748b', textAlign: 'center', marginBottom: 28 }}>
            Sign in to your DocLink dashboard
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
                Email address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                <input
                  className="login-input"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  style={{
                    width: '100%', height: 46, borderRadius: 10, border: '1px solid #e2e8f0',
                    paddingLeft: 40, paddingRight: 14, fontSize: 14, boxSizing: 'border-box',
                    color: '#1a1a1a', caretColor: '#1a1a1a', backgroundColor: '#ffffff',
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Password</label>
                <span style={{ fontSize: 12, color: '#1a6b9a' }}>Forgot password?</span>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                <input
                  className="login-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  style={{
                    width: '100%', height: 46, borderRadius: 10, border: '1px solid #e2e8f0',
                    paddingLeft: 40, paddingRight: 40, fontSize: 14, boxSizing: 'border-box',
                    color: '#1a1a1a', caretColor: '#1a1a1a', backgroundColor: '#ffffff',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#94a3b8', padding: 2, lineHeight: 1, outline: 'none',
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#374151', marginBottom: 20 }}>
              <input
                type="checkbox"
                checked={remember}
                onChange={e => setRemember(e.target.checked)}
                style={{ width: 15, height: 15 }}
              />
              Remember me
            </label>

            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626', marginBottom: 16 }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#154d75'
                const icon = e.currentTarget.querySelector('.login-btn-arrow')
                if (icon) icon.style.transform = 'translateX(3px)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = '#1a5c8a'
                const icon = e.currentTarget.querySelector('.login-btn-arrow')
                if (icon) icon.style.transform = 'translateX(0)'
              }}
              style={{
                width: '100%', height: 46, borderRadius: 10, border: 'none',
                background: '#1a5c8a', color: '#ffffff', fontWeight: 600, fontSize: 14,
                cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'background 0.15s',
              }}
            >
              {loading ? 'Signing in...' : 'Sign in'}
              {!loading && <ArrowRight size={16} className="login-btn-arrow" style={{ transition: 'transform 0.15s' }} />}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
