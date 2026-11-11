import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

const PRESIGN_FUNCTION = 'r2-presign'

export function useDocuments(filters = {}) {
  return useQuery({
    queryKey: ['documents', filters],
    queryFn: async () => {
      let query = supabase
        .from('documents')
        .select('*, client:clients(id, company_name, contact_person, client_code), case:cases(id, title, case_number), uploaded_by_user:users!documents_uploaded_by_fkey(id, full_name)')
        .order('created_at', { ascending: false })

      if (filters.client_id) query = query.eq('client_id', filters.client_id)
      if (filters.category) query = query.eq('category', filters.category)
      if (filters.case_id) query = query.eq('case_id', filters.case_id)
      if (filters.search?.trim()) query = query.ilike('file_name', `%${filters.search}%`)

      const { data, error } = await query.limit(500)
      if (error) throw error
      return data ?? []
    },
  })
}

async function getPresignedUrl({ action, key, contentType }) {
  const { data, error } = await supabase.functions.invoke(PRESIGN_FUNCTION, {
    body: { action, key, contentType },
  })
  if (error) throw error
  if (action !== 'delete' && !data?.url) throw new Error('Failed to get presigned URL')
  return data
}

function buildFileKey({ category, clientId, fileName }) {
  const safeName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_')
  const prefix = [category || 'general', clientId || 'unassigned'].join('/')
  return `${prefix}/${crypto.randomUUID()}-${safeName}`
}

export function useUploadDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      file, category, categoryCustom, clientId, caseId, uploadedBy,
      notes, isAdminOnly, requiresApproval, approvalStatus, expiryDate,
    }) => {
      const fileKey = buildFileKey({ category, clientId, fileName: file.name })

      // OFFLINE COPY: uploads to object storage are disabled (no network request is made).
      throw new Error('File upload is disabled in the offline design copy.')

      const { data, error } = await supabase
        .from('documents')
        .insert([{
          file_name: file.name,
          file_key: fileKey,
          file_url: `/${fileKey}`,
          category: category || null,
          category_custom: categoryCustom || null,
          client_id: clientId || null,
          case_id: caseId || null,
          uploaded_by: uploadedBy || null,
          file_size_bytes: file.size,
          notes: notes || null,
          is_admin_only: !!isAdminOnly,
          requires_approval: !!requiresApproval,
          approval_status: approvalStatus || 'approved',
          expiry_date: expiryDate || null,
        }])
        .select()
        .single()
      if (error) throw error

      let renewalCreated = false
      if (expiryDate) {
        const { error: renewalErr } = await supabase.from('renewals').insert([{
          client_id: clientId || null,
          case_id: caseId || null,
          renewal_type: category || categoryCustom || 'Document Renewal',
          expiry_date: expiryDate,
          status: 'upcoming',
          notes: `Auto-created from document: ${file.name}`,
          created_by: uploadedBy || null,
        }])
        if (renewalErr) {
          console.error('[useUploadDocument] failed to create renewal record:', renewalErr)
        } else {
          renewalCreated = true
        }
      }

      return { document: data, renewalCreated }
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['documents'] })
      if (variables.expiryDate) {
        qc.invalidateQueries({ queryKey: ['renewals'] })
      }
    },
  })
}

export function useDeleteDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, fileKey }) => {
      await getPresignedUrl({ action: 'delete', key: fileKey })
      const { data, error } = await supabase.from('documents').delete().eq('id', id).select('id')
      if (error) throw error
      if (!data || data.length === 0) {
        throw new Error('Document record was not deleted. Check the Row Level Security DELETE policy on documents for this role.')
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  })
}

export function useDownloadDocument() {
  return useMutation({
    mutationFn: async ({ fileKey }) => {
      const { url } = await getPresignedUrl({ action: 'download', key: fileKey })
      return url
    },
  })
}
