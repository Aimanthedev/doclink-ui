// Display labels/colours for the enums the Overview shows.
export const STAGE_ORDER = ['new_lead', 'consultation', 'proposal_sent', 'documents_requested', 'won', 'lost']
export const STAGE_LABELS = {
  new_lead: 'New Lead', consultation: 'Consultation', proposal_sent: 'Proposal Sent',
  documents_requested: 'Documents Requested', won: 'Won', lost: 'Lost',
}
export const STAGE_COLORS = {
  new_lead: '#94a3b8', consultation: '#6366f1', proposal_sent: '#3b82f6',
  documents_requested: '#f59e0b', won: '#10b981', lost: '#ef4444',
}

export const CASE_STATUS_ORDER = ['active', 'waiting_client', 'government_review', 'overdue', 'completed', 'cancelled']
export const CASE_STATUS_LABELS = {
  active: 'Active', waiting_client: 'Waiting for Client', government_review: 'Government Review',
  overdue: 'Marked Overdue', completed: 'Completed', cancelled: 'Cancelled',
}
export const CASE_STATUS_COLORS = {
  active: '#10b981', waiting_client: '#f59e0b', government_review: '#6366f1',
  overdue: '#ef4444', completed: '#3b82f6', cancelled: '#94a3b8',
}

export const PRIORITY_COLORS = { low: '#94a3b8', medium: '#3b82f6', high: '#f59e0b', urgent: '#ef4444', critical: '#dc2626' }

export const INVOICE_STATUS_LABELS = {
  draft: 'Draft', pending_approval: 'Pending Approval', approved: 'Approved', rejected: 'Rejected',
  sent: 'Sent', paid: 'Paid', partially_paid: 'Partially Paid', overdue: 'Overdue', cancelled: 'Cancelled', converted: 'Converted',
}

export const ROLE_LABELS = {
  sales_staff: 'Sales', pro_officer: 'PRO Officer', accounts_staff: 'Accounts', manager: 'Manager', super_admin: 'Super Admin',
}

// Lead / contact display name (company_name can be an empty string).
export function leadName(item) {
  return item.company_name || item.contact_person || 'Unnamed lead'
}

// Sort rows of {stage|status, count} into a stable display order.
export function sortByOrder(rows, key, order) {
  return [...rows].sort((a, b) => {
    const ia = order.indexOf(a[key])
    const ib = order.indexOf(b[key])
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
  })
}
