import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, todayStr, movingAvg, type Photo } from '../db'
import { macroPlan, GOAL_OPTIONS, fmtWeeks } from '../lib/calc'
import { compressImage } from '../lib/image'

function PhotosCard() {
  const photos = useLiveQuery(() => db.photos.orderBy('date').reverse().toArray()) as Photo[] | undefined
  const [sel, setSel] = useState<number[]>([])
  const [busy, setBusy] = useState(false)

  const urls = useMemo(() => {
    const m = new Map<number, string>()
    for (const p of photos ?? []) m.set(p.id!, URL.createObjectURL(p.blob))
    return m
  }, [photos])
  useEffect(() => () => { urls.forEach(u => URL.revokeObjectURL(u)) }, [urls])

  const add = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setBusy(true)
    try {
      const blob = await compressImage(f)
      await db.photos.add({ date: todayStr(), blob })
    } finally {
      setBusy(false)
    }
  }

  const toggle = (id: number) => setSel(s =>
    s.includes(id) ? s.filter(x => x !== id) : s.length >= 2 ? [s[1], id] : [...s, id]
  )
  const remove = async (id: number) => {
    if (!window.confirm('Xoá ảnh này?')) return
    await db.photos.delete(id)
    setSel(s => s.filter(x => x !== id))
  }

  const selected = (photos ?? []).filter(p => sel.includes(p.id!))

  return (
    <div className="card">
      <div className="eyebrow">ẢNH PROGRESS</div>
      {selected.length === 2 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          {selected.map(p => (
            <div key={p.id} style={{ flex: 1 }}>
              <img src={urls.get(p.id!)} alt={`Ảnh ${p.date}`} style={{ width: '100%', display: 'block', borderRadius: 12 }} />
              <div className="meta" style={{ textAlign: 'center' }}>{p.date}</div>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 10 }}>
        {(photos ?? []).map(p => (
          <div key={p.id} style={{ position: 'relative' }}>
            <button type="button" onClick={() => toggle(p.id!)}
              style={{ padding: 0, border: sel.includes(p.id!) ? '2px solid var(--red)' : '1px solid var(--line-2)', borderRadius: 10, overflow: 'hidden', cursor: 'pointer', display: 'block', width: '100%', background: 'none' }}>
              <img src={urls.get(p.id!)} alt={`Ảnh ${p.date}`} style={{ width: '100%', display: 'block' }} />
            </button>
            <button type="button" onClick={() => remove(p.id!)} aria-label="Xoá ảnh"
              style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%', border: 'none', background: 'rgba(10,10,12,.8)', color: 'var(--text-2)', cursor: 'pointer', fontSize: 12 }}>×</button>
          </div>
        ))}
      </div>
      <label className="btn ghost" style={{ marginTop: 12, textAlign: 'center', cursor: 'pointer' }}>
        {busy ? 'Đang xử lý…' : (photos?.length ?? 0) > 0 ? '+ Thêm ảnh (chọn 2 để so sánh)' : '+ Chụp/Thêm ảnh đầu tiên'}
        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={add} />
      </label>
      <p className="note">Ảnh nén và lưu ngay trên máy — không upload đi đâu. Chọn 2 ảnh để so sánh hai mốc cạnh nhau.</p>
    </div>
  )
}

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

/** Cột kcal 7 ngày + đường mục tiêu. */
function KcalChart({ logs, target }: { logs: { date: string; kcal: number }[]; target: number }) {
  if (logs.length === 0) return null
  const W = 320, H = 130, PADY = 16
  const max = Math.max(target, ...logs.map(l => l.kcal)) * 1.15
  const slot = W / 7
  const bw = slot - 10
  const y = (v: number) => PADY + (1 - v / max) * (H - PADY * 2)
  const offset = 7 - logs.length // neo phải: ngày mới nhất bên phải

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', marginTop: 10 }} role="img" aria-label="Kcal 7 ngày so với mục tiêu">
      <line x1={0} x2={W} y1={y(target)} y2={y(target)} stroke="var(--ember)" strokeWidth="1.5" strokeDasharray="4 4" />
      <text x={W - 4} y={y(target) - 4} textAnchor="end" fontSize="9" fill="var(--ember)" className="ringnum">mục tiêu {target}</text>
      {logs.map((l, i) => {
        const inRange = l.kcal >= target * 0.85 && l.kcal <= target * 1.1
        const bx = (offset + i) * slot + 5
        const by = y(l.kcal)
        return (
          <g key={l.date}>
            <rect x={bx} y={by} width={bw} height={H - PADY - by} rx="4" fill={inRange ? 'var(--red)' : 'var(--line-2)'} />
            <text x={bx + bw / 2} y={by - 4} textAnchor="middle" fontSize="9" fill="var(--text-2)" className="ringnum">{l.kcal}</text>
            <text x={bx + bw / 2} y={H - 4} textAnchor="middle" fontSize="9" fill="var(--text-3)">{l.date.slice(5)}</text>
          </g>
        )
      })}
    </svg>
  )
}

