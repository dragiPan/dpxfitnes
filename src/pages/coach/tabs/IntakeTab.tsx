import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../../lib/supabase'
import { INTAKE_QUESTIONS } from '../../../lib/intake'
import type { IntakeResponse, Profile } from '../../../lib/types'

export default function IntakeTab({ client }: { client: Profile }) {
  const { t } = useTranslation()
  const [response, setResponse] = useState<IntakeResponse | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    void supabase
      .from('intake_responses')
      .select('*')
      .eq('user_id', client.id)
      .maybeSingle()
      .then(({ data }) => {
        setResponse(data as IntakeResponse | null)
        setLoaded(true)
      })
  }, [client.id])

  if (!loaded) return <p>{t('common.loading')}</p>
  if (!response)
    return <p className="text-sm text-neutral-500">{t('coach.intakeTab.empty')}</p>

  return (
    <div className="max-w-2xl space-y-3">
      <p className="text-xs font-bold text-neutral-500">
        {response.submitted_at
          ? `✓ ${t('intake.submitted')} — ${new Date(response.submitted_at).toLocaleDateString()}`
          : t('coach.intakeTab.draft')}
      </p>
      {INTAKE_QUESTIONS.map((q) => (
        <div key={q} className="card">
          <p className="label">{t(`intake.q.${q}`)}</p>
          <p className="whitespace-pre-wrap text-sm">
            {response.answers?.[q] || <span className="text-neutral-400">—</span>}
          </p>
        </div>
      ))}
    </div>
  )
}
