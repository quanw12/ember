import { getDatabase } from '../db'
import { isRunDraft } from './runDraft'
import { imageBytes } from './image'

type Row = Record<string, unknown>
export interface Backup { format: 'ember-backup'; version: 1; exportedAt: string; tables: Record<string, Row[]> }
const names = ['profile', 'exercises', 'bodyLogs', 'nutritionLogs', 'sleepLogs', 'sessions', 'sets', 'settings', 'runs', 'routines', 'photos', 'cycleLogs', 'checkins']
const record = (value: unknown): value is Row => Boolean(value) && typeof value === 'object' && !Array.isArray(value)
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every(v => typeof v === 'string')
const dateKey = (value: unknown): boolean => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value))
const storedImage = (value: unknown) => value instanceof Blob || (record(value) && value.data instanceof Uint8Array && typeof value.type === 'string' && /^image\/(jpeg|png|webp|gif)$/.test(value.type))

async function encode(value: unknown): Promise<unknown> {
  if (value instanceof Date) return { $ember: 'date', value: value.toISOString() }
  if (value instanceof Uint8Array) {
    let binary = ''
    for (let i = 0; i < value.length; i += 8192) binary += String.fromCharCode(...value.subarray(i, i + 8192))
    return { $ember: 'bytes', value: btoa(binary) }
  }
  if (value instanceof Blob) {
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(new Error('Không đọc được ảnh để sao lưu.'))
      reader.readAsDataURL(value)
    })
    return { $ember: 'blob', value: data }
  }
  if (Array.isArray(value)) return Promise.all(value.map(encode))
  if (record(value)) return Object.fromEntries(await Promise.all(Object.entries(value).map(async ([k, v]) => [k, await encode(v)])))
  return value
}

function decode(value: unknown, depth = 0): unknown {
  if (depth > 30) throw new Error('File backup có cấu trúc quá sâu.')
  if (Array.isArray(value)) return value.map(v => decode(v, depth + 1))
  if (!record(value)) return value
  if (value.$ember === 'bytes') {
    if (typeof value.value !== 'string') throw new Error('Dữ liệu ảnh không hợp lệ.')
    return Uint8Array.from(atob(value.value), c => c.charCodeAt(0))
  }
  if (value.$ember === 'date') {
    const date = new Date(String(value.value))
    if (!Number.isFinite(date.getTime())) throw new Error('Ngày trong backup không hợp lệ.')
    return date
  }
  if (value.$ember === 'blob') {
    if (typeof value.value !== 'string' || !/^data:image\/(jpeg|png|webp|gif);base64,/.test(value.value)) throw new Error('Ảnh trong backup không hợp lệ.')
    const [header, data] = value.value.split(',')
    return new Blob([Uint8Array.from(atob(data), c => c.charCodeAt(0))], { type: header.slice(5, header.indexOf(';')) })
  }
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, decode(v, depth + 1)]))
}

