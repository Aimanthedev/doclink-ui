import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

function monthKey(dateStr) {
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`
}
function monthLabel(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

export function useReports(dateRange) {
  return useQuery({
    queryKey: ['reports', dateRange.start, dateRange.end],
    queryFn: async () => {
      const startISO = new Date(dateRange.start).toISOString()
      const endISO = new Date(new Date(dateRange.end).setHours(23,59,59)).toISOString()

      const [
        casesRes, invoicesRes, paymentsRes, leadsRes,
        renewalsRes, employeesRes, clientsRes,
      ] = await Promise.all([
        supabase.from('cases').select('id, status, priority, service_id, amount, created_at, completed_at, due_date, assigned_to, services(name, category)').gte('created_at', startISO).lte('created_at', endISO),
        supabase.from('invoices').select('id, total_amount, amount_paid, amount_due, status, created_at').gte('created_at', startISO).lte('created_at', endISO),
        supabase.from('payments').select('id, amount, payment_date, payment_method').gte('payment_date', dateRange.start).lte('payment_date', dateRange.end),
        supabase.from('leads').select('id, stage, estimated_value, created_at, converted_at').gte('created_at', startISO).lte('created_at', endISO),
        supabase.from('renewals').select('id, status, expiry_date, created_at'),
        supabase.from('users').select('id, full_name, role').eq('is_active', true),
        supabase.from('clients').select('id, created_at, client_type'),
      ])

      const cases = casesRes.data ?? []
      const invoices = invoicesRes.data ?? []
      const payments = paymentsRes.data ?? []
      const leads = leadsRes.data ?? []
      const renewals = renewalsRes.data ?? []
      const employees = employeesRes.data ?? []
      const clients = clientsRes.data ?? []

      const revenueByCategory = {}
      cases.forEach(c => {
        const cat = c.services?.category || 'Uncategorized'
        revenueByCategory[cat] = (revenueByCategory[cat] || 0) + Number(c.amount || 0)
      })

      const completedCases = cases.filter(c => c.status === 'completed' && c.completed_at)
      const avgCompletionDays = completedCases.length > 0
        ? Math.round(completedCases.reduce((s, c) => s + (new Date(c.completed_at) - new Date(c.created_at)) / 86400000, 0) / completedCases.length)
        : null

      const statusBreakdown = {}
      cases.forEach(c => { statusBreakdown[c.status] = (statusBreakdown[c.status] || 0) + 1 })

      const employeeStats = employees.map(e => {
        const empCases = cases.filter(c => c.assigned_to === e.id)
        return {
          name: e.full_name,
          total: empCases.length,
          completed: empCases.filter(c => c.status === 'completed').length,
          overdue: empCases.filter(c => c.status === 'overdue').length,
        }
      }).filter(e => e.total > 0)

      const wonLeads = leads.filter(l => l.stage === 'won')
      const lostLeads = leads.filter(l => l.stage === 'lost')

      const stageBreakdown = {}
      leads.forEach(l => { stageBreakdown[l.stage] = (stageBreakdown[l.stage] || 0) + 1 })

      const revenueMonthMap = new Map()
      function ensureRevenueMonth(dateStr) {
        const key = monthKey(dateStr)
        if (!revenueMonthMap.has(key)) revenueMonthMap.set(key, { key, month: monthLabel(dateStr), revenue: 0, collected: 0 })
        return revenueMonthMap.get(key)
      }
      invoices.forEach(i => { ensureRevenueMonth(i.created_at).revenue += Number(i.total_amount || 0) })
      payments.forEach(p => { ensureRevenueMonth(p.payment_date).collected += Number(p.amount || 0) })
      const revenueByMonth = [...revenueMonthMap.values()]
        .sort((a, b) => a.key.localeCompare(b.key))
        .map(m => ({ month: m.month, revenue: m.revenue, collected: m.collected }))

      const caseMonthMap = new Map()
      function ensureCaseMonth(dateStr) {
        const key = monthKey(dateStr)
        if (!caseMonthMap.has(key)) caseMonthMap.set(key, { key, month: monthLabel(dateStr), total: 0, completed: 0 })
        return caseMonthMap.get(key)
      }
      cases.forEach(c => {
        const m = ensureCaseMonth(c.created_at)
        m.total += 1
        if (c.status === 'completed') m.completed += 1
      })
      const casesByMonth = [...caseMonthMap.values()]
        .sort((a, b) => a.key.localeCompare(b.key))
        .map(m => ({ month: m.month, total: m.total, completed: m.completed }))

      return {
        totalCases: cases.length,
        completedCases: completedCases.length,
        overdueCases: cases.filter(c => c.status === 'overdue').length,
        avgCompletionDays,
        statusBreakdown,
        revenueByCategory,
        casesByMonth,

        totalLeads: leads.length,
        wonLeads: wonLeads.length,
        lostLeads: lostLeads.length,
        conversionRate: leads.length > 0 ? Math.round((wonLeads.length / leads.length) * 100) : 0,
        pipelineValue: leads.filter(l => !['won','lost'].includes(l.stage)).reduce((s, l) => s + Number(l.estimated_value || 0), 0),
        wonValue: wonLeads.reduce((s, l) => s + Number(l.estimated_value || 0), 0),
        stageBreakdown,

        totalRevenue: invoices.reduce((s, i) => s + Number(i.total_amount || 0), 0),
        totalCollected: payments.reduce((s, p) => s + Number(p.amount || 0), 0),
        totalOutstanding: invoices.reduce((s, i) => s + Number(i.amount_due || 0), 0),
        overdueInvoices: invoices.filter(i => i.status === 'overdue').length,
        collectionRate: invoices.length > 0
          ? Math.round((invoices.reduce((s, i) => s + Number(i.amount_paid || 0), 0) / invoices.reduce((s, i) => s + Number(i.total_amount || 0), 0)) * 100) || 0
          : 0,
        revenueByMonth,

        renewalsCreated: renewals.filter(r => r.created_at >= startISO && r.created_at <= endISO).length,
        renewalsOverdue: renewals.filter(r => new Date(r.expiry_date) < new Date() && r.status !== 'completed').length,
        renewalsCompleted: renewals.filter(r => r.status === 'completed').length,

        newClients: clients.filter(c => c.created_at >= startISO && c.created_at <= endISO).length,
        totalClients: clients.length,

        employeeStats,
      }
    },
  })
}