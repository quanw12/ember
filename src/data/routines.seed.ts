import { db, type Exercise, type Profile, type RoutineDay } from '../db'

export const WEEKDAYS = ['Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy', 'Chủ nhật']
export const WEEKDAYS_SHORT = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

export const weekdayLabel = (w: number): string => WEEKDAYS[w - 1] ?? `Ngày ${w}`
export const weekdayShort = (w: number): string => WEEKDAYS_SHORT[w - 1] ?? `N${w}`
/** JS getDay(): 0=CN…6=T7 → weekday 1..7 (T2..CN). */
export const jsDayToWeekday = (js: number): number => (js === 0 ? 7 : js)

interface TemplateDay { weekday: number; slugs: string[] }
export interface Template { name: string; days: TemplateDay[] }

/** Template dựng theo chuẩn phổ biến: Full Body, Upper/Lower, PPL, PHUL, PPLUL + template nữ (Mông & Chân/Mông & Upper). */
export const ROUTINES_SEED_REV = 4

export const ROUTINE_TEMPLATES: Template[] = [
  {
    name: 'Full Body 2 buổi',
    days: [
      { weekday: 2, slugs: ['back-squat', 'bench-press', 'barbell-row', 'plank'] },
      { weekday: 5, slugs: ['deadlift', 'ohp', 'lat-pulldown', 'hanging-leg-raise'] }
    ]
  },
  {
    name: 'Full Body 3 buổi',
    days: [
      { weekday: 2, slugs: ['back-squat', 'bench-press', 'barbell-row', 'plank'] },
      { weekday: 4, slugs: ['deadlift', 'ohp', 'lat-pulldown', 'hanging-leg-raise'] },
      { weekday: 6, slugs: ['leg-press', 'incline-db-press', 'one-arm-row', 'cable-crunch'] }
    ]
  },
  {
    name: 'PPL 3 buổi',
    days: [
      { weekday: 2, slugs: ['bench-press', 'incline-db-press', 'seated-db-press', 'lateral-raise', 'triceps-pushdown'] },
      { weekday: 4, slugs: ['lat-pulldown', 'barbell-row', 'face-pull', 'barbell-curl', 'cable-curl'] },
      { weekday: 6, slugs: ['back-squat', 'rdl', 'leg-extension', 'leg-curl', 'standing-calf'] }
    ]
  },
  {
    name: 'Upper/Lower 4 buổi',
    days: [
      { weekday: 2, slugs: ['bench-press', 'barbell-row', 'ohp', 'barbell-curl', 'triceps-pushdown'] },
      { weekday: 3, slugs: ['back-squat', 'rdl', 'leg-extension', 'standing-calf'] },
      { weekday: 5, slugs: ['incline-db-press', 'lat-pulldown', 'lateral-raise', 'hammer-curl', 'skull-crusher'] },
      { weekday: 6, slugs: ['leg-press', 'walking-lunge', 'leg-curl', 'seated-calf'] }
    ]
  },
  {
    name: 'PHUL 4 buổi (Power + Hypertrophy)',
    days: [
      { weekday: 2, slugs: ['bench-press', 'barbell-row', 'ohp', 'barbell-curl', 'skull-crusher'] },
      { weekday: 3, slugs: ['back-squat', 'deadlift', 'leg-press', 'leg-curl', 'standing-calf'] },
      { weekday: 5, slugs: ['incline-db-press', 'one-arm-row', 'lateral-raise', 'cable-curl', 'triceps-pushdown'] },
      { weekday: 6, slugs: ['leg-press', 'walking-lunge', 'leg-curl', 'seated-calf', 'cable-crunch'] }
    ]
  },
  {
    name: 'PPLUL 5 buổi',
    days: [
      { weekday: 2, slugs: ['bench-press', 'incline-db-press', 'seated-db-press', 'lateral-raise', 'triceps-pushdown'] },
      { weekday: 3, slugs: ['lat-pulldown', 'barbell-row', 'face-pull', 'barbell-curl', 'cable-curl'] },
      { weekday: 4, slugs: ['back-squat', 'rdl', 'leg-extension', 'leg-curl', 'standing-calf'] },
      { weekday: 6, slugs: ['incline-db-press', 'lat-pulldown', 'lateral-raise', 'hammer-curl', 'skull-crusher'] },
      { weekday: 7, slugs: ['leg-press', 'walking-lunge', 'leg-curl', 'seated-calf', 'cable-crunch'] }
    ]
  },
  {
    name: 'PPL 6 buổi',
    days: [
      { weekday: 2, slugs: ['bench-press', 'incline-db-press', 'seated-db-press', 'lateral-raise', 'triceps-pushdown'] },
      { weekday: 3, slugs: ['lat-pulldown', 'barbell-row', 'face-pull', 'barbell-curl', 'cable-curl'] },
      { weekday: 4, slugs: ['back-squat', 'rdl', 'leg-extension', 'leg-curl', 'standing-calf'] },
      { weekday: 5, slugs: ['bench-press', 'incline-db-press', 'seated-db-press', 'lateral-raise', 'triceps-pushdown'] },
      { weekday: 6, slugs: ['lat-pulldown', 'barbell-row', 'face-pull', 'barbell-curl', 'cable-curl'] },
      { weekday: 7, slugs: ['back-squat', 'rdl', 'leg-extension', 'leg-curl', 'standing-calf'] }
    ]
  }
]

