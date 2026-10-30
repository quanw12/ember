/**
 * Mô hình người vẽ tay bằng SVG — mặt trước & mặt sau, chia nhóm cơ theo giải phẫu.
 * Nhóm cơ truyền vào `highlight` sáng đỏ ember (glow nhẹ) — chỉ nhóm cơ mà bài tập nhắm tới.
 * Vector thuần: nét ở mọi kích thước, không phụ thuộc ảnh ngoài, tối cho theme tối.
 */

const C = {
  base: '#232329', // da/silhouette
  idle: '#34343C', // cơ nghỉ
  idleLine: 'rgba(10,10,12,.5)', // đường tách cơ
  hi: 'var(--red, #E8232A)',
  hiEdge: 'var(--ember, #FF7A45)'
}

export const BACK_VIEW_MUSCLES = ['back', 'glutes', 'hamstrings', 'triceps']
export const preferredView = (muscle: string): 'front' | 'back' => (BACK_VIEW_MUSCLES.includes(muscle) ? 'back' : 'front')

interface Props {
  /** Nhóm cơ cần sáng đỏ (id theo exercises.seed: chest, back, quads…). */
  highlight?: string[]
  view?: 'front' | 'back'
  /** Chiều cao hiển thị (px) — svg giữ tỉ lệ dọc. */
  height?: number
  className?: string
}

/* Một shape cơ: stroke? → capsule tay (nét dày tròn hai đầu), ngược lại là path fill.
   Chỉ vẽ nửa TRÁI — nửa phải là ảnh gương qua transform. */
interface Shape { m: string | null; d: string; sw?: number }

/* ---------------- Hình nền (dùng chung 2 mặt) ---------------- */
const HEAD = <ellipse cx="50" cy="13" rx="8" ry="9.5" fill={C.base} />
const NECK = <path d="M45.5,20.5 L54.5,20.5 L55.5,29.5 L44.5,29.5 Z" fill={C.base} />
const TORSO = (
  <path
    fill={C.base}
    d="M42,26 C38.5,26.5 34,28.5 31,32.5 C28.5,35.5 27.5,39.5 28.5,44 C29.5,48 31,50.5 32,53 C33.5,60 36.5,71 38.5,81 C39.5,87 39.8,93 40,98 C38.5,103 37,107.5 36.5,111 C36.5,115 38,119 41,122 L43,124.5 C45,126 48,127 50,127 C52,127 55,126 57,124.5 L59,122 C62,119 63.5,115 63.5,111 C63,107.5 61.5,103 60,98 C60.2,93 60.5,87 61.5,81 C63.5,71 66.5,60 68,53 C69,50.5 70.5,48 71.5,44 C72.5,39.5 71.5,35.5 69,32.5 C66,28.5 61.5,26.5 58,26 C56,28 52.5,29 50,29 C47.5,29 44,28 42,26 Z"
  />
)
const ARM: Shape[] = [
  { m: null, d: 'M30,37 L25,60', sw: 9 }, // cánh tay
  { m: null, d: 'M25,60 L20.5,88', sw: 7.5 }, // cẳng tay
  { m: null, d: 'M20,93.5 L20,93.6', sw: 7.2 } // bàn tay (chấm tròn)
]
const LEG: Shape[] = [
  { m: null, d: 'M43.5,110 L41,150', sw: 15.5 }, // đùi
  { m: null, d: 'M41,150 L39.5,186', sw: 10 }, // cẳng chân
  { m: null, d: 'M38.6,192.5 L38.6,192.6', sw: 10 } // bàn chân
]

