import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { setLanguage } from '../i18n'

type Step = 'start' | 'code'

export default function Login() {
  const { t, i18n } = useTranslation()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<Step>('start')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  async function googleSignIn() {
    setError('')
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  }

  async function sendCode() {
    setBusy(true)
    setError('')
    // shouldCreateUser: false keeps the platform invite-only
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false },
    })
    setBusy(false)
    if (err) {
      setError(t('auth.inviteOnly'))
      return
    }
    setInfo(t('auth.codeSent'))
    setStep('code')
  }

  async function verifyCode() {
    setBusy(true)
    setError('')
    const { error: err } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: 'email',
    })
    setBusy(false)
    if (err) setError(t('auth.error'))
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-4xl font-black tracking-tighter">{t('app.name')}</h1>
          <p className="mt-1 text-xs font-bold uppercase tracking-widest text-neutral-500">
            {t('auth.welcome')}
          </p>
        </div>

        <div className="card space-y-4">
          <button className="btn w-full" onClick={() => void googleSignIn()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21.35 11.1H12v2.9h5.3c-.5 2.5-2.6 3.9-5.3 3.9a5.9 5.9 0 1 1 0-11.8c1.5 0 2.8.5 3.9 1.4l2.1-2.1A8.9 8.9 0 0 0 12 3a9 9 0 1 0 0 18c5.2 0 8.9-3.7 8.9-8.9 0-.3 0-.7-.1-1z" />
            </svg>
            {t('auth.signInGoogle')}
          </button>

          <div className="flex items-center gap-3">
            <div className="h-0.5 flex-1 bg-black" />
            <span className="text-xs font-bold uppercase">{t('auth.or')}</span>
            <div className="h-0.5 flex-1 bg-black" />
          </div>

          {step === 'start' ? (
            <div className="space-y-2">
              <label className="label">{t('auth.email')}</label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@email.com"
                autoComplete="email"
              />
              <button
                className="btn btn-primary w-full"
                disabled={busy || !email.includes('@')}
                onClick={() => void sendCode()}
              >
                {t('auth.sendCode')}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {info && <p className="text-xs font-bold">{info}</p>}
              <label className="label">{t('auth.code')}</label>
              <input
                className="input text-center text-xl tracking-[0.5em]"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <button
                className="btn btn-primary w-full"
                disabled={busy || code.trim().length < 6}
                onClick={() => void verifyCode()}
              >
                {t('auth.verifyCode')}
              </button>
            </div>
          )}

          {error && <p className="text-xs font-bold text-black bg-neutral-100 border border-black p-2">{error}</p>}
          <p className="text-[11px] text-neutral-500">{t('auth.inviteOnly')}</p>
        </div>

        <div className="mt-4 flex justify-center gap-2">
          <button
            className={`btn btn-sm ${i18n.language === 'en' ? 'btn-primary' : ''}`}
            onClick={() => setLanguage('en')}
          >
            EN
          </button>
          <button
            className={`btn btn-sm ${i18n.language === 'sr' ? 'btn-primary' : ''}`}
            onClick={() => setLanguage('sr')}
          >
            SR
          </button>
        </div>
      </div>
    </div>
  )
}
