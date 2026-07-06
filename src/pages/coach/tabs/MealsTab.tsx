import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../../lib/supabase'
import { notifyUsers } from '../../../lib/notify'
import Comments from '../../../components/Comments'
import type { MealPlan, MealPlanMeal, Profile } from '../../../lib/types'

interface FullPlan extends MealPlan {
  meal_plan_meals: MealPlanMeal[]
}

export default function MealsTab({ client }: { client: Profile }) {
  const { t } = useTranslation()
  const [plans, setPlans] = useState<FullPlan[]>([])
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('meal_plans')
      .select('*, meal_plan_meals(*)')
      .eq('client_id', client.id)
      .order('created_at', { ascending: false })
    const ps = (data as FullPlan[]) ?? []
    for (const p of ps) p.meal_plan_meals.sort((a, b) => a.order_index - b.order_index)
    setPlans(ps)
  }, [client.id])

  useEffect(() => {
    void load()
  }, [load])

  async function createPlan() {
    await supabase.from('meal_plans').insert({
      client_id: client.id,
      title: t('coach.mealsTab.newPlan'),
    })
    await load()
  }

  async function notifyClient(plan: FullPlan) {
    await notifyUsers([client.id], {
      type: 'meal_plan',
      title: `${t('meals.title')}: ${plan.title}`,
      link: '/meals',
    })
    setMsg(t('coach.mealsTab.savedMsg'))
  }

  async function addMeal(plan: FullPlan) {
    await supabase.from('meal_plan_meals').insert({
      meal_plan_id: plan.id,
      order_index: plan.meal_plan_meals.length,
      name: '',
    })
    await load()
  }

  async function deletePlan(id: string) {
    if (!confirm(t('common.confirmDelete'))) return
    await supabase.from('meal_plans').delete().eq('id', id)
    await load()
  }

  async function deleteMeal(id: string) {
    if (!confirm(t('common.confirmDelete'))) return
    await supabase.from('meal_plan_meals').delete().eq('id', id)
    await load()
  }

  async function toggleActive(plan: FullPlan) {
    await supabase.from('meal_plans').update({ active: !plan.active }).eq('id', plan.id)
    await load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button className="btn btn-primary" onClick={() => void createPlan()}>
          + {t('coach.mealsTab.newPlan')}
        </button>
        {msg && <p className="text-xs font-bold">{msg}</p>}
      </div>

      {plans.map((plan) => (
        <div key={plan.id} className="card">
          <div className="mb-2 flex items-center gap-2">
            <input
              className="input font-black"
              defaultValue={plan.title}
              placeholder={t('coach.mealsTab.planTitle')}
              onBlur={(e) => void supabase.from('meal_plans').update({ title: e.target.value }).eq('id', plan.id)}
            />
            <button
              className={`btn btn-sm shrink-0 ${plan.active ? 'btn-primary' : ''}`}
              onClick={() => void toggleActive(plan)}
            >
              {t('coach.mealsTab.active')}
            </button>
            <button className="btn btn-sm shrink-0" onClick={() => void deletePlan(plan.id)}>
              ✕
            </button>
          </div>
          <textarea
            className="input mb-2"
            defaultValue={plan.notes ?? ''}
            placeholder={t('common.notes')}
            onBlur={(e) => void supabase.from('meal_plans').update({ notes: e.target.value || null }).eq('id', plan.id)}
          />

          <div className="space-y-2">
            {plan.meal_plan_meals.map((m) => (
              <MealEditor key={m.id} meal={m} onDelete={() => void deleteMeal(m.id)} />
            ))}
          </div>

          <div className="mt-2 flex gap-2">
            <button className="btn btn-sm" onClick={() => void addMeal(plan)}>
              + {t('coach.mealsTab.addMeal')}
            </button>
            <button className="btn btn-sm btn-primary" onClick={() => void notifyClient(plan)}>
              {t('common.send')} →
            </button>
          </div>

          <Comments entityType="meal_plan" entityId={plan.id} clientId={client.id} contextLabel={plan.title} />
        </div>
      ))}
    </div>
  )
}

function MealEditor({ meal: m, onDelete }: { meal: MealPlanMeal; onDelete: () => void }) {
  const { t } = useTranslation()

  async function save(field: keyof MealPlanMeal, raw: string) {
    let value: string | number | null = raw
    if (['calories', 'protein', 'carbs', 'fat'].includes(field)) {
      value = raw.trim() === '' ? null : Number(raw.replace(',', '.'))
    } else if (raw.trim() === '') {
      value = null
    }
    await supabase.from('meal_plan_meals').update({ [field]: value }).eq('id', m.id)
  }

  return (
    <div className="border-2 border-black p-2">
      <div className="mb-1 flex gap-2">
        <input
          className="input font-black"
          defaultValue={m.name}
          placeholder={t('coach.mealsTab.mealName')}
          onBlur={(e) => void save('name', e.target.value)}
        />
        <input
          className="input max-w-28"
          defaultValue={m.time_hint ?? ''}
          placeholder={t('coach.mealsTab.time')}
          onBlur={(e) => void save('time_hint', e.target.value)}
        />
        <button className="btn btn-sm shrink-0" onClick={onDelete}>
          ✕
        </button>
      </div>
      <textarea
        className="input mb-1 min-h-14"
        defaultValue={m.description ?? ''}
        placeholder={t('common.description')}
        onBlur={(e) => void save('description', e.target.value)}
      />
      <div className="grid grid-cols-4 gap-1">
        {(['calories', 'protein', 'carbs', 'fat'] as const).map((f) => (
          <div key={f}>
            <label className="label">{t(`nutrient.${f}`)}</label>
            <input
              className="input px-2 py-1.5"
              inputMode="decimal"
              defaultValue={m[f] ?? ''}
              onBlur={(e) => void save(f, e.target.value)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
