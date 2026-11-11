import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from '@/lib/router-compat'
import { useQueryClient } from '@tanstack/react-query'
import { Menu, Search, Bell, ChevronDown, UserCog, Settings, LogOut, Sun, Moon, RefreshCw, FileCheck, X as XIcon } from 'lucide-react'
import { useAuth } from '../../lib/AuthContext'
import { useGlobalSearch } from '../../hooks/useGlobalSearch'
import { useNotifications } from '../../hooks/useNotifications'
import { useIsMobile } from '../../hooks/useIsMobile'
import { supabase } from '../../lib/supabase'
import { NAV } from './navConfig'
import EditProfileModal from './EditProfileModal'

// useNotifications only returns real rows from the `notifications` table
// (ids prefixed this way), so every item shown in the bell is deletable.
const DB_NOTIFICATION_PREFIX = 'notification-'
function realNotificationId(id) {
  return id.startsWith(DB_NOTIFICATION_PREFIX) ? id.slice(DB_NOTIFICATION_PREFIX.length) : null
}

const URGENCY_DOT = { high: '#ef4444', medium: '#f59e0b', low: '#3b82f6' }

function NotifIcon() {
  return (
    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(37,99,235,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <FileCheck size={15} color="#3b82f6" />
    </div>
  )
}

function NotifItem({ n, dismissible, onNavigate, onDismiss }) {
  return (
    <div
      onClick={onNavigate}
      style={{ padding: '12px 16px', borderBottom: '1px solid var(--bg-border)', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', transition: 'background 0.1s' }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-border)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
    >
      <NotifIcon />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.title}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.subtitle}</div>
      </div>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: URGENCY_DOT[n.urgency], flexShrink: 0 }} />
      {dismissible && (
        <button
          onClick={onDismiss}
          title="Dismiss"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, flexShrink: 0, display: 'flex' }}
        >
          <XIcon size={14} />
        </button>
      )}
    </div>
  )
}

