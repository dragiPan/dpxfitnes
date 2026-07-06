import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { notifyUsers } from '../../lib/notify'
import YouTubeEmbed from '../../components/YouTubeEmbed'
import type { Profile, Program, ProgramDay, ProgramExercise } from '../../lib/types'

interface FullProgram extends Program {
  program_days: (ProgramDay & { program_exercises: ProgramExercise[] })[]
}

export default function ProgramBuilder() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const [program, setProgram] = useState<FullProgram | null>(null)
  const [clients, setClients] = useState<Profile[]>([])
  const [assignTo, setAssignTo] = useState('')
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    if (!id) return
    const { data } = await supabase
      .from('programs')
      .select('*, program_days(*, program_exercises(*))')
      .eq('id', id)
      .single()
    if (data) {
      const p = data as FullProgram
      p.program_days.sort((a, b) => a.day_index - b.day_index)
      for (const d of p.program_days) d.program_exercises.sort((a, b) => a.order_index - b.order_index)
      setProgram(p)
    }
  }, [id])

  useEffect(() => {
    void load()
    void supabase
      .from('profiles')
      .select('*')
      .eq('role', 'client')
      .order('full_name')
      .then(({ data }) => setClients((data as Profile[]) ?? []))
  }, [load])

  async function saveProgramField(field: 'title' | 'description', value: string) {
    if (!id) return
    await supabase.from('programs').update({ [field]: value, updated_at: new Date().toISOString() }).eq('id', id)
  }

  async function addDay() {
    if (!program) return
    await supabase.from('program_days').insert({
      program_id: program.id,
      day_index: program.program_days.length,
      title: '',
    })
    await load()
  }

  async function deleteDay(dayId: string) {
    if (!confirm(t('common.confirmDelete'))) return
    await supabase.from('program_days').delete().eq('id', dayId)
    await load()
  }

  async function addExercise(dayId: string, count: number) {
    await supabase.from('program_exercises').insert({
      program_day_id: dayId,
      order_index: count,
      name: '',
    })
    await load()
  }

  async function assign() {
    if (!program || !assignTo) return
    setMsg('')
    const { error } = await supabase
      .from('program_assignments')
      .upsert(
        { program_id: program.id, client_id: assignTo, active: true },
        { onConflict: 'program_id,client_id' },
      )
    if (error) {
      setMsg(t('common.error'))
      return
    }
    await notifyUsers([assignTo], {
      type: 'program',
      title: `${t('program.title')}: ${program.title}`,
      body: program.description ?? '',
      link: '/program',
    })
    setMsg(t('coach.programTab.assignedMsg'))
  }

  if (!program) return <p>{t('common.loading')}</p>

  return (
    <div>
      <Link to="/programs" className="text-xs font-bold uppercase hover:underline">
        ← {t('common.back')}
      </Link>

      <div className="card my-3 space-y-2">
        <input
          className="input text-lg font-black"
          defaultValue={program.title}
          onBlur={(e) => void saveProgramField('title', e.target.value)}
          placeholder={t('common.title')}
        />
        <textarea
          className="input"
          defaultValue={program.description ?? ''}
          onBlur={(e) => void saveProgramField('description', e.target.value)}
          placeholder={t('common.description')}
        />
        <div className="flex flex-wrap items-center gap-2">
          <select className="input max-w-64" value={assignTo} onChange={(e) => setAssignTo(e.target.value)}>
            <option value="">{t('coach.programs.assignTo')}…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name || c.email}
              </option>
            ))}
          </select>
          <button className="btn" disabled={!assignTo} onClick={() => void assign()}>
            {t('coach.programs.assignTo')}
          </button>
          {msg && <span className="text-xs font-bold">{msg}</span>}
        </div>
      </div>

      <div className="space-y-4">
        {program.program_days.map((day, i) => (
          <div key={day.id} className="card">
            <div className="mb-2 flex items-center gap-2">
              <span className="badge shrink-0">
                {t('program.day')} {i + 1}
              </span>
              <input
                className="input"
                defaultValue={day.title}
                placeholder={t('coach.programs.dayTitle')}
                onBlur={(e) => void supabase.from('program_days').update({ title: e.target.value }).eq('id', day.id)}
              />
              <button className="btn btn-sm shrink-0" onClick={() => void deleteDay(day.id)}>
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {day.program_exercises.map((ex) => (
                <ExerciseEditor key={ex.id} exercise={ex} onChanged={load} />
              ))}
            </div>

            <button
              className="btn btn-sm mt-3"
              onClick={() => void addExercise(day.id, day.program_exercises.length)}
            >
              + {t('coach.programs.addExercise')}
            </button>
          </div>
        ))}
      </div>

      <button className="btn btn-primary mt-4" onClick={() => void addDay()}>
        + {t('coach.programs.addDay')}
      </button>
    </div>
  )
}

