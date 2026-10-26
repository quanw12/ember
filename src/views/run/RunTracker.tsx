import { useEffect, useRef, useState } from 'react'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { db, todayStr } from '../../db'
import { haversineKm, fmtPace, fmtClock } from '../../lib/geo'

type Status = 'running' | 'paused'

type WakeLockSentinel = { release: () => Promise<void> }
type WakeLockApi = { request: (type: 'screen') => Promise<WakeLockSentinel> }

const MIN_ACCURACY_M = 30

export default function RunTracker({ onSaved }: { onSaved: () => void }) {
  const [status, setStatus] = useState<Status>('running')
  const [distanceKm, setDistanceKm] = useState(0)
  const [elapsedSec, setElapsedSec] = useState(0)
  const [gpsError, setGpsError] = useState<string | null>(null)
  const [fixCount, setFixCount] = useState(0)

  const mapDivRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const polyRef = useRef<L.Polyline | null>(null)
  const meRef = useRef<L.CircleMarker | null>(null)
  const watchIdRef = useRef<number | null>(null)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)
  const pointsRef = useRef<[number, number, number][]>([])
  const lastPtRef = useRef<[number, number, number] | null>(null)
  const distRef = useRef(0)
  const elapsedRef = useRef(0)
  const statusRef = useRef<Status>('running')
  const startedAtRef = useRef<Date>(new Date())

  useEffect(() => {
    if (!mapDivRef.current || mapRef.current) return
    const map = L.map(mapDivRef.current, { zoomControl: false })
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map)
    map.setView([16.0, 107.0], 4.4)
    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const t = setInterval(() => {
      if (statusRef.current === 'running') {
        elapsedRef.current += 1
        setElapsedSec(elapsedRef.current)
      }
    }, 1000)
    return () => clearInterval(t)
  }, [])

  const requestWakeLock = async () => {
    try {
      const api = (navigator as Navigator & { wakeLock?: WakeLockApi }).wakeLock
      if (api) wakeLockRef.current = await api.request('screen')
    } catch { /* không có wake lock vẫn chạy được */ }
  }

  const handleFix = (pos: GeolocationPosition) => {
    if (pos.coords.accuracy > MIN_ACCURACY_M) return
    const t = Date.now()
    const pt: [number, number, number] = [pos.coords.latitude, pos.coords.longitude, t]
    const prev = lastPtRef.current
    lastPtRef.current = pt
    setFixCount(c => c + 1)
    if (prev && statusRef.current === 'running') {
      const dKm = haversineKm(prev[0], prev[1], pt[0], pt[1])
      distRef.current += dKm
      setDistanceKm(distRef.current)
      pointsRef.current.push(pt)
      const latlngs = pointsRef.current.map(p => [p[0], p[1]] as [number, number])
      const map = mapRef.current
      if (map) {
        if (!polyRef.current) {
          polyRef.current = L.polyline(latlngs, { color: '#E8232A', weight: 4, lineCap: 'round' }).addTo(map)
        } else {
          polyRef.current.setLatLngs(latlngs)
        }
        if (!meRef.current) {
          meRef.current = L.circleMarker([pt[0], pt[1]], { radius: 6, color: '#FFF6F5', weight: 2, fillColor: '#3DD68C', fillOpacity: 1 }).addTo(map)
        } else {
          meRef.current.setLatLng([pt[0], pt[1]])
        }
        map.panTo([pt[0], pt[1]])
      }
    } else if (!prev && mapRef.current) {
      mapRef.current.setView([pt[0], pt[1]], 16)
    }
  }

  const startWatch = () => {
    if (!('geolocation' in navigator)) {
      setGpsError('Thiết bị không có GPS/geolocation.')
      return
    }
    watchIdRef.current = navigator.geolocation.watchPosition(
      handleFix,
      err => {
        setGpsError(
          err.code === err.PERMISSION_DENIED
            ? 'Chưa cấp quyền vị trí — mở Cài đặt > Safari/EMBER > Vị trí để bật.'
            : 'Chưa bắt được tín hiệu GPS — ra trời thoáng một chút.'
        )
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 }
    )
  }

  const stopWatch = () => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
  }

  useEffect(() => {
    void requestWakeLock()
    startWatch()
    const onVis = () => {
      if (document.visibilityState === 'visible' && statusRef.current === 'running') void requestWakeLock()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      stopWatch()
      document.removeEventListener('visibilitychange', onVis)
      void wakeLockRef.current?.release().catch(() => {})
      wakeLockRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const togglePause = () => {
    setStatus(s => {
      const next: Status = s === 'running' ? 'paused' : 'running'
      statusRef.current = next
      if (next === 'running') void requestWakeLock()
      else void wakeLockRef.current?.release().catch(() => {})
      return next
    })
  }

  const finish = async () => {
    const keep = pointsRef.current.length >= 2 && distRef.current >= 0.02
    if (!keep && !window.confirm('Chưa đủ dữ liệu buổi chạy (quá ngắn). Kết thúc và bỏ đi?')) return
    stopWatch()
    void wakeLockRef.current?.release().catch(() => {})
    wakeLockRef.current = null
    if (keep) {
      await db.runs.add({
        date: todayStr(),
        startedAt: startedAtRef.current,
        endedAt: new Date(),
        points: pointsRef.current,
        distanceKm: Math.round(distRef.current * 1000) / 1000,
        durationSec: elapsedRef.current
      })
    }
    onSaved()
  }

  const exit = () => {
    if (pointsRef.current.length > 0 && !window.confirm('Rời khỏi màn hình sẽ mất buổi chạy CHƯA LƯU. Kết thúc để lưu. Vẫn rời đi?')) return
    stopWatch()
    void wakeLockRef.current?.release().catch(() => {})
    wakeLockRef.current = null
    onSaved()
  }

  // pace hiện tại: khoảng cách trong 30 giây gần nhất
  const currentPaceSecPerKm = (() => {
    const pts = pointsRef.current
    if (pts.length < 2) return null
    const last = pts[pts.length - 1]
    let i = pts.length - 1
    while (i > 0 && last[2] - pts[i][2] < 30000) i--
    const spanSec = (last[2] - pts[i][2]) / 1000
    if (spanSec < 10) return null
    let d = 0
    for (let j = i + 1; j < pts.length; j++) d += haversineKm(pts[j - 1][0], pts[j - 1][1], pts[j][0], pts[j][1])
    if (d < 0.005) return null
    return spanSec / d
  })()

  const avgPace = distanceKm > 0.02 ? elapsedSec / distanceKm : null

  return (
    <>
      <div style={{ paddingTop: 18 }}>
        <button type="button" onClick={exit} style={{ background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer', fontSize: 13, padding: 0 }}>← Thoát</button>
        <h1 className="h">Đang chạy {status === 'paused' ? '(tạm dừng)' : ''}</h1>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div ref={mapDivRef} style={{ height: 210, background: 'var(--bg-1)' }} aria-label="Bản đồ lộ trình đang chạy" />
      </div>

      <div className="card">
        <div className="grid2">
          <div>
            <div className="eyebrow">QUÃNG ĐƯỜNG</div>
            <div style={{ fontSize: 30, fontWeight: 800 }} className="ringnum">{distanceKm.toFixed(2)}<span style={{ fontSize: 14, color: 'var(--text-2)' }}> km</span></div>
          </div>
          <div>
            <div className="eyebrow">THỜI GIAN</div>
            <div style={{ fontSize: 30, fontWeight: 800 }} className="ringnum">{fmtClock(elapsedSec)}</div>
          </div>
        </div>
        <div className="grid2" style={{ marginTop: 8 }}>
          <div className="kv" style={{ borderTop: 'none' }}><b>Pace TB</b><span className="ringnum">{fmtPace(avgPace)}/km</span></div>
          <div className="kv" style={{ borderTop: 'none' }}><b>Pace hiện tại</b><span className="ringnum">{fmtPace(currentPaceSecPerKm)}/km</span></div>
        </div>
        {fixCount < 3 && !gpsError && <div className="note">Đang bắt GPS… ra chỗ thoáng trời để tín hiệu ổn hơn.</div>}
        {gpsError && <div className="note" style={{ color: 'var(--red-soft)' }}>{gpsError}</div>}
      </div>

      <button className="btn ghost" style={{ marginTop: 14 }} onClick={togglePause}>
        {status === 'running' ? 'TẠM DỪNG' : 'TIẾP TỤC'}
      </button>
      <button className="btn" style={{ marginTop: 10 }} onClick={finish}>KẾT THÚC &amp; LƯU</button>
      <p className="note">Giữ màn hình bật khi chạy — iOS tạm dừng web khi khóa máy (giới hạn của PWA, wake lock đã tự bật).</p>
    </>
  )
}
