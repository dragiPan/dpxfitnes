import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import ChatThread from '../../components/ChatThread'
import { useAuth } from '../../contexts/AuthContext'
import type { Profile } from '../../lib/types'
import OverviewTab from './tabs/OverviewTab'
import CheckinsTab from './tabs/CheckinsTab'
import TargetsTab from './tabs/TargetsTab'
import ProgramTab from './tabs/ProgramTab'
import MealsTab from './tabs/MealsTab'
import SessionsTab from './tabs/SessionsTab'
import MeasurementsTab from './tabs/MeasurementsTab'
import IntakeTab from './tabs/IntakeTab'
import PaymentTab from './tabs/PaymentTab'

const TABS = [
  'overview',
  'checkins',
  'targets',
  'program',
  'meals',
  'sessions',
  'measurements',
  'chat',
  'intake',
  'payment',
] as const
type Tab = (typeof TABS)[number]

export default function ClientDetail() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [client, setClient] = useState<Profile | null>(null)
  const [tab, setTab] = useState<Tab>('overview')
  const [removing, setRemoving] = useState(false)
  const [removeError, setRemoveError] = useState('')

  useEffect(() => {
    if (!id) return
    void supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => setClient(data as Profile))
  }, [id])

  async function removeClient() {
    if (!client) return
    const name = client.full_name || client.email
    if (!confirm(t('coach.remove.confirm', { name }))) return
    setRemoving(true)
    setRemoveError('')
    try {
      const { data, error } = await supabase.functions.invoke('remove-client', {
        body: { user_id: client.id },
      })
      if (error || (data as { error?: string })?.error) throw new Error('remove failed')
      navigate('/clients')
    } catch {
      setRemoveError(t('coach.remove.error'))
      setRemoving(false)
    }
  }

  if (!client) return <p>{t('common.loading')}</p>

  return (
    <div>
      <div className="flex items-center justify-between">
        <Link to="/clients" className="text-xs font-bold uppercase hover:underline">
          ← {t('coach.clients.title')}
        </Link>
        <button className="btn btn-sm" disabled={removing} onClick={() => void removeClient()}>
          🚫 {t('coach.remove.button')}
        </button>
      </div>
      {removeError && <p className="mt-1 text-xs font-bold">{removeError}</p>}
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
      {tab === 'chat' && (
        <div className="max-w-2xl">
          <ChatThread clientId={client.id} senderLabel={profile?.full_name || 'Coach'} />
        </div>
      )}
      {tab === 'intake' && <IntakeTab client={client} />}
      {tab === 'payment' && <PaymentTab client={client} />}
    </div>
  )
}
