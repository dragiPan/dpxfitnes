import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { notifyUsers } from '../../lib/notify'
import { useAuth } from '../../contexts/AuthContext'
import { INTAKE_QUESTIONS } from '../../lib/intake'
import type { IntakeResponse } from '../../lib/types'

export default function Intake() {
  const { t } = useTranslation()
  const { session, profile } = useAuth()
  const navigate = useNavigate()
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!session) return
    void supabase
      .from('intake_responses')
      .select('*')
      .eq('user_id', session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        const row = data as IntakeResponse | null
        if (row) {
          setAnswers(row.answers ?? {})
          setSubmitted(!!row.submitted_at)
        }
      })
  }, [session])

  async function save(final: boolean) {
    if (!session) return
    setBusy(true)
    try {
      const { error } = await supabase.from('intake_responses').upsert({
        user_id: session.user.id,
        answers,
        submitted_at: final ? new Date().toISOString() : null,
      })
      if (error) throw error
      if (final) {
        setSubmitted(true)
        const { data: coaches } = await supabase.rpc('coach_ids')
        await notifyUsers(((coaches as string[] | null) ?? []).map(String), {
          type: 'intake',
          title: `${t('intake.title')}: ${profile?.full_name || profile?.email}`,
          link: `/clients/${session.user.id}?tab=intake`,
        })
        navigate('/')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl">{t('intake.title')}</h1>
      <p className="mb-4 text-sm text-neutral-500">{t('intake.subtitle')}</p>
      {submitted && <p className="mb-4 badge">✓ {t('intake.submitted')}</p>}

      <div className="space-y-4">
        {INTAKE_QUESTIONS.map((q) => (
          <div key={q} className="card">
            <label className="label">{t(`intake.q.${q}`)}</label>
            <textarea
              className="input min-h-16"
              value={answers[q] ?? ''}
              onChange={(e) => setAnswers((a) => ({ ...a, [q]: e.target.value }))}
            />
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <button className="btn" disabled={busy} onClick={() => void save(false)}>
          {t('intake.saveDraft')}
        </button>
        <button className="btn btn-primary flex-1" disabled={busy} onClick={() => void save(true)}>
          {t('intake.submit')}
        </button>
      </div>
    </div>
  )
}
