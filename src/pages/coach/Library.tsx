import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import YouTubeEmbed from '../../components/YouTubeEmbed'
import type { LibraryExercise } from '../../lib/types'

export default function Library() {
  const { t } = useTranslation()
  const [items, setItems] = useState<LibraryExercise[]>([])
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    const { data } = await supabase.from('exercise_library').select('*').order('name')
    setItems((data as LibraryExercise[]) ?? [])
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function add() {
    await supabase.from('exercise_library').insert({ name: t('coach.library.newName') })
    await load()
  }

  async function remove(id: string) {
    if (!confirm(t('common.confirmDelete'))) return
    await supabase.from('exercise_library').delete().eq('id', id)
    await load()
  }

  const filtered = items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h1 className="text-2xl">{t('coach.library.title')}</h1>
        <button className="btn btn-primary" onClick={() => void add()}>
          + {t('common.add')}
        </button>
      </div>
      <p className="mb-3 text-sm text-neutral-500">{t('coach.library.hint')}</p>
      <input
        className="input mb-4 max-w-sm"
        placeholder={t('coach.library.search')}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {filtered.length === 0 && <p className="text-sm text-neutral-500">{t('coach.library.empty')}</p>}

      <div className="space-y-3">
        {filtered.map((item) => (
          <LibraryEditor key={item.id} item={item} onDelete={() => void remove(item.id)} />
        ))}
      </div>
    </div>
  )
}

function LibraryEditor({ item, onDelete }: { item: LibraryExercise; onDelete: () => void }) {
  const { t } = useTranslation()
  const [preview, setPreview] = useState(false)
  const [kind, setKind] = useState(item.kind)

  async function save(field: keyof LibraryExercise, raw: string) {
    let value: string | number | null = raw
    if (field === 'target_sets' || field === 'rest_seconds') {
      value = raw.trim() === '' ? null : Number(raw)
    } else if (raw.trim() === '') {
      value = null
    }
    await supabase.from('exercise_library').update({ [field]: value }).eq('id', item.id)
  }

  async function changeKind(next: 'strength' | 'cardio') {
    setKind(next)
    await supabase.from('exercise_library').update({ kind: next }).eq('id', item.id)
  }

  return (
    <div className="card">
      <div className="mb-2 flex items-center gap-2">
        <input
          className="input font-black"
          defaultValue={item.name}
          onBlur={(e) => void save('name', e.target.value)}
        />
        <select
          className="input max-w-32 shrink-0"
          value={kind}
          onChange={(e) => void changeKind(e.target.value as 'strength' | 'cardio')}
        >
          <option value="strength">{t('program.strength')}</option>
          <option value="cardio">{t('program.cardio')}</option>
        </select>
        <button className="btn btn-sm shrink-0" onClick={onDelete}>
          ✕
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div>
          <label className="label">{t('program.sets')}</label>
          <input className="input" inputMode="numeric" defaultValue={item.target_sets ?? ''} onBlur={(e) => void save('target_sets', e.target.value)} />
        </div>
        <div>
          <label className="label">{t('program.reps')}</label>
          <input className="input" defaultValue={item.target_reps ?? ''} placeholder="8-12" onBlur={(e) => void save('target_reps', e.target.value)} />
        </div>
        <div>
          <label className="label">{t('program.weight')}</label>
          <input className="input" defaultValue={item.target_weight ?? ''} onBlur={(e) => void save('target_weight', e.target.value)} />
        </div>
        <div>
          <label className="label">{t('coach.programs.restSec')}</label>
          <input className="input" inputMode="numeric" defaultValue={item.rest_seconds ?? ''} onBlur={(e) => void save('rest_seconds', e.target.value)} />
        </div>
      </div>

      <div className="mt-2">
        <label className="label">{t('coach.programs.youtube')}</label>
        <div className="flex gap-2">
          <input className="input" defaultValue={item.youtube_url ?? ''} onBlur={(e) => void save('youtube_url', e.target.value)} />
          <button className="btn btn-sm shrink-0" onClick={() => setPreview((p) => !p)}>
            {t('program.video')}
          </button>
        </div>
        {preview && <div className="mt-2"><YouTubeEmbed url={item.youtube_url} /></div>}
      </div>

      <div className="mt-2">
        <label className="label">{t('program.instructions')}</label>
        <textarea className="input min-h-14" defaultValue={item.instructions ?? ''} onBlur={(e) => void save('instructions', e.target.value)} />
      </div>
    </div>
  )
}
