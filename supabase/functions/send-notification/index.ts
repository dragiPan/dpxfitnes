// Sends notification emails. Supports two providers:
//   1. Brevo (https://brevo.com, free 300/day) — set BREVO_API_KEY. Brevo lets you
//      verify a plain email address as the sender (no domain required), so it can
//      email ANY recipient for free. Preferred.
//   2. Resend (https://resend.com) — set RESEND_API_KEY. Without a verified domain
//      it only delivers to the account owner's address.
// The in-app notification row is created by the frontend; this only handles email.
// Deploy: supabase functions deploy send-notification
// Secrets used: BREVO_API_KEY or RESEND_API_KEY, FROM_EMAIL (e.g. "DPXFITNES <dpxfitnes@gmail.com>")
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

  const brevoKey = Deno.env.get('BREVO_API_KEY')
  const resendKey = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('FROM_EMAIL') ?? 'DPXFITNES <onboarding@resend.dev>'
  if (!brevoKey && !resendKey) {
    // loud, so a missing/typo'd secret is visible in the function logs
    console.error('No email provider configured — set BREVO_API_KEY (preferred) or RESEND_API_KEY')
    return json({ ok: true, sent: 0, warning: 'no email API key set' })
  }

  // FROM_EMAIL is "Display Name <address>" or a bare address
  const fromMatch = from.match(/^(.*?)\s*<(.+)>$/)
  const fromName = fromMatch ? fromMatch[1] || 'DPXFITNES' : 'DPXFITNES'
  const fromAddr = fromMatch ? fromMatch[2] : from

  const buildHtml = () =>
    `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;border:2px solid #000;padding:24px">
      <h1 style="font-size:20px;letter-spacing:-1px;margin:0 0 16px">DPXFITNES</h1>
      <h2 style="font-size:16px;margin:0 0 8px">${escapeHtml(String(subject))}</h2>
      <p style="font-size:14px;white-space:pre-wrap">${escapeHtml(String(body ?? ''))}</p>
    </div>`

  const sendOne = (to: string) =>
    brevoKey
      ? fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: { 'api-key': brevoKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sender: { name: fromName, email: fromAddr },
            to: [{ email: to }],
            subject: `DPXFITNES — ${subject}`,
            htmlContent: buildHtml(),
          }),
        })
      : fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from,
            to,
            subject: `DPXFITNES — ${subject}`,
            html: buildHtml(),
          }),
        })

  // send in parallel — recipients lists can be a whole group
  const failures: { to: string; status: number; detail: string }[] = []
  const results = await Promise.all(
    recipients.map(async (r) => {
      const res = await sendOne(r.email as string)
      if (res.ok) return true
      const detail = await res.text()
      // shows up in Supabase -> Edge Functions -> send-notification -> Logs
      console.error(`Email to ${r.email} rejected: ${res.status} ${detail}`)
      failures.push({ to: r.email as string, status: res.status, detail: detail.slice(0, 300) })
      return false
    }),
  )
  const sent = results.filter(Boolean).length
  console.log(`emails: provider=${brevoKey ? 'brevo' : 'resend'} sent=${sent} failed=${failures.length} from="${from}"`)

  return json({ ok: true, sent, from, failures })
})

function escapeHtml(s: string) {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}
