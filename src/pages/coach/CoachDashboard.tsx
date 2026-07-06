import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import type { Checkin, Profile } from '../../lib/types'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export default function CoachDashboard() {
  const { t } = useTranslation()
  const [clientCount, setClientCount] = useState(0)
  const [programCount, setProgramCount] = useState(0)
  const [todayCheckins, setTodayCheckins] = useState<(Checkin & { profile?: Profile })[]>([])

  useEffect(() => {
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
                  {c.calories ?? '–'} kcal · P {c.protein ?? '–'}g ·{' '}
                  {c.weight != null ? `${c.weight} kg` : '–'}
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
