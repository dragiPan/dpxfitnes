import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../../lib/supabase'
import { NUTRIENTS } from '../../../lib/nutrients'
import type { Checkin, Profile } from '../../../lib/types'

export default function CheckinsTab({ client }: { client: Profile }) {
  const { t } = useTranslation()
  const [checkins, setCheckins] = useState<Checkin[]>([])

  useEffect(() => {
    void supabase
      .from('checkins')
      .select('*')
      .eq('user_id', client.id)
      .order('date', { ascending: false })
      .limit(90)
      .then(({ data }) => setCheckins((data as Checkin[]) ?? []))
  }, [client.id])

  if (checkins.length === 0)
    return <p className="text-sm text-neutral-500">{t('coach.checkinsEmpty')}</p>

  return (
    <div className="overflow-x-auto border-2 border-black">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-black text-white">
            <th className="sticky left-0 bg-black px-2 py-2 text-left font-black uppercase">
              {t('common.date')}
            </th>
            <th className="px-2 py-2 text-right font-black uppercase">{t('common.weight')}</th>
            {NUTRIENTS.map((n) => (
              <th key={n.key} className="whitespace-nowrap px-2 py-2 text-right font-black uppercase">
                {t(`nutrient.${n.key}`)}
              </th>
            ))}
            <th className="px-2 py-2 text-left font-black uppercase">{t('common.notes')}</th>
          </tr>
        </thead>
        <tbody>
          {checkins.map((c, i) => (
            <tr key={c.id} className={i % 2 ? 'bg-neutral-50' : ''}>
              <td className="sticky left-0 whitespace-nowrap bg-inherit px-2 py-1.5 font-black">
                {new Date(c.date).toLocaleDateString()}
              </td>
              <td className="px-2 py-1.5 text-right font-bold">{c.weight ?? '–'}</td>
              {NUTRIENTS.map((n) => (
                <td key={n.key} className="px-2 py-1.5 text-right">
                  {c[n.key] != null ? String(c[n.key]) : '–'}
                </td>
              ))}
              <td className="max-w-48 truncate px-2 py-1.5" title={c.notes ?? ''}>
                {c.notes ?? ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
