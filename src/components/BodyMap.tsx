import { MUSCLES } from '../data/exercises.seed'

/**
 * Bản đồ cơ thể tương tác: hình trước + hình sau, từng khối cơ là vùng bấm được.
 * Bấm để chọn/bỏ nhóm cơ cho ngày đang soạn trong WeeklyPlanner; nhóm đã chọn
 * tô đỏ, hover rõ hơn. Chú thích chip bên dưới làm phương án thay thế cho accessibility.
 */

const muscleLabel = (id: string): string => MUSCLES.find(m => m.id === id)?.label ?? id

/** Mảng cơ = danh sách path; tách path bằng '|'. */
interface Region { muscle: string; label: string; d: string }

/** Hình TRƯỚC: vai, ngực, tay trước, cẳng tay, bụng, đùi trước, ống chân. */
const FRONT: Region[] = [
  { muscle: 'shoulders', label: 'Vai trước', d: 'M36.5 40 a10 8 0 1 0 .01 0 Z | M83.5 40 a10 8 0 1 0 .01 0 Z' },
  { muscle: 'chest', label: 'Ngực', d: 'M47 33 h11 v15 a5.5 5 0 0 1 -11 0 Z | M62 33 h11 v15 a5.5 5 0 0 1 -11 0 Z' },
  { muscle: 'biceps', label: 'Tay trước', d: 'M36.5 46 a5.5 11 0 1 0 .01 0 Z | M83.5 46 a5.5 11 0 1 0 .01 0 Z' },
  { muscle: 'forearms', label: 'Cẳng tay', d: 'M36.5 71 a5 14 0 1 0 .01 0 Z | M83.5 71 a5 14 0 1 0 .01 0 Z' },
  { muscle: 'core', label: 'Cơ bụng', d: 'M50 57 h20 v38 a8 8 0 0 1 -8 8 h-4 a8 8 0 0 1 -8 -8 Z' },
  { muscle: 'quads', label: 'Đùi trước', d: 'M46.5 116 h10.5 v37 a5.2 5 0 0 1 -10.5 0 Z | M63 116 h10.5 v37 a5.2 5 0 0 1 -10.5 0 Z' },
  { muscle: 'calves', label: 'Ống chân', d: 'M52 172 a5 14 0 1 0 .01 0 Z | M68 172 a5 14 0 1 0 .01 0 Z' }
]

/** Hình SAU: cổ/lưng xà, cánh lưng, lưng dưới, vai sau, tay sau, cẳng tay, mông, gân kheo, bắp chân. */
const BACK: Region[] = [
  { muscle: 'back', label: 'Cổ & lưng xà', d: 'M45 30 L60 24 L75 30 L71 38 L49 38 Z' },
  { muscle: 'back', label: 'Lưng xà (cánh)', d: 'M48 40 L58 44 L56 64 L46 60 Z | M72 40 L62 44 L64 64 L74 60 Z' },
  { muscle: 'back', label: 'Lưng dưới', d: 'M53 64 h14 v16 a4 4 0 0 1 -14 0 Z' },
  { muscle: 'shoulders', label: 'Vai sau', d: 'M36.5 40 a10 8 0 1 0 .01 0 Z | M83.5 40 a10 8 0 1 0 .01 0 Z' },
  { muscle: 'triceps', label: 'Tay sau', d: 'M36.5 46 a5.5 11 0 1 0 .01 0 Z | M83.5 46 a5.5 11 0 1 0 .01 0 Z' },
  { muscle: 'forearms', label: 'Cẳng tay', d: 'M36.5 71 a5 14 0 1 0 .01 0 Z | M83.5 71 a5 14 0 1 0 .01 0 Z' },
  { muscle: 'glutes', label: 'Cơ mông', d: 'M53.5 96 a8 10 0 1 0 .01 0 Z | M66.5 96 a8 10 0 1 0 .01 0 Z' },
  { muscle: 'hamstrings', label: 'Gân kheo', d: 'M46.5 116 h10.5 v35 a5.2 5 0 0 1 -10.5 0 Z | M63 116 h10.5 v35 a5.2 5 0 0 1 -10.5 0 Z' },
  { muscle: 'calves', label: 'Bắp chân', d: 'M52 170 a5 14 0 1 0 .01 0 Z | M68 170 a5 14 0 1 0 .01 0 Z' }
]

/** Khung người — shape tường minh, không dùng path arc kiểu circle-trick. */
function BodySilhouette() {
  return (
    <g className="bm-body-g">
      <circle cx="60" cy="14" r="9" />
      <rect x="55" y="21" width="10" height="8" rx="3" />
      <rect x="44" y="28" width="32" height="78" rx="13" />
      <rect x="47" y="98" width="26" height="18" rx="8" />
      <rect x="31" y="36" width="11" height="66" rx="5.5" />
      <rect x="78" y="36" width="11" height="66" rx="5.5" />
      <circle cx="36.5" cy="106" r="4" />
      <circle cx="83.5" cy="106" r="4" />
      <rect x="46" y="112" width="12" height="108" rx="6" />
      <rect x="62" y="112" width="12" height="108" rx="6" />
      <rect x="44" y="218" width="15" height="6" rx="3" />
      <rect x="61" y="218" width="15" height="6" rx="3" />
    </g>
  )
}

export default function BodyMap({ selected, onToggle }: {
  selected: string[]
  onToggle: (muscle: string) => void
}) {
  const fig = (regions: Region[], caption: string) => (
    <div className="bm-fig">
      <svg viewBox="0 0 120 232" width="100%" role="group" aria-label={`Cơ thể mặt ${caption}`} style={{ display: 'block' }}>
        <BodySilhouette />
        {regions.map((r, i) => (
          r.d.split('|').map((d, j) => (
            <path key={`${i}-${j}`} d={d.trim()}
              className={`bm-region${selected.includes(r.muscle) ? ' on' : ''}`}
              onClick={() => onToggle(r.muscle)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(r.muscle) } }}
              tabIndex={0} role="button"
              aria-pressed={selected.includes(r.muscle)}
              aria-label={`${r.label} (${muscleLabel(r.muscle)})`}>
              <title>{r.label} — {selected.includes(r.muscle) ? 'bấm để bỏ' : 'bấm để chọn'}</title>
            </path>
          ))
        ))}
      </svg>
      <div className="bm-caption">{caption}</div>
    </div>
  )

  return (
    <div>
      <div className="bm-wrap">
        {fig(FRONT, 'Trước')}
        {fig(BACK, 'Sau')}
      </div>
      <div className="bm-legend" aria-label="Chọn nhanh nhóm cơ">
        {MUSCLES.filter(m => m.id !== 'other').map(m => (
          <button key={m.id} type="button"
            className={`bm-chip${selected.includes(m.id) ? ' on' : ''}`}
            onClick={() => onToggle(m.id)}
            aria-pressed={selected.includes(m.id)}>
            {m.label}
          </button>
        ))}
      </div>
    </div>
  )
}
