import type { Exercise, Profile } from '../db'
import { ALLOWED_EQUIPMENT } from '../data/routines.seed'

/**
 * Cơ chế gợi ý cho WeeklyPlanner:
 * - cơ phụ cho từng bài (để tư vấn "bài này ảnh hưởng cơ nào")
 * - thứ tự ưu tiên theo nhóm cơ (compound trước, isolation sau, core cuối)
 * - split gợi ý theo số buổi/tuần
 * Không bao giờ tự chọn bài thay người dùng — chỉ xếp hạng để họ bấm chọn.
 */

export interface RecItem {
  ex: Exercise
  role: 'compound' | 'isolation'
  secondary: string[]
}

/** Cơ phụ của từng bài seed — dùng cho dòng tư vấn "phụ: Tay sau, Vai". */
export const SECONDARY: Record<string, string[]> = {
  'bench-press': ['triceps', 'shoulders'],
  'incline-db-press': ['triceps', 'shoulders'],
  'push-up': ['triceps', 'core'],
  'cable-fly': ['shoulders'],
  'dips': ['triceps', 'shoulders'],
  'deadlift': ['hamstrings', 'glutes', 'forearms'],
  'lat-pulldown': ['biceps', 'forearms'],
  'barbell-row': ['biceps', 'shoulders'],
  'one-arm-row': ['biceps', 'shoulders'],
  'pull-up': ['biceps', 'forearms'],
  'face-pull': ['shoulders'],
  'ohp': ['triceps', 'core'],
  'seated-db-press': ['triceps'],
  'lateral-raise': [],
  'rear-delt-fly': ['back'],
  'barbell-curl': ['forearms'],
  'hammer-curl': ['forearms'],
  'cable-curl': ['forearms'],
  'triceps-pushdown': [],
  'skull-crusher': [],
  'oh-triceps-ext': [],
  'back-squat': ['glutes', 'hamstrings', 'core'],
  'front-squat': ['core', 'glutes'],
  'leg-press': ['glutes', 'hamstrings'],
  'walking-lunge': ['glutes', 'hamstrings', 'core'],
  'leg-extension': [],
  'rdl': ['glutes', 'back'],
  'leg-curl': [],
  'good-morning': ['glutes', 'back'],
  'hip-thrust': ['hamstrings'],
  'glute-bridge': ['hamstrings'],
  'bulgarian-split': ['glutes', 'hamstrings'],
  'cable-kickback': ['hamstrings'],
  'hip-abduction': [],
  'db-step-up': ['glutes'],
  'standing-calf': [],
  'seated-calf': [],
  'plank': ['shoulders'],
  'hanging-leg-raise': ['quads'],
  'cable-crunch': [],
  'russian-twist': [],
  'wrist-curl': []
}

/** Bodyweight compound — bodyweight nhưng là bài đa khớp lớn. */
const COMPOUND_SLUGS = new Set([
  'push-up', 'pull-up', 'dips', 'walking-lunge', 'bulgarian-split', 'db-step-up', 'plank'
])

export function roleFor(ex: Pick<Exercise, 'slug' | 'equipment'>): 'compound' | 'isolation' {
  if (COMPOUND_SLUGS.has(ex.slug)) return 'compound'
  return ex.equipment === 'barbell' || ex.equipment === 'machine' || ex.equipment === 'cable' ? 'compound' : 'isolation'
}

/** Thứ tự gợi ý ưu tiên cho từng nhóm cơ (bài seed đặt tên slug chuẩn). */
const CURATED: Record<string, string[]> = {
  chest: ['bench-press', 'incline-db-press', 'dips', 'push-up', 'cable-fly'],
  back: ['deadlift', 'pull-up', 'lat-pulldown', 'barbell-row', 'one-arm-row', 'face-pull'],
  shoulders: ['ohp', 'seated-db-press', 'lateral-raise', 'rear-delt-fly'],
  biceps: ['barbell-curl', 'hammer-curl', 'cable-curl'],
  triceps: ['triceps-pushdown', 'skull-crusher', 'oh-triceps-ext'],
  quads: ['back-squat', 'front-squat', 'leg-press', 'bulgarian-split', 'walking-lunge', 'db-step-up', 'leg-extension'],
  hamstrings: ['rdl', 'good-morning', 'leg-curl'],
  glutes: ['hip-thrust', 'glute-bridge', 'bulgarian-split', 'cable-kickback', 'hip-abduction', 'walking-lunge'],
  calves: ['standing-calf', 'seated-calf'],
  core: ['plank', 'hanging-leg-raise', 'cable-crunch', 'russian-twist'],
  forearms: ['wrist-curl'],
  other: []
}

/**
 * Xếp hạng gợi ý cho một nhóm cơ: bài seed "chuẩn" theo thứ tự curated trước,
 * sau đó bài còn lại trong thư viện (kể cả import -fx) xếp compound trước.
 * Lọc theo dụng cụ hồ sơ đang dùng (full/home/bodyweight).
 */
