import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import type { Program, ProgramDay, ProgramExercise } from '../../lib/types'

interface ProgramRow extends Program {
  program_days: { id: string }[]
}

export default function Programs() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [programs, setPrograms] = useState<ProgramRow[]>([])
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('programs')
      .select('*, program_days(id)')
      .order('created_at', { ascending: false })
    setPrograms((data as ProgramRow[]) ?? [])
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function createProgram() {
    const { data, error } = await supabase
      .from('programs')
      .insert({ title: t('coach.programs.new') })
      .select()
      .single()
    if (!error && data) navigate(`/programs/${(data as Program).id}`)
  }

  async function duplicate(id: string) {
    setMsg('')
    // deep copy: program -> days -> exercises
    const { data: src } = await supabase
      .from('programs')
      .select('*, program_days(*, program_exercises(*))')
      .eq('id', id)
      .single()
    if (!src) return
    const program = src as Program & {
      program_days: (ProgramDay & { program_exercises: ProgramExercise[] })[]
    }
    const { data: newProg, error } = await supabase
      .from('programs')
      .insert({ title: `${program.title} (copy)`, description: program.description })
      .select()
      .single()
    if (error || !newProg) return
    for (const day of program.program_days) {
      const { data: newDay } = await supabase
        .from('program_days')
        .insert({ program_id: (newProg as Program).id, day_index: day.day_index, title: day.title })
        .select()
        .single()
      if (!newDay) continue
      const exercises = day.program_exercises.map((ex) => ({
        program_day_id: (newDay as ProgramDay).id,
        order_index: ex.order_index,
        name: ex.name,
        instructions: ex.instructions,
        youtube_url: ex.youtube_url,
        target_sets: ex.target_sets,
        target_reps: ex.target_reps,
        target_weight: ex.target_weight,
        rest_seconds: ex.rest_seconds,
      }))
      if (exercises.length > 0) await supabase.from('program_exercises').insert(exercises)
    }
    setMsg(t('coach.programs.duplicated'))
    await load()
  }

  async function remove(id: string) {
    if (!confirm(t('common.confirmDelete'))) return
    await supabase.from('programs').delete().eq('id', id)
    await load()
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl">{t('coach.programs.title')}</h1>
        <button className="btn btn-primary" onClick={() => void createProgram()}>
          + {t('coach.programs.new')}
        </button>
      </div>
      {msg && <p className="mb-2 text-xs font-bold">{msg}</p>}
      {programs.length === 0 && (
        <p className="text-sm text-neutral-500">{t('coach.programs.empty')}</p>
      )}
      <div className="space-y-2">
        {programs.map((p) => (
          <div key={p.id} className="card flex flex-wrap items-center justify-between gap-2">
            <div>
              <Link to={`/programs/${p.id}`} className="font-black hover:underline">
                {p.title}
              </Link>
              <p className="text-xs text-neutral-500">
                {p.program_days.length} {t('coach.programs.days')}
              </p>
            </div>
            <div className="flex gap-1">
              <Link to={`/programs/${p.id}`} className="btn btn-sm">
                {t('common.edit')}
              </Link>
              <button className="btn btn-sm" onClick={() => void duplicate(p.id)}>
                {t('common.duplicate')}
              </button>
              <button className="btn btn-sm" onClick={() => void remove(p.id)}>
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
