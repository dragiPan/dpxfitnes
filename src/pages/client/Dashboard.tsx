import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import type { BoardPost, TrainingSession } from '../../lib/types'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export default function ClientDashboard() {
  const { t } = useTranslation()
  const { session, profile } = useAuth()
  const [checkedIn, setCheckedIn] = useState<boolean | null>(null)
  const [nextSession, setNextSession] = useState<TrainingSession | null>(null)
  const [posts, setPosts] = useState<BoardPost[]>([])
  const [intakeDone, setIntakeDone] = useState(true)

  useEffect(() => {
    if (!session) return
    void supabase
      .from('intake_responses')
      .select('submitted_at')
      .eq('user_id', session.user.id)
      .maybeSingle()
      .then(({ data }) => setIntakeDone(!!(data as { submitted_at: string | null } | null)?.submitted_at))
    void supabase
      .from('checkins')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('date', todayStr())
      .maybeSingle()
      .then(({ data }) => setCheckedIn(!!data))

    void supabase
      .from('training_sessions')
      .select('*')
      .eq('client_id', session.user.id)
      .gte('start_at', new Date().toISOString())
      .order('start_at')
      .limit(1)
      .then(({ data }) => setNextSession((data?.[0] as TrainingSession) ?? null))

    void supabase
      .from('board_posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(3)
      .then(({ data }) => setPosts((data as BoardPost[]) ?? []))
  }, [session])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl">
        {t('dashboard.hello')}
        {profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''} 👊
      </h1>

      {!intakeDone && (
        <Link to="/intake" className="card block border-4 hover:bg-neutral-50">
          <p className="font-black">📋 {t('intake.bannerTitle')}</p>
          <p className="text-sm text-neutral-600">{t('intake.bannerBody')}</p>
        </Link>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="card">
          <p className="label">{t('dashboard.todayCheckin')}</p>
          {checkedIn === null ? (
            <p className="text-sm">{t('common.loading')}</p>
          ) : checkedIn ? (
            <p className="text-xl font-black">✓ {t('dashboard.done')}</p>
          ) : (
            <>
              <p className="mb-2 text-xl font-black">✗ {t('dashboard.notDone')}</p>
              <Link to="/checkin" className="btn btn-primary btn-sm">
                {t('dashboard.goCheckin')}
              </Link>
            </>
          )}
        </div>

        <div className="card">
          <p className="label">{t('dashboard.nextSession')}</p>
          {nextSession ? (
            <>
              <p className="text-xl font-black">{nextSession.title}</p>
              <p className="text-sm font-bold">
                {new Date(nextSession.start_at).toLocaleString([], {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </>
          ) : (
            <p className="text-sm text-neutral-500">{t('dashboard.noSession')}</p>
          )}
          <Link to="/program" className="btn btn-sm mt-2">
            {t('dashboard.openProgram')}
          </Link>
        </div>
      </div>

      <div>
        <p className="label">{t('dashboard.latestPosts')}</p>
        {posts.length === 0 && <p className="text-sm text-neutral-500">{t('board.noPosts')}</p>}
        <div className="space-y-2">
          {posts.map((p) => (
            <Link key={p.id} to="/board" className="card block hover:bg-neutral-50">
              <p className="font-bold">{p.title}</p>
              <p className="line-clamp-2 text-sm text-neutral-600">{p.body}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
