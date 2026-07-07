import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { notifyUsers } from '../lib/notify'
import { useAuth } from '../contexts/AuthContext'
import type { BoardPost, Group } from '../lib/types'

export default function Board() {
  const { t } = useTranslation()
  const { session, isCoach } = useAuth()
  const [posts, setPosts] = useState<BoardPost[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [audience, setAudience] = useState<string>('all') // 'all' | group id
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('board_posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    setPosts((data as BoardPost[]) ?? [])
    if (isCoach) {
      const { data: g } = await supabase.from('groups').select('*').order('name')
      setGroups((g as Group[]) ?? [])
    }
  }, [isCoach])

  useEffect(() => {
    void load()
  }, [load])

  const groupName = (id: string | null) =>
    id === null ? t('board.everyone') : (groups.find((g) => g.id === id)?.name ?? '')

  async function publish() {
    if (!session || !title.trim() || !body.trim()) return
    setBusy(true)
    setMsg('')
    try {
      const group_id = audience === 'all' ? null : audience
      const { error } = await supabase.from('board_posts').insert({
        group_id,
        author_id: session.user.id,
        title: title.trim(),
        body: body.trim(),
      })
      if (error) throw error

      // fan out notifications (in-app + email) to the audience
      let recipientIds: string[] = []
      if (group_id) {
        const { data: members } = await supabase
          .from('group_members')
          .select('user_id')
          .eq('group_id', group_id)
        recipientIds = ((members as { user_id: string }[] | null) ?? []).map((m) => m.user_id)
      } else {
        const { data: clients } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'client')
        recipientIds = ((clients as { id: string }[] | null) ?? []).map((c) => c.id)
      }
      await notifyUsers(
        recipientIds.filter((id) => id !== session.user.id),
        { type: 'board', title: title.trim(), body: body.trim().slice(0, 300), link: '/board' },
      )

      setTitle('')
      setBody('')
      setMsg(t('board.published'))
      await load()
    } catch (e) {
      console.error('board publish failed:', e)
      setMsg(t('common.error'))
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: string) {
    if (!confirm(t('common.confirmDelete'))) return
    await supabase.from('board_posts').delete().eq('id', id)
    await load()
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl">{t('board.title')}</h1>

      {isCoach && (
        <div className="card mb-6 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide">{t('board.newPost')}</p>
          <div>
            <label className="label">{t('board.audience')}</label>
            <select className="input" value={audience} onChange={(e) => setAudience(e.target.value)}>
              <option value="all">{t('board.everyone')}</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
          <input
            className="input"
            placeholder={t('board.postTitle')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="input min-h-24"
            placeholder={t('board.postBody')}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <button
            className="btn btn-primary"
            disabled={busy || !title.trim() || !body.trim()}
            onClick={() => void publish()}
          >
            {t('board.publish')}
          </button>
          {msg && <p className="text-xs font-bold">{msg}</p>}
        </div>
      )}

      {posts.length === 0 && <p className="text-sm text-neutral-500">{t('board.noPosts')}</p>}
      <div className="space-y-3">
        {posts.map((p) => (
          <div key={p.id} className="card">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="badge">{groupName(p.group_id)}</span>
                <h2 className="mt-1 text-lg">{p.title}</h2>
              </div>
              {isCoach && (
                <button className="btn btn-sm" onClick={() => void remove(p.id)}>
                  ✕
                </button>
              )}
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm">{p.body}</p>
            <p className="mt-2 text-[10px] font-bold uppercase text-neutral-400">
              {new Date(p.created_at).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
