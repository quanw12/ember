import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { jsDayToWeekday, weekdayShort } from '../data/routines.seed'
import { makeNameOf } from '../lib/gym'
import { DumbbellIcon } from './icons'

/**
 * Card "buổi hôm nay theo kế hoạch đang dùng" — dùng chung cho tab Hôm nay
 * và tab Gym → Kế hoạch, tránh lặp logic + giao diện ở hai nơi.
 */
export default function TodayPlanCard({ onStart, onGoPlans }: {
  onStart: (slugs: string[], name: string) => void
  onGoPlans?: () => void
}) {
  const activeRow = useLiveQuery(() => db.settings.get('activeRoutineId'))
  const routines = useLiveQuery(() => db.routines.toArray())
  const exercises = useLiveQuery(() => db.exercises.toArray())
  const nameOf = makeNameOf(exercises)

  const weekday = jsDayToWeekday(new Date().getDay())
  const active = routines?.find(r => r.id === (activeRow?.value as number | undefined))
  const todayDay = active?.days.find(d => d.weekday === weekday)
  const slugs = todayDay?.slugs ?? []

  return (
    <div className="card">
      <div className="eyebrow">
        GYM · {weekdayShort(weekday).toUpperCase()}
        {active ? ` · ${active.name.toUpperCase()}` : ''}
      </div>
      {slugs.length > 0 ? (
        <>
          <h2 className="h" style={{ marginTop: 4 }}>Hôm nay: {slugs.length} bài</h2>
          <div className="meta">{slugs.map(s => nameOf(s).en).join(' · ')}</div>
          <div className="meta">Bài đã có sẵn trong buổi. Bấm bắt đầu rồi kết thúc khi xong.</div>
          <button className="btn" style={{ marginTop: 12 }} onClick={() => onStart(slugs, `${active!.name} · ${weekdayShort(weekday)}`)}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
              <DumbbellIcon className="button-icon" /> BẮT ĐẦU TẬP
            </span>
          </button>
        </>
      ) : (
        <>
          <h2 className="h" style={{ marginTop: 4 }}>Sẵn sàng vào buổi.</h2>
          <div className="meta">Bấm bắt đầu, tập xong thì kết thúc. Kế hoạch và thư viện để bạn tự xem — không cần thêm từng bài vào lịch.</div>
          <button className="btn" style={{ marginTop: 12 }} onClick={() => onStart([], 'Buổi tập tự do')}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
              <DumbbellIcon className="button-icon" /> BẮT ĐẦU TẬP
            </span>
          </button>
          {onGoPlans && (
            <button className="btn ghost" onClick={onGoPlans}>Xem kế hoạch</button>
          )}
        </>
      )}
    </div>
  )
}
