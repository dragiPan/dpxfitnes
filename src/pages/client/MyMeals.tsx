import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { printMealPlan } from '../../lib/print'
import Comments from '../../components/Comments'
import type { MealPlan, MealPlanMeal } from '../../lib/types'

interface FullPlan extends MealPlan {
  meal_plan_meals: MealPlanMeal[]
}

export default function MyMeals() {
  const { t } = useTranslation()
  const { session } = useAuth()
  const [plans, setPlans] = useState<FullPlan[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session) return
    void supabase
      .from('meal_plans')
      .select('*, meal_plan_meals(*)')
      .eq('client_id', session.user.id)
      .eq('active', true)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        const ps = (data as FullPlan[]) ?? []
        for (const p of ps) p.meal_plan_meals.sort((a, b) => a.order_index - b.order_index)
        setPlans(ps)
        setLoading(false)
      })
  }, [session])

  if (loading) return <p>{t('common.loading')}</p>

  const totals = (p: FullPlan) =>
    p.meal_plan_meals.reduce(
      (acc, m) => ({
        calories: acc.calories + (m.calories ?? 0),
        protein: acc.protein + (m.protein ?? 0),
        carbs: acc.carbs + (m.carbs ?? 0),
        fat: acc.fat + (m.fat ?? 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    )

  return (
    <div>
      <h1 className="mb-4 text-2xl">{t('meals.title')}</h1>
      {plans.length === 0 && <p className="text-sm text-neutral-500">{t('meals.noPlan')}</p>}

      <div className="space-y-6">
        {plans.map((plan) => {
          const tot = totals(plan)
          return (
            <div key={plan.id} className="card">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-xl">{plan.title}</h2>
                <button
                  className="btn btn-sm shrink-0"
                  onClick={() =>
                    printMealPlan(plan, {
                      meal: t('coach.mealsTab.mealName'),
                      time: t('coach.mealsTab.time'),
                      calories: t('nutrient.calories'),
                      protein: t('nutrient.protein'),
                      carbs: t('nutrient.carbs'),
                      fat: t('nutrient.fat'),
                      totals: t('meals.dailyTotals'),
                    })
                  }
                >
                  🖨
                </button>
              </div>
              {plan.notes && <p className="mt-1 whitespace-pre-wrap text-sm">{plan.notes}</p>}

              <div className="mt-3 space-y-3">
                {plan.meal_plan_meals.map((m) => (
                  <div key={m.id} className="border-2 border-black p-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-black">
                        {m.name}
                        {m.time_hint && (
                          <span className="ml-2 text-xs font-bold text-neutral-500">{m.time_hint}</span>
                        )}
                      </p>
                      <p className="text-xs font-bold">
                        {m.calories ?? 0} kcal · P {m.protein ?? 0}g · C {m.carbs ?? 0}g · F {m.fat ?? 0}g
                      </p>
                    </div>
                    {m.description && (
                      <p className="mt-1 whitespace-pre-wrap text-sm">{m.description}</p>
                    )}
                  </div>
                ))}
              </div>

              <p className="mt-3 border-t-2 border-black pt-2 text-sm font-black">
                {t('meals.dailyTotals')}: {tot.calories} kcal · P {tot.protein}g · C {tot.carbs}g · F{' '}
                {tot.fat}g
              </p>

              <Comments
                entityType="meal_plan"
                entityId={plan.id}
                clientId={session!.user.id}
                contextLabel={plan.title}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
