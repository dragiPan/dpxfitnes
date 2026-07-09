import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import { supabase } from '../lib/supabase'
import NutrientChart, { type ChartPoint } from './NutrientChart'
import { MEASUREMENT_FIELDS, NUTRIENTS, type MeasurementField, type NutrientKey } from '../lib/nutrients'
import type { CardioLog, Checkin, ExerciseLog, Measurement, NutritionTarget } from '../lib/types'

// macro donut slices: accent red / black / gray — identity is also carried by
// the legend + direct % labels, never by color alone
const MACRO_COLORS = ['#e11d48', '#000000', '#a3a3a3']

const RANGES = [7, 30, 90, 365] as const
const RANGE_LABELS: Record<number, string> = { 7: '7D', 30: '30D', 90: '90D', 365: '1Y' }

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
  const [cardio, setCardioLogs] = useState<CardioLog[]>([])
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [measureField, setMeasureField] = useState<MeasurementField>('waist')
  const [nutrient, setNutrient] = useState<NutrientKey>('calories')
  const [rangeDays, setRangeDays] = useState<number>(90)

  useEffect(() => {
    const since = new Date()
    since.setDate(since.getDate() - rangeDays)
    const sinceStr = since.toISOString().slice(0, 10)
    void supabase
      .from('checkins')
      .select('*')
      .eq('user_id', userId)
      .gte('date', sinceStr)
      .order('date')
      .then(({ data }) => setCheckins((data as Checkin[]) ?? []))
    void supabase
      .from('cardio_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('date', sinceStr)
      .order('date')
      .then(({ data }) => setCardioLogs((data as CardioLog[]) ?? []))
    void supabase
      .from('measurements')
      .select('*')
      .eq('user_id', userId)
      .gte('date', sinceStr)
      .order('date')
      .then(({ data }) => setMeasurements((data as Measurement[]) ?? []))
  }, [userId, rangeDays])

  useEffect(() => {
    void supabase
      .from('nutrition_targets')
      .select('*')
      .eq('user_id', userId)
      .then(({ data }) => setTargets((data as NutritionTarget[]) ?? []))
    // all-time logs so PRs are true personal records
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

  // ---- MFP/Cronometer-style aggregates ----
  const avgOf = (rows: Checkin[], pick: (c: Checkin) => number | null) => {
    const vals = rows.map(pick).filter((v): v is number => v != null).map(Number)
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
  }
  // averages follow the selected time range (checkins are already range-fetched)
  const avgs = {
    calories: avgOf(checkins, (c) => c.calories),
    protein: avgOf(checkins, (c) => c.protein),
    carbs: avgOf(checkins, (c) => c.carbs),
    fat: avgOf(checkins, (c) => c.fat),
    steps: avgOf(checkins, (c) => c.steps),
  }

  // macro split: % of calories from protein/carbs/fat (4/4/9 kcal per gram)
  const macroSlices = useMemo(() => {
    const p = (avgs.protein ?? 0) * 4
    const c = (avgs.carbs ?? 0) * 4
    const f = (avgs.fat ?? 0) * 9
    const total = p + c + f
    if (total <= 0) return []
    return [
      { key: 'protein', grams: avgs.protein ?? 0, kcal: p, pct: (p / total) * 100 },
      { key: 'carbs', grams: avgs.carbs ?? 0, kcal: c, pct: (c / total) * 100 },
      { key: 'fat', grams: avgs.fat ?? 0, kcal: f, pct: (f / total) * 100 },
    ]
  }, [avgs.protein, avgs.carbs, avgs.fat])

  const measureData: ChartPoint[] = measurements
    .filter((m) => m[measureField] != null)
    .map((m) => ({ date: m.date, value: Number(m[measureField]) }))

  // adherence over the selected range — checkins are already range-fetched
  // (only where a target exists; RLS limits which targets a client can see)
  const adherence = useMemo(() => {
    const calTarget = targets.find((x) => x.nutrient === 'calories')?.target_value
    const protTarget = targets.find((x) => x.nutrient === 'protein')?.target_value

    let cal: { hit: number; days: number } | null = null
    if (calTarget) {
      const days = checkins.filter((c) => c.calories != null)
      cal = {
        days: days.length,
        hit: days.filter((c) => Math.abs(Number(c.calories) - calTarget) <= calTarget * 0.1).length,
      }
    }
    let prot: { hit: number; days: number } | null = null
    if (protTarget) {
      const days = checkins.filter((c) => c.protein != null)
      prot = {
        days: days.length,
        hit: days.filter((c) => Number(c.protein) >= protTarget).length,
      }
    }
    return { cal, prot, checkinCount: checkins.length }
  }, [checkins, targets])

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

  // cardio: this-week minutes vs weekly target + per-activity breakdown.
  // Sessions come from cardio_logs plus cardio exercises logged in programs.
  const cardioStats = useMemo(() => {
    const cutoff7 = new Date()
    cutoff7.setDate(cutoff7.getDate() - 7)
    const cutoff7Str = cutoff7.toISOString().slice(0, 10)

    let weekMinutes = 0
    // steps count toward cardio too — daily totals from check-ins, this week
    let weekSteps = 0
    for (const c of checkins) {
      if (c.date >= cutoff7Str && c.steps != null) weekSteps += Number(c.steps)
    }
    const byKind = new Map<string, { minutes: number; steps: number; sessions: number }>()
    const bump = (kind: string, minutes: number, steps: number) => {
      const cur = byKind.get(kind) ?? { minutes: 0, steps: 0, sessions: 0 }
      cur.minutes += minutes
      cur.steps += steps
      cur.sessions++
      byKind.set(kind, cur)
    }
    for (const s of cardio) {
      if (s.date >= cutoff7Str) weekMinutes += Number(s.minutes ?? 0)
      bump(s.kind, Number(s.minutes ?? 0), Number(s.steps ?? 0))
    }
    const rangeCutoff = new Date()
    rangeCutoff.setDate(rangeCutoff.getDate() - rangeDays)
    const rangeCutoffStr = rangeCutoff.toISOString().slice(0, 10)
    for (const l of logs) {
      if (l.exercise?.kind !== 'cardio' || l.date < rangeCutoffStr) continue
      if (l.date >= cutoff7Str) weekMinutes += Number(l.duration_min ?? 0)
      bump('program', Number(l.duration_min ?? 0), Number(l.steps ?? 0))
    }
    const kinds = [...byKind.entries()]
      .map(([kind, v]) => ({ kind, ...v }))
      .sort((a, b) => b.minutes - a.minutes)
    const weeklyTarget = targets.find((x) => x.nutrient === 'cardio_weekly_min')?.target_value ?? null
    return { weekMinutes, weekSteps, weeklyTarget, kinds }
  }, [cardio, logs, targets, rangeDays, checkins])

  const stepsTarget = targets.find((x) => x.nutrient === 'steps')?.target_value ?? null

  const empty = <p className="text-sm text-neutral-500">{t('progress.noData')}</p>

  return (
    <div className="space-y-4">
      {/* time-range selector for all trend charts */}
      <div className="flex gap-1">
        {RANGES.map((r) => (
          <button
            key={r}
            className={`tab ${rangeDays === r ? 'tab-active' : ''}`}
            onClick={() => setRangeDays(r)}
          >
            {RANGE_LABELS[r]}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <p className="label">{t('progress.weight')}</p>
          {statHead(weightData, 'kg')}
          {weightData.length === 0 ? empty : <NutrientChart data={weightData} unit="kg" />}
        </div>

        <div className="card">
          <p className="label">{t('progress.steps')}</p>
          {statHead(stepsData)}
          {stepsData.length === 0 ? (
            empty
          ) : (
            <NutrientChart data={stepsData} target={stepsTarget} targetLabel={t('checkin.target')} />
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <p className="label">{t('progress.macroSplitN', { n: rangeDays })}</p>
          {macroSlices.length === 0 ? (
            empty
          ) : (
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative h-44 w-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={macroSlices}
                      dataKey="kcal"
                      nameKey="key"
                      innerRadius="62%"
                      outerRadius="100%"
                      stroke="#fff"
                      strokeWidth={2}
                      isAnimationActive={false}
                    >
                      {macroSlices.map((s, i) => (
                        <Cell key={s.key} fill={MACRO_COLORS[i]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                {avgs.calories != null && (
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-black tabular-nums leading-none">
                      {Math.round(avgs.calories)}
                    </span>
                    <span className="text-[9px] font-bold uppercase text-neutral-500">kcal</span>
                  </div>
                )}
              </div>
              <div className="min-w-40 flex-1 space-y-1.5">
                {macroSlices.map((s, i) => (
                  <div key={s.key} className="flex items-baseline justify-between gap-2 border-b border-neutral-200 pb-1">
                    <span className="flex items-center gap-2 text-sm font-bold">
                      <span
                        className="inline-block h-3 w-3 border border-black"
                        style={{ background: MACRO_COLORS[i] }}
                      />
                      {t(`nutrient.${s.key}`)}
                    </span>
                    <span className="text-sm font-black tabular-nums">
                      {Math.round(s.pct)}%
                      <span className="ml-2 text-xs font-bold text-neutral-500">
                        {Math.round(s.grams)}g
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="card">
            <p className="label">{t('progress.averagesN', { n: rangeDays })}</p>
            <div className="grid grid-cols-2 gap-1 text-center sm:grid-cols-3 lg:grid-cols-5">
              {(
                [
                  [t('nutrient.calories'), avgs.calories, 'kcal'],
                  [t('nutrient.protein'), avgs.protein, 'g'],
                  [t('nutrient.carbsShort'), avgs.carbs, 'g'],
                  [t('nutrient.fat'), avgs.fat, 'g'],
                ] as const
              ).map(([label, val, u]) => (
                <div key={label} className="min-w-0 border-2 border-black p-1.5">
                  <p className="truncate text-[9px] font-black uppercase text-neutral-500">{label}</p>
                  <p className="text-sm font-black tabular-nums leading-tight sm:text-base">
                    {val != null ? Math.round(val).toLocaleString() : '-'}
                    <span className="ml-0.5 text-[9px] font-bold">{u}</span>
                  </p>
                </div>
              ))}
              <div className="min-w-0 border-2 border-black p-1.5">
                <p className="truncate text-[9px] font-black uppercase text-neutral-500">
                  {t('progress.steps')}
                </p>
                <p className="text-sm font-black tabular-nums leading-tight sm:text-base">
                  {avgs.steps != null ? Math.round(avgs.steps).toLocaleString() : '-'}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <p className="label">{t('progress.adherenceN', { n: rangeDays })}</p>
            <div className="grid grid-cols-3 gap-1 text-center">
              <div className="border-2 border-black p-1.5">
                <p className="text-[9px] font-black uppercase text-neutral-500">
                  {t('progress.calOnTarget')}
                </p>
                <p className="text-xl font-black tabular-nums">
                  {adherence.cal && adherence.cal.days > 0
                    ? `${Math.round((adherence.cal.hit / adherence.cal.days) * 100)}%`
                    : '-'}
                </p>
                {adherence.cal && adherence.cal.days > 0 && (
                  <p className="text-[10px] font-bold text-neutral-500">
                    {adherence.cal.hit}/{adherence.cal.days}
                  </p>
                )}
              </div>
              <div className="border-2 border-black p-1.5">
                <p className="text-[9px] font-black uppercase text-neutral-500">
                  {t('progress.proteinHit')}
                </p>
                <p className="text-xl font-black tabular-nums">
                  {adherence.prot && adherence.prot.days > 0
                    ? `${Math.round((adherence.prot.hit / adherence.prot.days) * 100)}%`
                    : '-'}
                </p>
                {adherence.prot && adherence.prot.days > 0 && (
                  <p className="text-[10px] font-bold text-neutral-500">
                    {adherence.prot.hit}/{adherence.prot.days}
                  </p>
                )}
              </div>
              <div className="border-2 border-black p-1.5">
                <p className="text-[9px] font-black uppercase text-neutral-500">
                  {t('progress.checkinCompliance')}
                </p>
                <p className="text-xl font-black tabular-nums">
                  {adherence.checkinCount}/{rangeDays}
                </p>
              </div>
            </div>
          </div>
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

      {measurements.length > 0 && (
        <div className="card">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="label mb-0">{t('measure.title')}</p>
            <select
              className="input max-w-56"
              value={measureField}
              onChange={(e) => setMeasureField(e.target.value as MeasurementField)}
            >
              {MEASUREMENT_FIELDS.map((f) => (
                <option key={f} value={f}>
                  {t(`measure.${f}`)}
                </option>
              ))}
            </select>
          </div>
          {statHead(measureData, 'cm')}
          {measureData.length === 0 ? empty : <NutrientChart data={measureData} unit="cm" />}
        </div>
      )}

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
          <p className="label">{t('cardio.title')}</p>

          {/* this week vs weekly minutes target */}
          <div className="mb-3">
            <div className="mb-1 flex items-baseline justify-between">
              <span className="text-xs font-black uppercase text-neutral-500">
                {t('cardio.thisWeek')}
              </span>
              <span className="text-lg font-black tabular-nums">
                {Math.round(cardioStats.weekMinutes)}
                <span className="text-xs font-bold"> min</span>
                {cardioStats.weeklyTarget != null && (
                  <span className="text-xs font-bold text-neutral-500">
                    {' '}
                    / {cardioStats.weeklyTarget} min
                  </span>
                )}
              </span>
            </div>
            {cardioStats.weeklyTarget != null && (
              <div className="h-4 border-2 border-black">
                <div
                  className="h-full bg-accent"
                  style={{
                    width: `${Math.min(100, (cardioStats.weekMinutes / cardioStats.weeklyTarget) * 100)}%`,
                  }}
                />
              </div>
            )}
          </div>

          {/* steps are cardio too — this week's total vs daily target × 7 */}
          <div className="mb-3">
            <div className="mb-1 flex items-baseline justify-between">
              <span className="text-xs font-black uppercase text-neutral-500">
                {t('cardio.stepsWeek')}
              </span>
              <span className="text-lg font-black tabular-nums">
                {Math.round(cardioStats.weekSteps).toLocaleString()}
                {stepsTarget != null && (
                  <span className="text-xs font-bold text-neutral-500">
                    {' '}
                    / {(stepsTarget * 7).toLocaleString()}
                  </span>
                )}
              </span>
            </div>
            {stepsTarget != null && (
              <div className="h-4 border-2 border-black">
                <div
                  className="h-full bg-accent"
                  style={{
                    width: `${Math.min(100, (cardioStats.weekSteps / (stepsTarget * 7)) * 100)}%`,
                  }}
                />
              </div>
            )}
          </div>

          {/* per-activity breakdown for the selected range */}
          <p className="text-[9px] font-black uppercase tracking-wide text-neutral-500">
            {t('cardio.byKind')}
          </p>
          {cardioStats.kinds.length === 0 && empty}
          <div className="space-y-1">
            {cardioStats.kinds.map((k) => (
              <div key={k.kind} className="flex items-baseline justify-between gap-2 border-b border-neutral-200 pb-1">
                <span className="text-sm font-bold">{t(`cardio.kinds.${k.kind}`)}</span>
                <span className="text-sm font-black tabular-nums">
                  {Math.round(k.minutes)} min
                  {k.steps > 0 && (
                    <span className="ml-2 text-xs font-bold text-neutral-500">
                      {Math.round(k.steps).toLocaleString()} {t('progress.steps').toLowerCase()}
                    </span>
                  )}
                  <span className="ml-2 text-xs font-bold text-neutral-500">×{k.sessions}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