/* ---------------- Cơ mặt TRƯỚC ---------------- */
const FRONT_LEFT: Shape[] = [
  { m: 'shoulders', d: 'M46.5,27 C43.5,28 40.5,29.8 38,32.3 C40.5,34.8 43.5,35.6 46.5,34.6 C45.8,32.2 45.9,29.6 46.5,27 Z' }, // trap trước
  { m: 'shoulders', d: 'M28.2,37.5 C26.8,40.5 26.9,44.5 28.8,47.8 C31.6,47 33.6,44 33.9,40.2 C32.2,37.8 29.9,36.9 28.2,37.5 Z' }, // delt trước
  { m: 'chest', d: 'M39.5,33.5 C36,35.5 33.8,39 33.8,43 C33.8,46.5 35.6,49.4 38.6,50.4 C43,51.6 47,49 47.5,44.5 C47.8,41 47,36.5 45.5,34 C43.6,32.6 41.3,32.5 39.5,33.5 Z' }, // ngực
  { m: 'biceps', d: 'M29.8,40 L26.8,55', sw: 6 }, // bắp tay trước
  { m: 'forearms', d: 'M25.5,63 L21.8,85', sw: 5.2 }, // cẳng tay
  { m: 'quads', d: 'M40.5,110.5 C38.8,118 38.2,128 39,138 C39.4,144 40.4,149 41.9,152.8 L47.2,150.5 C48,140 48,126 47.2,112.5 C45,112 42.6,111.3 40.5,110.5 Z' }, // tứ đầu
  { m: 'calves', d: 'M40.8,158 C39.8,164 39.4,171 39.6,178 C39.8,182.5 40.4,185.8 41.4,188.2 C42.9,186.6 43.7,182.8 43.8,178 C44,170 43.5,163 42.8,157.8 C42.1,158 41.4,158 40.8,158 Z' } // bắp chân
]
const FRONT_CENTER: Shape[] = [
  { m: 'core', d: 'M44,54 C42.8,60 42.5,70 43,78 C43.4,86 45,93 47.5,96.5 C49,98.5 51,98.5 52.5,96.5 C55,93 56.6,86 57,78 C57.5,70 57.2,60 56,54 C52,55.5 48,55.5 44,54 Z' } // cơ bụng
]
const ABS_CUTS = ['M50,55.5 L50,96.5', 'M44.2,63 L55.8,63', 'M43.6,72 L56.4,72', 'M43.6,81 L56.4,81', 'M44.6,89.5 L55.4,89.5']

/* ---------------- Cơ mặt SAU ---------------- */
const BACK_LEFT: Shape[] = [
  { m: 'back', d: 'M38.2,44.2 C34.7,50.8 33.9,59.3 35.3,67.4 C36.5,74.4 38.7,80.4 41.6,84.4 C44.9,82.9 46.7,77.4 47.2,69.4 C47.7,60.4 47.4,52.4 46.7,46.3 C43.9,46.5 40.9,45.7 38.2,44.2 Z' }, // lats
  { m: 'triceps', d: 'M30.5,40 L27.2,55', sw: 6 }, // bắp tay sau
  { m: 'forearms', d: 'M25.5,63 L21.8,85', sw: 5.2 }, // cẳng tay
  { m: 'hamstrings', d: 'M40.5,124 C39,131 38.8,140 39.7,148.5 C41.4,150 44,150 45.8,148.5 C46.4,139.5 46.1,130 45.2,123.5 C43.6,124.4 42,124.5 40.5,124 Z' }, // gân kheo
  { m: 'calves', d: 'M40.6,157 C39.4,163 39.2,170 40,176.5 C40.5,181 41.5,184.5 43,187 C44.6,184.4 45.4,180 45.2,174 C45,167.5 44.3,161.2 43.5,156.6 C42.5,157 41.5,157.1 40.6,157 Z' } // bắp chân sau
]
const BACK_CENTER: Shape[] = [
  { m: 'back', d: 'M50,26.5 C46,28 41.5,30.5 38.5,33.5 C42,36.8 46,38.3 50,38.3 C54,38.3 58,36.8 61.5,33.5 C58.5,30.5 54,28 50,26.5 Z' }, // trap sau
  { m: 'back', d: 'M45.5,88.5 C44.6,92.5 44.6,96 45.6,99.3 C48.3,100.4 51.7,100.4 54.4,99.3 C55.4,96 55.4,92.5 54.5,88.5 C51.5,89.8 48.5,89.8 45.5,88.5 Z' }, // dựng sống/lưng dưới
  { m: 'shoulders', d: 'M28.2,37.5 C26.8,40.5 26.9,44.5 28.8,47.8 C31.6,47 33.6,44 33.9,40.2 C32.2,37.8 29.9,36.9 28.2,37.5 Z' }, // delt sau
  { m: 'glutes', d: 'M50,104 L45.5,103.8 C42.2,104.5 39.4,104.2 37.2,103 C36.4,109.5 37.4,116.5 41,120.8 C43.6,123.9 47.2,124.3 48.8,121.6 C49.6,117 49.9,110.5 50,104 Z' } // mông trái
]
// mông phải vẽ gương qua mirror — BACK_CENTER có shape mông trái, mirror sẽ ra mông phải.
// Tuy nhiên các shape center không được mirror → gói mông vào BACK_LEFT thay thế.
const BACK_LEFT_FIXED: Shape[] = [
  ...BACK_LEFT.slice(0, 1),
  { m: 'glutes', d: 'M49.9,104 L45.5,103.8 C42.2,104.5 39.4,104.2 37.2,103 C36.4,109.5 37.4,116.5 41,120.8 C43.6,123.9 47.2,124.3 48.8,121.6 C49.6,117 49.9,110.5 49.9,104 Z' },
  ...BACK_LEFT.slice(1)
]
const BACK_CENTER_FIXED: Shape[] = BACK_CENTER.filter(s => s.m !== 'glutes')

