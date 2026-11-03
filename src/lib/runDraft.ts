export interface RunDraft {
  startedAt: Date
  points: [number, number, number][]
  segmentStarts?: number[]
  elapsedAtPoints?: number[]
  distanceKm: number
  elapsedSec: number
}
export const RUN_DRAFT_KEY = 'runDraft'

export function isRunDraft(value: unknown): value is RunDraft {
  if (!value || typeof value !== 'object') return false
  const draft = value as RunDraft
  return draft.startedAt instanceof Date && Number.isFinite(draft.startedAt.getTime())
    && Number.isFinite(draft.distanceKm) && draft.distanceKm >= 0
    && Number.isFinite(draft.elapsedSec) && draft.elapsedSec >= 0
    && Array.isArray(draft.points) && draft.points.every(p => Array.isArray(p) && p.length === 3 && p.every(Number.isFinite) && Math.abs(p[0]) <= 90 && Math.abs(p[1]) <= 180)
    && (draft.segmentStarts == null || (Array.isArray(draft.segmentStarts) && draft.segmentStarts.every(i => Number.isSafeInteger(i) && i >= 0 && (i < draft.points.length || (i === 0 && draft.points.length === 0)))))
    && (draft.elapsedAtPoints == null || (Array.isArray(draft.elapsedAtPoints) && draft.elapsedAtPoints.length === draft.points.length && draft.elapsedAtPoints.every(t => Number.isFinite(t) && t >= 0)))
}
