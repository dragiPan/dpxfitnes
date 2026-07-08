import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { notifyUsers } from '../../lib/notify'
import { printProgram } from '../../lib/print'
import YouTubeEmbed from '../../components/YouTubeEmbed'
import type { LibraryExercise, Profile, Program, ProgramDay, ProgramExercise } from '../../lib/types'

interface FullProgram extends Program {
  program_days: (ProgramDay & { program_exercises: ProgramExercise[] })[]
}

export default function ProgramBuilder() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const [program, setProgram] = useState<FullProgram | null>(null)
  const [clients, setClients] = useState<Profile[]>([])
  const [library, setLibrary] = useState<LibraryExercise[]>([])
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
    void supabase
      .from('exercise_library')
      .select('*')
      .order('name')
      .then(({ data }) => setLibrary((data as LibraryExercise[]) ?? []))
  }, [load])

  async function addFromLibrary(dayId: string, count: number, libId: string) {
    const item = library.find((l) => l.id === libId)
    if (!item) return
    await supabase.from('program_exercises').insert({
      program_day_id: dayId,
      order_index: count,
      name: item.name,
      kind: item.kind,
      instructions: item.instructions,
      youtube_url: item.youtube_url,
      target_sets: item.target_sets,
      target_reps: item.target_reps,
      target_weight: item.target_weight,
      target_rpe: item.target_rpe,
      target_minutes: item.target_minutes,
      target_zone: item.target_zone,
      rest_seconds: item.rest_seconds,
    })
    await load()
  }

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
      <div className="flex items-center justify-between">
        <Link to="/programs" className="text-xs font-bold uppercase hover:underline">
          ← {t('common.back')}
        </Link>
        <button
          className="btn btn-sm"
          onClick={() =>
            printProgram(program, {
              day: t('program.day'),
              exercise: t('coach.programs.exName'),
              sets: t('program.sets'),
              reps: t('program.reps'),
              weight: t('program.weight'),
              rest: t('program.rest'),
              video: t('program.video'),
            })
          }
        >
          🖨 {t('common.exportPdf')}
        </button>
      </div>

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
                onBlur={async (e) => {
                  await supabase.from('program_days').update({ title: e.target.value }).eq('id', day.id)
                }}
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

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                className="btn btn-sm"
                onClick={() => void addExercise(day.id, day.program_exercises.length)}
              >
                + {t('coach.programs.addExercise')}
              </button>
              {library.length > 0 && (
                <select
                  className="input max-w-64 py-1.5 text-xs"
                  value=""
                  onChange={(e) => void addFromLibrary(day.id, day.program_exercises.length, e.target.value)}
                >
                  <option value="">+ {t('coach.library.addFrom')}…</option>
                  {library.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
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
  const [kind, setKind] = useState(ex.kind)
  const [savedToLib, setSavedToLib] = useState(false)

  const NUMERIC_FIELDS: (keyof ProgramExercise)[] = [
    'target_sets',
    'rest_seconds',
    'target_minutes',
    'target_zone',
    'target_rpe',
  ]

  async function save(field: keyof ProgramExercise, raw: string) {
    let value: string | number | null = raw
    if (NUMERIC_FIELDS.includes(field)) {
      value = raw.trim() === '' ? null : Number(raw.replace(',', '.'))
    } else if (raw.trim() === '') {
      value = null
    }
    await supabase.from('program_exercises').update({ [field]: value }).eq('id', ex.id)
  }

  async function changeKind(next: 'strength' | 'cardio') {
    setKind(next)
    await supabase.from('program_exercises').update({ kind: next }).eq('id', ex.id)
  }

  async function saveToLibrary() {
    // read the current row so unblurred edits are not lost
    const { data } = await supabase.from('program_exercises').select('*').eq('id', ex.id).single()
    const row = (data as ProgramExercise | null) ?? ex
    await supabase.from('exercise_library').insert({
      name: row.name,
      kind: row.kind,
      youtube_url: row.youtube_url,
      instructions: row.instructions,
      target_sets: row.target_sets,
      target_reps: row.target_reps,
      target_weight: row.target_weight,
      target_rpe: row.target_rpe,
      target_minutes: row.target_minutes,
      target_zone: row.target_zone,
      rest_seconds: row.rest_seconds,
    })
    setSavedToLib(true)
    setTimeout(() => setSavedToLib(false), 2500)
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
        <select
          className="input max-w-32 shrink-0"
          value={kind}
          onChange={(e) => void changeKind(e.target.value as 'strength' | 'cardio')}
        >
          <option value="strength">{t('program.strength')}</option>
          <option value="cardio">{t('program.cardio')}</option>
        </select>
        <button className="btn btn-sm shrink-0" title={t('coach.library.saveTo')} onClick={() => void saveToLibrary()}>
          {savedToLib ? '✓' : '📚'}
        </button>
        <button className="btn btn-sm shrink-0" onClick={() => void remove()}>
          ✕
        </button>
      </div>

      {kind === 'cardio' ? (
        // cardio is prescribed as zone + minutes — no sets/reps/weight/rest
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label">{t('cardio.zone')}</label>
            <select
              className="input"
              defaultValue={ex.target_zone ?? ''}
              onChange={(e) => void save('target_zone', e.target.value)}
            >
              <option value="">–</option>
              <option value="1">Z1</option>
              <option value="2">Z2</option>
              <option value="3">Z3</option>
            </select>
          </div>
          <div>
            <label className="label">{t('cardio.minutes')}</label>
            <input
              className="input"
              inputMode="numeric"
              defaultValue={ex.target_minutes ?? ''}
              placeholder="30"
              onBlur={(e) => void save('target_minutes', e.target.value)}
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
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
              placeholder="60kg"
              onBlur={(e) => void save('target_weight', e.target.value)}
            />
          </div>
          <div>
            <label className="label">{t('program.rpe')}</label>
            <input
              className="input"
              inputMode="decimal"
              defaultValue={ex.target_rpe ?? ''}
              placeholder="5-10"
              onBlur={(e) => void save('target_rpe', e.target.value)}
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
      )}

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
