import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../../lib/supabase'
import { notifyUsers } from '../../../lib/notify'
import type { Profile, Subscription } from '../../../lib/types'

export default function PaymentTab({ client }: { client: Profile }) {
  const { t } = useTranslation()
  const [sub, setSub] = useState<Partial<Subscription>>({})
  const [msg, setMsg] = useState('')

  useEffect(() => {
    void supabase
      .from('subscriptions')
      .select('*')
      .eq('client_id', client.id)
      .maybeSingle()
      .then(({ data }) => setSub((data as Subscription | null) ?? {}))
  }, [client.id])

  async function save() {
    setMsg('')
    const { error } = await supabase.from('subscriptions').upsert({
      client_id: client.id,
      package_name: sub.package_name || null,
      price: sub.price ?? null,
      currency: sub.currency || 'EUR',
      paid_until: sub.paid_until || null,
      notes: sub.notes || null,
      updated_at: new Date().toISOString(),
    })
    setMsg(error ? t('common.error') : t('common.saved'))
  }

  async function sendReminder() {
    await notifyUsers([client.id], {
      type: 'payment',
      title: t('coach.paymentTab.reminderTitle'),
      body: sub.paid_until
        ? `${t('coach.paymentTab.paidUntil')}: ${new Date(sub.paid_until).toLocaleDateString()}`
        : '',
    })
    setMsg(t('coach.paymentTab.reminderSent'))
  }

  const expired = sub.paid_until && new Date(sub.paid_until) < new Date()
  const soon =
    sub.paid_until &&
    !expired &&
    new Date(sub.paid_until).getTime() - Date.now() < 7 * 86400000

  return (
    <div className="max-w-md space-y-3">
      {expired && <p className="card border-4 font-black">⚠ {t('coach.paymentTab.expired')}</p>}
      {soon && <p className="card font-bold">⏳ {t('coach.paymentTab.expiringSoon')}</p>}

      <div className="card space-y-2">
        <div>
          <label className="label">{t('coach.paymentTab.package')}</label>
          <input
            className="input"
            value={sub.package_name ?? ''}
            onChange={(e) => setSub((s) => ({ ...s, package_name: e.target.value }))}
            placeholder="1-on-1 coaching"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label">{t('coach.paymentTab.price')}</label>
            <input
              className="input"
              inputMode="decimal"
              value={sub.price ?? ''}
              onChange={(e) =>
                setSub((s) => ({ ...s, price: e.target.value === '' ? null : Number(e.target.value) }))
              }
            />
          </div>
          <div>
            <label className="label">{t('coach.paymentTab.currency')}</label>
            <select
              className="input"
              value={sub.currency ?? 'EUR'}
              onChange={(e) => setSub((s) => ({ ...s, currency: e.target.value }))}
            >
              <option>EUR</option>
              <option>RSD</option>
              <option>USD</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label">{t('coach.paymentTab.paidUntil')}</label>
          <input
            type="date"
            className="input"
            value={sub.paid_until ?? ''}
            onChange={(e) => setSub((s) => ({ ...s, paid_until: e.target.value }))}
          />
        </div>
        <div>
          <label className="label">{t('common.notes')}</label>
          <textarea
            className="input min-h-14"
            value={sub.notes ?? ''}
            onChange={(e) => setSub((s) => ({ ...s, notes: e.target.value }))}
          />
        </div>
        <div className="flex gap-2">
          <button className="btn btn-primary flex-1" onClick={() => void save()}>
            {t('common.save')}
          </button>
          <button className="btn" onClick={() => void sendReminder()}>
            ✉ {t('coach.paymentTab.sendReminder')}
          </button>
        </div>
        {msg && <p className="text-xs font-bold">{msg}</p>}
      </div>
    </div>
  )
}
