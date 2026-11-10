import { useId } from 'react'
import { MUSCLE_INFO } from '../lib/muscles'

export type BodyView = 'front' | 'back' | 'side'

interface Part { id: string; cx: number; cy: number; rx: number; ry: number; mirror?: boolean }

type Pt = readonly [number, number]

/** Đường kín đi qua từng mốc. Tension lớn hơn thì sát mốc hơn. */
function smoothClosed(pts: readonly Pt[], tension = 6): string {
  const n = pts.length
  const cmd: string[] = []
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n]
    const p1 = pts[i]
    const p2 = pts[(i + 1) % n]
    const p3 = pts[(i + 2) % n]
    const c1x = p1[0] + (p2[0] - p0[0]) / tension
    const c1y = p1[1] + (p2[1] - p0[1]) / tension
    const c2x = p2[0] - (p3[0] - p1[0]) / tension
    const c2y = p2[1] - (p3[1] - p1[1]) / tension
    if (i === 0) cmd.push(`M${p1[0]} ${p1[1]}`)
    cmd.push(`C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2[0]} ${p2[1]}`)
  }
  return `${cmd.join('')}Z`
}

/** Nửa trái, từ đỉnh đầu xuống háng. Nửa phải là ảnh gương. */
const LEFT: readonly Pt[] = [
  [100, 16],
  [86, 18], [74, 30], [68, 48], [70, 66], [80, 80], [90, 88],
  [86, 104],
  [66, 110], [48, 120], [36, 138],
  [30, 162], [28, 188], [28, 212],
  [32, 234], [36, 254], [42, 266],
  [48, 272], [50, 262],
  [48, 244], [48, 222], [54, 200], [60, 178], [68, 158],
  [72, 180], [62, 208], [58, 234],
  [54, 260], [50, 290], [50, 322], [50, 354],
  [52, 384], [58, 412], [68, 432],
  [78, 444], [90, 446], [92, 428],
  [88, 400], [88, 368], [92, 340], [96, 314], [100, 298]
]

const FRONT_OUTLINE = smoothClosed([
  ...LEFT,
  ...LEFT.slice(1, -1).reverse().map(([x, y]) => [200 - x, y] as const)
])

const SIDE_OUTLINE = smoothClosed([
  [120, 18],
  [106, 20], [94, 32], [86, 46],
  [76, 58],
  [86, 66], [80, 78],
  [94, 90], [100, 108],
  [92, 126], [84, 150], [88, 176], [96, 202],
  [106, 226], [112, 252],
  [110, 286], [108, 320], [104, 354],
  [106, 388], [104, 418],
  [98, 436], [112, 446], [128, 442],
  [136, 424], [138, 392], [142, 360],
  [134, 328], [130, 296], [132, 268],
  [146, 244], [138, 218], [130, 192],
  [126, 166], [132, 142], [140, 126],
  [132, 108], [126, 92],
  [132, 74], [136, 54], [128, 34], [122, 20]
])

const SIDE_ARM = smoothClosed([
  [104, 122], [90, 138], [80, 166], [76, 196],
  [78, 226], [84, 254], [92, 276], [104, 286],
  [114, 276], [108, 250], [102, 220], [102, 190],
  [108, 162], [116, 140], [114, 124]
])

/** Nửa trái. `mirror` vẽ thêm nửa phải. Thứ tự sau nằm trên, nhận cú bấm. */
const FRONT: Part[] = [
  { id: 'core', cx: 100, cy: 196, rx: 16, ry: 26 },
  { id: 'chest', mirror: true, cx: 78, cy: 150, rx: 16, ry: 20 },
  { id: 'shoulders', mirror: true, cx: 48, cy: 130, rx: 13, ry: 11 },
  { id: 'biceps', mirror: true, cx: 40, cy: 172, rx: 10, ry: 18 },
  { id: 'forearms', mirror: true, cx: 38, cy: 224, rx: 8, ry: 16 },
  { id: 'quads', mirror: true, cx: 72, cy: 330, rx: 14, ry: 32 },
  { id: 'calves', mirror: true, cx: 70, cy: 408, rx: 10, ry: 18 }
]

