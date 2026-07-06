import { supabase } from './supabase'

interface NotifyPayload {
  type?: string
  title: string
  body?: string
  link?: string
}

/**
 * Creates in-app notifications for the given users and asks the
 * `send-notification` edge function to email them as well.
 * Email failures are non-fatal (the function may not be deployed yet).
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
  if (error) throw error

  try {
    await supabase.functions.invoke('send-notification', {
      body: { user_ids: userIds, subject: payload.title, body: payload.body ?? '' },
    })
  } catch {
    // email is best-effort; in-app notification already created
  }
}
