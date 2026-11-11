import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useActiveAnnouncement, useDismissAnnouncement } from '../../hooks/useAnnouncements'
import { useAuth } from '../../lib/AuthContext'
import { useToast } from '../../lib/ToastContext'

export default function AnnouncementModal() {
  const { profile } = useAuth()
  const toast = useToast()
  const { data: announcement } = useActiveAnnouncement(profile?.id)
  const { mutateAsync: dismiss, isPending } = useDismissAnnouncement()

  if (!announcement) return null

  async function handleDismiss() {
    try {
      await dismiss({ announcementId: announcement.id, userId: profile.id })
    } catch (err) {
      toast(err.message || 'Failed to dismiss announcement', 'error')
    }
  }

  return createPortal(
    <div className="modal-overlay">
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 16, border: '1px solid var(--bg-border)', width: '100%', maxWidth: 480, maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--bg-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}>{announcement.title}</h2>
          <button onClick={handleDismiss} disabled={isPending} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '20px 24px', overflowY: 'auto' }}>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 }}>
            {announcement.body}
          </p>
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--bg-border)', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn-gold" onClick={handleDismiss} disabled={isPending}>
            {isPending ? 'Dismissing...' : 'Got it'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
