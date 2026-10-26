import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db'
import { weekdayLabel, weekdayShort, jsDayToWeekday } from '../../data/routines.seed'

export default function PlansHome({ onStart, onEdit }: {
  onStart: (slugs: string[], name: string) => void
  onEdit: (id: number) => void
}) {
  const routines = useLiveQuery(() => db.routines.toArray())
  const activeRow = useLiveQuery(() => db.settings.get('activeRoutineId'))
  const exercises = useLiveQuery(() => db.exercises.toArray())
  const activeId = activeRow?.value as number | undefined

  const nameOf = (slug: string): string => exercises?.find(e => e.slug === slug)?.name ?? slug
  const active = routines?.find(r => r.id === activeId)
  const today = jsDayToWeekday(new Date().getDay())
  const todayDay = active?.days.find(d => d.weekday === today)

  const setActive = async (id: number) => { await db.settings.put({ key: 'activeRoutineId', value: id }) }
  const createNew = async () => {
    const name = window.prompt('Tên kế hoạch:', 'Kế hoạch của tôi')
    if (!name?.trim()) return
    const id = await db.routines.add({ name: name.trim(), source: 'custom', days: [], createdAt: new Date() })
    onEdit(id)
  }
  const startToday = () => {
    if (!active || !todayDay || todayDay.slugs.length === 0) return
    onStart(todayDay.slugs, `${active.name} · ${weekdayLabel(today)}`)
  }

  return (
    <>
      <div style={{ paddingTop: 14 }}>
        <div className="eyebrow">KẾ HOẠCH</div>
        <h1 className="h">Tuần này đi theo lịch.</h1>
      </div>

      <div className="card">
        <div className="eyebrow">HÔM NAY · {weekdayShort(today).toUpperCase()}</div>
        {active && todayDay && todayDay.slugs.length > 0 ? (
          <>
            <h2 className="h" style={{ marginTop: 4 }}>{active.name}</h2>
            <div className="meta">{todayDay.slugs.map(nameOf).join(' · ')}</div>
            <button className="btn" style={{ marginTop: 12 }} onClick={startToday}>TẬP BUỔI NÀY</button>
          </>
        ) : (
          <div className="meta" style={{ marginTop: 6 }}>
            {active
              ? `Hôm nay ${weekdayShort(today)} là ngày nghỉ theo ${active.name}. Muốn tập tự do thì sang Thư viện.`
              : 'Chưa chọn kế hoạch hoạt động — chọn một kế hoạch bên dưới hoặc tập tự do ở Thư viện.'}
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 14 }}>
        <div className="eyebrow">CÁC KẾ HOẠCH</div>
        {(routines ?? []).length === 0 && <div className="meta" style={{ marginTop: 6 }}>Chưa có kế hoạch nào.</div>}
        {(routines ?? []).map(r => {
          const days = r.days.filter(d => d.slugs.length > 0).length
          return (
            <div className="kv" key={r.id}>
              <b>
                <button type="button" onClick={() => onEdit(r.id!)} style={{ background: 'none', border: 'none', color: 'var(--text-1)', font: 'inherit', fontWeight: 700, cursor: 'pointer', textAlign: 'left' }}>
                  {r.name}
                </button>
                <span style={{ display: 'block', fontWeight: 400, color: 'var(--text-2)', fontSize: 12 }}>
                  {days} buổi/tuần · {r.source === 'template' ? 'template' : 'tự tạo'}
                </span>
              </b>
              <span>
                {r.id === activeId
                  ? <span className="streak" style={{ color: 'var(--red-soft)' }}>ĐANG DÙNG</span>
                  : <button type="button" className="btn ghost" style={{ width: 'auto', padding: '8px 14px', fontSize: 11, margin: 0 }} onClick={() => setActive(r.id!)}>Dùng</button>}
              </span>
            </div>
          )
        })}
        <button className="btn ghost" style={{ marginTop: 12 }} onClick={createNew}>+ Kế hoạch mới</button>
      </div>

      <p className="note">
        Bấm vào tên kế hoạch để soạn từng ngày: thêm/bỏ bài, sắp thứ tự. Kế hoạch "ĐANG DÙNG" sẽ hiện buổi tương ứng ở tab Hôm nay.
      </p>
    </>
  )
}
