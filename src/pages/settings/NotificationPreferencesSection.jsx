import { useState } from 'react'
import { ChevronDown, ChevronRight, Bell } from 'lucide-react'
import { useNotificationPreferences, useUpdateNotificationPreferences } from '../../hooks/useNotificationPreferences'
import { useAuth } from '../../lib/AuthContext'
import { useToast } from '../../lib/ToastContext'

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        width: 40, height: 22, borderRadius: 20, border: 'none', cursor: 'pointer', position: 'relative', padding: 0, flexShrink: 0,
        background: checked ? '#2563eb' : 'var(--bg-elevated)', transition: 'background 0.15s',
      }}
    >
      <span style={{
        position: 'absolute', top: 2, left: checked ? 20 : 2, width: 18, height: 18, borderRadius: '50%',
        background: '#ffffff', transition: 'left 0.15s',
      }} />
    </button>
  )
}

function ToggleRow({ title, subtitle, checked, onChange, withBorder = true, children }) {
  return (
    <div style={{ borderBottom: withBorder ? '1px solid var(--bg-border)' : 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{title}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{subtitle}</div>
        </div>
        <Toggle checked={checked} onChange={onChange} />
      </div>
      {children}
    </div>
  )
}

const DEFAULT_PREFS = {
  renewal_reminders: true,
  renewal_days_before: 30,
  payment_alerts: true,
  approval_notifications: true,
  case_updates: true,
  new_lead_alerts: true,
}

export default function NotificationPreferencesSection() {
  const { profile } = useAuth()
  const toast = useToast()
  const [expanded, setExpanded] = useState(false)
  const { data: prefs, isLoading } = useNotificationPreferences(profile?.id)
  const { mutateAsync: updatePrefs } = useUpdateNotificationPreferences()

  const [local, setLocal] = useState(null)

  if (!isLoading && local === null) {
    setLocal({
      renewal_reminders: prefs?.renewal_reminders ?? DEFAULT_PREFS.renewal_reminders,
      renewal_days_before: prefs?.renewal_days_before ?? DEFAULT_PREFS.renewal_days_before,
      payment_alerts: prefs?.payment_alerts ?? DEFAULT_PREFS.payment_alerts,
      approval_notifications: prefs?.approval_notifications ?? DEFAULT_PREFS.approval_notifications,
      case_updates: prefs?.case_updates ?? DEFAULT_PREFS.case_updates,
      new_lead_alerts: prefs?.new_lead_alerts ?? DEFAULT_PREFS.new_lead_alerts,
    })
  }

  async function persist(next) {
    try {
      await updatePrefs({ userId: profile.id, ...next })
      toast('Preferences saved', 'success')
    } catch (err) {
      toast(err.message || 'Failed to save preference', 'error')
    }
  }

  function handleToggle(field, value) {
    const next = { ...local, [field]: value }
    setLocal(next)
    persist(next)
  }

  function handleDaysChange(value) {
    setLocal(p => ({ ...p, renewal_days_before: value }))
  }

  function handleDaysBlur() {
    persist(local)
  }

  return (
    <div className="card" style={{ padding: 0, marginBottom: 20, overflow: 'hidden' }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{ padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, background: 'var(--bg-elevated)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Bell size={16} color="var(--accent-gold)" />
          </div>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Notification Preferences</h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Configure alerts for renewals, approvals, and payments</p>
          </div>
        </div>
        {expanded ? <ChevronDown size={18} color="var(--text-muted)" /> : <ChevronRight size={18} color="var(--text-muted)" />}
      </div>

      {expanded && (
        <div style={{ padding: '0 24px 24px' }}>
          <div className="gold-line" style={{ marginBottom: 12 }} />

          {isLoading || !local ? (
            <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading preferences...</div>
          ) : (
            <div>
              <ToggleRow
                title="Renewal Reminders"
                subtitle="Get notified before renewals expire"
                checked={local.renewal_reminders}
                onChange={v => handleToggle('renewal_reminders', v)}
                withBorder={!local.renewal_reminders}
              >
                {local.renewal_reminders && (
                  <div style={{ paddingBottom: 14 }}>
                    <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Days before expiry
                    </label>
                    <input
                      className="input-base"
                      type="number" inputMode="decimal"
                      min={1}
                      max={90}
                      style={{ width: 100 }}
                      value={local.renewal_days_before}
                      onChange={e => handleDaysChange(Number(e.target.value))}
                      onBlur={handleDaysBlur}
                    />
                  </div>
                )}
              </ToggleRow>

              <ToggleRow
                title="Payment Alerts"
                subtitle="Alerts for overdue invoices and outstanding payments"
                checked={local.payment_alerts}
                onChange={v => handleToggle('payment_alerts', v)}
              />

              <ToggleRow
                title="Approval Notifications"
                subtitle="When quotations are approved or rejected"
                checked={local.approval_notifications}
                onChange={v => handleToggle('approval_notifications', v)}
              />

              <ToggleRow
                title="Case Updates"
                subtitle="Status changes on your assigned cases"
                checked={local.case_updates}
                onChange={v => handleToggle('case_updates', v)}
              />

              <ToggleRow
                title="New Lead Alerts"
                subtitle="When a new lead is added to the pipeline"
                checked={local.new_lead_alerts}
                onChange={v => handleToggle('new_lead_alerts', v)}
                withBorder={false}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
