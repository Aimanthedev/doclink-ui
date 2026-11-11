import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useNotifications() {
  useEffect(() => {
    async function triggerCalendarReminders() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return
        await supabase.functions.invoke('send-calendar-reminders')
      } catch {
        // Best-effort — no UI feedback needed, this is a background side effect.
      }
    }
    triggerCalendarReminders()
  }, [])

  return useQuery({
    queryKey: ['notifications'],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      // notifications.user_id is the auth.users UUID (auth.uid()), not the
      // public.users row id — must come from the authenticated session itself,
      // not from a users-table lookup.
      //
      // getUser() revalidates against the Supabase Auth server over the network
      // and can transiently resolve to a null user (e.g. on initial page load,
      // right as the session is still hydrating) even though a valid session
      // exists locally — falling back to getSession()'s user avoids that whole
      // failure mode silently zeroing out the reminders query below.
      const { data: getUserData, error: getUserError } = await supabase.auth.getUser()
      if (getUserError) {
        console.error('[useNotifications] supabase.auth.getUser() failed:', getUserError)
      }
      let user = getUserData?.user ?? null
      if (!user) {
        const { data: { session } } = await supabase.auth.getSession()
        user = session?.user ?? null
      }

      const remindersRes = user
        ? await supabase
            .from('notifications')
            .select('id, type, message, is_read, created_at, related_event_id')
            .eq('user_id', user.id)
            .eq('is_read', false)
            // Lead follow-ups now live in the dedicated "Today's Follow-ups"
            // card on the Sales page — no longer surfaced in the bell.
            .neq('type', 'follow_up')
            .order('created_at', { ascending: false })
            .limit(5)
        : { data: [] }

      console.log('[useNotifications] auth user id:', user?.id, '| reminder rows returned:', remindersRes.data?.length ?? 0, '| query error:', remindersRes.error)

      // The bell only shows real rows from the `notifications` table — every
      // item here is keyed by n.id, so every item is deletable/dismissible.
      // Overdue cases, upcoming renewals, and pending-approval quotations used
      // to be derived live and merged in here as pseudo-notifications, but
      // since they had no row of their own, "dismissing" them couldn't persist
      // and they reappeared on every refresh. They've been removed from the
      // bell entirely rather than surfaced as non-dismissible alerts.
      if (remindersRes.error) {
        console.error('[useNotifications] failed to fetch notifications table rows:', remindersRes.error)
      }
      const notifications = []
      for (const n of remindersRes.data ?? []) {
        notifications.push({
          id: `notification-${n.id}`,
          type: n.type,
          title: n.message,
          subtitle: '',
          urgency: 'medium',
          link: '/calendar',
        })
      }

      return { notifications, totalCount: notifications.length }
    },
  })
}