const BACK: Part[] = [
  { id: 'traps', cx: 100, cy: 124, rx: 34, ry: 13 },
  { id: 'lats', mirror: true, cx: 74, cy: 178, rx: 18, ry: 26 },
  { id: 'back', cx: 100, cy: 218, rx: 16, ry: 18 },
  { id: 'glutes', mirror: true, cx: 76, cy: 268, rx: 15, ry: 14 },
  { id: 'hamstrings', mirror: true, cx: 74, cy: 332, rx: 13, ry: 26 },
  { id: 'calves', mirror: true, cx: 70, cy: 408, rx: 10, ry: 18 },
  { id: 'shoulders', mirror: true, cx: 48, cy: 130, rx: 13, ry: 11 },
  { id: 'triceps', mirror: true, cx: 42, cy: 172, rx: 10, ry: 18 },
  { id: 'forearms', mirror: true, cx: 38, cy: 224, rx: 8, ry: 16 }
]

const SIDE: Part[] = [
  { id: 'lats', cx: 124, cy: 176, rx: 12, ry: 18 },
  { id: 'traps', cx: 126, cy: 138, rx: 12, ry: 9 },
  { id: 'chest', cx: 98, cy: 154, rx: 12, ry: 15 },
  { id: 'core', cx: 102, cy: 192, rx: 11, ry: 15 },
  { id: 'shoulders', cx: 116, cy: 134, rx: 11, ry: 9 },
  { id: 'glutes', cx: 136, cy: 246, rx: 10, ry: 12 },
  { id: 'quads', cx: 110, cy: 314, rx: 10, ry: 22 },
  { id: 'hamstrings', cx: 130, cy: 314, rx: 10, ry: 20 },
  { id: 'calves', cx: 126, cy: 394, rx: 10, ry: 16 },
  { id: 'triceps', cx: 106, cy: 178, rx: 8, ry: 14 },
  { id: 'biceps', cx: 90, cy: 180, rx: 9, ry: 16 },
  { id: 'forearms', cx: 92, cy: 244, rx: 8, ry: 14 }
]

function lit(id: string, highlight: Set<string>): boolean {
  if (highlight.has(id)) return true
  return highlight.has('back') && (id === 'traps' || id === 'lats' || id === 'back')
}

export default function BodyFigure({
  view, highlight = [], height, className, interactive = false, onPick
}: {
  view: BodyView
  highlight?: string[]
  height?: number
  className?: string
  interactive?: boolean
  onPick?: (id: string) => void
}) {
  const uid = useId().replace(/:/g, '')
  const on = new Set(highlight)
  const parts = view === 'front' ? FRONT : view === 'back' ? BACK : SIDE
  const names = highlight.map(id => MUSCLE_INFO[id]?.title ?? id).filter(Boolean)
  const label = names.length > 0 ? `Mô hình cơ — nhóm sáng: ${names.join(', ')}` : 'Mô hình cơ thể'
  const skin = `url(#${uid}-skin)`
  const light = `url(#${uid}-light)`
  const soft = `url(#${uid}-soft)`

  const region = (part: Part, key: string, side = '') => {
    const title = MUSCLE_INFO[part.id]?.title ?? part.id
    return (
      <ellipse key={key} cx={part.cx} cy={part.cy} rx={part.rx} ry={part.ry} data-muscle={part.id}
        className={lit(part.id, on) ? 'body-region on' : 'body-region'}
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        aria-label={interactive ? `Vùng ${title}${side}` : undefined}
        onClick={interactive ? () => onPick?.(part.id) : undefined}
        onKeyDown={interactive ? e => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick?.(part.id) }
        } : undefined} />
    )
  }

  const size = height != null ? { height, width: Math.round(height * 200 / 460) } : undefined

  return (
    <svg viewBox="0 0 200 460" className={['body-figure', interactive ? 'body-figure-live' : '', className ?? ''].filter(Boolean).join(' ')}
      style={size} role={interactive ? 'group' : 'img'} aria-label={label}>
      <defs>
        <linearGradient id={`${uid}-skin`} x1="0.2" y1="0" x2="0.85" y2="1">
          <stop offset="0" stopColor="#e7c2b0" />
          <stop offset="0.38" stopColor="#c48b74" />
          <stop offset="1" stopColor="#8d5a4a" />
        </linearGradient>
        <radialGradient id={`${uid}-light`} cx="36%" cy="18%" r="62%">
          <stop offset="0" stopColor="#f3d2c4" stopOpacity="0.45" />
          <stop offset="0.55" stopColor="#c48470" stopOpacity="0.08" />
          <stop offset="1" stopColor="#4a2c26" stopOpacity="0.2" />
        </radialGradient>
        <filter id={`${uid}-soft`} x="-30%" y="-12%" width="160%" height="124%">
          <feDropShadow dx="0" dy="6" stdDeviation="4" floodColor="#1a0e0c" floodOpacity="0.28" />
        </filter>
        <clipPath id={`${uid}-clip`}>
          {view === 'side'
            ? <><path d={SIDE_OUTLINE} /><path d={SIDE_ARM} /></>
            : <path d={FRONT_OUTLINE} />}
        </clipPath>
      </defs>

      <ellipse cx="100" cy="452" rx="42" ry="5" fill="#000" opacity="0.28" />
      {view === 'side'
        ? <SideBody skin={skin} light={light} soft={soft} />
        : <FrontBack view={view} skin={skin} light={light} soft={soft} />}

      <g clipPath={`url(#${uid}-clip)`}>
        {parts.map(part => part.mirror ? (
          <g key={part.id}>
            {region(part, `${part.id}-l`, ' bên trái')}
            <g transform="translate(200 0) scale(-1 1)">{region(part, `${part.id}-r`, ' bên phải')}</g>
          </g>
        ) : region(part, part.id))}
      </g>
    </svg>
  )
}