/* ------------------------------------------------------------------ */

function paint(s: Shape, on: boolean): React.CSSProperties {
  if (s.sw != null) {
    return on
      ? { stroke: C.hi, filter: 'url(#emberGlow)' }
      : { stroke: C.idle }
  }
  return on
    ? { fill: C.hi, stroke: C.hiEdge, strokeWidth: 0.5, filter: 'url(#emberGlow)' }
    : { fill: C.idle, stroke: C.idleLine, strokeWidth: 0.4 }
}

function Shapes({ list, hs }: { list: Shape[]; hs: Set<string> }): React.ReactNode {
  return (
    <>
      {list.map((s, i) => {
        const on = s.m != null && hs.has(s.m)
        const st = paint(s, on)
        return s.sw != null
          ? <path key={i} d={s.d} fill="none" strokeWidth={s.sw} strokeLinecap="round" style={st} />
          : <path key={i} d={s.d} style={st} />
      })}
    </>
  )
}

const MIRROR = 'translate(100 0) scale(-1 1)'

export default function MuscleFigure({ highlight = [], view = 'front', height = 220, className }: Props) {
  const hs = new Set(highlight.filter(m => m !== 'other'))
  return (
    <svg viewBox="0 0 100 220" height={height} className={className} role="img"
      aria-label={highlight.length > 0 ? `Mô hình cơ — nhóm sáng: ${highlight.join(', ')}` : 'Mô hình cơ'}>
      <defs>
        <filter id="emberGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="1.6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {HEAD}
      {NECK}
      <g><Shapes list={ARM} hs={hs} /></g>
      <g transform={MIRROR}><Shapes list={ARM} hs={hs} /></g>
      <g><Shapes list={LEG} hs={hs} /></g>
      <g transform={MIRROR}><Shapes list={LEG} hs={hs} /></g>
      {TORSO}
      {view === 'front' ? (
        <>
          <g><Shapes list={FRONT_LEFT} hs={hs} /></g>
          <g transform={MIRROR}><Shapes list={FRONT_LEFT} hs={hs} /></g>
          <Shapes list={FRONT_CENTER} hs={hs} />
          <g stroke={C.idleLine} strokeWidth="0.7" fill="none" opacity="0.85">
            {ABS_CUTS.map((d, i) => <path key={i} d={d} />)}
          </g>
        </>
      ) : (
        <>
          <g><Shapes list={BACK_LEFT_FIXED} hs={hs} /></g>
          <g transform={MIRROR}><Shapes list={BACK_LEFT_FIXED} hs={hs} /></g>
          <Shapes list={BACK_CENTER_FIXED} hs={hs} />
        </>
      )}
    </svg>
  )
}
