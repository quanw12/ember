import { db } from '../db'
import { jsDayToWeekday } from '../data/routines.seed'

const pad = (n: number): string => String(n).padStart(2, '0')
const esc = (s: string): string =>
  s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')

/** Xuất lịch 14 ngày tới ra file .ics — mở bằng Apple Calendar trên iPhone là có nhắc. */
export async function exportIcs(): Promise<void> {
  const remRow = await db.settings.get('reminder')
  const cfg = (remRow?.value ?? {}) as { hour?: number; minute?: number }
  const hour = cfg.hour ?? 18
  const minute = cfg.minute ?? 0

  const activeRow = await db.settings.get('activeRoutineId')
  const routine = activeRow ? await db.routines.get(activeRow.value as number) : undefined
  const exercises = await db.exercises.toArray()
  const nameOf = new Map(exercises.map(e => [e.slug, e.nameEn || e.name]))

  const lines: string[] = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//EMBER//VI', 'CALSCALE:GREGORIAN']
  for (let i = 1; i <= 14; i++) {
    const d = new Date()
    d.setDate(d.getDate() + i)
    const wd = jsDayToWeekday(d.getDay())
    const slugs = routine?.days.find(x => x.weekday === wd)?.slugs ?? []
    const title = slugs.length > 0 ? `EMBER — ${routine!.name}` : 'EMBER — Giờ tập'
    const desc = slugs.map(s => nameOf.get(s) ?? s).join(', ')
    const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hour, minute + 60)
    const dtStart = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(hour)}${pad(minute)}00`
    const dtEnd = `${end.getFullYear()}${pad(end.getMonth() + 1)}${pad(end.getDate())}T${pad(end.getHours())}${pad(end.getMinutes())}00`
    lines.push(
      'BEGIN:VEVENT',
      `UID:ember-${dtStart}-${i}@ember.app`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${esc(title)}`,
      `DESCRIPTION:${esc(desc)}`,
      'END:VEVENT'
    )
  }
  lines.push('END:VCALENDAR')

  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'ember-lich-tap.ics'
  a.click()
  URL.revokeObjectURL(url)
}