function FrontBack({ view, skin, light, soft }: { view: 'front' | 'back'; skin: string; light: string; soft: string }) {
  return (
    <g filter={soft}>
      <path className="body-skin" fill={skin} d={FRONT_OUTLINE} />
      <path fill={light} d={FRONT_OUTLINE} pointerEvents="none" />
      {view === 'front' ? <FrontFace /> : <BackMarks />}
    </g>
  )
}

function FrontFace() {
  return (
    <g pointerEvents="none">
      <ellipse cx="66" cy="56" rx="4.5" ry="7" fill="#b88876" />
      <ellipse cx="134" cy="56" rx="4.5" ry="7" fill="#b88876" />
      <g fill="#5c332e">
        <ellipse cx="88" cy="48" rx="2.2" ry="1.4" />
        <ellipse cx="112" cy="48" rx="2.2" ry="1.4" />
      </g>
      <path d="M99 56c1.2 5 2.6 6 2 6" fill="none" stroke="#6a3d36" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M94 68c4 3 8 3 12 0" fill="none" stroke="#8a4d4a" strokeWidth="1.5" strokeLinecap="round" />
      <g fill="none" stroke="#6a4038" strokeWidth="1.05" strokeLinecap="round" opacity="0.45">
        <path d="M78 128c8 6 14 6 22 0" />
        <path d="M122 128c-8 6-14 6-22 0" />
        <path d="M100 148v72" />
        <path d="M90 172h20M88 190h24M88 208h24" />
        <path d="M86 292c8 8 20 8 28 0" />
      </g>
    </g>
  )
}

function BackMarks() {
  return (
    <g fill="none" stroke="#6a4038" strokeWidth="1.15" strokeLinecap="round" opacity="0.5" pointerEvents="none">
      <path d="M100 112v160" />
      <path d="M68 128c12 10 20 14 32 14s20-4 32-14" />
      <path d="M78 262c8 12 14 18 22 18s14-6 22-18" />
    </g>
  )
}

function SideBody({ skin, light, soft }: { skin: string; light: string; soft: string }) {
  return (
    <g filter={soft}>
      <path fill={skin} d={SIDE_OUTLINE} />
      <path fill={light} d={SIDE_OUTLINE} pointerEvents="none" />
      <path fill="#d7b09e" stroke="#8d5a4a" strokeWidth="1.2" d={SIDE_ARM} />
      <g pointerEvents="none">
        <ellipse cx="136" cy="56" rx="5" ry="8" fill="#b88876" />
        <ellipse cx="90" cy="50" rx="1.6" ry="1.2" fill="#5c332e" />
        <path d="M82 64c6 2 10 1 10-2" fill="none" stroke="#8a4d4a" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M112 250c8 14 8 32 2 48" fill="none" stroke="#6a4038" strokeWidth="1.05" strokeLinecap="round" opacity="0.45" />
      </g>
    </g>
  )
}
