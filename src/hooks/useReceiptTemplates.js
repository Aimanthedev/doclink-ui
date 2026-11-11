import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

const BUCKET = 'receipt-templates'

export function useReceiptTemplates() {
  return useQuery({
    queryKey: ['receipt_templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('receipt_templates')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}

// Deactivate-then-insert via the replace_receipt_template RPC (one transaction),
// which keeps upload history instead of overwriting a single row.
export function useUploadReceiptTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ file }) => {
      // Unique path + no overwrite: approved receipts are pinned to a template
      // row, so its file must never be replaced by a later upload.
      const storagePath = `${crypto.randomUUID()}-${file.name}`

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, file, { upsert: false, contentType: file.type })
      if (uploadError) throw uploadError

      // Deactivate-old + insert-new in ONE database transaction.
      const { data, error: rpcError } = await supabase.rpc('replace_receipt_template', {
        p_storage_path: storagePath,
      })
      if (rpcError) {
        // The new file is not referenced by any row, so removing it is safe.
        await supabase.storage.from(BUCKET).remove([storagePath])
        throw rpcError
      }

      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['receipt_templates'] }),
  })
}

export function useGetReceiptTemplateUrl(storagePath) {
  return useQuery({
    queryKey: ['receipt_template_url', storagePath],
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
