import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { printProgram } from '../../lib/print'
import Comments from '../../components/Comments'
import YouTubeEmbed from '../../components/YouTubeEmbed'
import type { ExerciseLog, Program, ProgramDay, ProgramExercise } from '../../lib/types'

interface FullProgram extends Program {
  program_days: (ProgramDay & { program_exercises: ProgramExercise[] })[]
}

interface SetDraft {
  reps: string
  weight: string
  steps: string
  duration: string
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function num(s: string): number | null {
  if (s.trim() === '') return null
  const n = Number(s.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

export default function MyProgram() {
  const { t } = useTranslation()
  const { session } = useAuth()
  const [programs, setPrograms] = useState<FullProgram[]>([])
  const [programId, setProgramId] = useState<string>('')
  const [dayId, setDayId] = useState<string>('')
  const [logs, setLogs] = useState<ExerciseLog[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!session) return
    const { data } = await supabase
      .from('program_assignments')
      .select('program:programs(*, program_days(*, program_exercises(*)))')
      .eq('client_id', session.user.id)
      .eq('active', true)
    const progs = ((data as { program: FullProgram | null }[] | null) ?? [])
      .map((r) => r.program)
      .filter((p): p is FullProgram => !!p)
    for (const p of progs) {
      p.program_days.sort((a, b) => a.day_index - b.day_index)
      for (const d of p.program_days) d.program_exercises.sort((a, b) => a.order_index - b.order_index)
    }
    setPrograms(progs)
    setLoading(false)
  }, [session])

  useEffect(() => {
    void load()
  }, [load])

  const program = programs.find((p) => p.id === programId) ?? programs[0]
  const day = program?.program_days.find((d) => d.id === dayId) ?? program?.program_days[0]

  const loadLogs = useCallback(async () => {
    if (!session || !day) return
    const exIds = day.program_exercises.map((e) => e.id)
    if (exIds.length === 0) {
      setLogs([])
      return
    }
    const { data } = await supabase
      .from('exercise_logs')
      .select('*')
      .eq('client_id', session.user.id)
      .in('program_exercise_id', exIds)
      .order('date', { ascending: false })
      .order('set_number')
    setLogs((data as ExerciseLog[]) ?? [])
  }, [session, day?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    void loadLogs()
  }, [loadLogs])

  const today = todayStr()

  /** saves one set; returns true when a strength weight beats the all-time best */
  async function saveSet(ex: ProgramExercise, setNumber: number, d: SetDraft): Promise<boolean> {
    if (!session) return false
    const weight = num(d.weight)
    // PR check against everything logged before this save
    const prevBest = logs
      .filter((l) => l.program_exercise_id === ex.id && l.weight != null)
      .filter((l) => !(l.date === today && l.set_number === setNumber))
      .reduce((max, l) => Math.max(max, Number(l.weight)), 0)
    const isPr = ex.kind === 'strength' && weight != null && weight > 0 && weight > prevBest

    await supabase.from('exercise_logs').upsert(
      {
        program_exercise_id: ex.id,
        client_id: session.user.id,
        date: today,
        set_number: setNumber,
        reps: num(d.reps),
        weight,
        steps: num(d.steps),
        duration_min: num(d.duration),
      },
      { onConflict: 'program_exercise_id,client_id,date,set_number' },
    )
    await loadLogs()
    return isPr
  }

  if (loading) return <p>{t('common.loading')}</p>
  if (!program)
    return (
      <div>
        <h1 className="mb-2 text-2xl">{t('program.title')}</h1>
        <p className="text-sm text-neutral-500">{t('program.noProgram')}</p>
      </div>
    )

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-2xl">{t('program.title')}</h1>
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

      {programs.length > 1 && (
        <select
          className="input mb-3 max-w-sm"
          value={program.id}
          onChange={(e) => {
            setProgramId(e.target.value)
            setDayId('')
          }}
        >
          {programs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
      )}

      {program.description && <p className="mb-3 text-sm">{program.description}</p>}

      <div className="mb-4 flex gap-1 overflow-x-auto">
        {program.program_days.map((d, i) => (
          <button
            key={d.id}
            className={`tab ${day?.id === d.id ? 'tab-active' : ''}`}
            onClick={() => setDayId(d.id)}
          >
            {t('program.day')} {i + 1}
            {d.title ? ` · ${d.title}` : ''}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {day?.program_exercises.map((ex) => (
          <ExerciseCard
            key={ex.id}
            exercise={ex}
            logs={logs.filter((l) => l.program_exercise_id === ex.id)}
            today={today}
            clientId={session!.user.id}
            onSave={saveSet}
          />
        ))}
      </div>
    </div>
  )
}

function ExerciseCard({
  exercise: ex,
  logs,
  today,
  clientId,
  onSave,
}: {
  exercise: ProgramExercise
  logs: ExerciseLog[]
  today: string
  clientId: string
  onSave: (ex: ProgramExercise, setNumber: number, draft: SetDraft) => Promise<boolean>
}) {
  const { t } = useTranslation()
  const cardio = ex.kind === 'cardio'
  const todayLogs = logs.filter((l) => l.date === today)
  const targetSets = cardio ? 1 : (ex.target_sets ?? 3)
  const numRows = Math.max(todayLogs.length, targetSets)
  const [draft, setDraft] = useState<Record<number, SetDraft>>({})
  const [extraSets, setExtraSets] = useState(0)
  const [prFlash, setPrFlash] = useState(false)

  const history = useMemo(() => {
    const past = logs.filter((l) => l.date !== today)
    const byDate = new Map<string, ExerciseLog[]>()
    for (const l of past) {
      if (!byDate.has(l.date)) byDate.set(l.date, [])
      byDate.get(l.date)!.push(l)
    }
    return [...byDate.entries()].slice(0, 3)
  }, [logs, today])

  const best = useMemo(
    () => logs.reduce((max, l) => Math.max(max, Number(l.weight ?? 0)), 0),
    [logs],
  )

  const rowValue = (setNo: number): SetDraft => {
    const saved = todayLogs.find((l) => l.set_number === setNo)
    const d = draft[setNo]
    return {
      reps: d?.reps ?? (saved?.reps != null ? String(saved.reps) : ''),
      weight: d?.weight ?? (saved?.weight != null ? String(saved.weight) : ''),
      steps: d?.steps ?? (saved?.steps != null ? String(saved.steps) : ''),
      duration: d?.duration ?? (saved?.duration_min != null ? String(saved.duration_min) : ''),
    }
  }

  async function save(setNo: number) {
    const isPr = await onSave(ex, setNo, rowValue(setNo))
    if (isPr) {
      setPrFlash(true)
      setTimeout(() => setPrFlash(false), 6000)
    }
  }

  const setField = (setNo: number, field: keyof SetDraft, value: string) =>
    setDraft((d) => ({ ...d, [setNo]: { ...rowValue(setNo), [field]: value } }))

  return (
    <div className="card">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg">
          {ex.name}
          {cardio && <span className="badge ml-2">{t('program.cardio')}</span>}
          {prFlash && <span className="ml-2 bg-accent px-2 py-0.5 text-xs font-black text-white">🏆 {t('program.newPr')}</span>}
        </h2>
        <p className="text-xs font-bold text-neutral-500">
          {cardio ? (
            ex.target_reps ?? ''
          ) : (
            <>
              {ex.target_sets ?? '–'} × {ex.target_reps ?? '–'}
              {ex.target_weight ? ` @ ${ex.target_weight}` : ''}
              {ex.rest_seconds ? ` · ${t('program.rest')} ${ex.rest_seconds}s` : ''}
              {best > 0 ? ` · 🏆 ${best} kg` : ''}
            </>
          )}
        </p>
      </div>

      {ex.youtube_url && <YouTubeEmbed url={ex.youtube_url} />}
      {ex.instructions && (
        <p className="mt-2 whitespace-pre-wrap text-sm">
          <span className="font-bold uppercase text-xs tracking-wide">{t('program.instructions')}: </span>
          {ex.instructions}
        </p>
      )}

      <div className="mt-3">
        <p className="label">
          {t('program.logTitle')} — {t('common.today')}
        </p>
        <div className="space-y-1">
          {Array.from({ length: numRows + extraSets }, (_, i) => i + 1).map((setNo) => {
            const v = rowValue(setNo)
            return (
              <div key={setNo} className="flex items-center gap-2">
                <span className="w-14 shrink-0 text-xs font-bold uppercase">
                  {cardio ? t('program.session') : `${t('program.set')} ${setNo}`}
                </span>
                {cardio ? (
                  <>
                    <input
                      className="input"
                      inputMode="numeric"
                      placeholder={`${t('program.duration')} (min)`}
                      value={v.duration}
                      onChange={(e) => setField(setNo, 'duration', e.target.value)}
                      onBlur={() => void save(setNo)}
                    />
                    <input
                      className="input"
                      inputMode="numeric"
                      placeholder={t('progress.steps')}
                      value={v.steps}
                      onChange={(e) => setField(setNo, 'steps', e.target.value)}
                      onBlur={() => void save(setNo)}
                    />
                  </>
                ) : (
                  <>
                    <input
                      className="input"
                      inputMode="numeric"
                      placeholder={t('program.reps')}
                      value={v.reps}
                      onChange={(e) => setField(setNo, 'reps', e.target.value)}
                      onBlur={() => void save(setNo)}
                    />
                    <input
                      className="input"
                      inputMode="decimal"
                      placeholder={`${t('program.weight')} (kg)`}
                      value={v.weight}
                      onChange={(e) => setField(setNo, 'weight', e.target.value)}
                      onBlur={() => void save(setNo)}
                    />
                  </>
                )}
              </div>
            )
          })}
        </div>
        {!cardio && (
          <button className="btn btn-sm mt-2" onClick={() => setExtraSets((n) => n + 1)}>
            + {t('program.addSet')}
          </button>
        )}
      </div>

      {history.length > 0 && (
        <div className="mt-3 border-t border-black pt-2">
          <p className="label">{t('program.history')}</p>
          {history.map(([date, sets]) => (
            <p key={date} className="text-xs font-semibold">
              {new Date(date).toLocaleDateString()}:{' '}
              {sets
                .sort((a, b) => a.set_number - b.set_number)
                .map((s) =>
                  cardio
                    ? `${s.duration_min ?? '–'}min / ${s.steps ?? '–'} ${t('progress.steps').toLowerCase()}`
                    : `${s.reps ?? '–'}×${s.weight ?? '–'}kg`,
                )
                .join(', ')}
            </p>
          ))}
        </div>
      )}

      <Comments
        entityType="program_exercise"
        entityId={ex.id}
        clientId={clientId}
        contextLabel={ex.name}
      />
    </div>
  )
}
