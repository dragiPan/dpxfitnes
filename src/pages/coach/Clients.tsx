import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import type { Profile } from '../../lib/types'

interface ClientRow extends Profile {
  lastCheckin?: string | null
}

export default function Clients() {
  const { t } = useTranslation()
  const [clients, setClients] = useState<ClientRow[]>([])
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'client')
      .order('full_name')
    const rows = (data as ClientRow[]) ?? []
    // latest check-in date per client (single query, newest first)
    const { data: checkins } = await supabase
      .from('checkins')
      .select('user_id, date')
      .order('date', { ascending: false })
    const latest = new Map<string, string>()
    for (const c of (checkins as { user_id: string; date: string }[]) ?? []) {
      if (!latest.has(c.user_id)) latest.set(c.user_id, c.date)
    }
    for (const r of rows) r.lastCheckin = latest.get(r.id) ?? null
    setClients(rows)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function invite() {
    setBusy(true)
    setMsg('')
    try {
      const { error } = await supabase.functions.invoke('invite-client', {
        body: { email: email.trim(), full_name: name.trim() },
      })
      if (error) throw error
      setMsg(t('coach.clients.invited'))
      setEmail('')
      setName('')
      await load()
    } catch {
      setMsg(t('coach.clients.inviteError'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl">{t('coach.clients.title')}</h1>

      <div className="card mb-6">
        <p className="mb-2 text-xs font-black uppercase tracking-wide">{t('coach.clients.invite')}</p>
        <div className="grid gap-2 sm:grid-cols-3">
          <input
            className="input"
            placeholder={t('coach.clients.fullName')}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="input"
            type="email"
            placeholder={t('coach.clients.email')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button
            className="btn btn-primary"
            disabled={busy || !email.includes('@')}
            onClick={() => void invite()}
          >
            {t('coach.clients.sendInvite')}
          </button>
        </div>
        {msg && <p className="mt-2 text-xs font-bold">{msg}</p>}
      </div>

      <div className="space-y-2">
        {clients.map((c) => (
          <Link key={c.id} to={`/clients/${c.id}`} className="card flex items-center justify-between hover:bg-neutral-50">
            <div>
              <p className="font-black">{c.full_name || c.email}</p>
              <p className="text-xs text-neutral-500">
                {t('coach.clients.lastCheckin')}:{' '}
                {c.lastCheckin ? new Date(c.lastCheckin).toLocaleDateString() : t('coach.clients.never')}
              </p>
            </div>
            <span className="btn btn-sm">{t('coach.clients.open')} →</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
