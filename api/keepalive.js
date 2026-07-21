// Vercel Cron hits this daily (see vercel.json) and runs one tiny query
// against Supabase. That counts as database activity, so the free-tier
// project never goes 7 days idle and never gets auto-paused.
export default async function handler(req, res) {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) {
    return res.status(500).json({ ok: false, error: 'missing Supabase env vars' })
  }
  const r = await fetch(`${url}/rest/v1/profiles?select=id&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  })
  return res.status(200).json({ ok: r.ok, supabaseStatus: r.status, at: new Date().toISOString() })
}
