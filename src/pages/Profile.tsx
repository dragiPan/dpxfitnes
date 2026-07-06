import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { setLanguage } from '../i18n'

export default function Profile() {
  const { t } = useTranslation()
  const { profile, session, refreshProfile, signOut } = useAuth()
  const [name, setName] = useState(profile?.full_name ?? '')
  const [saved, setSaved] = useState(false)

  async function changeLanguage(lang: 'en' | 'sr') {
    setLanguage(lang)
    if (session) {
      await supabase.from('profiles').update({ language: lang }).eq('id', session.user.id)
      await refreshProfile()
    }
  }

  async function saveName() {
    if (!session) return
    await supabase.from('profiles').update({ full_name: name.trim() }).eq('id', session.user.id)
    await refreshProfile()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="max-w-md">
      <h1 className="mb-4 text-2xl">{t('profile.title')}</h1>
      <div className="card space-y-4">
        <div>
          <label className="label">{t('profile.name')}</label>
          <div className="flex gap-2">
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
            <button className="btn" onClick={() => void saveName()}>
              {saved ? '✓' : t('common.save')}
            </button>
          </div>
          <p className="mt-1 text-xs text-neutral-500">{profile?.email}</p>
        </div>

        <div>
          <label className="label">{t('profile.language')}</label>
          <div className="flex gap-2">
            <button
              className={`btn ${profile?.language === 'en' ? 'btn-primary' : ''}`}
              onClick={() => void changeLanguage('en')}
            >
              English
            </button>
            <button
              className={`btn ${profile?.language === 'sr' ? 'btn-primary' : ''}`}
              onClick={() => void changeLanguage('sr')}
            >
              Srpski
            </button>
          </div>
        </div>

        <button className="btn w-full" onClick={() => void signOut()}>
          {t('profile.signOut')}
        </button>
      </div>
    </div>
  )
}
