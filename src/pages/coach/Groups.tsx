import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import type { Group, Profile } from '../../lib/types'

interface FullGroup extends Group {
  group_members: { user_id: string }[]
}

export default function Groups() {
  const { t } = useTranslation()
  const [groups, setGroups] = useState<FullGroup[]>([])
  const [clients, setClients] = useState<Profile[]>([])
  const [newName, setNewName] = useState('')

  const load = useCallback(async () => {
    const [{ data: g }, { data: c }] = await Promise.all([
      supabase.from('groups').select('*, group_members(user_id)').order('name'),
      supabase.from('profiles').select('*').eq('role', 'client').order('full_name'),
    ])
    setGroups((g as FullGroup[]) ?? [])
    setClients((c as Profile[]) ?? [])
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function createGroup() {
    if (!newName.trim()) return
    await supabase.from('groups').insert({ name: newName.trim() })
    setNewName('')
    await load()
  }

  async function removeGroup(id: string) {
    if (!confirm(t('common.confirmDelete'))) return
    await supabase.from('groups').delete().eq('id', id)
    await load()
  }

  async function addMember(groupId: string, userId: string) {
    if (!userId) return
    await supabase.from('group_members').upsert({ group_id: groupId, user_id: userId })
    await load()
  }

  async function removeMember(groupId: string, userId: string) {
    await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', userId)
    await load()
  }

  const clientName = (id: string) => {
    const c = clients.find((x) => x.id === id)
    return c ? c.full_name || c.email : '?'
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl">{t('coach.groups.title')}</h1>

      <div className="card mb-6 flex gap-2">
        <input
          className="input"
          placeholder={t('coach.groups.new')}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button className="btn btn-primary shrink-0" disabled={!newName.trim()} onClick={() => void createGroup()}>
          + {t('common.add')}
        </button>
      </div>

      {groups.length === 0 && <p className="text-sm text-neutral-500">{t('coach.groups.empty')}</p>}

      <div className="space-y-4">
        {groups.map((g) => (
          <div key={g.id} className="card">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-lg">{g.name}</h2>
              <button className="btn btn-sm" onClick={() => void removeGroup(g.id)}>
                ✕
              </button>
            </div>

            <p className="label">
              {t('coach.groups.members')} ({g.group_members.length})
            </p>
            <div className="mb-2 flex flex-wrap gap-1">
              {g.group_members.map((m) => (
                <span key={m.user_id} className="badge inline-flex items-center gap-1">
                  {clientName(m.user_id)}
                  <button
                    className="font-black hover:text-neutral-500"
                    onClick={() => void removeMember(g.id, m.user_id)}
                    title={t('coach.groups.remove')}
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>

            <select
              className="input max-w-64"
              value=""
              onChange={(e) => void addMember(g.id, e.target.value)}
            >
              <option value="">+ {t('coach.groups.addMember')}…</option>
              {clients
                .filter((c) => !g.group_members.some((m) => m.user_id === c.id))
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name || c.email}
                  </option>
                ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  )
}
