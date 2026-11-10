import BodyFigure from './BodyFigure'

export const BACK_VIEW_MUSCLES = ['back', 'glutes', 'hamstrings', 'triceps']
export const preferredView = (muscle: string): 'front' | 'back' => (BACK_VIEW_MUSCLES.includes(muscle) ? 'back' : 'front')

/** Hình người dùng chung. `highlight` theo id thư viện (chest, back, quads…). */
export default function MuscleFigure({ highlight = [], view = 'front', height = 220, className }: {
  highlight?: string[]
  view?: 'front' | 'back'
  height?: number
  className?: string
}) {
  return <BodyFigure view={view} highlight={highlight} height={height} className={className} />
}
