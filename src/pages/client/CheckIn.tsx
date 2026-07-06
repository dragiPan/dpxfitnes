import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { notifyUsers } from '../../lib/notify'
import { useAuth } from '../../contexts/AuthContext'
import { NUTRIENTS, MEASUREMENT_FIELDS, type NutrientKey } from '../../lib/nutrients'
import type { NutritionTarget } from '../../lib/types'

type FormValues = Partial<Record<NutrientKey | 'weight' | 'steps', string>>
type MeasureValues = Partial<Record<(typeof MEASUREMENT_FIELDS)[number], string>>

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export default function CheckIn() {
  const { t } = useTranslation()
  const { session, profile } = useAuth()
  const [date, setDate] = useState(todayStr())
  const [values, setValues] = useState<FormValues>({})
  const [measures, setMeasures] = useState<MeasureValues>({})
  const [notes, setNotes] = useState('')
  const [targets, setTargets] = useState<NutritionTarget[]>([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    if (!session) return
    setMsg('')
    const [{ data: ci }, { data: tg }, { data: ms }] = await Promise.all([
      supabase.from('checkins').select('*').eq('user_id', session.user.id).eq('date', date).maybeSingle(),
      supabase.from('nutrition_targets').select('*').eq('user_id', session.user.id),
      supabase.from('measurements').select('*').eq('user_id', session.user.id).eq('date', date).maybeSingle(),
    ])
    const v: FormValues = {}
    if (ci) {
      for (const n of NUTRIENTS) {
        const raw = (ci as Record<string, unknown>)[n.key]
        v[n.key] = raw == null ? '' : String(raw)
      }
      v.weight = ci.weight == null ? '' : String(ci.weight)
      v.steps = ci.steps == null ? '' : String(ci.steps)
      setNotes(ci.notes ?? '')
    } else {
      setNotes('')
    }
    setValues(v)
    setTargets((tg as NutritionTarget[]) ?? [])
    const m: MeasureValues = {}
    if (ms) {
      for (const f of MEASUREMENT_FIELDS) {
        const raw = (ms as Record<string, unknown>)[f]
        m[f] = raw == null ? '' : String(raw)
      }
    }
    setMeasures(m)
  }, [session, date])

  useEffect(() => {
    void load()
  }, [load])

  const targetFor = (key: string) => targets.find((x) => x.nutrient === key && x.show_to_client)

  function numOrNull(s: string | undefined) {
    if (s == null || s.trim() === '') return null
    const n = Number(s.replace(',', '.'))
    return Number.isFinite(n) ? n : null
  }

  async function save() {
    if (!session) return
    setBusy(true)
    setMsg('')
    try {
      const row: Record<string, unknown> = {
        user_id: session.user.id,
        date,
        notes: notes.trim() || null,
        weight: numOrNull(values.weight),
        steps: numOrNull(values.steps),
        updated_at: new Date().toISOString(),
      }
      for (const n of NUTRIENTS) row[n.key] = numOrNull(values[n.key])

      const { error } = await supabase.from('checkins').upsert(row, { onConflict: 'user_id,date' })
      if (error) throw error

      if (profile?.measurements_enabled) {
        const mrow: Record<string, unknown> = { user_id: session.user.id, date }
        let any = false
        for (const f of MEASUREMENT_FIELDS) {
          const v = numOrNull(measures[f])
          mrow[f] = v
          if (v != null) any = true
        }
        if (any) {
          const { error: mErr } = await supabase
            .from('measurements')
            .upsert(mrow, { onConflict: 'user_id,date' })
          if (mErr) throw mErr
        }
      }

      // let the coach know a check-in came in
      const { data: coaches } = await supabase.rpc('coach_ids')
      await notifyUsers(((coaches as string[] | null) ?? []).map(String), {
        type: 'checkin',
        title: `Check-in: ${profile?.full_name || profile?.email} (${date})`,
        body: `kcal: ${values.calories || '–'} | P: ${values.protein || '–'} | ${t('common.weight')}: ${values.weight || '–'}`,
      })

      setMsg(t('checkin.saved'))
    } catch {
      setMsg(t('common.error'))
    } finally {
      setBusy(false)
    }
  }

  const primary = NUTRIENTS.filter((n) => n.primary)
  const secondary = NUTRIENTS.filter((n) => !n.primary)

  const field = (key: NutrientKey) => {
    const def = NUTRIENTS.find((n) => n.key === key)!
    const tgt = targetFor(key)
    return (
      <div key={key}>
        <label className="label">
          {t(`nutrient.${key}`)} <span className="text-neutral-400">({def.unit})</span>
        </label>
        <div className="relative">
          <input
            className="input"
            inputMode="decimal"
            value={values[key] ?? ''}
            onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
            placeholder="0"
          />
          {tgt && (
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400">
              / {tgt.target_value} {def.unit}
            </span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl">{t('checkin.title')}</h1>
      <p className="mb-4 text-sm text-neutral-500">{t('checkin.subtitle')}</p>

      <div className="mb-4">
        <label className="label">{t('common.date')}</label>
        <input
          type="date"
          className="input max-w-48"
          value={date}
          max={todayStr()}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <div className="card mb-4">
        <p className="mb-3 text-xs font-black uppercase tracking-wide">{t('checkin.macros')}</p>
        <div className="grid grid-cols-2 gap-3">
          {primary.map((n) => field(n.key))}
          <div>
            <label className="label">{t('checkin.weight')}</label>
            <input
              className="input"
              inputMode="decimal"
              value={values.weight ?? ''}
              onChange={(e) => setValues((v) => ({ ...v, weight: e.target.value }))}
              placeholder="0.0"
            />
          </div>
          <div>
            <label className="label">{t('checkin.steps')}</label>
            <input
              className="input"
              inputMode="numeric"
              value={values.steps ?? ''}
              onChange={(e) => setValues((v) => ({ ...v, steps: e.target.value }))}
              placeholder="0"
            />
          </div>
        </div>
      </div>

      <div className="card mb-4">
        <p className="mb-3 text-xs font-black uppercase tracking-wide">{t('checkin.micros')}</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {secondary.map((n) => field(n.key))}
        </div>
      </div>

      {profile?.measurements_enabled && (
        <div className="card mb-4">
          <p className="mb-3 text-xs font-black uppercase tracking-wide">
            {t('measure.title')} <span className="text-neutral-400">({t('common.optional')})</span>
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {MEASUREMENT_FIELDS.map((f) => (
              <div key={f}>
                <label className="label">{t(`measure.${f}`)}</label>
                <input
                  className="input"
                  inputMode="decimal"
                  value={measures[f] ?? ''}
                  onChange={(e) => setMeasures((m) => ({ ...m, [f]: e.target.value }))}
                  placeholder="0.0"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card mb-4">
        <label className="label">{t('common.notes')}</label>
        <textarea
          className="input min-h-20"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t('checkin.notesPh')}
        />
      </div>

      <button className="btn btn-primary w-full" disabled={busy} onClick={() => void save()}>
        {t('common.save')}
      </button>
      {msg && <p className="mt-2 text-center text-sm font-bold">{msg}</p>}
    </div>
  )
}
