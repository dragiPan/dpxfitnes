import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../../lib/supabase'
import { notifyUsers } from '../../../lib/notify'
import type { ExerciseLog, Profile, Program, ProgramAssignment } from '../../../lib/types'

interface AssignmentRow extends ProgramAssignment {
  program: Program
}

interface LogRow extends ExerciseLog {
  exercise: { name: string } | null
}

export default function ProgramTab({ client }: { client: Profile }) {
  const { t } = useTranslation()
  const [assignments, setAssignments] = useState<AssignmentRow[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [logs, setLogs] = useState<LogRow[]>([])
  const [assignId, setAssignId] = useState('')
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    const [{ data: a }, { data: p }, { data: l }] = await Promise.all([
      supabase
        .from('program_assignments')
        .select('*, program:programs(*)')
        .eq('client_id', client.id)
        .order('assigned_at', { ascending: false }),
      supabase.from('programs').select('*').order('title'),
      supabase
        .from('exercise_logs')
        .select('*, exercise:program_exercises(name)')
        .eq('client_id', client.id)
        .order('date', { ascending: false })
        .order('set_number')
        .limit(120),
    ])
    setAssignments((a as AssignmentRow[]) ?? [])
    setPrograms((p as Program[]) ?? [])
    setLogs((l as LogRow[]) ?? [])
  }, [client.id])

  useEffect(() => {
    void load()
  }, [load])

  async function assign() {
    if (!assignId) return
    setMsg('')
    const program = programs.find((p) => p.id === assignId)
    const { error } = await supabase
      .from('program_assignments')
      .upsert({ program_id: assignId, client_id: client.id, active: true }, { onConflict: 'program_id,client_id' })
    if (error) {
      setMsg(t('common.error'))
      return
    }
    await notifyUsers([client.id], {
      type: 'program',
      title: `${t('program.title')}: ${program?.title ?? ''}`,
      link: '/program',
    })
    setMsg(t('coach.programTab.assignedMsg'))
    await load()
  }

  async function toggleActive(a: AssignmentRow) {
    await supabase.from('program_assignments').update({ active: !a.active }).eq('id', a.id)
    await load()
  }

  // group logs by date for readability
  const dates = [...new Set(logs.map((l) => l.date))]

  return (
    <div className="space-y-4">
      <div className="card">
        <p className="label">{t('coach.programTab.assign')}</p>
        <div className="flex flex-wrap gap-2">
          <select className="input max-w-72" value={assignId} onChange={(e) => setAssignId(e.target.value)}>
            <option value="">…</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
          <button className="btn" disabled={!assignId} onClick={() => void assign()}>
            {t('coach.programTab.assign')}
          </button>
        </div>
        {msg && <p className="mt-1 text-xs font-bold">{msg}</p>}
      </div>

      <div className="card">
        <p className="label">{t('coach.programTab.assigned')}</p>
        {assignments.length === 0 && (
          <p className="text-sm text-neutral-500">{t('coach.programTab.none')}</p>
        )}
        <div className="space-y-1">
          {assignments.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-2 border border-black px-2 py-1.5">
              <Link to={`/programs/${a.program_id}`} className="text-sm font-black hover:underline">
                {a.program?.title}
              </Link>
              <button className={`btn btn-sm ${a.active ? 'btn-primary' : ''}`} onClick={() => void toggleActive(a)}>
                {a.active ? t('coach.programTab.active') : t('coach.programTab.inactive')}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <p className="label">{t('coach.programTab.logs')}</p>
        {logs.length === 0 && <p className="text-sm text-neutral-500">{t('coach.programTab.noLogs')}</p>}
        <div className="space-y-2">
          {dates.map((date) => (
            <div key={date}>
              <p className="text-xs font-black uppercase">{new Date(date).toLocaleDateString()}</p>
              {(() => {
                const dayLogs = logs.filter((l) => l.date === date)
                const exNames = [...new Set(dayLogs.map((l) => l.exercise?.name ?? '?'))]
                return exNames.map((name) => (
                  <p key={name} className="ml-2 text-sm">
                    <span className="font-bold">{name}:</span>{' '}
                    {dayLogs
                      .filter((l) => (l.exercise?.name ?? '?') === name)
                      .map((l) => `${l.reps ?? '–'}×${l.weight ?? '–'}kg`)
                      .join(', ')}
                  </p>
                ))
              })()}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
