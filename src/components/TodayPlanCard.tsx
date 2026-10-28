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
          <button className="btn" style={{ marginTop: 12 }} onClick={() => onStart(slugs, `${active!.name} · ${weekdayShort(weekday)}`)}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
              <DumbbellIcon /> BẮT ĐẦU TẬP
            </span>
          </button>
        </>
      ) : (
        <>
          <h2 className="h" style={{ marginTop: 4 }}>Buổi tập đang trên đường về.</h2>
          <div className="meta">
            {active
              ? `Hôm nay ${weekdayShort(weekday)} là ngày nghỉ theo ${active.name}. Muốn tập tự do thì sang Thư viện, hoặc nhờ Coach đổi buổi.`
              : 'Chọn kế hoạch bên dưới hoặc nhờ Coach lên lịch — rồi Hôm nay sẽ tự chỉ bài.'}
          </div>
          {onGoPlans && (
            <button className="btn ghost" style={{ marginTop: 12 }} onClick={onGoPlans}>Xem kế hoạch</button>
          )}
        </>
      )}
    </div>
  )
}
