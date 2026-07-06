export type Role = 'coach' | 'client'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: Role
  language: 'en' | 'sr'
  measurements_enabled: boolean
  created_at: string
}

export interface Checkin {
  id: string
  user_id: string
  date: string
  calories: number | null
  protein: number | null
  carbs: number | null
  fiber: number | null
  sugar: number | null
  fat: number | null
  saturated_fat: number | null
  polyunsaturated_fat: number | null
  monounsaturated_fat: number | null
  trans_fat: number | null
  cholesterol: number | null
  sodium: number | null
  potassium: number | null
  vitamin_a: number | null
  vitamin_c: number | null
  calcium: number | null
  iron: number | null
  weight: number | null
  steps: number | null
  notes: string | null
}

export interface NutritionTarget {
  id: string
  user_id: string
  nutrient: string
  target_value: number
  show_to_client: boolean
}

export interface Measurement {
  id: string
  user_id: string
  date: string
  neck: number | null
  shoulders: number | null
  chest: number | null
  waist: number | null
  hips: number | null
  arm: number | null
  thigh: number | null
  calf: number | null
}

export interface Program {
  id: string
  title: string
  description: string | null
  created_at: string
}

export interface ProgramDay {
  id: string
  program_id: string
  day_index: number
  title: string
}

export interface ProgramExercise {
  id: string
  program_day_id: string
  order_index: number
  name: string
  kind: 'strength' | 'cardio'
  instructions: string | null
  youtube_url: string | null
  target_sets: number | null
  target_reps: string | null
  target_weight: string | null
  rest_seconds: number | null
}

export interface ProgramAssignment {
  id: string
  program_id: string
  client_id: string
  active: boolean
  assigned_at: string
}

export interface ExerciseLog {
  id: string
  program_exercise_id: string
  client_id: string
  date: string
  set_number: number
  reps: number | null
  weight: number | null
  steps: number | null
  duration_min: number | null
  notes: string | null
}

export interface IntakeResponse {
  user_id: string
  answers: Record<string, string>
  submitted_at: string | null
}

export interface LibraryExercise {
  id: string
  name: string
  kind: 'strength' | 'cardio'
  youtube_url: string | null
  instructions: string | null
  target_sets: number | null
  target_reps: string | null
  target_weight: string | null
  rest_seconds: number | null
}

export interface ChatMessage {
  id: string
  client_id: string
  sender_id: string
  body: string
  read: boolean
  created_at: string
}

export interface Subscription {
  client_id: string
  package_name: string | null
  price: number | null
  currency: string
  paid_until: string | null
  notes: string | null
}

export interface MealPlan {
  id: string
  client_id: string
  title: string
  notes: string | null
  active: boolean
  created_at: string
}

export interface MealPlanMeal {
  id: string
  meal_plan_id: string
  order_index: number
  name: string
  time_hint: string | null
  description: string | null
  calories: number | null
  protein: number | null
  carbs: number | null
  fat: number | null
}

export type CommentEntityType =
  | 'program'
  | 'program_exercise'
  | 'meal_plan'
  | 'meal'
  | 'checkin'

export interface Comment {
  id: string
  entity_type: CommentEntityType
  entity_id: string
  client_id: string
  author_id: string
  body: string
  created_at: string
  author?: Pick<Profile, 'full_name' | 'role'>
}

export interface Group {
  id: string
  name: string
  description: string | null
  created_at: string
}

export interface BoardPost {
  id: string
  group_id: string | null
  author_id: string
  title: string
  body: string
  created_at: string
}

export interface AppNotification {
  id: string
  user_id: string
  type: string
  title: string
  body: string | null
  link: string | null
  read: boolean
  created_at: string
}

export interface TrainingSession {
  id: string
  client_id: string
  title: string
  notes: string | null
  start_at: string
  end_at: string
  google_event_id: string | null
}

export interface GCalEvent {
  id: string
  summary?: string
  start: { dateTime?: string; date?: string }
  end: { dateTime?: string; date?: string }
}
