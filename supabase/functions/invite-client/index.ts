// Invites a new client by email (coach only).
// Deploy: supabase functions deploy invite-client
// Secrets used: SITE_URL (your deployed app URL, e.g. https://dpxfitnes.vercel.app)
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders, json } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const admin = createClient(supabaseUrl, serviceKey)

  // identify the caller from their JWT
  const authHeader = req.headers.get('Authorization') ?? ''
  const jwt = authHeader.replace('Bearer ', '')
  const { data: userData, error: userErr } = await admin.auth.getUser(jwt)
  if (userErr || !userData.user) return json({ error: 'unauthorized' }, 401)

  // only the coach may invite
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .single()
  if (profile?.role !== 'coach') return json({ error: 'forbidden' }, 403)

  const { email, full_name } = await req.json()
  if (!email || typeof email !== 'string') return json({ error: 'email required' }, 400)

  const siteUrl = Deno.env.get('SITE_URL') ?? ''
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: full_name ?? '' },
    redirectTo: siteUrl || undefined,
  })
  if (error) return json({ error: error.message }, 400)

  return json({ ok: true, user_id: data.user?.id })
})