export default function TopBar({ onMenuClick }) {
  const location = useLocation()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { profile, signOut } = useAuth()
  const isMobile = useIsMobile()

  const pageTitle = NAV.find(n => n.to === location.pathname)?.label || 'Dashboard'

  const now = new Date()
  const dateTime = `${now.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })} · ${now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true })}`

  const [rawSearch, setRawSearch] = useState('')
  const [search, setSearch] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)
  const containerRef = useRef(null)

  const [profileOpen, setProfileOpen] = useState(false)
  const [showEditProfile, setShowEditProfile] = useState(false)
  const profileRef = useRef(null)

  const [notifOpen, setNotifOpen] = useState(false)
  const [showAllNotifs, setShowAllNotifs] = useState(false)
  const [dismissedNotifIds, setDismissedNotifIds] = useState(() => new Set())
  const bellRef = useRef(null)

  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'))

  useEffect(() => {
    const t = setTimeout(() => setSearch(rawSearch), 300)
    return () => clearTimeout(t)
  }, [rawSearch])

  const { data: results, isFetching } = useGlobalSearch(search)
  const { data: notifData, isLoading: notifLoading } = useNotifications()

  const allNotifications = notifData?.notifications ?? []
  // Dismissed/cleared items disappear immediately without waiting on a refetch.
  const visibleNotifications = allNotifications.filter(n => !dismissedNotifIds.has(n.id))
  const displayedNotifications = showAllNotifs ? visibleNotifications : visibleNotifications.slice(0, 5)
  const totalCount = visibleNotifications.length

  async function handleDismissOne(e, id) {
    e.stopPropagation()
    setDismissedNotifIds(prev => new Set(prev).add(id))
    const realId = realNotificationId(id)
    if (realId) {
      try {
        await supabase.from('notifications').delete().eq('id', realId)
      } catch (err) {
        console.error('[TopBar] failed to dismiss notification:', err)
      }
      qc.invalidateQueries({ queryKey: ['notifications'] })
    }
  }

  async function handleClearAll() {
    setDismissedNotifIds(prev => new Set([...prev, ...visibleNotifications.map(n => n.id)]))
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('notifications').delete().eq('user_id', user.id).eq('is_read', false)
      }
    } catch (err) {
      console.error('[TopBar] failed to clear all notifications:', err)
    }
    qc.invalidateQueries({ queryKey: ['notifications'] })
  }

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setDropdownOpen(false)
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false)
      if (bellRef.current && !bellRef.current.contains(e.target)) setNotifOpen(false)
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') { setDropdownOpen(false); setProfileOpen(false); setNotifOpen(false) }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  function toggleTheme() {
    const next = !isDark
    setIsDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('doclink-theme', next ? 'dark' : 'light')
  }

  const showDropdown = dropdownOpen && search.trim().length >= 2
  const totalResults = results ? results.clients.length + results.cases.length + results.quotations.length + results.leads.length : 0

  function handleSelect(path) {
    navigate(path)
    setDropdownOpen(false)
  }

  function resultRowProps() {
    return {
      style: { padding: '8px 10px', borderRadius: 8, cursor: 'pointer', transition: 'background 0.1s' },
      onMouseEnter: e => { e.currentTarget.style.background = 'var(--bg-border)' },
      onMouseLeave: e => { e.currentTarget.style.background = 'transparent' },
    }
  }

  return (
    <header className="topbar" style={{
      height: 56,
      background: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--bg-border)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 24px',
      gap: 16,
      position: 'sticky',
      top: 0,
      zIndex: 30,
    }}>
      {/* Left: hamburger (mobile only) + page title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
        <button
          onClick={onMenuClick}
          className="hide-desktop"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4 }}
        >
          <Menu size={20} />
        </button>
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{pageTitle}</span>
      </div>

      {/* Center: search */}
      <div ref={containerRef} style={{ flex: 1, minWidth: 0, maxWidth: isMobile ? '100%' : 400, position: 'relative', marginLeft: 'auto' }}>
        <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          placeholder="Search clients, cases, quotations..."
          className="input-base"
          value={rawSearch}
          onChange={e => { setRawSearch(e.target.value); setDropdownOpen(true) }}
          onFocus={() => { setSearchFocused(true); setDropdownOpen(true) }}
          onBlur={() => setSearchFocused(false)}
          style={{
            paddingLeft: 36,
            background: 'var(--bg-elevated)',
            border: `1px solid ${searchFocused ? 'var(--accent-blue)' : 'var(--bg-border)'}`,
          }}
        />

        {showDropdown && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 6,
            background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)',
            borderRadius: 12, boxShadow: 'var(--shadow-lg)', zIndex: 300,
            maxHeight: 400, overflowY: 'auto', padding: 6,
          }}>
            {isFetching ? (
              <div style={{ padding: '16px 10px', textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>Searching...</div>
            ) : totalResults === 0 ? (
              <div style={{ padding: '16px 10px', textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>No results found</div>
            ) : (
              <>
                {results.clients.length > 0 && (
                  <div style={{ marginBottom: 6 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', padding: '6px 10px 4px' }}>Clients</div>
                    {results.clients.map(c => (
                      <div key={c.id} onClick={() => handleSelect(`/clients?open=${c.id}`)} {...resultRowProps()}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{c.company_name || c.contact_person}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{c.client_code}</div>
                      </div>
                    ))}
                  </div>
                )}

                {results.cases.length > 0 && (
                  <div style={{ marginBottom: 6 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', padding: '6px 10px 4px' }}>Cases</div>
                    {results.cases.map(c => (
                      <div key={c.id} onClick={() => handleSelect(`/cases?open=${c.id}`)} {...resultRowProps()}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{c.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.case_number} · <span style={{ textTransform: 'capitalize' }}>{c.status?.replace('_', ' ')}</span></div>
                      </div>
                    ))}
                  </div>
                )}

                {results.quotations.length > 0 && (
                  <div style={{ marginBottom: results.leads.length > 0 ? 6 : 0 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', padding: '6px 10px 4px' }}>Quotations</div>
                    {results.quotations.map(q => (
                      <div key={q.id} onClick={() => handleSelect(`/quotations?view=quotations&open=${q.id}`)} {...resultRowProps()}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{q.quotation_number}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {q.client_name_snapshot || q.client_contact_snapshot || q.client?.company_name || q.client?.contact_person} · <span style={{ textTransform: 'capitalize' }}>{q.status?.replace('_', ' ')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {results.leads.length > 0 && (
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', padding: '6px 10px 4px' }}>Leads</div>
                    {results.leads.map(l => (
                      <div key={l.id} onClick={() => handleSelect(`/sales?open=${l.id}`)} {...resultRowProps()}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{l.company_name || l.contact_person}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          <span style={{ textTransform: 'capitalize' }}>{l.stage?.replace('_', ' ')}</span>
                          {l.assigned_to_user?.full_name && <> · {l.assigned_to_user.full_name}</>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Right: date/time, theme toggle, notifications, profile */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
        <span className="hide-mobile" style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{dateTime}</span>

        <button
          onClick={() => window.location.reload()}
          title="Refresh"
          style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'transparent', border: '1px solid var(--bg-border)',
            cursor: 'pointer', color: 'var(--text-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s', flexShrink: 0,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
        >
          <RefreshCw size={16} />
        </button>

        <button
          onClick={toggleTheme}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'transparent', border: '1px solid var(--bg-border)',
            cursor: 'pointer', color: 'var(--text-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s', flexShrink: 0,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Notification bell */}
        <div ref={bellRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setNotifOpen(v => !v)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', position: 'relative', padding: 2 }}
          >
            <Bell size={16} />
            {totalCount > 0 && (
              <span style={{
                position: 'absolute', top: -4, right: -4,
                width: 18, height: 18, borderRadius: '50%',
                background: '#ef4444', color: '#ffffff',
                fontSize: 10, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                lineHeight: 1,
              }}>
                {totalCount > 9 ? '9+' : totalCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div style={{
              position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: 360,
              background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)',
              borderRadius: 12, boxShadow: 'var(--shadow-lg)', zIndex: 300,
              overflow: 'hidden',
            }}>
              {/* Header */}
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--bg-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Notifications</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{totalCount} unread</span>
                  {totalCount > 0 && (
                    <button
                      onClick={handleClearAll}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-blue-bright)', fontSize: 12, padding: 0 }}
                    >
                      Clear all
                    </button>
                  )}
                </div>
              </div>

              {/* Items */}
              <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                {notifLoading ? (
                  [1, 2, 3].map(i => (
                    <div key={i} style={{ padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'center', borderBottom: '1px solid var(--bg-border)' }}>
                      <div className="skeleton" style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div className="skeleton" style={{ height: 12, width: '70%', marginBottom: 6 }} />
                        <div className="skeleton" style={{ height: 10, width: '50%' }} />
                      </div>
                    </div>
                  ))
                ) : visibleNotifications.length === 0 ? (
                  <div style={{ padding: '40px 16px', textAlign: 'center' }}>
                    <Bell size={28} color="var(--text-muted)" style={{ marginBottom: 10 }} />
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>All clear — no alerts</div>
                  </div>
                ) : (
                  displayedNotifications.map(n => (
                    <NotifItem
                      key={n.id}
                      n={n}
                      dismissible
                      onNavigate={() => { navigate(n.link); setNotifOpen(false) }}
                      onDismiss={e => handleDismissOne(e, n.id)}
                    />
                  ))
                )}
              </div>

              {/* Footer */}
              {visibleNotifications.length > 5 && (
                <div
                  onClick={() => setShowAllNotifs(v => !v)}
                  style={{ padding: 12, textAlign: 'center', fontSize: 12, color: 'var(--accent-blue-bright)', cursor: 'pointer', borderTop: '1px solid var(--bg-border)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-border)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                >
                  {showAllNotifs ? 'Show less' : 'View all alerts'}
                </div>
              )}
            </div>
          )}
        </div>

        <div ref={profileRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setProfileOpen(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: isMobile ? 0 : 8, borderRadius: 20,
              padding: isMobile ? 2 : '6px 12px 6px 6px',
              background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.borderColor = 'var(--bg-border-hover)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.borderColor = 'var(--bg-border)' }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, #2563eb, #6366f1)', color: '#ffffff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700,
            }}>
              {profile?.full_name?.[0]?.toUpperCase() || '?'}
            </div>
            {!isMobile && (
              <>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {profile?.full_name || 'User'}
                </span>
                <ChevronDown size={14} color="var(--text-muted)" />
              </>
            )}
          </button>

          {profileOpen && (
            <div style={{
              position: 'absolute', right: 0, top: 'calc(100% + 8px)', minWidth: 220,
              background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', borderRadius: 12,
              boxShadow: 'var(--shadow-lg)', zIndex: 300, padding: 8,
            }}>
              <div style={{ padding: 12, borderBottom: '1px solid var(--bg-border)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, #2563eb, #6366f1)', color: '#ffffff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700,
                }}>
                  {profile?.full_name?.[0]?.toUpperCase() || '?'}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{profile?.full_name || 'User'}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.email}</div>
                  {profile?.role && (
                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'rgba(37,99,235,0.15)', color: '#3b82f6', fontWeight: 500, display: 'inline-block', marginTop: 4, textTransform: 'capitalize' }}>
                      {profile.role.replace('_', ' ')}
                    </span>
                  )}
                </div>
              </div>

              <div
                onClick={() => { setProfileOpen(false); setShowEditProfile(true) }}
                style={{ padding: '10px 12px', borderRadius: 8, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-secondary)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-border)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <UserCog size={15} /> Edit Profile
              </div>

              <div
                onClick={() => { setProfileOpen(false); navigate('/settings') }}
                style={{ padding: '10px 12px', borderRadius: 8, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-secondary)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-border)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <Settings size={15} /> Settings
              </div>

              <div style={{ height: 1, background: 'var(--bg-border)', margin: '4px 0' }} />

              <div
                onClick={() => { setProfileOpen(false); signOut() }}
                style={{ padding: '10px 12px', borderRadius: 8, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, color: 'var(--status-overdue)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-border)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <LogOut size={15} /> Sign Out
              </div>
            </div>
          )}
        </div>
      </div>

      {showEditProfile && <EditProfileModal onClose={() => setShowEditProfile(false)} />}
    </header>
  )
}
