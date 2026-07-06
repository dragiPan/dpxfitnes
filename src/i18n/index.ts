import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './en.json'
import sr from './sr.json'

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    sr: { translation: sr },
  },
  lng: localStorage.getItem('dpx-lang') ?? 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

export function setLanguage(lang: 'en' | 'sr') {
  localStorage.setItem('dpx-lang', lang)
  void i18n.changeLanguage(lang)
}

export default i18n
