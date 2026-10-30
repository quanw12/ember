import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Run } from '../db'
import { fmtPace, fmtClock } from '../lib/geo'
import { weekStart } from '../lib/gym'
import { C25K, C25K_TOTAL } from '../data/c25k'
import RunTracker from './run/RunTracker'
import RunDetail from './run/RunDetail'

type RunView = { kind: 'home' } | { kind: 'track' } | { kind: 'detail'; id: number }

export default function Run() {
  const [view, setView] = useState<RunView>({ kind: 'home' })
  // runs chỉ index 'date' — 'startedAt' không phải index, orderBy trên đó làm sập tab (NoSuchIndexError)
  const runs = useLiveQuery(async () => {
    const rs = await db.runs.toArray()
    return rs.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
  })
  const c25kRow = useLiveQuery(() => db.settings.get('c25kDone'))
  const c25kDone = (c25kRow?.value as number | undefined) ?? 0

  const completeDay = async () => {
    await db.settings.put({ key: 'c25kDone', value: Math.min(C25K_TOTAL, c25kDone + 1) })
  }
  const resetPlan = async () => {
    if (!window.confirm('Đặt lại kế hoạch C25K về ngày đầu?')) return
    await db.settings.put({ key: 'c25kDone', value: 0 })
  }

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

      {c25kDone < C25K_TOTAL ? (() => {
        const week = C25K[Math.floor(c25kDone / 3)]
        const dayIdx = c25kDone % 3
        return (
          <div className="card">
            <div className="eyebrow">KẾ HOẠCH NHS C25K · {week.label.toUpperCase()} · BUỔI {dayIdx + 1}/3</div>
            <h2 className="h" style={{ marginTop: 4 }}>Bài hôm nay</h2>
            <div style={{ fontSize: 14, lineHeight: 1.6, marginTop: 4 }}>{week.days[dayIdx]}</div>
            <div className="meta" style={{ marginTop: 8 }}>Ngày {c25kDone + 1}/{C25K_TOTAL} · mỗi tuần 3 buổi xen ngày nghỉ</div>
            <button className="btn" style={{ marginTop: 12 }} onClick={completeDay}>HOÀN THÀNH NGÀY NÀY</button>
            <button className="btn ghost" onClick={resetPlan}>Đặt lại kế hoạch</button>
          </div>
        )
      })() : (
        <div className="card">
          <div className="eyebrow">KẾ HOẠCH NHS C25K</div>
          <h2 className="h" style={{ marginTop: 4 }}>Hoàn thành toàn bộ 9 tuần!</h2>
          <div className="meta">5K đã thuộc về bạn. Giữ 3 buổi/tuần hoặc chuyển sang kế hoạch 10K.</div>
          <button className="btn ghost" onClick={resetPlan}>Chạy lại từ đầu</button>
        </div>
      )}

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
