import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { exercisesForRegion, MUSCLE_INFO } from '../lib/muscles'
import BodyFigure, { type BodyView } from './BodyFigure'

const MIN_ZOOM = 1
const MAX_ZOOM = 2.8

interface AtlasTarget { id: string; token: number }

function wrapYaw(n: number): number {
  return ((n % 360) + 360) % 360
}

function gap(yaw: number, angle: number): number {
  const d = Math.abs(wrapYaw(yaw) - angle)
  return Math.min(d, 360 - d)
}

function fade(yaw: number, angle: number): number {
  const d = gap(yaw, angle)
  if (d >= 90) return 0
  return 1 - d / 90
}

function sideName(yaw: number): string {
  const a = wrapYaw(yaw)
  if (a < 45 || a >= 315) return 'Mặt trước'
  if (a < 135) return 'Nghiêng phải'
  if (a < 225) return 'Mặt sau'
  return 'Nghiêng trái'
}

function yawFor(id: string): number {
  const view = MUSCLE_INFO[id]?.view
  if (view === 'back') return 180
  if (view === 'side') return 90
  return 0
}

function clampZoom(n: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, n))
}

const LAYERS: { view: BodyView; angle: number; flip: boolean }[] = [
  { view: 'front', angle: 0, flip: false },
  { view: 'side', angle: 90, flip: false },
  { view: 'back', angle: 180, flip: false },
  { view: 'side', angle: 270, flip: true }
]

