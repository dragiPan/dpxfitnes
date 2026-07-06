import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import type { Profile } from '../../lib/types'
import OverviewTab from './tabs/OverviewTab'
import CheckinsTab from './tabs/CheckinsTab'
import TargetsTab from './tabs/TargetsTab'
import ProgramTab from './tabs/ProgramTab'
import MealsTab from './tabs/MealsTab'
import SessionsTab from './tabs/SessionsTab'
import MeasurementsTab from './tabs/MeasurementsTab'

const TABS = ['overview', 'checkins', 'targets', 'program', 'meals', 'sessions', 'measurements'] as const
type Tab = (typeof TABS)[number]

export default function ClientDetail() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const [client, setClient] = useState<Profile | null>(null)
  const [tab, setTab] = useState<Tab>('overview')

  useEffect(() => {
    if (!id) return
    void supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => setClient(data as Profile))
  }, [id])

  if (!client) return <p>{t('common.loading')}</p>

  return (
    <div>
      <Link to="/clients" className="text-xs font-bold uppercase hover:underline">
        ← {t('coach.clients.title')}
      </Link>
      <h1 className="mt-1 mb-3 text-2xl">{client.full_name || client.email}</h1>

      <div className="mb-4 flex gap-1 overflow-x-auto pb-1">
        {TABS.map((x) => (
          <button key={x} className={`tab ${tab === x ? 'tab-active' : ''}`} onClick={() => setTab(x)}>
            {t(`coach.tabs.${x}`)}
          </button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab client={client} />}
      {tab === 'checkins' && <CheckinsTab client={client} />}
      {tab === 'targets' && <TargetsTab client={client} />}
      {tab === 'program' && <ProgramTab client={client} />}
      {tab === 'meals' && <MealsTab client={client} />}
      {tab === 'sessions' && <SessionsTab client={client} />}
      {tab === 'measurements' && <MeasurementsTab client={client} onChanged={setClient} />}
    </div>
  )
}