export function recommendFor(muscle: string, exercises: Exercise[], equipment: Profile['equipment']): RecItem[] {
  const allowed = new Set(ALLOWED_EQUIPMENT[equipment] ?? ALLOWED_EQUIPMENT.full)
  const pool = exercises.filter(e => e.muscle === muscle && allowed.has(e.equipment))
  const bySlug = new Map(pool.map(e => [e.slug, e]))
  const out: RecItem[] = []
  for (const slug of CURATED[muscle] ?? []) {
    const ex = bySlug.get(slug)
    if (ex) {
      out.push({ ex, role: roleFor(ex), secondary: SECONDARY[slug] ?? [] })
      bySlug.delete(slug)
    }
  }
  const rest = [...bySlug.values()].sort((a, b) => {
    const c = Number(roleFor(b) === 'compound') - Number(roleFor(a) === 'compound')
    if (c !== 0) return c
    const seedDiff = Number(a.custom === true) - Number(b.custom === true)
    if (seedDiff !== 0) return seedDiff
    return a.nameEn.localeCompare(b.nameEn, 'en')
  })
  for (const ex of rest) out.push({ ex, role: roleFor(ex), secondary: SECONDARY[ex.slug] ?? [] })
  return out
}

/* ---------------- Thứ tự tập trong 1 buổi ---------------- */

/** Cơ lớn/compound trước — cơ nhỏ, core để cuối buổi. */
const MUSCLE_TIER: Record<string, number> = {
  quads: 0, hamstrings: 0, back: 0, chest: 0,
  glutes: 1, shoulders: 1,
  biceps: 2, triceps: 2, calves: 2,
  forearms: 3,
  core: 4,
  other: 2
}

function orderTier(ex: Exercise | undefined): number {
  if (!ex) return 9
  return (MUSCLE_TIER[ex.muscle] ?? 2) + (roleFor(ex) === 'isolation' ? 0.5 : 0)
}

/** Dòng tư vấn thứ tự cho 1 bài trong buổi. */
export function orderAdvice(ex: Exercise | undefined): string {
  if (!ex) return ''
  const tier = MUSCLE_TIER[ex.muscle] ?? 2
  const compound = roleFor(ex) === 'compound'
  if (tier <= 1 && compound) return 'Compound lớn — nên tập đầu buổi'
  if (tier <= 1) return 'Isolation cơ lớn — giữa buổi'
  if (tier === 2 && compound) return 'Compound nhỏ — giữa buổi'
  if (tier === 2) return 'Isolation — nửa sau buổi'
  return 'Cơ nhỏ/core — để cuối buổi'
}

/** Sắp 1 buổi theo thứ tự gợi ý (dùng cho nút "Sắp theo thứ tự gợi ý"). */
export function sortDaySlugs(slugs: string[], exercises: Exercise[]): string[] {
  const bySlug = new Map(exercises.map(e => [e.slug, e]))
  return [...slugs].sort((a, b) => orderTier(bySlug.get(a)) - orderTier(bySlug.get(b)))
}

/* ---------------- Split gợi ý theo số buổi ---------------- */

/** Split chuẩn theo số buổi/tuần: [weekday, nhóm cơ]. Dùng làm đề xuất — người dùng vẫn sửa được. */
export function suggestSplit(days: number, sex: Profile['sex']): [number, string[]][] {
  const n = Math.min(6, Math.max(1, days))
  const female = sex === 'female'
  switch (n) {
    case 1: return [[2, female ? ['glutes', 'quads', 'back', 'core'] : ['chest', 'back', 'quads', 'core']]]
    case 2: return [
      [2, female ? ['glutes', 'hamstrings', 'back', 'biceps'] : ['chest', 'back', 'shoulders', 'core']],
      [5, female ? ['quads', 'glutes', 'calves', 'core'] : ['quads', 'hamstrings', 'glutes', 'calves']]
    ]
    case 3: return female
      ? [[2, ['glutes', 'hamstrings', 'back', 'biceps']], [4, ['chest', 'shoulders', 'triceps']], [6, ['quads', 'glutes', 'calves']]]
      : [[2, ['chest', 'shoulders', 'triceps']], [4, ['back', 'biceps', 'forearms']], [6, ['quads', 'hamstrings', 'glutes', 'calves']]]
    case 4: return female
      ? [[2, ['chest', 'back']], [3, ['quads', 'glutes', 'calves']], [5, ['shoulders', 'biceps', 'triceps']], [6, ['glutes', 'hamstrings', 'core']]]
      : [[2, ['chest', 'back']], [3, ['quads', 'hamstrings', 'calves']], [5, ['shoulders', 'biceps', 'triceps']], [6, ['glutes', 'hamstrings', 'core']]]
    case 5: return female
      ? [[2, ['chest', 'triceps']], [3, ['back', 'biceps']], [4, ['quads', 'calves']], [5, ['shoulders', 'forearms']], [6, ['glutes', 'hamstrings', 'core']]]
      : [[2, ['chest', 'triceps']], [3, ['back', 'biceps']], [4, ['quads', 'calves']], [5, ['shoulders', 'forearms']], [6, ['hamstrings', 'glutes', 'core']]]
    default: return [
      [2, ['chest', 'shoulders', 'triceps']], [3, ['back', 'biceps', 'forearms']], [4, ['quads', 'hamstrings', 'glutes', 'calves']],
      [5, ['chest', 'shoulders', 'triceps']], [6, ['back', 'biceps', 'forearms']], [7, ['quads', 'hamstrings', 'glutes', 'calves']]
    ]
  }
}
