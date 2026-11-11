import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

// Latest still-active, not-yet-dismissed-by-this-user announcement, or null.
// "Active" means expires_at is in the future for everyone, regardless of
// dismissal, so the popup naturally stops appearing 24 hours after publish
// even for users who never dismissed it.
export function useActiveAnnouncement(userId) {
  return useQuery({
    queryKey: ['active-announcement', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data: announcement, error: announcementErr } = await supabase
        .from('announcements')
        .select('id, title, body, published_at, expires_at')
        .gt('expires_at', new Date().toISOString())
        .order('published_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (announcementErr) throw announcementErr
      if (!announcement) return null

      const { data: dismissal, error: dismissalErr } = await supabase
        .from('announcement_dismissals')
        .select('id')
        .eq('announcement_id', announcement.id)
        .eq('user_id', userId)
        .maybeSingle()
      if (dismissalErr) throw dismissalErr
      if (dismissal) return null

      return announcement
    },
    // Once checked (or dismissed) this session, never check again until a
    // real reload, so dismissing can't be followed by a background refetch
    // briefly bringing the modal back.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })
}

export function useDismissAnnouncement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ announcementId, userId }) => {
      const { data, error } = await supabase
        .from('announcement_dismissals')
        .insert([{ announcement_id: announcementId, user_id: userId }])
        .select('id')
      if (error) throw error
      if (!data || data.length === 0) {
        throw new Error('Dismissal was not recorded. Check the Row Level Security INSERT policy on announcement_dismissals for this role.')
      }
    },
    onSuccess: (_d, { userId }) => {
      // Clear the cached announcement immediately, same effect as a refetch
      // that now finds a dismissal row, without an actual round trip.
      qc.setQueryData(['active-announcement', userId], null)
    },
  })
}
