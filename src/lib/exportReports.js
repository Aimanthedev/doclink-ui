import * as XLSX from 'xlsx'
import { supabase } from './supabase'

function downloadXLSX(rows, filename) {
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  XLSX.writeFile(wb, filename)
}

function downloadCSV(rows, filename) {
  const csv = rows.map(r => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function exportOverviewCSV(data, range) {
  if (!data) return
  const rows = [
    ['Report Period', `${range.start} to ${range.end}`],
    [],
    ['OPERATIONS'],
    ['Total Cases', data.totalCases],
    ['Completed Cases', data.completedCases],
    ['Overdue Cases', data.overdueCases],
    ['Avg Completion Days', data.avgCompletionDays ?? 'N/A'],
    [],
    ['SALES'],
    ['Total Leads', data.totalLeads],
    ['Won', data.wonLeads],
    ['Lost', data.lostLeads],
    ['Conversion Rate', `${data.conversionRate}%`],
    ['Pipeline Value (QAR)', data.pipelineValue],
    ['Won Value (QAR)', data.wonValue],
    [],
    ['ACCOUNTS'],
    ['Total Revenue (QAR)', data.totalRevenue],
    ['Total Collected (QAR)', data.totalCollected],
    ['Outstanding (QAR)', data.totalOutstanding],
    ['Collection Rate', `${data.collectionRate}%`],
    [],
    ['CLIENTS'],
    ['New Clients', data.newClients],
    ['Total Clients', data.totalClients],
  ]
  downloadCSV(rows, `DocLink_Report_${range.start}_to_${range.end}.csv`)
}

export async function exportInvoicesXLSX(range) {
  const startISO = new Date(range.start).toISOString()
  const endISO = new Date(new Date(range.end).setHours(23, 59, 59)).toISOString()

  const { data, error } = await supabase
    .from('invoices')
    .select('invoice_number, bill_to_name, total_amount, amount_paid, amount_due, status, due_date, client:clients(company_name, contact_person)')
    .gte('created_at', startISO)
    .lte('created_at', endISO)
    .order('created_at', { ascending: false })
  if (error) throw error

  const rows = (data ?? []).map(inv => ({
    'Invoice #': inv.invoice_number,
    'Client': inv.client?.company_name || inv.client?.contact_person || '',
    'Billed As': inv.bill_to_name || '',
    'Amount': Number(inv.total_amount || 0),
    'Paid': Number(inv.amount_paid || 0),
    'Outstanding': Number(inv.amount_due || 0),
    'Status': inv.status,
    'Due Date': inv.due_date || '',
  }))

  downloadXLSX(rows, `DocLink_Invoices_${range.start}_to_${range.end}.xlsx`)
}

export async function exportLeadsXLSX() {
  const { data, error } = await supabase
    .from('leads')
    .select('lead_number, company_name, contact_person, phone_country_code, phone_number, email, service_interest, estimated_value, source, stage, follow_up_date, notes, created_at, assigned_to_user:users!leads_assigned_to_fkey(full_name)')
    .order('created_at', { ascending: false })
  if (error) throw error

  const rows = (data ?? []).map(l => ({
    'Lead #': l.lead_number,
    'Company': l.company_name || '',
    'Contact': l.contact_person || '',
    'Phone': `${l.phone_country_code || '+974'} ${l.phone_number || ''}`.trim(),
    'Email': l.email || '',
    'Service Interest': l.service_interest || '',
    'Estimated Value': Number(l.estimated_value || 0),
    'Source': l.source || '',
    'Stage': l.stage || '',
    'Assigned To': l.assigned_to_user?.full_name || '',
    'Follow-up Date': l.follow_up_date || '',
    'Notes': l.notes || '',
    'Created Date': l.created_at ? l.created_at.split('T')[0] : '',
  }))

  downloadXLSX(rows, `DocLink_Leads_${new Date().toISOString().split('T')[0]}.xlsx`)
}

export async function exportCasesXLSX(range) {
  const startISO = new Date(range.start).toISOString()
  const endISO = new Date(new Date(range.end).setHours(23, 59, 59)).toISOString()

  const { data, error } = await supabase
    .from('cases')
    .select('case_number, status, priority, amount, due_date, created_at, client:clients(company_name, contact_person), service:services(name), assigned_to_user:users!cases_assigned_to_fkey(full_name)')
    .gte('created_at', startISO)
    .lte('created_at', endISO)
    .order('created_at', { ascending: false })
  if (error) throw error

  const rows = (data ?? []).map(c => ({
    'Case #': c.case_number,
    'Client': c.client?.company_name || c.client?.contact_person || '',
    'Service': c.service?.name || '',
    'Status': c.status,
    'Priority': c.priority,
    'Assigned To': c.assigned_to_user?.full_name || '',
    'Amount': Number(c.amount || 0),
    'Due Date': c.due_date || '',
    'Created Date': c.created_at ? c.created_at.split('T')[0] : '',
  }))

  downloadXLSX(rows, `DocLink_Cases_${range.start}_to_${range.end}.xlsx`)
}
