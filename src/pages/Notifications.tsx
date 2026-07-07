import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { AppNotification } from '../lib/types'

export default function Notifications() {
  const { t } = useTranslation()
  const { session } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState<AppNotification[]>([])

  const load = useCallback(async () => {
    if (!session) return
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(100)
    setItems((data as AppNotification[]) ?? [])
  }, [session])

  useEffect(() => {
    void load()
  }, [load])

  async function markAll() {
    if (!session) return
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', session.user.id)
      .eq('read', false)
    await load()
  }

  // clicking a notification jumps straight to the thing it's about
  async function open(n: AppNotification) {
    if (!n.read) {
      await supabase.from('notifications').update({ read: true }).eq('id', n.id)
    }
    if (n.link) {
      navigate(n.link)
    } else {
      await load()
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl">{t('notifications.title')}</h1>
        {items.some((n) => !n.read) && (
          <button className="btn btn-sm" onClick={() => void markAll()}>
            {t('notifications.markAll')}
          </button>
        )}
      </div>
      {items.length === 0 && <p className="text-sm text-neutral-500">{t('notifications.empty')}</p>}
      <div className="space-y-2">
        {items.map((n) => (
          <div
            key={n.id}
            className={`card ${n.read ? 'opacity-60' : ''} ${n.link ? 'cursor-pointer hover:bg-neutral-50' : ''}`}
            onClick={() => void open(n)}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-bold">{n.title}</p>
                {n.body && <p className="text-sm whitespace-pre-wrap">{n.body}</p>}
                <p className="mt-1 text-[10px] font-bold uppercase text-neutral-400">
                  {new Date(n.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {!n.read && <span className="badge">NEW</span>}
                {n.link && <span className="font-black">→</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