function ExerciseEditor({
  exercise: ex,
  onChanged,
}: {
  exercise: ProgramExercise
  onChanged: () => Promise<void>
}) {
  const { t } = useTranslation()
  const [preview, setPreview] = useState(false)

  async function save(field: keyof ProgramExercise, raw: string) {
    let value: string | number | null = raw
    if (field === 'target_sets' || field === 'rest_seconds') {
      value = raw.trim() === '' ? null : Number(raw)
    } else if (raw.trim() === '') {
      value = null
    }
    await supabase.from('program_exercises').update({ [field]: value }).eq('id', ex.id)
  }

  async function remove() {
    if (!confirm(t('common.confirmDelete'))) return
    await supabase.from('program_exercises').delete().eq('id', ex.id)
    await onChanged()
  }

  return (
    <div className="border-2 border-black p-3">
      <div className="mb-2 flex items-center gap-2">
        <input
          className="input font-black"
          defaultValue={ex.name}
          placeholder={t('coach.programs.exName')}
          onBlur={(e) => void save('name', e.target.value)}
        />
        <button className="btn btn-sm shrink-0" onClick={() => void remove()}>
          ✕
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div>
          <label className="label">{t('program.sets')}</label>
          <input
            className="input"
            inputMode="numeric"
            defaultValue={ex.target_sets ?? ''}
            onBlur={(e) => void save('target_sets', e.target.value)}
          />
        </div>
        <div>
          <label className="label">{t('program.reps')}</label>
          <input
            className="input"
            defaultValue={ex.target_reps ?? ''}
            placeholder="8-12"
            onBlur={(e) => void save('target_reps', e.target.value)}
          />
        </div>
        <div>
          <label className="label">{t('program.weight')}</label>
          <input
            className="input"
            defaultValue={ex.target_weight ?? ''}
            placeholder="60kg / RPE 8"
            onBlur={(e) => void save('target_weight', e.target.value)}
          />
        </div>
        <div>
          <label className="label">{t('coach.programs.restSec')}</label>
          <input
            className="input"
            inputMode="numeric"
            defaultValue={ex.rest_seconds ?? ''}
            onBlur={(e) => void save('rest_seconds', e.target.value)}
          />
        </div>
      </div>

      <div className="mt-2">
        <label className="label">{t('coach.programs.youtube')}</label>
        <div className="flex gap-2">
          <input
            className="input"
            defaultValue={ex.youtube_url ?? ''}
            placeholder="https://youtube.com/watch?v=…"
            onBlur={(e) => void save('youtube_url', e.target.value)}
          />
          <button className="btn btn-sm shrink-0" onClick={() => setPreview((p) => !p)}>
            {t('program.video')}
          </button>
        </div>
        {preview && <div className="mt-2"><YouTubeEmbed url={ex.youtube_url} /></div>}
      </div>

      <div className="mt-2">
        <label className="label">{t('program.instructions')}</label>
        <textarea
          className="input min-h-16"
          defaultValue={ex.instructions ?? ''}
          onBlur={(e) => void save('instructions', e.target.value)}
        />
      </div>
    </div>
  )
}
