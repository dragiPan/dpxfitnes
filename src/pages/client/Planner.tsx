import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { addDays, format, startOfWeek } from 'date-fns'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import type { GCalEvent, TrainingSession } from '../../lib/types'

interface DayEvent {
  id: string
  title: string
  start: Date
  allDay: boolean
  isTraining: boolean
}

export default function Planner() {
  const { t } = useTranslation()
  const { session } = useAuth()
  const [connected, setConnected] = useState<boolean | null>(null)
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [events, setEvents] = useState<DayEvent[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!session) return
    void (async () => {
      // If we just came back from the Google consent screen, the refresh token
      // is on the current session — persist it before checking connection state.
      const { data: fresh } = await supabase.auth.getSession()
      const s = fresh.session
      if (s?.provider_refresh_token) {
        await supabase.from('google_tokens').upsert({
          user_id: s.user.id,
          refresh_token: s.provider_refresh_token,
          updated_at: new Date().toISOString(),
        })
      }
      const { data } = await supabase
        .from('google_tokens')
        .select('user_id')
        .eq('user_id', session.user.id)
        .maybeSingle()
      setConnected(!!data)
    })()
  }, [session])

  const load = useCallback(async () => {
    if (!session) return
    setLoading(true)
    setError('')
    const timeMin = weekStart.toISOString()
    const timeMax = addDays(weekStart, 7).toISOString()
    const collected: DayEvent[] = []

    // training sessions scheduled by the coach (always shown)
    const { data: sess } = await supabase
      .from('training_sessions')
      .select('*')
      .eq('client_id', session.user.id)
      .gte('start_at', timeMin)
      .lt('start_at', timeMax)
    for (const s of (sess as TrainingSession[]) ?? []) {
      collected.push({
        id: `s-${s.id}`,
        title: s.title,
        start: new Date(s.start_at),
        allDay: false,
        isTraining: true,
      })
    }

    // Google Calendar events via the edge function
    if (connected) {
      try {
        const { data, error: fnErr } = await supabase.functions.invoke('google-calendar', {
          body: { action: 'list_events', time_min: timeMin, time_max: timeMax },
        })
        if (fnErr) throw fnErr
        if ((data as { error?: string })?.error === 'not_connected') {
          // token missing or revoked — show the connect button again
          setConnected(false)
          setEvents(collected.sort((a, b) => a.start.getTime() - b.start.getTime()))
          setLoading(false)
          return
        }
        if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error)
        for (const ev of ((data as { events: GCalEvent[] })?.events ?? [])) {
          const startRaw = ev.start?.dateTime ?? ev.start?.date
          if (!startRaw) continue
          collected.push({
            id: `g-${ev.id}`,
            title: ev.summary ?? '(untitled)',
            start: new Date(startRaw),
            allDay: !ev.start?.dateTime,
            isTraining: false,
          })
        }
      } catch {
        setError(t('planner.loadError'))
      }
    }

    collected.sort((a, b) => a.start.getTime() - b.start.getTime())
    setEvents(collected)
    setLoading(false)
  }, [session, weekStart, connected, t])

  useEffect(() => {
    if (connected !== null) void load()
  }, [connected, load])

  async function connect() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/planner`,
        scopes:
          'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events',
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    })
  }

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl">{t('planner.title')}</h1>
        <div className="flex items-center gap-1">
          <button className="btn btn-sm" onClick={() => setWeekStart((w) => addDays(w, -7))}>
            ←
          </button>
          <span className="px-2 text-xs font-black uppercase">
            {format(weekStart, 'd.M.')} – {format(addDays(weekStart, 6), 'd.M.yyyy')}
          </span>
          <button className="btn btn-sm" onClick={() => setWeekStart((w) => addDays(w, 7))}>
            →
          </button>
          <button className="btn btn-sm" onClick={() => void load()}>
            ⟳
          </button>
        </div>
      </div>

      {connected === false && (
        <div className="card mb-4">
          <p className="mb-2 text-sm">{t('planner.hint')}</p>
          <button className="btn btn-primary" onClick={() => void connect()}>
            {t('planner.connect')}
          </button>
        </div>
      )}
      {connected && (
        <p className="mb-3 text-xs font-bold text-neutral-500">✓ {t('planner.connected')}</p>
      )}
      {error && <p className="mb-3 text-xs font-bold">{error}</p>}
      {loading && <p className="mb-3 text-xs">{t('common.loading')}</p>}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-7">
        {days.map((d) => {
          const dayEvents = events.filter(
            (e) => format(e.start, 'yyyy-MM-dd') === format(d, 'yyyy-MM-dd'),
          )
          const isToday = format(d, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
          return (
            <div key={d.toISOString()} className={`border-2 border-black ${isToday ? 'bg-neutral-100' : ''}`}>
              <p className="border-b-2 border-black px-2 py-1 text-xs font-black uppercase">
                {format(d, 'EEE d.M.')}
              </p>
              <div className="space-y-1 p-1.5 min-h-12">
                {dayEvents.length === 0 && (
                  <p className="text-[10px] text-neutral-400">{t('planner.noEvents')}</p>
                )}
                {dayEvents.map((e) => (
                  <div
                    key={e.id}
                    className={`px-1.5 py-1 text-[11px] font-bold leading-tight ${
                      e.isTraining ? 'bg-black text-white' : 'border border-black'
                    }`}
                  >
                    {e.isTraining && <span className="mr-1">🏋</span>}
                    {!e.allDay && <span>{format(e.start, 'HH:mm')} · </span>}
                    {e.allDay && <span>{t('planner.allDay')} · </span>}
                    {e.title}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
