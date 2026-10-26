import Dexie, { type Table } from 'dexie'

export interface Profile {
  id: number // luôn là 1 — hồ sơ duy nhất
  sex: 'male' | 'female'
  age: number
  heightCm: number
  weightKg: number
  activity: 'sedentary' | 'light' | 'moderate' | 'active' | 'athlete'
  expLevel: 'new' | 'mid' | 'pro'
  daysGym: number
  daysRun: number
  equipment: 'full' | 'home' | 'bodyweight'
  goal: 'cut' | 'bulk' | 'maintain' | 'recomp'
  targetWeightKg?: number
  targetDate?: string
  kcalOverride?: number
  createdAt: Date
  updatedAt: Date
}

export interface Exercise {
  id?: number
  slug: string
  name: string
  nameEn: string
  muscle: string
  equipment: string
  keywords: string[]
  custom?: boolean
}

export interface BodyLog {
  id?: number
  date: string // YYYY-MM-DD
  weightKg?: number
  bellyCm?: number
  note?: string
}

export interface NutritionLog {
  id?: number
  date: string
  kcal?: number
  proteinG?: number
}

export interface SleepLog {
  id?: number
  date: string
  hours?: number
}

export interface Session {
  id?: number
  date: string
  startedAt: Date
  endedAt?: Date
  name: string
  note?: string
}

export interface SetEntry {
  id?: number
  sessionId: number
  exerciseSlug: string
  idx: number
  kg: number
  reps: number
  rpe?: number
  technique?: 'drop' | 'superset' | 'restpause' | 'amrap' | 'warmup'
  done: boolean
  ts: Date
}

class EmberDB extends Dexie {
  profile!: Table<Profile, number>
  exercises!: Table<Exercise, number>
  bodyLogs!: Table<BodyLog, number>
  nutritionLogs!: Table<NutritionLog, number>
  sleepLogs!: Table<SleepLog, number>
  sessions!: Table<Session, number>
  sets!: Table<SetEntry, number>

  constructor() {
    super('ember')
    this.version(1).stores({
      profile: 'id',
      exercises: 'id, slug, muscle, equipment',
      bodyLogs: '++id, date',
      nutritionLogs: '++id, date',
      sleepLogs: '++id, date',
      sessions: '++id, date',
      sets: '++id, sessionId, exerciseSlug'
    })
  }
}

export const db = new EmberDB()

export const todayStr = (): string => new Date().toISOString().slice(0, 10)

/** Trung bình trượt của n điểm cuối cùng — chống nhiễu nước khi cân. */
export function movingAvg(vals: number[], win = 7): number | null {
  if (vals.length === 0) return null
  const slice = vals.slice(-win)
  return slice.reduce((a, b) => a + b, 0) / slice.length
}

/** Ước lượng 1RM — công thức Epley. */
export function epley(kg: number, reps: number): number {
  if (reps <= 0) return 0
  if (reps === 1) return kg
  return kg * (1 + reps / 30)
}
