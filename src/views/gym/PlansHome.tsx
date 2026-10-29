import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db'
import TodayPlanCard from '../../components/TodayPlanCard'

export default function PlansHome({ onStart, onEdit, onOpenPlanner }: {
  onStart: (slugs: string[], name: string) => void
  onEdit: (id: number) => void
  onOpenPlanner: () => void
}) {
  const routines = useLiveQuery(() => db.routines.toArray())
  const activeRow = useLiveQuery(() => db.settings.get('activeRoutineId'))
  const activeId = activeRow?.value as number | undefined

  const setActive = async (id: number) => { await db.settings.put({ key: 'activeRoutineId', value: id }) }
  const createNew = async () => {
    const name = window.prompt('Tên kế hoạch:', 'Kế hoạch của tôi')
    if (!name?.trim()) return
    const id = await db.routines.add({ name: name.trim(), source: 'custom', days: [], createdAt: new Date() })
    onEdit(id)
  }

  return (
    <>
      <div style={{ paddingTop: 14 }}>
        <div className="eyebrow">KẾ HOẠCH</div>
        <h1 className="h">Tuần này đi theo lịch.</h1>
      </div>

      <TodayPlanCard onStart={onStart} />

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
        <button className="btn" style={{ marginTop: 12 }} onClick={onOpenPlanner}>LẬP LỊCH TUẦN MỚI (CÓ GỢI Ý)</button>
        <button className="btn ghost" style={{ marginTop: 10 }} onClick={createNew}>+ Kế hoạch trống</button>
      </div>

      <p className="note">
        Bấm vào tên kế hoạch để soạn từng ngày: thêm/bỏ bài, sắp thứ tự. Template được lọc theo dụng cụ bạn khai báo lúc onboarding. Kế hoạch "ĐANG DÙNG" sẽ hiện buổi tương ứng ở tab Hôm nay.
      </p>
    </>
  )
}
