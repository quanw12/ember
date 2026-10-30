import { useState } from 'react'
import { MUSCLES } from '../../data/exercises.seed'
import MuscleFigure, { preferredView } from '../../components/MuscleFigure'

/** Trên số kết quả này mới vẽ thumbnail cơ (SVG) — chặn quá tải DOM khi hiện cả 876 bài. */
const THUMB_LIMIT = 150

const muscleLabel = (id: string): string => MUSCLES.find(m => m.id === id)?.label ?? id

interface PickableExercise { slug: string; name: string; nameEn: string; muscle: string; keywords: string[] }

/** Bảng chọn bài tập dùng chung: thêm bài vào buổi tập hoặc vào ngày trong kế hoạch.
 *  Panel rộng, mỗi bài kèm mô hình cơ mini — nhóm cơ của bài sáng đỏ. Tên tiếng Anh là chính. */
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
  const showThumbs = list.length <= THUMB_LIMIT

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(6,6,8,.7)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ width: '100%', maxWidth: 760, maxHeight: '90vh', overflowY: 'auto', background: 'var(--bg-0)', borderTop: '1px solid var(--line-2)', borderRadius: '22px 22px 0 0', padding: '16px 20px calc(24px + env(safe-area-inset-bottom))' }} onClick={e => e.stopPropagation()}>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
          <h2 className="h">Thêm bài tập</h2>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer', fontSize: 20 }} aria-label="Đóng">×</button>
        </div>
        <input type="text" placeholder="Tìm bài tập…" value={q} onChange={e => setQ(e.target.value)} aria-label="Tìm bài tập để thêm" />
        <div className="seg" style={{ marginTop: 10, flexWrap: 'wrap' }}>
          <button type="button" className={muscle === null ? 'on' : ''} onClick={() => setMuscle(null)}>Tất cả</button>
          {MUSCLES.map(m => <button key={m.id} type="button" className={muscle === m.id ? 'on' : ''} onClick={() => setMuscle(m.id)}>{m.label}</button>)}
        </div>
        <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '0 20px' }}>
          {list.slice(0, THUMB_LIMIT).map(e => (
            <button key={e.slug} type="button"
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: 'none', borderBottom: '1px solid var(--line)', cursor: 'pointer', textAlign: 'left', padding: '7px 2px', opacity: picked.includes(e.slug) ? 0.45 : 1 }}
              onClick={() => onPick(e.slug)}>
              <span style={{ flex: 'none', width: 26, display: 'inline-flex', justifyContent: 'center' }} aria-hidden="true">
                <MuscleFigure highlight={[e.muscle]} view={preferredView(e.muscle)} height={50} />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <b style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {e.nameEn}{picked.includes(e.slug) ? ' — đã chọn' : ''}
                </b>
                <span style={{ color: 'var(--text-2)', fontSize: 12 }}>
                  {e.nameEn !== e.name ? `${e.name} · ` : ''}{muscleLabel(e.muscle)}
                </span>
              </span>
            </button>
          ))}
        </div>
        {!showThumbs && <div className="note">Đang hiện {THUMB_LIMIT} kết quả đầu — gõ từ khoá hoặc chọn nhóm cơ để lọc thêm (thumbnail cơ chỉ hiện khi kết quả ngắn).</div>}
      </div>
    </div>
  )
}
