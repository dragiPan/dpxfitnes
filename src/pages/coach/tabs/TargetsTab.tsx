import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../../lib/supabase'
import { EXTRA_TARGETS, NUTRIENTS } from '../../../lib/nutrients'
import type { NutritionTarget, Profile } from '../../../lib/types'

export default function TargetsTab({ client }: { client: Profile }) {
  const { t } = useTranslation()
  const [targets, setTargets] = useState<NutritionTarget[]>([])

  useEffect(() => {
    void supabase
      .from('nutrition_targets')
      .select('*')
      .eq('user_id', client.id)
      .then(({ data }) => setTargets((data as NutritionTarget[]) ?? []))
  }, [client.id])

  const rowFor = (key: string) => targets.find((x) => x.nutrient === key)

  async function saveTarget(nutrient: string, value: string, show: boolean) {
    const num = value.trim() === '' ? null : Number(value.replace(',', '.'))
    if (num == null) {
      await supabase.from('nutrition_targets').delete().eq('user_id', client.id).eq('nutrient', nutrient)
    } else {
      await supabase
        .from('nutrition_targets')
        .upsert(
          { user_id: client.id, nutrient, target_value: num, show_to_client: show },
          { onConflict: 'user_id,nutrient' },
        )
    }
    const { data } = await supabase.from('nutrition_targets').select('*').eq('user_id', client.id)
    setTargets((data as NutritionTarget[]) ?? [])
  }

  return (
    <div className="max-w-xl">
      <p className="mb-3 text-xs text-neutral-500">{t('coach.targets.hint')}</p>
      <div className="border-2 border-black">
        <div className="grid grid-cols-[1fr_7rem_6rem] items-center gap-2 border-b-2 border-black bg-black px-3 py-2 text-white">
          <span className="text-xs font-black uppercase">{t('checkin.micros')}</span>
          <span className="text-xs font-black uppercase text-right">{t('coach.targets.value')}</span>
          <span className="text-xs font-black uppercase text-center">{t('coach.targets.show')}</span>
        </div>
        {[
          ...NUTRIENTS.map((n) => ({ key: n.key as string, unit: n.unit, label: t(`nutrient.${n.key}`) })),
          { key: 'steps', unit: EXTRA_TARGETS[0].unit, label: t('cardio.stepsDaily') },
          { key: 'cardio_weekly_min', unit: EXTRA_TARGETS[1].unit, label: t('cardio.weeklyMin') },
        ].map((n) => {
          const row = rowFor(n.key)
          return (
            <div
              key={n.key}
              className="grid grid-cols-[1fr_7rem_6rem] items-center gap-2 border-b border-neutral-300 px-3 py-1.5 last:border-b-0"
            >
              <span className="text-sm font-bold">
                {n.label} <span className="text-xs text-neutral-400">({n.unit})</span>
              </span>
              <input
                className="input px-2 py-1.5 text-right"
                inputMode="decimal"
                defaultValue={row?.target_value ?? ''}
                onBlur={(e) => void saveTarget(n.key, e.target.value, row?.show_to_client ?? n.key === 'calories')}
              />
              <input
                type="checkbox"
                className="mx-auto h-5 w-5 accent-black"
                checked={row?.show_to_client ?? false}
                disabled={!row}
                onChange={(e) =>
                  row && void saveTarget(n.key, String(row.target_value), e.target.checked)
                }
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
