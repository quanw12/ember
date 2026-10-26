import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, todayStr, movingAvg } from '../db'
import { macroPlan, GOAL_OPTIONS, fmtWeeks } from '../lib/calc'

/** Chuỗi điểm cân thô + đường trung bình trượt 7 ngày. */
function WeightChart({ weights }: { weights: { date: string; kg: number }[] }) {
  if (weights.length < 2) return null
  const W = 320, H = 150, PADX = 8, PADY = 16
  const trend = weights.map((_, i) => movingAvg(weights.slice(0, i + 1).map(w => w.kg), 7)!)
  const ys = [...weights.map(w => w.kg), ...trend]
  let lo = Math.min(...ys), hi = Math.max(...ys)
  const pad = Math.max(0.4, (hi - lo) * 0.15)
  lo -= pad; hi += pad
  const x = (i: number) => PADX + (i / (weights.length - 1)) * (W - PADX * 2)
  const y = (v: number) => PADY + (1 - (v - lo) / (hi - lo)) * (H - PADY * 2)

  const line = (vals: number[]): string =>
    vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')

  const grid = [0.25, 0.5, 0.75].map(f => lo + f * (hi - lo))

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', marginTop: 10 }} role="img" aria-label="Biểu đồ cân nặng">
      {grid.map((g, i) => (
        <g key={i}>
          <line x1={PADX} x2={W - PADX} y1={y(g)} y2={y(g)} stroke="var(--line)" strokeWidth="1" />
          <text x={W - PADX} y={y(g) - 3} textAnchor="end" fontSize="9" fill="var(--text-3)" className="ringnum">{g.toFixed(1)}</text>
        </g>
      ))}
      {weights.map((w, i) => (
        <circle key={i} cx={x(i)} cy={y(w.kg)} r={2} fill="var(--red-soft)" opacity={0.45}>
          <title>{w.date} — {w.kg} kg</title>
        </circle>
      ))}
      <path d={line(trend)} fill="none" stroke="var(--red)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <text x={PADX} y={H - 3} fontSize="9" fill="var(--text-3)">{weights[0].date.slice(5)}</text>
      <text x={W - PADX} y={H - 3} textAnchor="end" fontSize="9" fill="var(--text-3)">{weights[weights.length - 1].date.slice(5)}</text>
    </svg>
  )
}

export default function Progress() {
  const today = todayStr()
  const profile = useLiveQuery(() => db.profile.get(1))
  const bodyLogs = useLiveQuery(() => db.bodyLogs.orderBy('date').toArray())
  const [weight, setWeight] = useState('')
  const [belly, setBelly] = useState('')
  const [saved, setSaved] = useState(false)

  if (!profile || !bodyLogs) return null

  const weights = bodyLogs
    .filter(l => l.weightKg != null)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(l => ({ date: l.date, kg: l.weightKg! }))
  const weightsChart = weights.slice(-30)
  const trend = movingAvg(weights.map(w => w.kg))
  const todayLog = bodyLogs.find(l => l.date === today)
  const delta = trend != null && profile.targetWeightKg ? null : null
  void delta

  const goalLabel = GOAL_OPTIONS.find(g => g.id === profile.goal)?.label ?? profile.goal
  const plan = macroPlan(profile)

  const saveLog = async () => {
    const w = Number(weight), b = Number(belly)
    if (!(w > 0 || b > 0)) return
    if (todayLog?.id != null) {
      await db.bodyLogs.update(todayLog.id, {
        weightKg: weight ? w : todayLog.weightKg,
        bellyCm: belly ? b : todayLog.bellyCm
      })
    } else {
      await db.bodyLogs.add({
        date: today,
        weightKg: weight ? w : undefined,
        bellyCm: belly ? b : undefined
      })
    }
    setWeight(''); setBelly(''); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <>
      <div style={{ paddingTop: 22 }}>
        <div className="eyebrow">TIẾN TRÌNH</div>
        <h1 className="h">Con số đang đi đúng hướng chưa?</h1>
      </div>

      <div className="card">
        <div className="eyebrow">GHI NHANH HÔM NAY</div>
        <div className="grid2" style={{ marginTop: 4 }}>
          <div>
            <label className="f" htmlFor="pw">Cân nặng (kg)</label>
            <input id="pw" type="number" inputMode="decimal" step="0.1" placeholder={trend ? trend.toFixed(1) : '60'} value={weight} onChange={e => setWeight(e.target.value)} />
          </div>
          <div>
            <label className="f" htmlFor="pb">Vòng bụng (cm)</label>
            <input id="pb" type="number" inputMode="decimal" step="0.5" placeholder="—" value={belly} onChange={e => setBelly(e.target.value)} />
          </div>
        </div>
        <button className="btn ghost" style={{ marginTop: 12 }} onClick={saveLog}>{saved ? 'Đã lưu ✓' : 'Lưu'}</button>
      </div>

      <div className="card">
        <div className="eyebrow">CÂN NẶNG — 30 LẦN GẦN NHẤT</div>
        <div className="kv" style={{ borderTop: 'none' }}>
          <b>Trung bình trượt 7 ngày</b>
          <span className="ringnum">{trend != null ? `${trend.toFixed(1)} kg` : '—'}</span>
        </div>
        <WeightChart weights={weightsChart} />
        {weightsChart.length < 2 && <div className="meta" style={{ marginTop: 8 }}>Cần ít nhất 2 lần ghi để vẽ biểu đồ — cân mỗi ngày cho đường mượt.</div>}
        <p className="note">Điểm nhỏ mờ là số cân thô (hay dao động do nước); đường đậm là trung bình trượt 7 ngày — hãy đánh giá theo đường đậm.</p>
      </div>

      <div className="card">
        <div className="kv"><b>Mục tiêu</b><span>{goalLabel}{profile.targetWeightKg ? ` — ${profile.targetWeightKg} kg` : ''}</span></div>
        <div className="kv"><b>Kcal / protein mục tiêu</b><span className="ringnum">{plan.kcal} kcal · {plan.proteinG} g</span></div>
        <div className="kv"><b>Tới mục tiêu</b><span>{fmtWeeks(plan.weeksToTarget)}</span></div>
      </div>
    </>
  )
}
