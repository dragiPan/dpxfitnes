import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'
import ProgressCharts from '../../components/ProgressCharts'

export default function Progress() {
  const { t } = useTranslation()
  const { session } = useAuth()
  if (!session) return null
  return (
    <div>
      <h1 className="mb-4 text-2xl">{t('progress.title')}</h1>
      <ProgressCharts userId={session.user.id} />
    </div>
  )
}
