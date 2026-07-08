// The 17 nutrients MyFitnessPal tracks, in the order the app shows them.
// Clients transfer these totals from MFP into their daily check-in.

export interface NutrientDef {
  key: NutrientKey
  unit: string
  /** shown in the main (macro) section of the check-in form */
  primary: boolean
}

export type NutrientKey =
  | 'calories'
  | 'protein'
  | 'carbs'
  | 'fiber'
  | 'sugar'
  | 'fat'
  | 'saturated_fat'
  | 'polyunsaturated_fat'
  | 'monounsaturated_fat'
  | 'trans_fat'
  | 'cholesterol'
  | 'sodium'
  | 'potassium'
  | 'vitamin_a'
  | 'vitamin_c'
  | 'calcium'
  | 'iron'

export const NUTRIENTS: NutrientDef[] = [
  { key: 'calories', unit: 'kcal', primary: true },
  { key: 'protein', unit: 'g', primary: true },
  { key: 'carbs', unit: 'g', primary: true },
  { key: 'fat', unit: 'g', primary: true },
  { key: 'fiber', unit: 'g', primary: false },
  { key: 'sugar', unit: 'g', primary: false },
  { key: 'saturated_fat', unit: 'g', primary: false },
  { key: 'polyunsaturated_fat', unit: 'g', primary: false },
  { key: 'monounsaturated_fat', unit: 'g', primary: false },
  { key: 'trans_fat', unit: 'g', primary: false },
  { key: 'cholesterol', unit: 'mg', primary: false },
  { key: 'sodium', unit: 'mg', primary: false },
  { key: 'potassium', unit: 'mg', primary: false },
  { key: 'vitamin_a', unit: '%', primary: false },
  { key: 'vitamin_c', unit: '%', primary: false },
  { key: 'calcium', unit: '%', primary: false },
  { key: 'iron', unit: '%', primary: false },
]

// non-nutrient targets stored in the same nutrition_targets table
export const EXTRA_TARGETS = [
  { key: 'steps', unit: '/day' },
  { key: 'cardio_weekly_min', unit: 'min' },
] as const

export const CARDIO_KINDS = [
  'walk',
  'jog',
  'run',
  'incline_treadmill',
  'bike',
  'elliptical',
  'rowing',
  'swim',
  'other',
] as const

export type CardioKind = (typeof CARDIO_KINDS)[number]

// muscle groups for categorizing strength exercises in the library
export const MUSCLE_GROUPS = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'forearms',
  'abs',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'full_body',
] as const

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number]

export const MEASUREMENT_FIELDS = [
  'neck',
  'shoulders',
  'chest',
  'waist',
  'hips',
  'arm',
  'thigh',
  'calf',
] as const

export type MeasurementField = (typeof MEASUREMENT_FIELDS)[number]
