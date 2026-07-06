import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Profile } from '../lib/types'
import { setLanguage } from '../i18n'

interface AuthCtx {
  session: Session | null
  profile: Profile | null
  loading: boolean
  isCoach: boolean
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

const Ctx = createContext<AuthCtx>({
  session: null,
  profile: null,
  loading: true,
  isCoach: false,
  refreshProfile: async () => {},
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadProfile(userId: string) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (data) {
      setProfile(data as Profile)
      setLanguage((data as Profile).language)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session) void loadProfile(data.session.user.id)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession)
      if (newSession) {
        void loadProfile(newSession.user.id)
        // After a Google OAuth redirect with calendar scopes, persist the
        // refresh token so edge functions can talk to Google Calendar later.
        if (event === 'SIGNED_IN' && newSession.provider_refresh_token) {
          void supabase.from('google_tokens').upsert({
            user_id: newSession.user.id,
            refresh_token: newSession.provider_refresh_token,
            updated_at: new Date().toISOString(),
          })
        }
      } else {
        setProfile(null)
      }
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  return (
    <Ctx.Provider
      value={{
        session,
        profile,
        loading,
        isCoach: profile?.role === 'coach',
        refreshProfile: async () => {
          if (session) await loadProfile(session.user.id)
        },
        signOut: async () => {
          await supabase.auth.signOut()
        },
      }}
    >
      {children}
    </Ctx.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(Ctx)
}
