import type { RoutineDay } from '../db'

export const WEEKDAYS = ['Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy', 'Chủ nhật']
export const WEEKDAYS_SHORT = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

export const weekdayLabel = (w: number): string => WEEKDAYS[w - 1] ?? `Ngày ${w}`
export const weekdayShort = (w: number): string => WEEKDAYS_SHORT[w - 1] ?? `N${w}`
/** JS getDay(): 0=CN…6=T7 → weekday 1..7 (T2..CN). */
export const jsDayToWeekday = (js: number): number => (js === 0 ? 7 : js)

interface TemplateDay { weekday: number; slugs: string[] }
interface Template { name: string; days: TemplateDay[] }

/** Template dựng theo chuẩn phổ biến: StrongLifts/Starting Strength (full body), Upper/Lower cổ điển, PPL, PHUL. */
export const ROUTINES_SEED_REV = 2

export const ROUTINE_TEMPLATES: Template[] = [
  {
    name: 'Full Body 3 buổi',
    days: [
      { weekday: 2, slugs: ['back-squat', 'bench-press', 'barbell-row', 'plank'] },
      { weekday: 4, slugs: ['deadlift', 'ohp', 'lat-pulldown', 'hanging-leg-raise'] },
      { weekday: 6, slugs: ['leg-press', 'incline-db-press', 'one-arm-row', 'cable-crunch'] }
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
    name: 'PPL 6 buổi',
    days: [
      { weekday: 2, slugs: ['bench-press', 'incline-db-press', 'seated-db-press', 'lateral-raise', 'triceps-pushdown'] },
      { weekday: 3, slugs: ['lat-pulldown', 'barbell-row', 'face-pull', 'barbell-curl', 'cable-curl'] },
      { weekday: 4, slugs: ['back-squat', 'rdl', 'leg-extension', 'leg-curl', 'standing-calf'] },
      { weekday: 5, slugs: ['bench-press', 'incline-db-press', 'seated-db-press', 'lateral-raise', 'triceps-pushdown'] },
      { weekday: 6, slugs: ['lat-pulldown', 'barbell-row', 'face-pull', 'barbell-curl', 'cable-curl'] },
      { weekday: 7, slugs: ['back-squat', 'rdl', 'leg-extension', 'leg-curl', 'standing-calf'] }
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
  }
]
