import Dexie, { type Table } from 'dexie'

export interface Profile {
  id: number // luôn là 1 — mỗi hồ sơ người dùng là một DB riêng
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
  /** Chế độ nữ: độ dài chu kỳ (mặc định 28). */
  cycleLenDays?: number
  /** Ảnh "body mong muốn" — lưu Blob cục bộ. */
  targetPhoto?: Blob
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
  steps?: string[]
  mistakes?: string
  pinnedVideoUrl?: string
  images?: string[]
  level?: string
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
  slugs?: string[]
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

export interface SettingRow {
  key: string
  value: unknown
}

export interface Run {
  id?: number
  date: string
  startedAt: Date
  endedAt: Date
  /** Điểm GPS nén: [lat, lng, epochMs]. */
  points: [number, number, number][]
  distanceKm: number
  durationSec: number
}

/** Một ngày trong tuần của kế hoạch. weekday: 1=T2 … 7=CN. */
export interface RoutineDay {
  weekday: number
  slugs: string[]
}

export interface Routine {
  id?: number
  name: string
  source?: 'template' | 'custom'
  days: RoutineDay[]
  createdAt: Date
}

export interface Photo {
  id?: number
  date: string
  blob: Blob
}

/** Ghi nhận chu kỳ: kind 'start' = ngày đầu kỳ kinh. */
export interface CycleLog {
  id?: number
  date: string
  kind: 'start'
}

class EmberDB extends Dexie {
  profile!: Table<Profile, number>
  exercises!: Table<Exercise, number>
  bodyLogs!: Table<BodyLog, number>
  nutritionLogs!: Table<NutritionLog, number>
  sleepLogs!: Table<SleepLog, number>
  sessions!: Table<Session, number>
  sets!: Table<SetEntry, number>
  settings!: Table<SettingRow, string>
  runs!: Table<Run, number>
  routines!: Table<Routine, number>
  photos!: Table<Photo, number>
  cycleLogs!: Table<CycleLog, number>

  constructor(name: string) {
    super(name)
    this.version(1).stores({
      profile: 'id',
      exercises: 'id, slug, muscle, equipment',
      bodyLogs: '++id, date',
      nutritionLogs: '++id, date',
      sleepLogs: '++id, date',
      sessions: '++id, date',
      sets: '++id, sessionId, exerciseSlug'
    })
    this.version(2).stores({
      settings: 'key',
      runs: '++id, date'
    })
    this.version(3).stores({
      routines: '++id'
    })
    this.version(4).stores({
      photos: '++id, date',
      cycleLogs: '++id, date'
    })
    // v5+6: exercises trước đây dùng keyPath 'id' không auto-increment → mọi add() không id
    // đều DataError, thư viện không nạp được. IndexedDB không sửa được primary key,
    // phải xoá store rồi tạo lại (mất exercises đã nạp — sẽ tự seed/import lại).
    this.version(5).stores({ exercises: null })
    this.version(6).stores({
      exercises: '++id, slug, muscle, equipment'
    })
  }
}

/* ------------------------------------------------------------------ */
/* Đa hồ sơ: mỗi người dùng một DB IndexedDB riêng (ember-<slotId>) —  */
/* dữ liệu, kế hoạch, backup tách biệt hoàn toàn trên cùng một máy.    */
/* ------------------------------------------------------------------ */

export interface SlotMeta {
  id: string
  name: string
  createdAt: string
}

const SLOTS_KEY = 'emberSlots'
const ACTIVE_KEY = 'emberActive'

function readSlots(): SlotMeta[] {
  try {
    return JSON.parse(localStorage.getItem(SLOTS_KEY) ?? '[]') as SlotMeta[]
  } catch {
    return []
  }
}

function writeSlots(slots: SlotMeta[]): void {
  localStorage.setItem(SLOTS_KEY, JSON.stringify(slots))
}

export function listSlots(): SlotMeta[] {
  return readSlots()
}

export function getActiveSlot(): SlotMeta | null {
  const slots = readSlots()
  const id = localStorage.getItem(ACTIVE_KEY)
  return slots.find(s => s.id === id) ?? slots[0] ?? null
}

export function setActiveSlot(id: string): void {
  localStorage.setItem(ACTIVE_KEY, id)
}

let active: EmberDB = new EmberDB('ember-default')

/** Trỏ `db` sang DB của một hồ sơ. Gọi trước khi render dùng db. */
export function activateSlotDb(id: string): void {
  active = new EmberDB(`ember-${id}`)
}

export function createSlot(name: string): SlotMeta {
  const meta: SlotMeta = { id: 'p' + Date.now().toString(36), name, createdAt: new Date().toISOString() }
  const slots = readSlots()
  slots.push(meta)
  writeSlots(slots)
  setActiveSlot(meta.id)
  activateSlotDb(meta.id)
  return meta
}

export function renameSlot(id: string, name: string): void {
  const slots = readSlots()
  const meta = slots.find(s => s.id === id)
  if (meta) {
    meta.name = name
    writeSlots(slots)
  }
}

export async function deleteSlot(id: string): Promise<void> {
  const slots = readSlots().filter(s => s.id !== id)
  writeSlots(slots)
  await new EmberDB(`ember-${id}`).delete()
  if (getActiveSlot()?.id === id) {
    localStorage.removeItem(ACTIVE_KEY)
    const next = slots[0]
    if (next) {
      setActiveSlot(next.id)
      activateSlotDb(next.id)
    }
  }
}

/** Bản cài cũ (trước đa hồ sơ) chứa dữ liệu trong DB tên 'ember' — dồn vào hồ sơ đầu tiên. */
export async function migrateLegacyIfNeeded(): Promise<void> {
  if (readSlots().length > 0) return
  if (!('databases' in indexedDB)) return
  const dbs = await indexedDB.databases()
  if (!dbs.some(d => d.name === 'ember')) return

  const meta = createSlot('Của tôi')
  const legacy = new EmberDB('ember')
  await legacy.open()
  try {
    for (const table of legacy.tables) {
      const rows = await table.toArray()
      if (rows.length > 0) await active.table(table.name).bulkPut(rows)
    }
  } finally {
    legacy.close()
  }
  void meta
}

/** Proxy: mọi `db.xxx` trong app đều trỏ tới DB của hồ sơ đang mở. */
export const db = new Proxy({} as EmberDB, {
  get(_target, prop) {
    const value = Reflect.get(active as unknown as object, prop, active)
    return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(active) : value
  }
}) as EmberDB

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
