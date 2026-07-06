import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface NavItem {
  to: string
  key: string
}

const CLIENT_NAV: NavItem[] = [
  { to: '/', key: 'nav.dashboard' },
  { to: '/checkin', key: 'nav.checkin' },
  { to: '/program', key: 'nav.program' },
  { to: '/meals', key: 'nav.meals' },
  { to: '/progress', key: 'nav.progress' },
  { to: '/planner', key: 'nav.planner' },
  { to: '/chat', key: 'nav.chat' },
  { to: '/board', key: 'nav.board' },
]

const COACH_NAV: NavItem[] = [
  { to: '/', key: 'nav.dashboard' },
  { to: '/clients', key: 'nav.clients' },
  { to: '/programs', key: 'nav.programs' },
  { to: '/library', key: 'nav.library' },
  { to: '/groups', key: 'nav.groups' },
  { to: '/board', key: 'nav.board' },
]

export default function Layout() {
  const { t } = useTranslation()
  const { isCoach, session } = useAuth()
  const location = useLocation()
  const [unread, setUnread] = useState(0)
  const nav = isCoach ? COACH_NAV : CLIENT_NAV

  useEffect(() => {
    if (!session) return
    void supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', session.user.id)
      .eq('read', false)
      .then(({ count }) => setUnread(count ?? 0))
  }, [session, location.pathname])

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 text-xs sm:text-sm font-bold uppercase tracking-wide whitespace-nowrap ${
      isActive ? 'bg-black text-white' : 'text-black hover:bg-neutral-100'
    }`

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-20 border-b-2 border-black bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-3 py-2.5">
          <NavLink to="/" className="text-lg font-black tracking-tighter">
            {t('app.name')}
          </NavLink>
          <div className="flex items-center gap-1">
            <NavLink
              to="/notifications"
              className="relative px-2 py-1 font-bold"
              aria-label={t('notifications.title')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.7 21a2 2 0 0 1-3.4 0" />
              </svg>
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center bg-black px-1 text-[9px] font-black text-white">
                  {unread}
                </span>
              )}
            </NavLink>
            <NavLink to="/profile" className="px-2 py-1" aria-label={t('profile.title')}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
              </svg>
            </NavLink>
          </div>
        </div>
        {/* horizontal nav — scrollable on small screens */}
        <nav className="mx-auto flex max-w-5xl overflow-x-auto border-t border-black">
          {nav.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} className={linkCls}>
              {t(item.key)}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-3 py-4 pb-16">
        <Outlet />
      </main>
    </div>
  )
}
