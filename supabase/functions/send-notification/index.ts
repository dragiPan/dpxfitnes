// Sends notification emails through Resend (https://resend.com — free tier).
// The in-app notification row is created by the frontend; this only handles email.
// Deploy: supabase functions deploy send-notification
// Secrets used: RESEND_API_KEY, FROM_EMAIL (e.g. "DPX Fitnes <onboarding@resend.dev>")
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders, json } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
  const { data: userData, error: userErr } = await admin.auth.getUser(jwt)
  if (userErr || !userData.user) return json({ error: 'unauthorized' }, 401)

  const { user_ids, subject, body } = await req.json()
  if (!Array.isArray(user_ids) || user_ids.length === 0 || !subject) {
    return json({ error: 'user_ids and subject required' }, 400)
  }

  // clients may only email coaches (e.g. new question notification);
  // the coach may email anyone
  const { data: callerProfile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .single()

  let query = admin.from('profiles').select('id, email, full_name').in('id', user_ids)
  if (callerProfile?.role !== 'coach') query = query.eq('role', 'coach')
  const { data: recipients } = await query
  if (!recipients || recipients.length === 0) return json({ ok: true, sent: 0 })

  const resendKey = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('FROM_EMAIL') ?? 'DPXFITNES <onboarding@resend.dev>'
  if (!resendKey) return json({ ok: true, sent: 0, warning: 'RESEND_API_KEY not set' })

  let sent = 0
  for (const r of recipients) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: r.email,
        subject: `DPXFITNES — ${subject}`,
        html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;border:2px solid #000;padding:24px">
          <h1 style="font-size:20px;letter-spacing:-1px;margin:0 0 16px">DPXFITNES</h1>
          <h2 style="font-size:16px;margin:0 0 8px">${escapeHtml(String(subject))}</h2>
          <p style="font-size:14px;white-space:pre-wrap">${escapeHtml(String(body ?? ''))}</p>
        </div>`,
      }),
    })
    if (res.ok) sent++
  }

  return json({ ok: true, sent })
})

function escapeHtml(s: string) {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}
