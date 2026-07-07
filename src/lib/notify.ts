import { supabase } from './supabase'

interface NotifyPayload {
  type?: string
  title: string
  body?: string
  link?: string
}

/**
 * Creates in-app notifications for the given users and fires the
 * `send-notification` edge function for the emails IN THE BACKGROUND —
 * the caller never waits on email delivery, and notification problems
 * never break the action that triggered them (they only log to console).
 */
export async function notifyUsers(userIds: string[], payload: NotifyPayload) {
  if (userIds.length === 0) return
  const rows = userIds.map((user_id) => ({
    user_id,
    type: payload.type ?? 'general',
    title: payload.title,
    body: payload.body ?? null,
    link: payload.link ?? null,
  }))

  const { error } = await supabase.from('notifications').insert(rows)
  if (error) {
    console.error('In-app notification insert failed:', error.message)
    return
  }

  // fire-and-forget: email delivery must not block the UI
  supabase.functions
    .invoke('send-notification', {
      body: { user_ids: userIds, subject: payload.title, body: payload.body ?? '' },
    })
    .then(({ data, error: fnErr }) => {
      if (fnErr) {
        console.error('send-notification failed:', fnErr.message ?? fnErr)
        return
      }
      const res = data as { sent?: number; failures?: unknown[]; warning?: string } | null
      if (res?.warning) console.error('send-notification warning:', res.warning)
      if (res?.failures?.length) console.error('email failures:', res.failures)
    })
    .catch((e) => console.error('send-notification invoke error:', e))
}
