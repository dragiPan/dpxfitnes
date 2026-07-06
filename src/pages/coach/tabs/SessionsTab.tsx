import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../../lib/supabase'
import { notifyUsers } from '../../../lib/notify'
import type { Profile, TrainingSession } from '../../../lib/types'

export default function SessionsTab({ client }: { client: Profile }) {
  const { t } = useTranslation()
  const [sessions, setSessions] = useState<TrainingSession[]>([])
  const [title, setTitle] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('training_sessions')
      .select('*')
      .eq('client_id', client.id)
      .order('start_at', { ascending: false })
      .limit(50)
    setSessions((data as TrainingSession[]) ?? [])
  }, [client.id])

  useEffect(() => {
    void load()
  }, [load])

  async function create() {
    if (!title.trim() || !start || !end) return
    setBusy(true)
    setMsg('')
    try {
      const { data: inserted, error } = await supabase
        .from('training_sessions')
        .insert({
          client_id: client.id,
          title: title.trim(),
          notes: notes.trim() || null,
          start_at: new Date(start).toISOString(),
          end_at: new Date(end).toISOString(),
        })
        .select()
        .single()
      if (error) throw error
      const sessionRow = inserted as TrainingSession

      // push into the client's Google Calendar (if they've connected it)
      let pushed = false
      try {
        const { data: res, error: fnErr } = await supabase.functions.invoke('google-calendar', {
          body: {
            action: 'create_event',
            target_user_id: client.id,
            summary: title.trim(),
            description: notes.trim(),
            start: new Date(start).toISOString(),
            end: new Date(end).toISOString(),
          },
        })
        if (!fnErr && (res as { event_id?: string })?.event_id) {
          pushed = true
          await supabase
            .from('training_sessions')
            .update({ google_event_id: (res as { event_id: string }).event_id })
            .eq('id', sessionRow.id)
        }
      } catch {
        // client hasn't connected Google Calendar or function not deployed
      }

      await notifyUsers([client.id], {
        type: 'session',
        title: `${t('planner.training')}: ${title.trim()}`,
        body: new Date(start).toLocaleString(),
        link: '/planner',
      })

      setMsg(pushed ? t('coach.sessions.pushed') : t('coach.sessions.notConnected'))
      setTitle('')
      setStart('')
      setEnd('')
      setNotes('')
      await load()
    } catch {
      setMsg(t('common.error'))
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: string) {
    if (!confirm(t('common.confirmDelete'))) return
    await supabase.from('training_sessions').delete().eq('id', id)
    await load()
  }

  const now = Date.now()
  const upcoming = sessions.filter((s) => new Date(s.start_at).getTime() >= now)
  const past = sessions.filter((s) => new Date(s.start_at).getTime() < now)

  const sessionRow = (s: TrainingSession) => (
    <div key={s.id} className="flex items-center justify-between gap-2 border border-black px-2 py-1.5">
      <div>
        <p className="text-sm font-black">
          {s.title}
          {s.google_event_id && <span className="ml-2 badge">GCal ✓</span>}
        </p>
        <p className="text-xs font-bold text-neutral-500">
          {new Date(s.start_at).toLocaleString([], {
            weekday: 'short',
            day: 'numeric',
            month: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}{' '}
          – {new Date(s.end_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
      <button className="btn btn-sm" onClick={() => void remove(s.id)}>
        ✕
      </button>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="card space-y-2">
        <p className="label">{t('coach.sessions.new')}</p>
        <input
          className="input"
          placeholder={t('common.title')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label">{t('coach.sessions.start')}</label>
            <input
              type="datetime-local"
              className="input"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </div>
          <div>
            <label className="label">{t('coach.sessions.end')}</label>
            <input
              type="datetime-local"
              className="input"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </div>
        </div>
        <textarea
          className="input min-h-14"
          placeholder={t('common.notes')}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <button
          className="btn btn-primary"
          disabled={busy || !title.trim() || !start || !end}
          onClick={() => void create()}
        >
          {t('coach.sessions.push')}
        </button>
        {msg && <p className="text-xs font-bold">{msg}</p>}
      </div>

      <div className="card">
        <p className="label">{t('coach.sessions.upcoming')}</p>
        <div className="space-y-1">
          {upcoming.length === 0 && <p className="text-sm text-neutral-500">{t('common.none')}</p>}
          {upcoming.map(sessionRow)}
        </div>
      </div>

      {past.length > 0 && (
        <div className="card">
          <p className="label">{t('coach.sessions.past')}</p>
          <div className="space-y-1 opacity-60">{past.map(sessionRow)}</div>
        </div>
      )}
    </div>
  )
}
