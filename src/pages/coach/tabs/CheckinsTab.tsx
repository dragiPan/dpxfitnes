import { Fragment, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../../lib/supabase'
import { NUTRIENTS } from '../../../lib/nutrients'
import type { Checkin, Profile } from '../../../lib/types'

export default function CheckinsTab({ client }: { client: Profile }) {
  const { t } = useTranslation()
  const [checkins, setCheckins] = useState<Checkin[]>([])
  const [openId, setOpenId] = useState<string | null>(null)

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

  const colCount = NUTRIENTS.length + 4 // date, weight, steps, nutrients…, notes

  return (
    <div className="overflow-x-auto border-2 border-black">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-black text-white">
            <th className="sticky left-0 bg-black px-2 py-2 text-left font-black uppercase">
              {t('common.date')}
            </th>
            <th className="px-2 py-2 text-right font-black uppercase">{t('common.weight')}</th>
            <th className="px-2 py-2 text-right font-black uppercase">{t('progress.steps')}</th>
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
            <Fragment key={c.id}>
              <tr
                className={`cursor-pointer ${openId === c.id ? 'bg-black text-white' : i % 2 ? 'bg-neutral-50' : ''}`}
                onClick={() => setOpenId(openId === c.id ? null : c.id)}
              >
                <td className="sticky left-0 whitespace-nowrap bg-inherit px-2 py-1.5 font-black">
                  {openId === c.id ? '▾' : '▸'} {new Date(c.date).toLocaleDateString()}
                </td>
                <td className="px-2 py-1.5 text-right font-bold tabular-nums">{c.weight ?? '–'}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">
                  {c.steps != null ? Number(c.steps).toLocaleString() : '–'}
                </td>
                {NUTRIENTS.map((n) => (
                  <td key={n.key} className="px-2 py-1.5 text-right tabular-nums">
                    {c[n.key] != null ? String(c[n.key]) : '–'}
                  </td>
                ))}
                <td className="max-w-48 truncate px-2 py-1.5" title={c.notes ?? ''}>
                  {c.notes ?? ''}
                </td>
              </tr>

              {openId === c.id && (
                <tr>
                  <td colSpan={colCount} className="border-y-2 border-black p-3">
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-7">
                      <Tile label={t('common.weight')} value={c.weight} unit="kg" strong />
                      <Tile
                        label={t('progress.steps')}
                        value={c.steps}
                        format={(v) => Number(v).toLocaleString()}
                        strong
                      />
                      {NUTRIENTS.map((n) => (
                        <Tile
                          key={n.key}
                          label={t(`nutrient.${n.key}`)}
                          value={c[n.key]}
                          unit={n.unit}
                          strong={n.primary}
                        />
                      ))}
                    </div>
                    {c.notes && (
                      <p className="mt-2 border-2 border-black p-2 text-sm">
                        <span className="text-[9px] font-black uppercase tracking-wide text-neutral-500">
                          {t('common.notes')}:{' '}
                        </span>
                        {c.notes}
                      </p>
                    )}
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Tile({
  label,
  value,
  unit,
  strong,
  format,
}: {
  label: string
  value: number | null
  unit?: string
  strong?: boolean
  format?: (v: number) => string
}) {
  return (
    <div className={`border-2 border-black p-2 text-center ${strong ? 'bg-black text-white' : ''}`}>
      <p className={`text-[9px] font-black uppercase tracking-wide ${strong ? 'text-neutral-300' : 'text-neutral-500'}`}>
        {label}
      </p>
      <p className="text-lg font-black tabular-nums leading-tight">
        {value != null ? (format ? format(value) : value) : '–'}
        {value != null && unit && <span className="ml-0.5 text-[10px] font-bold">{unit}</span>}
      </p>
    </div>
  )
}
