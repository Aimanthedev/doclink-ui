import { useNavigate } from '@/lib/router-compat'
import { FileSignature, Receipt, Wallet, FlaskConical } from 'lucide-react'

function NavCard({ label, description, icon: Icon, onClick }) {
  return (
    <div
      className="glass card-hover"
      onClick={onClick}
      style={{ borderRadius: 12, padding: '20px 20px', cursor: 'pointer', position: 'relative' }}
    >
      <div style={{ width: 36, height: 36, background: 'rgba(37,99,235,0.1)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
        <Icon size={16} color="#3b82f6" />
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-primary)', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
        {description}
      </div>
    </div>
  )
}

export default function QuotationsLandingPage() {
  const navigate = useNavigate()

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: 30, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
          Quotations
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          Manage quotations, invoices, and receipts
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <NavCard
          label="Quotations"
          description="Create, manage, and approve service quotations for clients"
          icon={FileSignature}
          onClick={() => navigate('/quotations?view=quotations')}
        />
        <NavCard
          label="Invoices"
          description="View and manage invoices generated from approved quotations"
          icon={Receipt}
          onClick={() => navigate('/quotations?view=invoices')}
        />
        <NavCard
          label="Receipts"
          description="Track and issue payment receipts against approved invoices"
          icon={Wallet}
          onClick={() => navigate('/quotations?view=receipts')}
        />
        <NavCard
          label="TEST"
          description="Sandbox copy of Quotations with mock data. Nothing here is saved."
          icon={FlaskConical}
          onClick={() => navigate('/quotations?view=test')}
        />
      </div>
    </div>
  )
}