export default function Progress() {
  const today = todayStr()
  const profile = useLiveQuery(() => db.profile.get(1))
  const bodyLogs = useLiveQuery(() => db.bodyLogs.orderBy('date').toArray())
  const kcalQ = useLiveQuery(() => db.nutritionLogs.orderBy('date').toArray())
  const sleepQ = useLiveQuery(() => db.sleepLogs.orderBy('date').toArray())
  const [weight, setWeight] = useState('')
  const [belly, setBelly] = useState('')
  const [saved, setSaved] = useState(false)

  if (!profile || !bodyLogs || !kcalQ || !sleepQ) return null

  const weights = bodyLogs
    .filter(l => l.weightKg != null)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(l => ({ date: l.date, kg: l.weightKg! }))
  const weightsChart = weights.slice(-30)
  const trend = movingAvg(weights.map(w => w.kg))
  const todayLog = bodyLogs.find(l => l.date === today)

  const goalLabel = GOAL_OPTIONS.find(g => g.id === profile.goal)?.label ?? profile.goal
  const plan = macroPlan(profile)

  const kcalLogs = (kcalQ ?? [])
    .filter(l => l.kcal != null)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-7)
    .map(l => ({ date: l.date, kcal: l.kcal! }))
  const sleepLogs7 = (sleepQ ?? [])
    .filter(l => l.hours != null)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 7)
  const avgProtein7 = (kcalQ ?? [])
    .filter(l => l.proteinG != null)
    .slice(-7)
    .reduce((a, l, _, arr) => a + l.proteinG! / arr.length, 0)

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

      <PhotosCard />

      <div className="card">
        <div className="eyebrow">NĂNG LƯỢNG — 7 NGÀY</div>
        <KcalChart logs={kcalLogs} target={plan.kcal} />
        {kcalLogs.length === 0 && <div className="meta" style={{ marginTop: 8 }}>Nhập kcal ở tab Hôm nay để thấy biểu đồ so với mục tiêu.</div>}
        <div className="kv"><b>Protein TB 7 ngày</b><span className="ringnum">{avgProtein7 > 0 ? `${Math.round(avgProtein7)} / ${plan.proteinG} g` : '—'}</span></div>
      </div>

      <div className="card">
        <div className="eyebrow">GIẤC NGỦ</div>
        {sleepLogs7.length === 0 && <div className="meta" style={{ marginTop: 6 }}>Nhập giờ ngủ ở tab Hôm nay — ngủ đủ là một nửa của việc tăng cơ.</div>}
        {sleepLogs7.map(l => (
          <div className="kv" key={l.id}>
            <b>{new Date(l.date).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })}</b>
            <span className="ringnum">{l.hours} giờ {(l.hours ?? 0) >= 7 ? '✓' : ''}</span>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="kv"><b>Mục tiêu</b><span>{goalLabel}{profile.targetWeightKg ? ` — ${profile.targetWeightKg} kg` : ''}</span></div>
        <div className="kv"><b>Kcal / protein mục tiêu</b><span className="ringnum">{plan.kcal} kcal · {plan.proteinG} g</span></div>
        <div className="kv"><b>Tới mục tiêu</b><span>{fmtWeeks(plan.weeksToTarget)}</span></div>
      </div>
    </>
  )
}
