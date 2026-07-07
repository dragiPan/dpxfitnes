import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import NutrientChart, { type ChartPoint } from './NutrientChart'
import { NUTRIENTS, type NutrientKey } from '../lib/nutrients'
import type { Checkin, ExerciseLog, NutritionTarget } from '../lib/types'

interface LogRow extends ExerciseLog {
  exercise: { name: string; kind: 'strength' | 'cardio' } | null
}

interface PR {
  exercise: string
  weight: number
  reps: number | null
  date: string
}

/**
 * Full progress dashboard for one user: weight / steps / nutrient trends + PRs.
 * Targets are RLS-filtered, so a client automatically only sees the ones the
 * coach flagged "show to client"; the coach sees all of them.
 */
export default function ProgressCharts({ userId }: { userId: string }) {
  const { t } = useTranslation()
  const [checkins, setCheckins] = useState<Checkin[]>([])
  const [targets, setTargets] = useState<NutritionTarget[]>([])
  const [logs, setLogs] = useState<LogRow[]>([])
  const [nutrient, setNutrient] = useState<NutrientKey>('calories')

  useEffect(() => {
    const since = new Date()
    since.setDate(since.getDate() - 90)
    const sinceStr = since.toISOString().slice(0, 10)
    void supabase
      .from('checkins')
      .select('*')
      .eq('user_id', userId)
      .gte('date', sinceStr)
      .order('date')
      .then(({ data }) => setCheckins((data as Checkin[]) ?? []))
    void supabase
      .from('nutrition_targets')
      .select('*')
      .eq('user_id', userId)
      .then(({ data }) => setTargets((data as NutritionTarget[]) ?? []))
    void supabase
      .from('exercise_logs')
      .select('*, exercise:program_exercises(name, kind)')
      .eq('client_id', userId)
      .order('date')
      .limit(1000)
      .then(({ data }) => setLogs((data as LogRow[]) ?? []))
  }, [userId])

  const points = (pick: (c: Checkin) => number | null): ChartPoint[] =>
    checkins
      .filter((c) => pick(c) != null)
      .map((c) => ({ date: c.date, value: Number(pick(c)) }))

  const weightData = points((c) => c.weight)
  const stepsData = points((c) => c.steps)
  const nutrientData = points((c) => c[nutrient])
  const target = targets.find((x) => x.nutrient === nutrient)?.target_value ?? null
  const unit = NUTRIENTS.find((n) => n.key === nutrient)?.unit

  // stock-ticker headline: latest value + change across the loaded range
  const fmtNum = (n: number) =>
    Number.isInteger(n) ? n.toLocaleString() : n.toLocaleString(undefined, { maximumFractionDigits: 1 })
  const statHead = (data: ChartPoint[], u?: string) => {
    if (data.length === 0) return null
    const latest = data[data.length - 1].value
    const delta = data.length > 1 ? latest - data[0].value : 0
    return (
      <div className="mb-1 flex flex-wrap items-baseline gap-x-3">
        <span className="text-3xl font-black tabular-nums leading-none">
          {fmtNum(latest)}
          {u ? <span className="ml-1 text-sm font-bold">{u}</span> : null}
        </span>
        {delta !== 0 && (
          <span className="text-sm font-bold tabular-nums text-neutral-500">
            {delta > 0 ? '▲' : '▼'} {fmtNum(Math.abs(delta))}
            {u ? ` ${u}` : ''}
          </span>
        )}
      </div>
    )
  }

  // personal records: heaviest logged weight per strength exercise
  const prs: PR[] = useMemo(() => {
    const best = new Map<string, PR>()
    for (const l of logs) {
      if (l.weight == null || !l.exercise || l.exercise.kind === 'cardio') continue
      const cur = best.get(l.exercise.name)
      if (!cur || l.weight > cur.weight || (l.weight === cur.weight && (l.reps ?? 0) > (cur.reps ?? 0))) {
        best.set(l.exercise.name, { exercise: l.exercise.name, weight: l.weight, reps: l.reps, date: l.date })
      }
    }
    return [...best.values()].sort((a, b) => b.weight - a.weight)
  }, [logs])

  // cardio volume: total steps + minutes from cardio logs, last 4 weeks
  const cardio = useMemo(() => {
    const since = new Date()
    since.setDate(since.getDate() - 28)
    const sinceStr = since.toISOString().slice(0, 10)
    let steps = 0
    let minutes = 0
    let sessions = 0
    for (const l of logs) {
      if (l.exercise?.kind !== 'cardio' || l.date < sinceStr) continue
      sessions++
      steps += Number(l.steps ?? 0)
      minutes += Number(l.duration_min ?? 0)
    }
    return { steps, minutes, sessions }
  }, [logs])

  const empty = <p className="text-sm text-neutral-500">{t('progress.noData')}</p>

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <p className="label">{t('progress.weight')}</p>
          {statHead(weightData, 'kg')}
          {weightData.length === 0 ? empty : <NutrientChart data={weightData} unit="kg" />}
        </div>

        <div className="card">
          <p className="label">{t('progress.steps')}</p>
          {statHead(stepsData)}
          {stepsData.length === 0 ? empty : <NutrientChart data={stepsData} />}
        </div>
      </div>

      <div className="card">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="label mb-0">{t('progress.nutrition')}</p>
          <select
            className="input max-w-56"
            value={nutrient}
            onChange={(e) => setNutrient(e.target.value as NutrientKey)}
          >
            {NUTRIENTS.map((n) => (
              <option key={n.key} value={n.key}>
                {t(`nutrient.${n.key}`)}
              </option>
            ))}
          </select>
        </div>
        {statHead(nutrientData, unit)}
        {nutrientData.length === 0 ? (
          empty
        ) : (
          <NutrientChart data={nutrientData} target={target} unit={unit} targetLabel={t('checkin.target')} />
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <p className="label">🏆 {t('progress.prs')}</p>
          {prs.length === 0 && empty}
          <div className="space-y-1">
            {prs.slice(0, 12).map((pr) => (
              <div key={pr.exercise} className="flex items-baseline justify-between gap-2 border-b border-neutral-200 pb-1">
                <span className="text-sm font-bold">{pr.exercise}</span>
                <span className="text-sm font-black whitespace-nowrap">
                  {pr.weight} kg{pr.reps ? ` × ${pr.reps}` : ''}
                  <span className="ml-2 text-[10px] font-bold text-neutral-400">
                    {new Date(pr.date).toLocaleDateString()}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <p className="label">{t('progress.cardio4w')}</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-2xl font-black">{cardio.sessions}</p>
              <p className="text-[10px] font-bold uppercase text-neutral-500">{t('progress.sessions')}</p>
            </div>
            <div>
              <p className="text-2xl font-black">{Math.round(cardio.minutes)}</p>
              <p className="text-[10px] font-bold uppercase text-neutral-500">min</p>
            </div>
            <div>
              <p className="text-2xl font-black">{cardio.steps.toLocaleString()}</p>
              <p className="text-[10px] font-bold uppercase text-neutral-500">{t('progress.steps')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
