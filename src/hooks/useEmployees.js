import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { functionErrorMessage } from '../lib/functionErrors'

const STAFF_ROLES = ['sales_staff', 'pro_officer', 'accounts_staff']
const OPEN_LEAD_STAGES_EXCLUDED = ['won', 'lost']

export function useEmployees(includeInactive = false) {
  return useQuery({
    queryKey: ['employees', includeInactive],
    queryFn: async () => {
      let userQuery = supabase.from('users').select('id, full_name, email, role, phone, signature_url, is_active, created_at').order('full_name')
      if (!includeInactive) userQuery = userQuery.eq('is_active', true)

      // One batch query per table for the whole team, rather than per-employee —
      // the per-employee breakdowns below are all just client-side filters over these.
      const [usersRes, casesRes, employeesRes, leadsRes, invoicesRes] = await Promise.all([
        userQuery,
        supabase.from('cases').select('id, assigned_to, status, priority, due_date, completed_at'),
        supabase.from('employees').select('*'),
        supabase.from('leads').select('id, assigned_to, stage, estimated_value'),
        supabase.from('invoices').select('id, created_by, status, total_amount'),
      ])

      const users = usersRes.data ?? []
      const cases = casesRes.data ?? []
      const employeeProfiles = employeesRes.data ?? []
      const leads = leadsRes.data ?? []
      const invoices = invoicesRes.data ?? []

      const teamCases = cases.length
      const teamLeads = leads.length
      const staffCount = users.filter(u => STAFF_ROLES.includes(u.role)).length

      return users.map(u => {
        const userCases = cases.filter(c => c.assigned_to === u.id)
        const active = userCases.filter(c => ['active', 'waiting_client', 'government_review'].includes(c.status))
        const completed = userCases.filter(c => c.status === 'completed')
        const overdue = userCases.filter(c => c.status === 'overdue')
        const total = userCases.length
        const onTimeRate = total > 0 ? Math.round(((total - overdue.length) / total) * 100) : null
        const profile = employeeProfiles.find(e => e.user_id === u.id)

        // pro_officer: cases assigned/completed (any status name) + rate of those
        // completed before their due date, rather than the "not currently overdue"
        // rate above (which is about open cases, not a completion-quality metric).
        const casesCompletedAnyLabel = userCases.filter(c => c.status === 'completed' || c.status === 'closed')
        const onTimeCompleted = casesCompletedAnyLabel.filter(c => !c.due_date || !c.completed_at || new Date(c.completed_at) <= new Date(c.due_date))
        const proOnTimeRate = casesCompletedAnyLabel.length > 0
          ? Math.round((onTimeCompleted.length / casesCompletedAnyLabel.length) * 100)
          : null

        // sales_staff: leads assigned/won + open pipeline value (excludes won/lost)
        const userLeads = leads.filter(l => l.assigned_to === u.id)
        const leadsWon = userLeads.filter(l => l.stage === 'won')
        const pipelineValue = userLeads
          .filter(l => !OPEN_LEAD_STAGES_EXCLUDED.includes(l.stage))
          .reduce((s, l) => s + Number(l.estimated_value || 0), 0)

        // accounts_staff: invoices created + total value + pending approvals
        const userInvoices = invoices.filter(i => i.created_by === u.id)
        const invoicesValue = userInvoices.reduce((s, i) => s + Number(i.total_amount || 0), 0)
        const pendingApprovals = userInvoices.filter(i => i.status === 'pending_approval').length

        return {
          ...u,
          employeeProfileId: profile?.id || null,
          employee_code: profile?.employee_code || null,
          department: profile?.department || null,
          position: profile?.position || null,
          whatsapp: profile?.whatsapp || null,
          activeCases: active.length,
          completedCases: completed.length,
          overdueCases: overdue.length,
          totalCases: total,
          onTimeRate,

          casesAssigned: total,
          casesCompleted: casesCompletedAnyLabel.length,
          proOnTimeRate,

          leadsAssigned: userLeads.length,
          leadsWon: leadsWon.length,
          pipelineValue,

          invoicesHandled: userInvoices.length,
          invoicesValue,
          pendingApprovals,

          // manager/super_admin: team-wide totals, not just their own assignments
          teamCases,
          teamLeads,
          staffCount,
        }
      })
    },
  })
}

// Creates the login AND the profile in one step through the `create-employee` edge
// function. The server checks who is calling (super_admin, or a manager adding staff
// roles only) and rolls everything back if any part fails. Returns
// { user_id, email, temp_password }: the temporary password is shown once.
export function useCreateEmployee() {
  const qc = useQueryClient()
  return useMutation({
    // The result contains a one-time temporary password: don't keep it in the cache.
    gcTime: 0,
    mutationFn: async ({ full_name, email, phone, role, employee_code, department, position, whatsapp }) => {
      const { data, error } = await supabase.functions.invoke('create-employee', {
        body: { full_name, email, phone, role, employee_code, department, position, whatsapp },
      })
      if (error) throw new Error(await functionErrorMessage(error, 'Failed to add employee'))
      if (!data?.success) throw new Error(data?.error || 'Failed to add employee')
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }),
  })
}

export function useUpdateEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, employeeProfileId, full_name, phone, role, is_active, employee_code, department, position, whatsapp }) => {
      const { data: updatedUser, error: userErr } = await supabase
        .from('users')
        .update({ full_name, phone, role, is_active })
        .eq('id', id)
        .select('id')
      if (userErr) throw userErr
      if (!updatedUser || updatedUser.length === 0) {
        throw new Error('Employee profile was not updated. Check the Row Level Security UPDATE policy on users for this role.')
      }

      if (employeeProfileId) {
        const { data: updatedEmployee, error: empErr } = await supabase
          .from('employees')
          .update({ employee_code, department, position, whatsapp })
          .eq('id', employeeProfileId)
          .select('id')
        if (empErr) throw empErr
        if (!updatedEmployee || updatedEmployee.length === 0) {
          throw new Error('Employee HR details were not updated. Check the Row Level Security UPDATE policy on employees for this role.')
        }
      } else {
        const { error: empErr } = await supabase.from('employees').insert([{ user_id: id, employee_code, department, position, whatsapp }])
        if (empErr) throw empErr
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }),
  })
}