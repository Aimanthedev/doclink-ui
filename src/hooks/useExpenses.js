import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useExpenses(filters = {}) {
  return useQuery({
    queryKey: ['expenses', filters],
    queryFn: async () => {
      let query = supabase
        .from('expenses')
        .select(`
          *,
          case:cases(id, case_number, title),
          client:clients(id, company_name, contact_person),
          paid_by_user:users!expenses_paid_by_fkey(id, full_name),
          approved_by_user:users!expenses_approved_by_fkey(id, full_name),
          created_by_user:users!expenses_created_by_fkey(id, full_name)
        `)
        .order('expense_date', { ascending: false })

      if (filters.expense_type) query = query.eq('expense_type', filters.expense_type)
      if (filters.case_id) query = query.eq('case_id', filters.case_id)
      if (filters.status) query = query.eq('status', filters.status)
      if (filters.from) query = query.gte('expense_date', filters.from)
      if (filters.to) query = query.lte('expense_date', filters.to)

      const { data, error } = await query.limit(500)
      if (error) throw error
      return data ?? []
    },
  })
}

export function useCreateExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (expense) => {
      const { data, error } = await supabase.from('expenses').insert([expense]).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  })
}

export function useUpdateExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const { data, error } = await supabase.from('expenses').update(updates).eq('id', id).select()
      if (error) throw error
      if (!data || data.length === 0) {
        throw new Error('Expense was not updated. Check the Row Level Security UPDATE policy on expenses for this role.')
      }
      return data[0]
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  })
}

export function useDeleteExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { data, error } = await supabase.from('expenses').delete().eq('id', id).select('id')
      if (error) throw error
      if (!data || data.length === 0) {
        throw new Error('Expense was not deleted. Check the Row Level Security DELETE policy on expenses for this role.')
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  })
}
