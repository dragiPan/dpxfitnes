// Fixed intake questionnaire — question ids map to i18n keys intake.q.<id>
// Answers are stored as jsonb { [id]: string } in intake_responses.

export const INTAKE_QUESTIONS = [
  'goal',
  'experience',
  'training_days',
  'injuries',
  'health',
  'medications',
  'sleep',
  'stress',
  'occupation',
  'diet_restrictions',
  'extra',
] as const

export type IntakeQuestionId = (typeof INTAKE_QUESTIONS)[number]
