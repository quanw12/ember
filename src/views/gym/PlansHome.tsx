import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db'
import TodayPlanCard from '../../components/TodayPlanCard'
import { weekdayShort, ROUTINE_TEMPLATES, createRoutineFromTemplate } from '../../data/routines.seed'
import { suggestPlans } from '../../lib/planSuggest'

const DAY_CHOICES = [2, 3, 4, 5, 6]

export default function PlansHome({ onStart, onEdit, onOpenPlanner }: {
  onStart: (slugs: string[], name: string) => void
  onEdit: (id: number) => void
  onOpenPlanner: () => void
}) {
  const routines = useLiveQuery(() => db.routines.toArray())
  const activeRow = useLiveQuery(() => db.settings.get('activeRoutineId'))
  const profile = useLiveQuery(() => db.profile.get(1))
  const activeId = activeRow?.value as number | undefined

  // null = theo số buổi khai báo trong hồ sơ; chọn tay thì ghi đè
  const [selDays, setSelDays] = useState<number | null>(null)
  const days = selDays ?? Math.min(6, Math.max(2, profile?.daysGym ?? 3))
  const suggestions = suggestPlans(days, profile?.expLevel ?? 'new')

  const setActive = async (id: number) => { await db.settings.put({ key: 'activeRoutineId', value: id }) }
  const createNew = async () => {
    const name = window.prompt('Tên kế hoạch:', 'Kế hoạch của tôi')
    if (!name?.trim()) return
    const id = await db.routines.add({ name: name.trim(), source: 'custom', days: [], createdAt: new Date() })
    onEdit(id)
  }
  /** Dùng lịch gợi ý: có sẵn thì kích hoạt, chưa có thì tạo từ template rồi kích hoạt. */
  const useSuggestion = async (name: string) => {
    const existing = routines?.find(r => r.name === name)
    let id = existing?.id
    if (id == null) {
      if (!profile) return
      const created = await createRoutineFromTemplate(name, profile.equipment)
      if (created == null) return
      id = created
    }
    await setActive(id)
  }

  return (
    <>
      <div style={{ paddingTop: 14 }}>
        <div className="eyebrow">KẾ HOẠCH</div>
        <h1 className="h">Tuần này đi theo lịch.</h1>
      </div>

      <TodayPlanCard onStart={onStart} />

      <div className="card">
        <div className="eyebrow">GỢI Ý CHO BẠN</div>
        <h2 className="h" style={{ marginTop: 4 }}>Chọn số buổi — mình rcm lịch tương ứng.</h2>
        <div className="seg" style={{ marginTop: 10 }}>
          {DAY_CHOICES.map(n => (
            <button key={n} type="button" className={days === n ? 'on' : ''} onClick={() => setSelDays(n)}>
              {n} buổi
            </button>
          ))}
        </div>
        <div style={{ marginTop: 12 }}>
          {suggestions.map((s, i) => {
            const existing = routines?.find(r => r.name === s.name)
            const isActive = existing != null && existing.id === activeId
            const chips = ROUTINE_TEMPLATES.find(t => t.name === s.name)?.days.map(d => weekdayShort(d.weekday)).join(' · ')
            return (
              <div className="kv" key={s.name} style={{ alignItems: 'flex-start' }}>
                <b style={{ flex: 1 }}>
                  {i === 0 && <span className="streak" style={{ color: 'var(--ember)', marginRight: 6 }}>⭐ RCM</span>}
                  {s.name}
                  <span style={{ display: 'block', fontWeight: 400, color: 'var(--text-2)', fontSize: 12.5, marginTop: 2 }}>
                    {chips && <span style={{ color: 'var(--text-3)' }}>{chips} — </span>}{s.tagline}
                    {existing && <span style={{ color: 'var(--text-3)' }}> (đã có trong danh sách)</span>}
                  </span>
                </b>
                <span>
                  {isActive
                    ? <span className="streak" style={{ color: 'var(--red-soft)' }}>ĐANG DÙNG</span>
                    : <button type="button" className="btn ghost" style={{ width: 'auto', padding: '8px 14px', fontSize: 11, margin: 0 }} onClick={() => useSuggestion(s.name)}>
                        {existing ? 'Dùng' : 'Tạo & dùng'}
                      </button>}
                </span>
              </div>
            )
          })}
        </div>
        <div className="note">Gợi ý lọc theo trình độ ({profile?.expLevel === 'new' ? 'người mới' : profile?.expLevel === 'mid' ? '1–3 năm' : '3+ năm'}) — bài được lọc theo dụng cụ bạn khai báo.</div>
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
        <button className="btn" style={{ marginTop: 12 }} onClick={onOpenPlanner}>LẬP LỊCH TUẦN MỚI (CÓ GỢI Ý)</button>
        <button className="btn ghost" style={{ marginTop: 10 }} onClick={createNew}>+ Kế hoạch trống</button>
      </div>

      <p className="note">
        Bấm vào tên kế hoạch để soạn từng ngày: thêm/bỏ bài, sắp thứ tự. Template được lọc theo dụng cụ bạn khai báo lúc onboarding. Kế hoạch "ĐANG DÙNG" sẽ hiện buổi tương ứng ở tab Hôm nay.
      </p>
    </>
  )
}
