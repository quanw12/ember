import BodyFigure from './BodyFigure'
import { MUSCLES } from '../data/exercises.seed'

/**
 * Bản đồ cơ cho WeeklyPlanner. Trap và lat nằm trên hình, nhưng lịch vẫn lưu id `back`
 * vì thư viện chưa tách hai nhóm đó thành muscle riêng.
 */

function plannerMuscle(id: string): string {
  return id === 'traps' || id === 'lats' ? 'back' : id
}

export default function BodyMap({ selected, onToggle }: {
  selected: string[]
  onToggle: (muscle: string) => void
}) {
  const pick = (id: string) => onToggle(plannerMuscle(id))
  const fig = (view: 'front' | 'back', caption: string) => (
    <div className="bm-fig">
      <BodyFigure view={view} highlight={selected} interactive onPick={pick} />
      <div className="bm-caption">{caption}</div>
    </div>
  )

  return (
    <div>
      <div className="bm-wrap">
        {fig('front', 'Trước')}
        {fig('back', 'Sau')}
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