export default function BodyStudio({ atlas, onOpenExercise }: {
  atlas: AtlasTarget | null
  onOpenExercise: (slug: string) => void
}) {
  const exercises = useLiveQuery(() => db.exercises.toArray())
  const [mode, setMode] = useState<'home' | 'inspect'>('home')
  const [yaw, setYaw] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [picked, setPicked] = useState<string | null>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const yawRef = useRef(0)
  const zoomRef = useRef(1)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const gesture = useRef<{ lastX: number; moved: number; pinching: boolean; pinchDist: number; pinchZoom: number } | null>(null)

  const applyYaw = (next: number) => {
    yawRef.current = next
    setYaw(next)
  }
  const applyZoom = (next: number) => {
    const z = clampZoom(next)
    zoomRef.current = z
    setZoom(z)
  }

  const openInspect = (id: string | null) => {
    setMode('inspect')
    setPicked(id && MUSCLE_INFO[id] ? id : null)
    applyYaw(id && MUSCLE_INFO[id] ? yawFor(id) : 0)
    applyZoom(id && MUSCLE_INFO[id] ? 1.55 : 1.15)
  }

  useEffect(() => {
    if (!atlas) return
    openInspect(atlas.id === 'atlas' ? null : atlas.id)
  }, [atlas?.token])

  useEffect(() => {
    if (mode !== 'inspect') return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMode('home') }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode])

  useEffect(() => {
    const el = stageRef.current
    if (!el || mode !== 'inspect') return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      applyZoom(zoomRef.current * (e.deltaY > 0 ? 0.92 : 1.08))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [mode])

  const focusMuscle = (id: string) => {
    setPicked(id)
    applyYaw(yawFor(id))
    if (zoomRef.current < 1.4) applyZoom(1.55)
  }

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    stageRef.current?.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()]
      gesture.current = {
        lastX: e.clientX,
        moved: 40,
        pinching: true,
        pinchDist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        pinchZoom: zoomRef.current
      }
      return
    }
    gesture.current = { lastX: e.clientX, moved: 0, pinching: false, pinchDist: 1, pinchZoom: zoomRef.current }
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const g = gesture.current
    if (!g) return
    if (pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()]
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1
      g.pinching = true
      g.moved = 40
      applyZoom(g.pinchZoom * (dist / g.pinchDist))
      return
    }
    const dx = e.clientX - g.lastX
    g.moved += Math.abs(dx)
    g.lastX = e.clientX
    const width = stageRef.current?.clientWidth || 320
    applyYaw(yawRef.current + (dx / width) * 200)
  }

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const g = gesture.current
    pointers.current.delete(e.pointerId)
    if (pointers.current.size > 0) return
    if (g && !g.pinching && g.moved < 10) {
      const hit = document.elementFromPoint(e.clientX, e.clientY)
      const node = hit instanceof Element ? hit.closest('[data-muscle]') : null
      const id = node?.getAttribute('data-muscle')
      if (id && MUSCLE_INFO[id]) setPicked(id)
    }
    gesture.current = null
  }

  const info = picked ? MUSCLE_INFO[picked] : undefined
  const moves = picked ? exercisesForRegion(exercises ?? [], picked).slice(0, 8) : []
  const weights = LAYERS.map(layer => fade(yaw, layer.angle))
  const top = weights.reduce((best, w, i) => (w > weights[best] ? i : best), 0)

  return (
    <>
      <div className="card body-home">
        <div className="eyebrow">MÔ HÌNH CƠ THỂ</div>
        <h2 className="h" style={{ marginTop: 4 }}>Đứng yên để xem. Lại gần để bấm.</h2>
        <div className="body-frame">
          <BodyFigure view="front" className="body-figure-fluid" />
        </div>
        <p className="meta">Kéo ngang để quay trái phải, chụm hai ngón hoặc nút phóng để xem gần từng nhóm: tay trước, tay sau, trap, lat và các nhóm còn lại.</p>
        <button type="button" className="btn ghost" style={{ marginTop: 12 }} onClick={() => openInspect(null)}>Xem gần nhóm cơ</button>
      </div>

      {mode === 'inspect' && (
        <div className="body-inspect" role="dialog" aria-modal="true" aria-label="Mô hình cơ thể">
          <div className="body-inspect-bar">
            <div>
              <div className="eyebrow">MÔ HÌNH · {sideName(yaw).toUpperCase()}</div>
              <div className="meta">Kéo ngang để quay. Chụm hai ngón để phóng to. Bấm một nhóm cơ.</div>
            </div>
            <button type="button" className="body-close" onClick={() => setMode('home')} aria-label="Đóng mô hình">×</button>
          </div>

          <div className="body-stage" ref={stageRef}
            onPointerDown={onPointerDown} onPointerMove={onPointerMove}
            onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
            <div className="body-spin" style={{ transform: `scale(${zoom})` }}>
              {LAYERS.map((layer, index) => (
                <div key={`${layer.view}-${layer.angle}`} className="body-layer" aria-hidden={index !== top}
                  style={{
                    opacity: weights[index],
                    pointerEvents: index === top && weights[index] > 0 ? 'auto' : 'none',
                    transform: layer.flip ? 'scaleX(-1)' : undefined
                  }}>
                  <BodyFigure view={layer.view} highlight={picked ? [picked] : []} interactive={index === top} onPick={setPicked} />
                </div>
              ))}
            </div>
          </div>

          <div className="body-tools">
            <button type="button" onClick={() => applyZoom(zoomRef.current / 1.15)}>Thu nhỏ mô hình</button>
            <button type="button" onClick={() => applyZoom(zoomRef.current * 1.15)}>Phóng to mô hình</button>
            <button type="button" onClick={() => applyYaw(yawRef.current - 45)}>Xoay sang trái</button>
            <button type="button" onClick={() => applyYaw(yawRef.current + 45)}>Xoay sang phải</button>
          </div>

          <div className="body-chips" aria-label="Chọn nhóm cơ">
            {Object.values(MUSCLE_INFO).map(item => (
              <button key={item.id} type="button" className={picked === item.id ? 'body-chip on' : 'body-chip'}
                aria-pressed={picked === item.id} onClick={() => focusMuscle(item.id)}>
                {item.title}
              </button>
            ))}
          </div>

          {info && (
            <div className="body-sheet">
              <h2 className="h">{info.title}</h2>
              <p className="meta">{info.about}</p>
              <div className="eyebrow" style={{ marginTop: 8 }}>BÀI BỔ SUNG</div>
              {moves.length === 0 && <p className="meta">Chưa có bài khớp nhóm này trong thư viện.</p>}
              {moves.map(ex => (
                <button key={ex.slug} type="button" className="body-ex"
                  onClick={() => { onOpenExercise(ex.slug); setMode('home') }}>
                  {ex.nameEn}{ex.name !== ex.nameEn ? ` · ${ex.name}` : ''}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}
