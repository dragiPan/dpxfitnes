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
