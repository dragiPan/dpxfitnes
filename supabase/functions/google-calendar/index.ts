// Google Calendar bridge.
//   action: "list_events"  — returns the CALLER's own calendar events (client planner view)
//   action: "create_event" — coach only; inserts a training session into a CLIENT's calendar
// Refresh tokens live in the google_tokens table (written by the app after OAuth consent).
// Deploy: supabase functions deploy google-calendar
// Secrets used: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET (same OAuth app configured in
// Supabase Auth -> Providers -> Google)
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders, json } from '../_shared/cors.ts'

async function accessTokenFor(admin: ReturnType<typeof createClient>, userId: string) {
  const { data: tokenRow } = await admin
    .from('google_tokens')
    .select('refresh_token')
    .eq('user_id', userId)
    .maybeSingle()
  if (!tokenRow) return null

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
      client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
      refresh_token: tokenRow.refresh_token as string,
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.access_token as string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
  const { data: userData, error: userErr } = await admin.auth.getUser(jwt)
  if (userErr || !userData.user) return json({ error: 'unauthorized' }, 401)
  const callerId = userData.user.id

  const body = await req.json()
  const action = body.action as string

  if (action === 'list_events') {
    const token = await accessTokenFor(admin, callerId)
    // 200 with an error field: the browser client can't read non-2xx bodies
    if (!token) return json({ error: 'not_connected' })

    const params = new URLSearchParams({
      timeMin: body.time_min,
      timeMax: body.time_max,
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '150',
    })
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
    if (!res.ok) {
      const detail = await res.text()
      console.error('Google Calendar list failed:', res.status, detail)
      return json({ error: 'google_error', status: res.status, detail })
    }
    const data = await res.json()
    return json({ events: data.items ?? [] })
  }

  if (action === 'create_event') {
    // only the coach may write into a client's calendar
    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', callerId)
      .single()
    if (profile?.role !== 'coach') return json({ error: 'forbidden' }, 403)

    const targetUserId = body.target_user_id as string
    if (!targetUserId) return json({ error: 'target_user_id required' }, 400)

    const token = await accessTokenFor(admin, targetUserId)
    if (!token) return json({ error: 'not_connected' })

    const res = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: body.summary ?? 'Training',
          description: body.description ?? '',
          start: { dateTime: body.start },
          end: { dateTime: body.end },
          reminders: { useDefault: true },
        }),
      },
    )
    if (!res.ok) {
      const detail = await res.text()
      console.error('Google Calendar insert failed:', res.status, detail)
      return json({ error: 'google_error', status: res.status, detail })
    }
    const event = await res.json()
    return json({ event_id: event.id })
  }

  return json({ error: 'unknown action' }, 400)
})
