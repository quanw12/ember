import { db, type Exercise, type Run, type Session } from '../db'
import { jsDayToWeekday } from '../data/routines.seed'

/** Đầu tuần (thứ hai) của một ngày bất kỳ — dùng chung cho biểu đồ tuần. */
export function weekStart(d: Date): Date {
  const x = new Date(d)
  const day = (x.getDay() + 6) % 7
  x.setDate(x.getDate() - day)
  x.setHours(0, 0, 0, 0)
  return x
}

/** Ngày đã có buổi tập HOÀN THÀNH (session kết thúc) hoặc buổi chạy — dùng cho streak + lịch lửa. */
export function workoutDates(sessions: Session[] | undefined, runs: Run[] | undefined): Set<string> {
  const set = new Set<string>()
  for (const s of sessions ?? []) if (s.endedAt != null) set.add(s.date)
  for (const r of runs ?? []) set.add(r.date)
  return set
}

/** Streak giữ lửa: đếm lùi từ hôm nay (hôm nay chưa tập thì đếm từ hôm qua). */
export function streakOf(workedOut: Set<string>, todayISO: string): number {
  let streak = 0
  const cursor = new Date(todayISO + 'T00:00:00')
  if (!workedOut.has(todayISO)) cursor.setDate(cursor.getDate() - 1)
  for (let i = 0; i < 366; i++) {
    if (!workedOut.has(localIso(cursor))) break
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

/** ISO date theo giờ máy — đừng dùng toISOString (dịch theo UTC, sai ở múi giờ +). */
export function localIso(d: Date): string {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/* ------------------------------------------------------------------ */
/* Tên bài tập: tiếng Anh là tên chính, tiếng Việt làm phụ.            */
/* ------------------------------------------------------------------ */

export interface ExNames { en: string; vi: string }

export function exNames(e: Pick<Exercise, 'name' | 'nameEn'>): ExNames {
  const en = (e.nameEn ?? '').trim() || e.name
  const vi = e.name.trim() !== en ? e.name : ''
  return { en, vi }
}

/** Builder `nameOf` dùng chung — mọi nơi chỉ nên qua đây. */
export function makeNameOf(exercises: Exercise[] | undefined): (slug: string) => ExNames {
  const bySlug = new Map((exercises ?? []).map(e => [e.slug, e]))
  return slug => {
    const e = bySlug.get(slug)
    if (!e) return { en: slug, vi: '' }
    return exNames(e)
  }
}

/** Nút video: link tới TRANG TÌM KIẾM đã điền sẵn từ khoá bài tập. */
export function videoLinks(en: string): { tiktok: string; youtube: string } {
  const q = `${en} proper form tutorial`
  return {
    tiktok: `https://www.tiktok.com/search?q=${encodeURIComponent(`${en} gym tutorial`)}`,
    youtube: `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`
  }
}

/* ------------------------------------------------------------------ */
/* Buổi hôm nay theo kế hoạch đang dùng — một nguồn duy nhất.          */
/* ------------------------------------------------------------------ */

export interface TodayPlan {
  routineId: number | undefined
  routineName: string
  weekday: number
  slugs: string[]
}

export async function todayPlanOf(): Promise<TodayPlan | null> {
  const activeRow = await db.settings.get('activeRoutineId')
  const id = activeRow?.value as number | undefined
  const routine = id != null ? await db.routines.get(id) : undefined
  if (!routine) return null
  const weekday = jsDayToWeekday(new Date().getDay())
  const day = routine.days.find(d => d.weekday === weekday)
  return { routineId: routine.id, routineName: routine.name, weekday, slugs: day?.slugs ?? [] }
}
