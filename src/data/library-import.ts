import { db, type Exercise } from '../db'

/**
 * Import thư viện bài tập mở free-exercise-db (CC0, ~876 bài có hình minh họa
 * và hướng dẫn tiếng Anh). Hình load qua jsDelivr và được service worker cache.
 * Credit: https://github.com/yuhonas/free-exercise-db
 */

export const LIB_REV = 1
const CDN = 'https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/'

interface FreeExercise {
  name: string
  force?: string
  level?: string
  mechanic?: string
  equipment?: string
  primaryMuscles?: string[]
  secondaryMuscles?: string[]
  instructions?: string[]
  category?: string
  images?: string[]
}

const MUSCLE_MAP: Record<string, string> = {
  chest: 'chest',
  lats: 'back', 'middle back': 'back', 'lower back': 'back', traps: 'back', 'upper back': 'back',
  shoulders: 'shoulders',
  biceps: 'biceps',
  triceps: 'triceps',
  abdominals: 'core', abs: 'core', obliques: 'core',
  quadriceps: 'quads', adductors: 'quads', abductors: 'quads',
  hamstrings: 'hamstrings',
  glutes: 'glutes',
  calves: 'calves',
  forearms: 'forearms'
}

const EQUIP_MAP: Record<string, string> = {
  barbell: 'barbell', 'e-z curl bar': 'barbell',
  dumbbell: 'dumbbell', kettlebells: 'dumbbell',
  machine: 'machine',
  cable: 'cable',
  'body only': 'bodyweight', none: 'bodyweight'
}

const LEVEL_VI: Record<string, string> = {
  beginner: 'Mới bắt đầu',
  intermediate: 'Trung cấp',
  expert: 'Nâng cao'
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export async function importLibrary(): Promise<void> {
  const res = await fetch('data/free-exercises.json')
  if (!res.ok) return
  const list = (await res.json()) as FreeExercise[]
  const existing = await db.exercises.toArray()
  const bySlug = new Map(existing.map(e => [e.slug, e]))

  const fresh: Exercise[] = []
  for (const f of list) {
    const slug = `${slugify(f.name)}-fx`
    if (bySlug.has(slug)) continue
    const muscle = (f.primaryMuscles ?? []).map(m => MUSCLE_MAP[m.toLowerCase()]).find(Boolean) ?? 'other'
    const equipment = EQUIP_MAP[(f.equipment ?? '').toLowerCase()] ?? 'other'
    fresh.push({
      slug,
      name: f.name,
      nameEn: f.name,
      muscle,
      equipment,
      keywords: f.name.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 2),
      steps: f.instructions,
      level: LEVEL_VI[(f.level ?? '').toLowerCase()],
      images: (f.images ?? []).slice(0, 2).map(p => CDN + p)
    })
  }
  if (fresh.length > 0) await db.exercises.bulkAdd(fresh)
}
