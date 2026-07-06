import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { notifyUsers } from '../lib/notify'
import { useAuth } from '../contexts/AuthContext'
import type { Comment, CommentEntityType } from '../lib/types'

interface Props {
  entityType: CommentEntityType
  entityId: string
  /** the client whose context this thread belongs to */
  clientId: string
  /** shown in the notification the other side receives */
  contextLabel: string
}

export default function Comments({ entityType, entityId, clientId, contextLabel }: Props) {
  const { t } = useTranslation()
  const { session, isCoach } = useAuth()
  const [comments, setComments] = useState<Comment[]>([])
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('comments')
      .select('*, author:profiles!comments_author_id_fkey(full_name, role)')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: true })
    setComments((data as Comment[]) ?? [])
  }, [entityType, entityId])

  useEffect(() => {
    void load()
  }, [load])

  async function submit() {
    if (!body.trim() || !session) return
    setSending(true)
    try {
      const { error } = await supabase.from('comments').insert({
        entity_type: entityType,
        entity_id: entityId,
        client_id: clientId,
        author_id: session.user.id,
        body: body.trim(),
      })
      if (error) throw error
      setBody('')
      await load()

      // notify the other side of the conversation
      if (isCoach) {
        await notifyUsers([clientId], {
          type: 'comment',
          title: `${t('comments.coach')}: ${contextLabel}`,
          body: body.trim().slice(0, 200),
        })
      } else {
        const { data: coaches } = await supabase.rpc('coach_ids')
        const ids = ((coaches as string[] | null) ?? []).map(String)
        await notifyUsers(ids, {
          type: 'comment',
          title: contextLabel,
          body: body.trim().slice(0, 200),
        })
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="mt-3 border-t-2 border-black pt-3">
      <p className="text-xs font-bold uppercase tracking-wide mb-2">{t('comments.title')}</p>
      {comments.length === 0 && (
        <p className="text-xs text-neutral-500 mb-2">{t('comments.empty')}</p>
      )}
      <div className="space-y-2 mb-2">
        {comments.map((c) => (
          <div key={c.id} className="border border-black p-2">
            <p className="text-[10px] font-bold uppercase tracking-wide">
              {c.author?.role === 'coach' ? t('comments.coach') : (c.author?.full_name ?? '')}
              <span className="text-neutral-400 font-normal normal-case">
                {' '}
                · {new Date(c.created_at).toLocaleDateString()}
              </span>
            </p>
            <p className="text-sm whitespace-pre-wrap">{c.body}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="input"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t('comments.placeholder')}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void submit()
          }}
        />
        <button className="btn btn-primary" disabled={sending || !body.trim()} onClick={() => void submit()}>
          {t('common.send')}
        </button>
      </div>
    </div>
  )
}
