import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../../lib/supabase'
import NutrientChart, { type ChartPoint } from '../../../components/NutrientChart'
import { NUTRIENTS, type NutrientKey } from '../../../lib/nutrients'
import type { Checkin, NutritionTarget, Profile } from '../../../lib/types'

export default function OverviewTab({ client }: { client: Profile }) {
  const { t } = useTranslation()
  const [checkins, setCheckins] = useState<Checkin[]>([])
  const [targets, setTargets] = useState<NutritionTarget[]>([])
  const [nutrient, setNutrient] = useState<NutrientKey>('calories')

  useEffect(() => {
    const since = new Date()
    since.setDate(since.getDate() - 30)
    void supabase
      .from('checkins')
      .select('*')
      .eq('user_id', client.id)
      .gte('date', since.toISOString().slice(0, 10))
      .order('date')
      .then(({ data }) => setCheckins((data as Checkin[]) ?? []))
    void supabase
      .from('nutrition_targets')
      .select('*')
      .eq('user_id', client.id)
      .then(({ data }) => setTargets((data as NutritionTarget[]) ?? []))
  }, [client.id])

  const weightData: ChartPoint[] = checkins
    .filter((c) => c.weight != null)
    .map((c) => ({ date: c.date, value: c.weight as number }))

  const nutrientData: ChartPoint[] = checkins
    .filter((c) => c[nutrient] != null)
    .map((c) => ({ date: c.date, value: Number(c[nutrient]) }))

  const target = targets.find((x) => x.nutrient === nutrient)?.target_value ?? null
  const unit = NUTRIENTS.find((n) => n.key === nutrient)?.unit

  return (
    <div className="space-y-4">
      <div className="card">
        <p className="label">
          {t('coach.overview.weightTrend')} · {t('coach.overview.last30')}
        </p>
        {weightData.length === 0 ? (
          <p className="text-sm text-neutral-500">{t('coach.checkinsEmpty')}</p>
        ) : (
          <NutrientChart data={weightData} unit="kg" />
        )}
      </div>

      <div className="card">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="label mb-0">
            {t('coach.overview.nutrientTrend')} · {t('coach.overview.last30')}
          </p>
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
        {nutrientData.length === 0 ? (
          <p className="text-sm text-neutral-500">{t('coach.checkinsEmpty')}</p>
        ) : (
          <NutrientChart
            data={nutrientData}
            target={target}
            unit={unit}
            targetLabel={t('coach.overview.target')}
          />
        )}
      </div>
    </div>
  )
}
