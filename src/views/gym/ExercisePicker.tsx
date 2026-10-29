import { useState } from 'react'
import { MUSCLES } from '../../data/exercises.seed'

interface PickableExercise { slug: string; name: string; nameEn: string; muscle: string; keywords: string[] }

/** Bảng chọn bài tập dùng chung: thêm bài vào buổi tập hoặc vào ngày trong kế hoạch. */
export default function ExercisePicker({ exercises, picked, onPick, onClose }: {
  exercises: PickableExercise[]
  picked: string[]
  onPick: (slug: string) => void
  onClose: () => void
}) {
  const [q, setQ] = useState('')
  const [muscle, setMuscle] = useState<string | null>(null)
  const term = q.trim().toLowerCase()
  const list = exercises
    .filter(e => (muscle ? e.muscle === muscle : true))
    .filter(e => (term ? e.nameEn.toLowerCase().includes(term) || e.name.toLowerCase().includes(term) || e.keywords.some(k => k.includes(term)) : true))
    .sort((a, b) => a.nameEn.localeCompare(b.nameEn, 'en'))

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(6,6,8,.7)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ width: '100%', maxWidth: 520, maxHeight: '82vh', overflowY: 'auto', background: 'var(--bg-0)', borderTop: '1px solid var(--line-2)', borderRadius: '22px 22px 0 0', padding: '16px 18px calc(24px + env(safe-area-inset-bottom))' }} onClick={e => e.stopPropagation()}>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
          <h2 className="h">Thêm bài tập</h2>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer', fontSize: 20 }} aria-label="Đóng">×</button>
        </div>
        <input type="text" placeholder="Tìm bài tập…" value={q} onChange={e => setQ(e.target.value)} aria-label="Tìm bài tập để thêm" />
        <div className="seg" style={{ marginTop: 10 }}>
          <button type="button" className={muscle === null ? 'on' : ''} onClick={() => setMuscle(null)}>Tất cả</button>
          {MUSCLES.map(m => <button key={m.id} type="button" className={muscle === m.id ? 'on' : ''} onClick={() => setMuscle(m.id)}>{m.label}</button>)}
        </div>
        <div style={{ marginTop: 12 }}>
          {list.map(e => (
            <button key={e.slug} type="button" className="kv" style={{ width: '100%', background: 'none', border: 'none', borderBottom: '1px solid var(--line)', cursor: 'pointer', textAlign: 'left', opacity: picked.includes(e.slug) ? 0.45 : 1 }}
              onClick={() => onPick(e.slug)}>
              <b>{e.nameEn}{picked.includes(e.slug) ? ' — đã chọn' : ''}</b>
              <span>{e.nameEn !== e.name ? `${e.name} · ` : ''}{MUSCLES.find(m => m.id === e.muscle)?.label ?? e.muscle}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
