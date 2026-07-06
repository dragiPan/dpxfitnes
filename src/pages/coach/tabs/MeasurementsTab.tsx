import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../../lib/supabase'
import { MEASUREMENT_FIELDS } from '../../../lib/nutrients'
import type { Measurement, Profile } from '../../../lib/types'

export default function MeasurementsTab({
  client,
  onChanged,
}: {
  client: Profile
  onChanged: (p: Profile) => void
}) {
  const { t } = useTranslation()
  const [rows, setRows] = useState<Measurement[]>([])

  useEffect(() => {
    void supabase
      .from('measurements')
      .select('*')
      .eq('user_id', client.id)
      .order('date', { ascending: false })
      .limit(60)
      .then(({ data }) => setRows((data as Measurement[]) ?? []))
  }, [client.id])

  async function toggleEnabled() {
    const next = !client.measurements_enabled
    await supabase.from('profiles').update({ measurements_enabled: next }).eq('id', client.id)
    onChanged({ ...client, measurements_enabled: next })
  }

  return (
    <div className="space-y-4">
      <label className="card flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          className="h-5 w-5 accent-black"
          checked={client.measurements_enabled}
          onChange={() => void toggleEnabled()}
        />
        <span className="text-sm font-bold">{t('coach.measurementsTab.enable')}</span>
      </label>

      {rows.length === 0 ? (
        <p className="text-sm text-neutral-500">{t('coach.measurementsTab.empty')}</p>
      ) : (
        <div className="overflow-x-auto border-2 border-black">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-black text-white">
                <th className="px-2 py-2 text-left font-black uppercase">{t('common.date')}</th>
                {MEASUREMENT_FIELDS.map((f) => (
                  <th key={f} className="px-2 py-2 text-right font-black uppercase">
                    {t(`measure.${f}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} className={i % 2 ? 'bg-neutral-50' : ''}>
                  <td className="whitespace-nowrap px-2 py-1.5 font-black">
                    {new Date(r.date).toLocaleDateString()}
                  </td>
                  {MEASUREMENT_FIELDS.map((f) => (
                    <td key={f} className="px-2 py-1.5 text-right">
                      {r[f] ?? '–'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
