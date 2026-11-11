import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

const BUCKET = 'quotation-templates'

export function useQuotationTemplates() {
  return useQuery({
    queryKey: ['quotation_templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotation_templates')
        .select('*, uploaded_by_user:users(id, full_name)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}

export function useUploadQuotationTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ file, quotationType }) => {
      // Unique path + no overwrite: approved documents are pinned to a template
      // row, so its file must never be replaced by a later upload.
      const storagePath = `${quotationType}/${crypto.randomUUID()}-${file.name}`

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, file, { upsert: false, contentType: file.type })
      if (uploadError) throw uploadError

      // Deactivate-old + insert-new in ONE database transaction.
      const { data, error: rpcError } = await supabase.rpc('replace_quotation_template', {
        p_quotation_type: quotationType,
        p_file_name: file.name,
        p_storage_path: storagePath,
      })
      if (rpcError) {
        // The new file is not referenced by any row, so removing it is safe.
        await supabase.storage.from(BUCKET).remove([storagePath])
        throw rpcError
      }

      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quotation_templates'] }),
  })
}

export function useGetTemplateUrl(storagePath) {
  return useQuery({
    queryKey: ['quotation_template_url', storagePath],
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
