import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

const BUCKET = 'invoice-templates'

export function useInvoiceTemplates() {
  return useQuery({
    queryKey: ['invoice_templates'],
    queryFn: async () => {
      // History is kept (one row per upload); exactly one row per template_type
      // is active, enforced by a partial unique index. The UI shows that one.
      const { data, error } = await supabase
        .from('invoice_templates')
        .select('*, uploaded_by_user:users(id, full_name)')
        .eq('template_type', 'standard')
        .eq('is_active', true)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function useUploadInvoiceTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ file }) => {
      // Unique path + no overwrite: approved invoices are pinned to a template
      // row, so its file must never be replaced by a later upload.
      const storagePath = `standard/${crypto.randomUUID()}-${file.name}`

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, file, { upsert: false, contentType: file.type })
      if (uploadError) throw uploadError

      // invoice-templates is a private bucket, so a public URL won't resolve —
      // use a long-lived signed URL for file_url instead (1 year).
      const { data: signed, error: signedUrlError } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(storagePath, 60 * 60 * 24 * 365)
      if (signedUrlError || !signed?.signedUrl) {
        // The new file is not referenced by any row, so removing it is safe.
        await supabase.storage.from(BUCKET).remove([storagePath])
        if (signedUrlError) throw signedUrlError
        throw new Error('Could not generate a signed URL for the uploaded template')
      }

      // Deactivate-old + insert-new in ONE database transaction.
      const { data, error: rpcError } = await supabase.rpc('replace_invoice_template', {
        p_template_type: 'standard',
        p_file_name: file.name,
        p_file_url: signed.signedUrl,
        p_storage_path: storagePath,
      })
      if (rpcError) {
        await supabase.storage.from(BUCKET).remove([storagePath])
        throw rpcError
      }

      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoice_templates'] }),
  })
}

// Delete order: database row FIRST, then the storage file, and only if the row
// delete succeeded (a pinned template fails on the foreign key, and the active
// template is refused by a database trigger). The file is also kept if another
// template row still points at the same path (older rows can share a path).
export function useDeleteInvoiceTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, storagePath }) => {
      const { data, error } = await supabase.from('invoice_templates').delete().eq('id', id).select('id')
      if (error) {
        if (error.code === '23503') {
          throw new Error('This template is used by approved invoices and cannot be deleted.')
        }
        throw error
      }
      if (!data || data.length === 0) {
        throw new Error('Invoice template was not deleted. Check the Row Level Security DELETE policy on invoice_templates for this role.')
      }

      if (storagePath) {
        const { count, error: refErr } = await supabase
          .from('invoice_templates')
          .select('id', { count: 'exact', head: true })
          .eq('storage_path', storagePath)
        // If we can't confirm the file is unreferenced, keep it.
        if (!refErr && count === 0) {
          const { error: storageError } = await supabase.storage.from(BUCKET).remove([storagePath])
          if (storageError) console.error('[useDeleteInvoiceTemplate] template row deleted but file removal failed:', storageError)
        }
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoice_templates'] }),
  })
}

export function useGetInvoiceTemplateUrl(storagePath) {
  return useQuery({
    queryKey: ['invoice_template_url', storagePath],
    enabled: false,
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(storagePath, 60 * 60)
      if (error) throw error
      return data.signedUrl
    },
  })
}
