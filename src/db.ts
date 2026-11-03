import Dexie, { type Table } from 'dexie'

/** Legacy photos may be Blobs; new photos use portable bytes for WebKit IDB. */
export type StoredImage = Blob | { data: Uint8Array; type: string }

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
  /** Ảnh "body mong muốn" — lưu cục bộ. */
  targetPhoto?: StoredImage
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
  /** Index of the first point after each pause/resume; never bridge these gaps. */
  segmentStarts?: number[]
  /** Active elapsed seconds at each GPS fix, excluding pauses. */
  elapsedAtPoints?: number[]
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
  blob: StoredImage
}

/** Ghi nhận chu kỳ: kind 'start' = ngày đầu kỳ kinh. */
export interface CycleLog {
  id?: number
  date: string
  kind: 'start'
}

/** Check-in hằng ngày — thắp lửa không cần ảnh. date: YYYY-MM-DD. */
export interface Checkin {
  id?: number
  date: string
  ts: Date
}

export class EmberDB extends Dexie {
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
  checkins!: Table<Checkin, number>

  constructor(name: string) {
    // Commit-backed reads avoid Dexie's optimistic-cache crash observed in
    // WebKit during Blob mutations (applyOptimisticOps received a null op).
    // liveQuery remains reactive; UI only shows data after the write commits.
    super(name, { cache: 'disabled' })
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
    // v7: check-in hằng ngày (thắp lửa) — tách khỏi buổi tập để bắt streak không cần ảnh
    this.version(7).stores({
      checkins: '++id, date'
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
  const value: unknown = JSON.parse(localStorage.getItem(SLOTS_KEY) ?? '[]')
  if (!Array.isArray(value) || !value.every(s => s && typeof s.id === 'string'
    && /^p[a-z0-9-]+$/i.test(s.id) && typeof s.name === 'string' && typeof s.createdAt === 'string')) {
    throw new Error('Danh sách hồ sơ không hợp lệ. Dữ liệu vẫn còn trên thiết bị; không xoá dữ liệu trình duyệt.')
  }
  return value as SlotMeta[]
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
  if (active.name === `ember-${id}`) return
  active.close()
  active = new EmberDB(`ember-${id}`)
}

/** Capture this instance before asynchronous work so a profile switch cannot redirect writes. */
export function getDatabase(): EmberDB { return active }

export function createSlot(name: string): SlotMeta {
  const meta: SlotMeta = { id: 'p' + crypto.randomUUID(), name: name.trim(), createdAt: new Date().toISOString() }
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
  const wasActive = getActiveSlot()?.id === id
  const slots = readSlots().filter(s => s.id !== id)
  if (wasActive) active.close()
  await new EmberDB(`ember-${id}`).delete()
  writeSlots(slots)
  if (wasActive) {
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

  // Publish the slot only after an atomic copy succeeds. A failed copy is retryable.
  const meta: SlotMeta = { id: 'p' + crypto.randomUUID(), name: 'Của tôi', createdAt: new Date().toISOString() }
  const target = new EmberDB(`ember-${meta.id}`)
  const legacy = new EmberDB('ember')
  await legacy.open()
  try {
    const rows = await Promise.all(legacy.tables.map(async table => ({ name: table.name, rows: await table.toArray() })))
    await target.transaction('rw', target.tables, async () => {
      for (const table of rows) if (table.rows.length) await target.table(table.name).bulkPut(table.rows)
    })
    writeSlots([meta])
    setActiveSlot(meta.id)
  } finally {
    legacy.close()
    target.close()
  }
}

/** Proxy: mọi `db.xxx` trong app đều trỏ tới DB của hồ sơ đang mở. */
export const db = new Proxy({} as EmberDB, {
  get(_target, prop) {
    const value = Reflect.get(active as unknown as object, prop, active)
    return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(active) : value
  }
}) as EmberDB

export const todayStr = (): string => {
  const d = new Date()
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}` // giờ máy — toISOString dịch theo UTC, sai ngày ở múi giờ + (vd 5h sáng VN)
}

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
