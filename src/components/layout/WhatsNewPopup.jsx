import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

const RELEASE_ID = 'bill-to-2026-xx'
const EXPIRES_AT = '2026-10-06T07:26:16.762Z'
const STORAGE_KEY = `whatsnew_seen_${RELEASE_ID}`

function hasSeen() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function markSeen() {
  try {
    localStorage.setItem(STORAGE_KEY, '1')
  } catch {
    // ignore — storage unavailable (private mode, blocked, etc.)
  }
}

export default function WhatsNewPopup() {
  const [visible, setVisible] = useState(() => {
    const expired = Date.now() >= new Date(EXPIRES_AT).getTime()
    return !expired && !hasSeen()
  })

  if (!visible) return null

  function handleDismiss() {
    markSeen()
    setVisible(false)
  }

  return createPortal(
    <div className="modal-overlay">
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 16, border: '1px solid var(--bg-border)', width: '100%', maxWidth: 440, overflow: 'hidden' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--bg-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>What's new</h2>
          <button onClick={handleDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '18px 22px' }}>
          <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            <li>Fixed: Approving a quotation no longer shows an error message.</li>
            <li>New: You can now choose the name printed on an invoice ("Bill to"). Set it when you turn a quotation into an invoice. When it is set, only that name appears on the invoice and receipt.</li>
            <li>Fixed: Services priced at 0 are no longer lost. They now show everywhere.</li>
            <li>New: You can preview invoices and receipts before downloading.</li>
          </ul>
        </div>

        <div style={{ padding: '14px 22px', borderTop: '1px solid var(--bg-border)', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={handleDismiss}
            style={{
              background: '#3b82f6',
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 600,
              fontFamily: 'Inter, system-ui, sans-serif',
              cursor: 'pointer',
            }}
          >
            Got it
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
