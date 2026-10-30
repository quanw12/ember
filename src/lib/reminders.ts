import { db, todayStr } from '../db'
import { jsDayToWeekday } from '../data/routines.seed'
import { isWeekend, plannedThisWeek, workoutDates } from './gym'

export interface ReminderCfg {
  enabled: boolean
  hour: number
  minute: number
}

let firedOn = ''

/**
 * Nhắc nhở tử tế (đúng luật đã chốt): 1 lần/ngày đúng giờ hẹn,
 * im khi buổi hôm nay đã xong, chỉ hoạt động khi app đang mở
 * (iOS PWA không cho web push nền — kèm phương án .ics/Shortcuts trong Hồ sơ).
 */
export async function tickReminder(): Promise<void> {
  const today = todayStr()
  if (firedOn === today) return
  const row = await db.settings.get('reminder')
  const cfg = row?.value as ReminderCfg | undefined
  if (!cfg?.enabled) return
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  const now = new Date()
  if (now.getHours() !== cfg.hour || now.getMinutes() !== cfg.minute) return

  // "Im khi đã có lửa hôm nay": buổi gym hoàn thành, buổi chạy, hay chỉ check-in thắp lửa
  const [sessionsToday, runsToday, checkinsToday] = await Promise.all([
    db.sessions.where('date').equals(today).toArray(),
    db.runs.where('date').equals(today).toArray(),
    db.checkins.where('date').equals(today).toArray()
  ])
  if (workoutDates(sessionsToday, runsToday, checkinsToday).has(today)) { firedOn = today; return }

  const activeRow = await db.settings.get('activeRoutineId')
  const routine = activeRow ? await db.routines.get(activeRow.value as number) : undefined
  const wd = jsDayToWeekday(now.getDay())
  const slugs = routine?.days.find(x => x.weekday === wd)?.slugs ?? []

  let body = 'Giữ lửa — mở EMBER và bắt đầu thôi.'
  if (slugs.length > 0 && routine) {
    const exercises = await db.exercises.toArray()
    const nameOf = new Map(exercises.map(e => [e.slug, e.nameEn || e.name]))
    body = `Hôm nay: ${routine.name} — ${slugs.map(s => nameOf.get(s) ?? s).join(', ')}`
  }

  // Cuối tuần mà chưa lập lịch tuần mới thì ưu tiên nhắc việc đó trước
  const plannedRow = await db.settings.get('weeklyPlannedOn')
  if (isWeekend(now) && !plannedThisWeek(plannedRow?.value as string | undefined)) {
    body = 'Cuối tuần rồi — lên lịch tuần mới: chọn ngày + nhóm cơ, EMBER gợi ý bài cho bạn chọn.'
  }
  try {
    new Notification('EMBER — giờ tập', { body })
    firedOn = today
  } catch { /* trình duyệt chặn — thử lại lần sau */ }
}
