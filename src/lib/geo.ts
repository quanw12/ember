export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

/** Pace giây/km → "5'23"" */
export function fmtPace(secPerKm: number | null): string {
  if (secPerKm == null || !Number.isFinite(secPerKm) || secPerKm <= 0 || secPerKm > 3600) return '—'
  const m = Math.floor(secPerKm / 60)
  const s = Math.round(secPerKm % 60)
  return `${m}'${String(s).padStart(2, '0')}"`
}

export function fmtClock(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = s % 60
  const mm = String(m).padStart(2, '0')
  const sss = String(ss).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${sss}` : `${m}:${sss}`
}

/** Thời gian mỗi km (giây), nội suy giữa hai điểm GPS quanh mốc km. */
export function splitTimes(points: [number, number, number][], totalKm: number): number[] {
  const res: number[] = []
  if (points.length < 2) return res
  let cum = 0
  let crossingT = points[0][2]
  let nextKm = 1
  for (let i = 1; i < points.length; i++) {
    const d = haversineKm(points[i - 1][0], points[i - 1][1], points[i][0], points[i][1])
    const prevCum = cum
    cum += d
    while (cum >= nextKm && nextKm <= totalKm + 1e-6) {
      const need = nextKm - prevCum
      const frac = d > 0 ? Math.min(1, need / d) : 1
      const t = points[i - 1][2] + (points[i][2] - points[i - 1][2]) * frac
      res.push((t - crossingT) / 1000)
      crossingT = t
      nextKm += 1
    }
  }
  if (cum - res.length > 0.05) res.push((points[points.length - 1][2] - crossingT) / 1000)
  return res
}
