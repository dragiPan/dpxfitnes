import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'
import ChatThread from '../../components/ChatThread'

export default function Chat() {
  const { t } = useTranslation()
  const { session, profile } = useAuth()
  if (!session) return null
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-3 text-2xl">{t('chat.title')}</h1>
      <ChatThread clientId={session.user.id} senderLabel={profile?.full_name || profile?.email || ''} />
    </div>
  )
}
