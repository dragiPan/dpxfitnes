// Print/PDF export: opens a clean black & white document in a new window and
// triggers the browser print dialog ("Save as PDF" gives clients a file).

const BASE_CSS = `
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #000; margin: 24px; }
  h1 { font-size: 22px; letter-spacing: -1px; margin: 0 0 2px; }
  h2 { font-size: 15px; border-bottom: 2px solid #000; padding-bottom: 3px; margin: 18px 0 8px; text-transform: uppercase; }
  .brand { font-size: 11px; font-weight: bold; letter-spacing: 2px; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  th, td { border: 1px solid #000; padding: 5px 7px; font-size: 12px; text-align: left; vertical-align: top; }
  th { background: #000; color: #fff; text-transform: uppercase; font-size: 10px; }
  .notes { font-size: 12px; white-space: pre-wrap; }
  .muted { color: #555; font-size: 11px; }
`

function esc(s: string | null | undefined): string {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function openAndPrint(title: string, bodyHtml: string) {
  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>${BASE_CSS}</style></head><body>` +
      `<p class="brand">DPXFITNES</p>${bodyHtml}</body></html>`,
  )
  w.document.close()
  w.focus()
  setTimeout(() => w.print(), 300)
}

interface PrintExercise {
  name: string
  kind?: string
  target_sets: number | null
  target_reps: string | null
  target_weight: string | null
  target_rpe?: number | null
  target_minutes?: number | null
  target_zone?: number | null
  rest_seconds: number | null
  instructions: string | null
  youtube_url: string | null
}

interface PrintDay {
  title: string
  program_exercises: PrintExercise[]
}

export function printProgram(
  program: { title: string; description: string | null; program_days: PrintDay[] },
  labels: { day: string; exercise: string; sets: string; reps: string; weight: string; rest: string; video: string },
) {
  let html = `<h1>${esc(program.title)}</h1>`
  if (program.description) html += `<p class="notes">${esc(program.description)}</p>`
  program.program_days.forEach((day, i) => {
    html += `<h2>${esc(labels.day)} ${i + 1}${day.title ? ` — ${esc(day.title)}` : ''}</h2>`
    html += `<table><tr><th>${esc(labels.exercise)}</th><th>${esc(labels.sets)}</th><th>${esc(labels.reps)}</th><th>${esc(labels.weight)}</th><th>${esc(labels.rest)}</th></tr>`
    for (const ex of day.program_exercises) {
      const cardio = ex.kind === 'cardio'
      const setsCell = cardio ? (ex.target_zone ? `Z${ex.target_zone}` : '') : String(ex.target_sets ?? '')
      const repsCell = cardio
        ? ex.target_minutes
          ? `${ex.target_minutes} min`
          : esc(ex.target_reps)
        : esc(ex.target_reps)
      const weightCell = cardio
        ? ''
        : `${esc(ex.target_weight)}${ex.target_rpe ? ` RPE ${ex.target_rpe}` : ''}`
      html += `<tr><td><b>${esc(ex.name)}</b>${
        ex.instructions ? `<br><span class="muted">${esc(ex.instructions)}</span>` : ''
      }${ex.youtube_url ? `<br><span class="muted">${esc(labels.video)}: ${esc(ex.youtube_url)}</span>` : ''}</td>` +
        `<td>${setsCell}</td><td>${repsCell}</td><td>${weightCell}</td>` +
        `<td>${!cardio && ex.rest_seconds ? `${ex.rest_seconds}s` : ''}</td></tr>`
    }
    html += `</table>`
  })
  openAndPrint(program.title, html)
}

interface PrintMeal {
  name: string
  time_hint: string | null
  description: string | null
  calories: number | null
  protein: number | null
  carbs: number | null
  fat: number | null
}

export function printMealPlan(
  plan: { title: string; notes: string | null; meal_plan_meals: PrintMeal[] },
  labels: { meal: string; time: string; calories: string; protein: string; carbs: string; fat: string; totals: string },
) {
  let html = `<h1>${esc(plan.title)}</h1>`
  if (plan.notes) html += `<p class="notes">${esc(plan.notes)}</p>`
  html += `<table><tr><th>${esc(labels.meal)}</th><th>${esc(labels.time)}</th><th>${esc(labels.calories)}</th><th>${esc(labels.protein)}</th><th>${esc(labels.carbs)}</th><th>${esc(labels.fat)}</th></tr>`
  const tot = { calories: 0, protein: 0, carbs: 0, fat: 0 }
  for (const m of plan.meal_plan_meals) {
    tot.calories += m.calories ?? 0
    tot.protein += m.protein ?? 0
    tot.carbs += m.carbs ?? 0
    tot.fat += m.fat ?? 0
    html += `<tr><td><b>${esc(m.name)}</b>${
      m.description ? `<br><span class="muted">${esc(m.description)}</span>` : ''
    }</td><td>${esc(m.time_hint)}</td><td>${m.calories ?? ''}</td><td>${m.protein ?? ''}</td><td>${m.carbs ?? ''}</td><td>${m.fat ?? ''}</td></tr>`
  }
  html += `<tr><th>${esc(labels.totals)}</th><th></th><th>${tot.calories}</th><th>${tot.protein}</th><th>${tot.carbs}</th><th>${tot.fat}</th></tr></table>`
  openAndPrint(plan.title, html)
}
