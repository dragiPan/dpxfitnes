import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import type { Checkin, Profile, Subscription } from '../../lib/types'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

interface SubRow extends Subscription {
  profile?: Pick<Profile, 'full_name' | 'email'> | null
}

export default function CoachDashboard() {
  const { t } = useTranslation()
  const [clientCount, setClientCount] = useState(0)
  const [programCount, setProgramCount] = useState(0)
  const [todayCheckins, setTodayCheckins] = useState<(Checkin & { profile?: Profile })[]>([])
  const [expiring, setExpiring] = useState<SubRow[]>([])

  useEffect(() => {
    const soon = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
    void supabase
      .from('subscriptions')
      .select('*, profile:profiles!subscriptions_client_id_fkey(full_name, email)')
      .not('paid_until', 'is', null)
      .lte('paid_until', soon)
      .order('paid_until')
      .then(({ data }) => setExpiring((data as SubRow[]) ?? []))
    void supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'client')
      .then(({ count }) => setClientCount(count ?? 0))
    void supabase
      .from('programs')
      .select('id', { count: 'exact', head: true })
      .then(({ count }) => setProgramCount(count ?? 0))
    void supabase
      .from('checkins')
      .select('*, profile:profiles!checkins_user_id_fkey(*)')
      .eq('date', todayStr())
      .order('created_at', { ascending: false })
      .then(({ data }) => setTodayCheckins((data as (Checkin & { profile?: Profile })[]) ?? []))
  }, [])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl">{t('coach.dashTitle')}</h1>

      <div className="grid grid-cols-3 gap-3">
        <Link to="/clients" className="card text-center hover:bg-neutral-50">
          <p className="text-3xl font-black">{clientCount}</p>
          <p className="label mb-0">{t('coach.statClients')}</p>
        </Link>
        <div className="card text-center">
          <p className="text-3xl font-black">{todayCheckins.length}</p>
          <p className="label mb-0">{t('coach.statCheckins')}</p>
        </div>
        <Link to="/programs" className="card text-center hover:bg-neutral-50">
          <p className="text-3xl font-black">{programCount}</p>
          <p className="label mb-0">{t('coach.statPrograms')}</p>
        </Link>
      </div>

      {expiring.length > 0 && (
        <div>
          <p className="label">💰 {t('coach.paymentTab.expiringList')}</p>
          <div className="space-y-1">
            {expiring.map((s) => {
              const expired = s.paid_until && new Date(s.paid_until) < new Date()
              return (
                <Link
                  key={s.client_id}
                  to={`/clients/${s.client_id}`}
                  className={`card flex items-center justify-between hover:bg-neutral-50 ${expired ? 'border-4' : ''}`}
                >
                  <span className="font-bold">{s.profile?.full_name || s.profile?.email}</span>
                  <span className="text-xs font-black">
                    {expired ? '⚠ ' : '⏳ '}
                    {s.paid_until ? new Date(s.paid_until).toLocaleDateString() : ''}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      <div>
        <p className="label">{t('coach.statCheckins')}</p>
        {todayCheckins.length === 0 && (
          <p className="text-sm text-neutral-500">{t('coach.checkinsEmpty')}</p>
        )}
        <div className="space-y-2">
          {todayCheckins.map((c) => (
            <Link
              key={c.id}
              to={`/clients/${c.user_id}`}
              className="card block hover:bg-neutral-50"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-black">{c.profile?.full_name || c.profile?.email}</p>
                <p className="text-xs font-bold">
                  {c.calories ?? '-'} kcal · P {c.protein ?? '-'}g ·{' '}
                  {c.weight != null ? `${c.weight} kg` : '-'}
                </p>
              </div>
              {c.notes && <p className="mt-1 text-sm text-neutral-600">{c.notes}</p>}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
