import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { notifyUsers } from '../lib/notify'
import { useAuth } from '../contexts/AuthContext'
import type { ChatMessage } from '../lib/types'

interface Props {
  /** the client whose thread this is (thread key) */
  clientId: string
  /** display name of the other party, used in the notification */
  senderLabel: string
}

/** One coach↔client conversation. Used by the client Chat page and the coach's Chat tab. */
export default function ChatThread({ clientId, senderLabel }: Props) {
  const { t } = useTranslation()
  const { session, isCoach } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at')
      .limit(300)
    setMessages((data as ChatMessage[]) ?? [])
    // mark messages from the other side as read
    if (session) {
      await supabase
        .from('messages')
        .update({ read: true })
        .eq('client_id', clientId)
        .eq('read', false)
        .neq('sender_id', session.user.id)
    }
  }, [clientId, session])

  useEffect(() => {
    void load()
    // live updates while the thread is open
    const channel = supabase
      .channel(`chat-${clientId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `client_id=eq.${clientId}` },
        () => void load(),
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [clientId, load])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  async function send() {
    if (!body.trim() || !session) return
    setSending(true)
    try {
      const text = body.trim()
      const { error } = await supabase.from('messages').insert({
        client_id: clientId,
        sender_id: session.user.id,
        body: text,
      })
      if (error) throw error
      setBody('')
      await load()

      // notify the other side (in-app + email)
      if (isCoach) {
        await notifyUsers([clientId], {
          type: 'chat',
          title: t('chat.newMessage'),
          body: text.slice(0, 200),
          link: '/chat',
        })
      } else {
        const { data: coaches } = await supabase.rpc('coach_ids')
        await notifyUsers(((coaches as string[] | null) ?? []).map(String), {
          type: 'chat',
          title: `${t('chat.newMessage')}: ${senderLabel}`,
          body: text.slice(0, 200),
          link: `/clients/${clientId}?tab=chat`,
        })
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-col border-2 border-black" style={{ height: '60vh' }}>
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {messages.length === 0 && (
          <p className="text-xs text-neutral-500">{t('chat.empty')}</p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === session?.user.id
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] px-3 py-2 text-sm whitespace-pre-wrap ${
                  mine ? 'bg-black text-white' : 'border-2 border-black'
                }`}
              >
                {m.body}
                <p className={`mt-0.5 text-[9px] font-bold ${mine ? 'text-neutral-400' : 'text-neutral-500'}`}>
                  {new Date(m.created_at).toLocaleString([], {
                    day: 'numeric',
                    month: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
      <div className="flex gap-2 border-t-2 border-black p-2">
        <input
          className="input"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t('chat.placeholder')}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void send()
          }}
        />
        <button className="btn btn-primary shrink-0" disabled={sending || !body.trim()} onClick={() => void send()}>
          {t('common.send')}
        </button>
      </div>
    </div>
  )
}
