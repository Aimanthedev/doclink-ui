import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

// UI metadata for the two toggle groups in Settings → User Access Control.
// Also doubles as the source of truth for default values when a user has no permissions row yet.
export const TAB_PERMISSIONS = [
  { key: 'can_access_cases', label: 'Cases', default: true },
  { key: 'can_access_clients', label: 'Clients', default: true },
  { key: 'can_access_renewals', label: 'Renewals', default: true },
  { key: 'can_access_documents', label: 'Documents', default: true },
  { key: 'can_access_employees', label: 'Employees', default: true },
  { key: 'can_access_quotations', label: 'Quotations', default: true },
  { key: 'can_access_sales', label: 'Sales', default: true },
  { key: 'can_access_accounts', label: 'Accounts', default: false },
  { key: 'can_access_calendar', label: 'Calendar', default: true },
  { key: 'can_access_reports', label: 'Reports', default: false },
  { key: 'can_access_settings', label: 'Settings', default: true },
]

export const FEATURE_PERMISSIONS = [
  { key: 'can_approve_quotations', label: 'Approve Quotations', description: 'Can approve and sign quotations', default: false },
  { key: 'can_reject_quotations', label: 'Reject Quotations', description: 'Can reject pending quotations', default: false },
  { key: 'can_convert_to_invoice', label: 'Convert to Invoice', description: 'Can convert approved quotations to invoices', default: false },
  { key: 'can_approve_invoices', label: 'Approve Invoices', description: 'Can approve and sign invoices', default: false },
  { key: 'can_approve_receipts', label: 'Approve Receipts', description: 'Can approve and sign receipts', default: false },
  { key: 'can_create_quotations', label: 'Create Quotations', description: 'Can create new quotations', default: true },
  { key: 'can_delete_records', label: 'Delete Records', description: 'Can permanently delete cases, clients, and quotations', default: false },
  { key: 'can_export_documents', label: 'Export Documents', description: 'Can export DOCX files and upload documents', default: true },
  { key: 'can_manage_clients', label: 'Manage Clients', description: 'Can add and edit clients', default: true },
  { key: 'can_edit_clients', label: 'Edit Clients', description: 'Can edit existing client details', default: true },
  { key: 'can_manage_cases', label: 'Manage Cases', description: 'Can create and edit cases', default: true },
  { key: 'can_view_financials', label: 'View Financials', description: 'Can view and record payments in Accounts', default: false },
]

export const ALL_PERMISSION_KEYS = [...TAB_PERMISSIONS, ...FEATURE_PERMISSIONS].map(p => p.key)

export const DEFAULT_PERMISSIONS = Object.fromEntries(
  [...TAB_PERMISSIONS, ...FEATURE_PERMISSIONS].map(p => [p.key, p.default])
)

function withDefaults(row) {
  return { ...DEFAULT_PERMISSIONS, ...(row || {}) }
}

// ── Single user's permissions ─────────────────────────────────────────────────
export function usePermissions(userId) {
  return useQuery({
    queryKey: ['permissions', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_permissions')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()
      if (error) throw error
      return withDefaults(data)
    },
  })
}

// ── The logged-in user's own permissions ──────────────────────────────────────
export function useMyPermissions() {
  const { profile } = useAuth()
  return usePermissions(profile?.id)
}

// ── All users + their permissions, for the super_admin management UI ─────────
export function useAllPermissions() {
  return useQuery({
    queryKey: ['all_permissions'],
    queryFn: async () => {
      // The relationship is qualified by FK constraint name (not just `user_permissions(*)`)
      // because an unqualified embed throws a "more than one relationship was found" error
      // from PostgREST as soon as there's any other FK from user_permissions back to users
      // (e.g. a granted_by/updated_by column) — that error was being silently swallowed
      // into an empty list below, which is why the section looked empty instead of erroring.
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, role, permissions:user_permissions!user_permissions_user_id_fkey(*)')
        .order('full_name')

      if (error) {
        console.error('[useAllPermissions] query failed:', error)
        throw error
      }

      const result = (data ?? []).map(u => ({
        ...u,
        permissions: withDefaults(Array.isArray(u.permissions) ? u.permissions[0] : u.permissions),
      }))
      console.log('[useAllPermissions] loaded', result.length, 'user(s):', result)
      return result
    },
  })
}

// ── Upsert a user's permissions row ───────────────────────────────────────────
export function useUpdatePermissions() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId, ...permissions }) => {
      const { error } = await supabase
        .from('user_permissions')
        .upsert([{ user_id: userId, ...permissions }], { onConflict: 'user_id' })
      if (error) throw error
    },
    onSuccess: (_data, { userId }) => {
      qc.invalidateQueries({ queryKey: ['all_permissions'] })
      qc.invalidateQueries({ queryKey: ['permissions', userId] })
    },
  })
}

// ── Permission check helper ───────────────────────────────────────────────────
// `permissions === null` is treated as "no restrictions" (used for super_admin bypass).
export function hasPermission(permissions, key) {
  if (permissions === null) return true
  return permissions?.[key] === true
}
