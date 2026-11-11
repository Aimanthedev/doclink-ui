import { X, Lock } from 'lucide-react'

const OPTIONS = [
  {
    type: 'company_formation_expat',
    title: 'Company Formation — Expat Ownership',
    description: 'Full company setup quotation for 100% foreign-owned entities.',
    enabled: true,
  },
  {
    type: 'company_formation_qatari',
    title: 'Company Formation — Qatari Ownership',
    description: 'Full company setup quotation for Qatari-owned or partnered entities.',
    enabled: true,
  },
  {
    type: 'standard',
    title: 'Standard Service Quotation',
    description: 'General-purpose quotation for individual services from the service library.',
    enabled: true,
  },
]

export default function QuotationTypeSelector({ onClose, onSelect }) {
  return (
    <div className="modal-overlay">
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 16, border: '1px solid var(--bg-border)', width: '100%', maxWidth: 560, overflow: 'hidden' }}>

        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--bg-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: 22, fontWeight: 600, color: 'var(--text-primary)' }}>New Quotation</h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Choose the type of quotation you want to create</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {OPTIONS.map(opt => (
            <button
              key={opt.type}
              onClick={() => opt.enabled && onSelect(opt.type)}
              disabled={!opt.enabled}
              style={{
                textAlign: 'left',
                width: '100%',
                background: 'var(--bg-elevated)',
                border: opt.enabled ? '1px solid var(--bg-border)' : '1px solid var(--bg-border)',
                borderRadius: 10,
                padding: '16px 18px',
                cursor: opt.enabled ? 'pointer' : 'not-allowed',
                opacity: opt.enabled ? 1 : 0.55,
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 12,
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => { if (opt.enabled) e.currentTarget.style.borderColor = 'var(--accent-gold)' }}
              onMouseLeave={e => { if (opt.enabled) e.currentTarget.style.borderColor = 'var(--bg-border)' }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{opt.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{opt.description}</div>
              </div>
              {!opt.enabled && (
                <span style={{
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--text-muted)',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--bg-border)',
                  borderRadius: 20,
                  padding: '4px 10px',
                }}>
                  <Lock size={10} /> Coming soon
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
