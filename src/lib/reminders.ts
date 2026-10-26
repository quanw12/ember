import { db, todayStr } from '../db'
import { jsDayToWeekday } from '../data/routines.seed'

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

  const done = (await db.sessions.where('date').equals(today).toArray()).some(s => s.endedAt != null)
  if (done) { firedOn = today; return }

  const activeRow = await db.settings.get('activeRoutineId')
  const routine = activeRow ? await db.routines.get(activeRow.value as number) : undefined
  const wd = jsDayToWeekday(now.getDay())
  const slugs = routine?.days.find(x => x.weekday === wd)?.slugs ?? []

  let body = 'Giữ lửa — mở EMBER và bắt đầu thôi.'
  if (slugs.length > 0 && routine) {
    const exercises = await db.exercises.toArray()
    const nameOf = new Map(exercises.map(e => [e.slug, e.name]))
    body = `Hôm nay: ${routine.name} — ${slugs.map(s => nameOf.get(s) ?? s).join(', ')}`
  }
  try {
    new Notification('EMBER — giờ tập', { body })
    firedOn = today
  } catch { /* trình duyệt chặn — thử lại lần sau */ }
}
