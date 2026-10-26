import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type RoutineDay } from '../../db'
import { WEEKDAYS, weekdayShort } from '../../data/routines.seed'
import ExercisePicker from './ExercisePicker'

export default function PlanEditor({ id, onBack }: { id: number; onBack: () => void }) {
  const routine = useLiveQuery(() => db.routines.get(id))
  const exercises = useLiveQuery(() => db.exercises.toArray())
  const activeRow = useLiveQuery(() => db.settings.get('activeRoutineId'))
  const activeId = activeRow?.value as number | undefined
  const [nameDraft, setNameDraft] = useState<string | null>(null)
  const [pickerDay, setPickerDay] = useState<number | null>(null)

  if (!routine) return null
  const r = routine
  const nameOf = (slug: string): string => exercises?.find(e => e.slug === slug)?.name ?? slug

  const setDays = async (days: RoutineDay[]) => { await db.routines.update(id, { days }) }
  const saveName = async () => {
    const v = (nameDraft ?? '').trim()
    if (v && v !== r.name) await db.routines.update(id, { name: v })
    setNameDraft(null)
  }
  const addSlug = async (weekday: number, slug: string) => {
    const days = r.days.map(d => ({ ...d, slugs: [...d.slugs] }))
    const day = days.find(x => x.weekday === weekday)
    if (day) {
      if (!day.slugs.includes(slug)) day.slugs.push(slug)
    } else {
      days.push({ weekday, slugs: [slug] })
    }
    await setDays(days)
    setPickerDay(null)
  }
  const removeSlug = async (weekday: number, idx: number) => {
    await setDays(r.days.map(d => (d.weekday === weekday ? { ...d, slugs: d.slugs.filter((_, i) => i !== idx) } : d)))
  }
  const move = async (weekday: number, idx: number, dir: -1 | 1) => {
    const day = r.days.find(d => d.weekday === weekday)
    if (!day) return
    const j = idx + dir
    if (j < 0 || j >= day.slugs.length) return
    const slugs = [...day.slugs]
    ;[slugs[idx], slugs[j]] = [slugs[j], slugs[idx]]
    await setDays(r.days.map(d => (d.weekday === weekday ? { ...d, slugs } : d)))
  }
  const makeActive = async () => { await db.settings.put({ key: 'activeRoutineId', value: id }) }
  const del = async () => {
    if (!window.confirm(`Xoá kế hoạch "${r.name}"?`)) return
    if (activeId === id) await db.settings.delete('activeRoutineId')
    await db.routines.delete(id)
    onBack()
  }

  return (
    <>
      <div style={{ paddingTop: 18 }}>
        <button type="button" onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer', fontSize: 13, padding: 0 }}>← Kế hoạch</button>
        <input type="text" value={displayNameSafe(r, nameDraft)} onChange={e => setNameDraft(e.target.value)} onBlur={saveName}
          onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
          style={{ background: 'transparent', border: 'none', borderBottom: '1px dashed var(--line-2)', borderRadius: 0, padding: '2px 0', fontSize: 20, fontWeight: 800, color: 'var(--text-1)', marginTop: 4 }}
          aria-label="Tên kế hoạch" />
        <div className="meta">{r.source === 'template' ? 'Từ template' : 'Tự tạo'}{activeId === id ? ' · đang dùng' : ''}</div>
      </div>

      {activeId !== id && <button className="btn" style={{ marginTop: 12 }} onClick={makeActive}>ĐẶT LÀM KẾ HOẠCH HOẠT ĐỘNG</button>}

      {[1, 2, 3, 4, 5, 6, 7].map(wd => {
        const day = r.days.find(d => d.weekday === wd)
        const slugs = day?.slugs ?? []
        return (
          <div className="card" key={wd} style={{ padding: 14 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div className="eyebrow">{weekdayShort(wd)} · {WEEKDAYS[wd - 1]}</div>
              <button type="button" onClick={() => setPickerDay(wd)} style={{ background: 'none', border: 'none', color: 'var(--red-soft)', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>+ Thêm bài</button>
            </div>
            {slugs.length === 0 && <div className="meta" style={{ marginTop: 6 }}>Nghỉ</div>}
            {slugs.map((slug, idx) => (
              <div className="kv" key={slug}>
                <b>{nameOf(slug)}</b>
                <span style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <IconBtn label="Lên" disabled={idx === 0} onClick={() => move(wd, idx, -1)}>↑</IconBtn>
                  <IconBtn label="Xuống" disabled={idx === slugs.length - 1} onClick={() => move(wd, idx, 1)}>↓</IconBtn>
                  <IconBtn label="Bỏ" onClick={() => removeSlug(wd, idx)}>×</IconBtn>
                </span>
              </div>
            ))}
          </div>
        )
      })}

      <button className="btn danger" style={{ marginTop: 14 }} onClick={del}>Xoá kế hoạch này</button>

      {pickerDay != null && (
        <ExercisePicker exercises={exercises ?? []} picked={r.days.find(d => d.weekday === pickerDay)?.slugs ?? []}
          onPick={slug => addSlug(pickerDay, slug)} onClose={() => setPickerDay(null)} />
      )}
    </>
  )
}

function displayNameSafe(r: { name: string }, draft: string | null): string {
  return draft ?? r.name
}

function IconBtn({ children, onClick, disabled, label }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; label: string }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label}
      style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--line-2)', background: 'transparent', color: disabled ? 'var(--text-3)' : 'var(--text-2)', cursor: disabled ? 'default' : 'pointer', fontSize: 14, opacity: disabled ? 0.4 : 1 }}>
      {children}
    </button>
  )
}