function validateRow(table: string, row: Row): void {
  const assert = (condition: unknown) => { if (!condition) throw new Error(`Dữ liệu bảng ${table} không hợp lệ. Chưa thay đổi dữ liệu hiện tại.`) }
  if (table === 'settings') {
    assert(typeof row.key === 'string')
    if (row.key === 'c25kDone') assert(Number.isInteger(row.value) && Number(row.value) >= 0 && Number(row.value) <= 27)
    if (row.key === 'activeRoutineId') assert(finite(row.value))
    if (row.key === 'unit') assert(row.value === 'kg' || row.value === 'lb')
    if (row.key === 'runDraft') assert(isRunDraft(row.value))
    if (row.key === 'reminder') assert(record(row.value) && typeof row.value.enabled === 'boolean' && Number.isInteger(row.value.hour) && Number(row.value.hour) >= 0 && Number(row.value.hour) <= 23 && Number.isInteger(row.value.minute) && Number(row.value.minute) >= 0 && Number(row.value.minute) <= 59)
    return
  }
  assert(Number.isSafeInteger(row.id) && Number(row.id) > 0)
  if (table === 'profile') {
    assert(row.id === 1 && ['male', 'female'].includes(String(row.sex)))
    for (const field of ['age', 'heightCm', 'weightKg']) assert(finite(row[field]) && Number(row[field]) > 0)
    assert(['sedentary', 'light', 'moderate', 'active', 'athlete'].includes(String(row.activity)))
    assert(['cut', 'bulk', 'maintain', 'recomp'].includes(String(row.goal)))
    assert(['new', 'mid', 'pro'].includes(String(row.expLevel)))
    assert(['full', 'home', 'bodyweight'].includes(String(row.equipment)))
    for (const key of ['daysGym', 'daysRun']) assert(Number.isInteger(row[key]) && Number(row[key]) >= 0 && Number(row[key]) <= 7)
    for (const key of ['targetWeightKg', 'kcalOverride', 'cycleLenDays']) if (row[key] != null) assert(finite(row[key]) && Number(row[key]) > 0)
    assert(row.targetPhoto == null || storedImage(row.targetPhoto))
  }
  if (['bodyLogs', 'nutritionLogs', 'sleepLogs', 'sessions', 'runs', 'photos', 'cycleLogs', 'checkins'].includes(table)) assert(dateKey(row.date))
  const numberFields: Record<string, string[]> = { bodyLogs: ['weightKg', 'bellyCm'], nutritionLogs: ['kcal', 'proteinG'], sleepLogs: ['hours'], sets: ['sessionId', 'idx', 'kg', 'reps'], runs: ['distanceKm', 'durationSec'] }
  for (const key of numberFields[table] ?? []) if (row[key] != null) assert(finite(row[key]) && Number(row[key]) >= 0)
  const dates: Record<string, string[]> = { profile: ['createdAt', 'updatedAt'], sessions: ['startedAt', 'endedAt'], runs: ['startedAt', 'endedAt'], routines: ['createdAt'], checkins: ['ts'], sets: ['ts'] }
  for (const key of dates[table] ?? []) {
    if (table === 'sessions' && key === 'endedAt' && row[key] == null) continue
    // Legacy backups serialized dates to ISO strings.
    if (typeof row[key] === 'string') row[key] = new Date(row[key] as string)
    assert(row[key] instanceof Date && Number.isFinite((row[key] as Date).getTime()))
  }
  if (table === 'exercises') assert(['slug', 'name', 'nameEn', 'muscle', 'equipment'].every(k => typeof row[k] === 'string') && strings(row.keywords))
  if (table === 'exercises') for (const key of ['steps', 'images']) if (row[key] != null) assert(strings(row[key]))
  if (table === 'sessions') assert(typeof row.name === 'string' && (row.slugs == null || strings(row.slugs)))
  if (table === 'sets') assert(typeof row.exerciseSlug === 'string' && finite(row.sessionId) && finite(row.idx) && finite(row.kg) && finite(row.reps) && typeof row.done === 'boolean')
  if (table === 'photos') assert(storedImage(row.blob))
  if (table === 'cycleLogs') assert(row.kind === 'start')
  if (table === 'runs') assert(finite(row.distanceKm) && finite(row.durationSec) && Array.isArray(row.points) && row.points.every(p => Array.isArray(p) && p.length === 3 && p.every(finite) && Math.abs(p[0]) <= 90 && Math.abs(p[1]) <= 180))
  if (table === 'runs' && Array.isArray(row.points)) {
    const size = row.points.length
    if (row.segmentStarts != null) assert(Array.isArray(row.segmentStarts) && row.segmentStarts.every(i => Number.isSafeInteger(i) && i >= 0 && i < size))
    if (row.elapsedAtPoints != null) assert(Array.isArray(row.elapsedAtPoints) && row.elapsedAtPoints.length === size && row.elapsedAtPoints.every(t => finite(t) && t >= 0))
  }
  if (table === 'routines') assert(typeof row.name === 'string' && Array.isArray(row.days) && row.days.every(d => record(d) && Number.isInteger(d.weekday) && Number(d.weekday) >= 1 && Number(d.weekday) <= 7 && strings(d.slugs)))
}

export async function exportBackup(): Promise<string> {
  const source = getDatabase()
  // Read a consistent snapshot before encoding blobs outside the IDB transaction.
  const snapshot = await source.transaction('r', source.tables, async () => Object.fromEntries(await Promise.all(source.tables.map(async t => [t.name, await t.toArray()]))))
  return JSON.stringify({ format: 'ember-backup', version: 1, exportedAt: new Date().toISOString(), tables: await encode(snapshot) })
}

export function parseBackup(text: string): Backup {
  const raw: unknown = JSON.parse(text)
  if (!record(raw)) throw new Error('File backup không hợp lệ.')
  const modern = raw.format === 'ember-backup'
  if (modern && raw.version !== 1) throw new Error('Phiên bản backup chưa được hỗ trợ. Hãy cập nhật EMBER.')
  const decoded = decode(modern ? raw.tables : raw)
  if (!record(decoded) || !Array.isArray(decoded.profile) || decoded.profile.length !== 1) throw new Error('Backup cần có đúng một hồ sơ EMBER.')
  if (Object.keys(decoded).some(key => !names.includes(key))) throw new Error('Backup có bảng dữ liệu không được hỗ trợ.')
  const tables: Record<string, Row[]> = {}
  for (const name of names) {
    const rows = decoded[name] ?? []
    if (!Array.isArray(rows) || rows.length > 100_000) throw new Error(`Bảng ${name} không hợp lệ hoặc quá lớn.`)
    const keys = new Set<unknown>()
    for (const row of rows) {
      if (!record(row)) throw new Error(`Bảng ${name} chứa bản ghi không hợp lệ.`)
      validateRow(name, row)
      const key = name === 'settings' ? row.key : row.id
      if (keys.has(key)) throw new Error(`Bảng ${name} chứa bản ghi trùng mã.`)
      keys.add(key)
    }
    tables[name] = rows
  }
  return { format: 'ember-backup', version: 1, exportedAt: String(raw.exportedAt ?? ''), tables }
}

/** All validation happens before this atomic replace. Any write failure rolls back. */
export async function restoreBackup(backup: Backup): Promise<void> {
  const source = getDatabase()
  // Normalize legacy Blob images before opening a transaction (async Blob reads
  // inside a transaction could let Safari auto-commit it).
  const tables = { ...backup.tables }
  tables.profile = await Promise.all(tables.profile.map(async row => row.targetPhoto instanceof Blob ? { ...row, targetPhoto: await imageBytes(row.targetPhoto) } : row))
  tables.photos = await Promise.all(tables.photos.map(async row => row.blob instanceof Blob ? { ...row, blob: await imageBytes(row.blob) } : row))
  await source.transaction('rw', source.tables, async () => {
    for (const table of source.tables) {
      await table.clear()
      if (tables[table.name]?.length) await table.bulkPut(tables[table.name])
    }
  })
}
