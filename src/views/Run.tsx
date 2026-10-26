import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Run } from '../db'
import { fmtPace, fmtClock } from '../lib/geo'
import RunTracker from './run/RunTracker'
import RunDetail from './run/RunDetail'

type RunView = { kind: 'home' } | { kind: 'track' } | { kind: 'detail'; id: number }

function weekStart(d: Date): Date {
  const x = new Date(d)
  const day = (x.getDay() + 6) % 7
  x.setDate(x.getDate() - day)
  x.setHours(0, 0, 0, 0)
  return x
}

export default function Run() {
  const [view, setView] = useState<RunView>({ kind: 'home' })
  const runs = useLiveQuery(() => db.runs.orderBy('startedAt').reverse().toArray())

  if (view.kind === 'track') {
    return <RunTracker onSaved={() => setView({ kind: 'home' })} />
  }
  if (view.kind === 'detail') {
    return <RunDetail id={view.id} onBack={() => setView({ kind: 'home' })} />
  }

  const list: Run[] = runs ?? []
  const ws = weekStart(new Date())
  const thisWeek = list.filter(r => r.startedAt >= ws)
  const weekKm = thisWeek.reduce((a, r) => a + r.distanceKm, 0)
  const last7 = list.filter(r => r.startedAt.getTime() >= Date.now() - 7 * 86400_000)
  const km7 = last7.reduce((a, r) => a + r.distanceKm, 0)

  return (
    <>
      <div style={{ paddingTop: 22 }}>
        <div className="eyebrow">CHẠY BỘ</div>
        <h1 className="h">Lửa chạy chờ sẵn.</h1>
        <button className="btn" style={{ marginTop: 12 }} onClick={() => setView({ kind: 'track' })}>BẮT ĐẦU CHẠY</button>
      </div>

      <div className="card">
        <div className="eyebrow">TUẦN NÀY</div>
        <div className="kv"><b>Quãng đường</b><span className="ringnum">{weekKm.toFixed(1)} km · {thisWeek.length} buổi</span></div>
        <div className="kv"><b>7 ngày gần nhất</b><span className="ringnum">{km7.toFixed(1)} km</span></div>
      </div>

      <div className="card" style={{ padding: list.length ? 14 : 16 }}>
        <div className="eyebrow">LỊCH SỬ</div>
        {list.length === 0 && <div className="meta" style={{ marginTop: 6 }}>Chưa có buổi nào — buổi đầu tiên sẽ hiện ở đây cùng bản đồ lộ trình.</div>}
        {list.map(r => (
          <button key={r.id} type="button" className="kv" style={{ width: '100%', background: 'none', border: 'none', borderBottom: '1px solid var(--line)', cursor: 'pointer', textAlign: 'left' }}
            onClick={() => setView({ kind: 'detail', id: r.id! })}>
            <b>
              {r.startedAt.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
              <span style={{ display: 'block', fontWeight: 400, color: 'var(--text-2)', fontSize: 12 }}>
                {fmtClock(r.durationSec)}
              </span>
            </b>
            <span className="ringnum">{r.distanceKm.toFixed(2)} km · {fmtPace(r.durationSec / Math.max(r.distanceKm, 0.01))}/km</span>
          </button>
        ))}
      </div>
    </>
  )
}
