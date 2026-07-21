// Vercel Cron hits this daily (see vercel.json) and calls the keepalive()
// database function. That counts as activity, so the free-tier Supabase
// project never goes 7 days idle and never gets auto-paused.
// Note: only the apikey header is sent - no Authorization bearer, because
// publishable API keys are not JWTs and PostgREST would reject them.
export default async function handler(req, res) {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) {
    return res.status(500).json({ ok: false, error: 'missing Supabase env vars' })
  }
  const r = await fetch(`${url}/rest/v1/rpc/keepalive`, {
    method: 'POST',
    headers: { apikey: key, 'Content-Type': 'application/json' },
    body: '{}',
  })
  const body = await r.text()
  return res.status(200).json({ ok: r.ok, supabaseStatus: r.status, response: body.slice(0, 200), at: new Date().toISOString() })
}
