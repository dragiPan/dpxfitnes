// Permanently removes a client (coach only). Deletes the auth user, which
// cascades to their profile and all their data. Because public signups are
// disabled, a removed client cannot get back in unless the coach re-invites.
// Deploy: supabase functions deploy remove-client
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

  const { data: callerProfile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .single()
  if (callerProfile?.role !== 'coach') return json({ error: 'forbidden' }, 403)

  const { user_id } = await req.json()
  if (!user_id || typeof user_id !== 'string') return json({ error: 'user_id required' }, 400)
  if (user_id === userData.user.id) return json({ error: 'cannot remove yourself' }, 400)

  // safety: never delete another coach
  const { data: target } = await admin.from('profiles').select('role').eq('id', user_id).single()
  if (!target) return json({ error: 'not found' }, 404)
  if (target.role === 'coach') return json({ error: 'cannot remove a coach' }, 400)

  const { error } = await admin.auth.admin.deleteUser(user_id)
  if (error) return json({ error: error.message }, 400)

  return json({ ok: true })
})