/** Template riêng cho chế độ nữ — thiên về mông/chân, theo xu hướng huấn luyện nữ phổ biến. */
export const FEMALE_TEMPLATES: Template[] = [
  {
    name: 'Mông & Chân 3 buổi (nữ)',
    days: [
      { weekday: 2, slugs: ['back-squat', 'hip-thrust', 'bulgarian-split', 'glute-bridge', 'plank'] },
      { weekday: 4, slugs: ['rdl', 'hip-abduction', 'cable-kickback', 'leg-curl', 'hanging-leg-raise'] },
      { weekday: 6, slugs: ['db-step-up', 'walking-lunge', 'hip-thrust', 'standing-calf', 'russian-twist'] }
    ]
  },
  {
    name: 'Mông & Upper 4 buổi (nữ)',
    days: [
      { weekday: 2, slugs: ['bench-press', 'lat-pulldown', 'seated-db-press', 'barbell-curl', 'triceps-pushdown'] },
      { weekday: 3, slugs: ['hip-thrust', 'back-squat', 'bulgarian-split', 'hip-abduction', 'glute-bridge'] },
      { weekday: 5, slugs: ['one-arm-row', 'incline-db-press', 'lateral-raise', 'hammer-curl', 'face-pull'] },
      { weekday: 6, slugs: ['rdl', 'db-step-up', 'cable-kickback', 'leg-curl', 'standing-calf'] }
    ]
  }
]

const ALLOWED_EQUIPMENT: Record<Profile['equipment'], string[]> = {
  full: ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'other'],
  home: ['dumbbell', 'bodyweight', 'other'],
  bodyweight: ['bodyweight']
}
export { ALLOWED_EQUIPMENT }

/** Lọc bài của template theo dụng cụ cho phép — ngày rơi hết bài sẽ bị bỏ. */
export function filterTemplate(t: Template, bySlug: Map<string, Pick<Exercise, 'slug' | 'equipment'>>, equipment: Profile['equipment']): RoutineDay[] {
  const allowed = new Set(ALLOWED_EQUIPMENT[equipment] ?? ALLOWED_EQUIPMENT.full)
  return t.days
    .map(d => ({ weekday: d.weekday, slugs: d.slugs.filter(s => { const ex = bySlug.get(s); return ex != null && allowed.has(ex.equipment) }) }))
    .filter(d => d.slugs.length > 0)
}

/**
 * Tạo routine mới từ template (lọc theo dụng cụ hồ sơ). Không nhân bản nếu tên đã tồn tại.
 * Trả về id routine, hoặc null nếu thiếu template/bài tập.
 */
export async function createRoutineFromTemplate(name: string, equipment: Profile['equipment']): Promise<number | null> {
  const t = ROUTINE_TEMPLATES.find(x => x.name === name)
  if (!t) return null
  const bySlug = new Map((await db.exercises.toArray()).map(e => [e.slug, e]))
  const days = filterTemplate(t, bySlug, equipment)
  if (days.length === 0) return null
  return db.routines.add({ name: t.name, source: 'template', days, createdAt: new Date() })
}

/**
 * Tạo template lần đầu cho hồ sơ — lọc bài theo dụng cụ người đó khai báo
 * (chạy sau onboarding vì cần biết equipment; idempotent theo routinesSeedRev).
 * Chế độ nữ (sex 'female') được thêm template thiên về mông/chân.
 */
export async function ensureTemplatesFor(equipment: Profile['equipment'], sex: Profile['sex']): Promise<void> {
  const rSeedRow = await db.settings.get('routinesSeedRev')
  const rSeed = (rSeedRow?.value as number | undefined) ?? 0
  if (rSeed >= ROUTINES_SEED_REV) return
  const exercises = await db.exercises.toArray()
  if (exercises.length === 0) return // thư viện chưa nạp xong — thử lại ở lần mở sau, đừng đốt cờ
  const bySlug = new Map(exercises.map(e => [e.slug, e]))
  const existingNames = new Set((await db.routines.toArray()).map(r => r.name))
  const templates = sex === 'female' ? [...ROUTINE_TEMPLATES, ...FEMALE_TEMPLATES] : ROUTINE_TEMPLATES
  for (const t of templates) {
    if (existingNames.has(t.name)) continue
    const days = filterTemplate(t, bySlug, equipment)
    if (days.length > 0) {
      await db.routines.add({ name: t.name, source: 'template', days, createdAt: new Date() })
    }
  }
  await db.settings.put({ key: 'routinesSeedRev', value: ROUTINES_SEED_REV })
}
