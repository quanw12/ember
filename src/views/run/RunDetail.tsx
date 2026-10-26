import { useEffect, useRef } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { db } from '../../db'
import { fmtPace, fmtClock, splitTimes } from '../../lib/geo'

export default function RunDetail({ id, onBack }: { id: number; onBack: () => void }) {
  const run = useLiveQuery(() => db.runs.get(id))
  const mapDivRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)

  useEffect(() => {
    if (!mapDivRef.current || mapRef.current) return
    const map = L.map(mapDivRef.current, { zoomControl: false })
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map)
    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !run || run.points.length < 2) return
    const latlngs = run.points.map(p => [p[0], p[1]] as [number, number])
    L.polyline(latlngs, { color: '#E8232A', weight: 4, lineCap: 'round' }).addTo(map)
    L.circleMarker(latlngs[0], { radius: 5, color: '#FFF6F5', weight: 2, fillColor: '#3DD68C', fillOpacity: 1 }).addTo(map)
    L.circleMarker(latlngs[latlngs.length - 1], { radius: 5, color: '#FFF6F5', weight: 2, fillColor: '#E8232A', fillOpacity: 1 }).addTo(map)
    map.fitBounds(L.latLngBounds(latlngs).pad(0.12))
  }, [run?.id])

  if (!run) return null
  const avgPace = run.distanceKm > 0 ? run.durationSec / run.distanceKm : null
  const splits = splitTimes(run.points, run.distanceKm)
  const bestSplit = splits.length > 1 ? Math.min(...splits) : null

  const remove = async () => {
    if (!window.confirm('Xoá buổi chạy này?')) return
    await db.runs.delete(id)
    onBack()
  }

  return (
    <>
      <div style={{ paddingTop: 18 }}>
        <button type="button" onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer', fontSize: 13, padding: 0 }}>← Lịch sử</button>
        <h1 className="h">Buổi chạy {run.startedAt.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}</h1>
        <div className="meta">Bắt đầu {run.startedAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div ref={mapDivRef} style={{ height: 220, background: 'var(--bg-1)' }} aria-label="Lộ trình buổi chạy" />
      </div>

      <div className="card">
        <div className="kv"><b>Quãng đường</b><span className="ringnum">{run.distanceKm.toFixed(2)} km</span></div>
        <div className="kv"><b>Thời gian</b><span className="ringnum">{fmtClock(run.durationSec)}</span></div>
        <div className="kv"><b>Pace trung bình</b><span className="ringnum">{fmtPace(avgPace)}/km</span></div>
        {bestSplit != null && <div className="kv"><b>Km nhanh nhất</b><span className="ringnum">{fmtPace(bestSplit)}/km</span></div>}
      </div>

      {splits.length > 0 && (
        <div className="card" style={{ padding: 14 }}>
          <div className="eyebrow">TỐC ĐỘ THEO TỪNG KM</div>
          {splits.map((s, i) => (
            <div className="kv" key={i}>
              <b>Km {i + 1}{splits.length > i + 1 || run.distanceKm - (i + 1) < 0.05 ? '' : ' (dở)'}</b>
              <span className="ringnum">{fmtPace(s)}/km</span>
            </div>
          ))}
        </div>
      )}

      <button className="btn danger" style={{ marginTop: 14 }} onClick={remove}>Xoá buổi này</button>
    </>
  )
}
