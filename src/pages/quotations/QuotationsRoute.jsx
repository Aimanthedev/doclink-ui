import { useSearchParams } from '@/lib/router-compat'
import QuotationsLandingPage from './QuotationsLandingPage'
import QuotationsPage from './QuotationsPage'
import InvoicesPage from './InvoicesPage'
import ReceiptsPage from './ReceiptsPage'
import TestQuotationsPage from './test/TestQuotationsPage'

export default function QuotationsRoute() {
  const [searchParams] = useSearchParams()
  const view = searchParams.get('view')

  if (view === 'quotations') return <QuotationsPage />
  if (view === 'invoices') return <InvoicesPage />
  if (view === 'receipts') return <ReceiptsPage />
  if (view === 'test') return <TestQuotationsPage />
  return <QuotationsLandingPage />
}
