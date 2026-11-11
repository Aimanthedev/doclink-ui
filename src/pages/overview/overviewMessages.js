// One short, factual message per Overview. Every sentence is derived from the
// loaded data; nothing is praised or promised without supporting numbers, and
// there are no targets, quotas or benchmarks (none exist in the system).
import { formatQar, plural } from '../../lib/qatarTime'

export function salesMessage(data) {
  const k = data?.kpis
  if (!k) return null
  if (k.followups_overdue > 0) {
    return `You have ${plural(k.followups_overdue, 'overdue follow-up')}. Start with the oldest.`
  }
  if (k.followups_due > 0) {
    return `${plural(k.followups_due, 'follow-up')} ${k.followups_due === 1 ? 'is' : 'are'} due today.`
  }
  if (k.followups_completed_today > 0) {
    return "You've completed today's scheduled follow-ups. Nice work."
  }
  if (k.won_month_count > 0) {
    return `Nice progress. You've won ${plural(k.won_month_count, 'deal')} this month.`
  }
  return 'All clear for today. No follow-ups are due.'
}

export function proMessage(data) {
  const k = data?.kpis
  if (!k) return null
  if (k.overdue > 0) {
    return `You're making progress. Focus on your ${plural(k.overdue, 'overdue case')} first.`
  }
  if (k.due_soon > 0) {
    return `${plural(k.due_soon, 'case')} ${k.due_soon === 1 ? 'is' : 'are'} due within the next 7 days.`
  }
  if (k.completed_month > 0) {
    return `Nice progress. You've completed ${plural(k.completed_month, 'case')} this month.`
  }
  if (k.active_cases === 0) return 'No cases are assigned to you right now.'
  return 'All clear. Nothing is overdue or due this week.'
}

export function accountsMessage(data) {
  const k = data?.kpis
  if (!k) return null
  if (k.overdue_count > 0) {
    return `${plural(k.overdue_count, 'invoice')} ${k.overdue_count === 1 ? 'is' : 'are'} past the due date (${formatQar(k.overdue_amount)} outstanding).`
  }
  const waiting = (k.awaiting_invoice_approval || 0) + (k.awaiting_receipt_approval || 0)
  if (waiting > 0) {
    return `${plural(waiting, 'item')} ${waiting === 1 ? 'is' : 'are'} waiting for approval.`
  }
  if (k.collections_month > 0) {
    return `${formatQar(k.collections_month)} has been collected this month so far.`
  }
  if (k.outstanding === 0) return 'All clear. There are no outstanding receivables.'
  return 'No overdue invoices and nothing waiting for approval.'
}

export function managerMessage(data) {
  const k = data?.kpis
  if (!k) return null
  const overdue = (k.overdue_cases || 0) + (k.overdue_followups || 0) + (k.overdue_renewals || 0)
  if (overdue > 0) {
    return `Your team has ${plural(overdue, 'overdue item')}. Start with the items under Operational Attention.`
  }
  if (k.followups_due > 0) return `${plural(k.followups_due, 'follow-up')} due across the team, none overdue.`
  return 'All clear. No overdue assignments across the team.'
}

export function adminMessage(data) {
  const items = data?.attention
  if (!items) return null
  const critical = items.filter(i => i.severity === 1).length
  if (items.length === 0) return 'All clear. Nothing needs executive attention right now.'
  if (critical > 0) {
    return `${plural(items.length, 'item')} need${items.length === 1 ? 's' : ''} attention, ${critical} critical.`
  }
  return `${plural(items.length, 'item')} need${items.length === 1 ? 's' : ''} attention. None are critical.`
}
