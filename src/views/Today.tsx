import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, movingAvg, getActiveSlot } from '../db'
import { macroPlan, GOAL_OPTIONS, toDisplayW, cycleInfo, PHASE_LABEL, type Unit } from '../lib/calc'
import { streakOf, workoutDates, isWeekend, weekKey, plannedThisWeek, localIso, weekStart } from '../lib/gym'
import { FlameIcon } from '../components/icons'
import TargetPhoto from '../components/TargetPhoto'
import TodayPlanCard from '../components/TodayPlanCard'
import { useToday } from '../lib/useToday'

function greeting(name?: string): string {
  const h = new Date().getHours()
  const base = h < 11 ? 'Chào buổi sáng' : h < 14 ? 'Buổi trưa rồi' : h < 18 ? 'Chiều rồi' : 'Buổi tối rồi'
  return name ? `${base}, ${name}.` : `${base}.`
}

const DAYS = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy']

export default function Today({ onGoGym, onQuickStart, onOpenPlanner }: {
  onGoGym: () => void
  onQuickStart: (slugs: string[], name: string) => void
  onOpenPlanner: () => void
}) {
  const today = useToday()
  const profile = useLiveQuery(() => db.profile.get(1))
  const bodyLogs = useLiveQuery(() => db.bodyLogs.orderBy('date').toArray())
  const todayNutrition = useLiveQuery(() => db.nutritionLogs.where('date').equals(today).first(), [today])
  const todaySleep = useLiveQuery(() => db.sleepLogs.where('date').equals(today).first(), [today])
  const sessions = useLiveQuery(() => db.sessions.toArray())
  const checkins = useLiveQuery(() => db.checkins.toArray())
  const runs = useLiveQuery(() => db.runs.toArray())
  const cycleQ = useLiveQuery(() => db.cycleLogs.orderBy('date').reverse().toArray())
  const unitRow = useLiveQuery(() => db.settings.get('unit'))
  const unit = (unitRow?.value as Unit | undefined) ?? 'kg'
  const plannedRow = useLiveQuery(() => db.settings.get('weeklyPlannedOn'))
  const nudgeOffRow = useLiveQuery(() => db.settings.get('weeklyNudgeOff'))
  const showWeeklyNudge = isWeekend()
    && !plannedThisWeek(plannedRow?.value as string | undefined)
    && (nudgeOffRow?.value as string | undefined) !== weekKey()

  const [kcal, setKcal] = useState('')
  const [protein, setProtein] = useState('')
  const [sleep, setSleep] = useState('')
  const [logMessage, setLogMessage] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setKcal(todayNutrition?.kcal != null ? String(todayNutrition.kcal) : '')
    setProtein(todayNutrition?.proteinG != null ? String(todayNutrition.proteinG) : '')
  }, [todayNutrition?.id, today])
  useEffect(() => {
    setSleep(todaySleep?.hours != null ? String(todaySleep.hours) : '')
  }, [todaySleep?.id, today])

  if (!profile) return null
  const plan = macroPlan(profile)

  const weightsAsc = (bodyLogs ?? []).filter(l => l.weightKg != null).sort((a, b) => a.date.localeCompare(b.date)).map(l => l.weightKg!) 
  const current = movingAvg(weightsAsc) ?? profile.weightKg
  const start = profile.weightKg
  const target = profile.targetWeightKg

  let pct: number | null = null
  if (target && target !== start) {
    if ((target < start && current > target) || (target > start && current < target)) {
      pct = Math.round((Math.abs(current - start) / Math.abs(target - start)) * 100)
      pct = Math.min(100, Math.max(0, pct))
    } else {
      pct = 100
    }
  }

  // Streak/lửa: ngày có buổi tập hoàn thành, buổi chạy, HOẶC check-in thắp lửa (không cần ảnh)
  const litDates = workoutDates(sessions, runs, checkins)
  const checkedInToday = (checkins ?? []).some(c => c.date === today)
  const streak = streakOf(litDates, today)
  const monday = localIso(weekStart(new Date()))
  const weekSessions = (sessions ?? []).filter(s => s.endedAt && s.date >= monday && s.date <= today).length
  const weekRuns = (runs ?? []).filter(r => r.date >= monday && r.date <= today)
  const weekKm = weekRuns.reduce((sum, r) => sum + r.distanceKm, 0)

  // Dải 7 ngày gần nhất cho card check-in (đậm dần theo lửa)
  const last7: { date: string; lit: boolean }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const ds = localIso(d)
    last7.push({ date: ds, lit: litDates.has(ds) })
  }

  const goalLabel = GOAL_OPTIONS.find(g => g.id === profile.goal)?.label ?? profile.goal

  const saveQuickLog = async () => {
    const k = Number(kcal), p = Number(protein), s = Number(sleep)
    if ((kcal && (!Number.isFinite(k) || k < 0 || k > 20000)) || (protein && (!Number.isFinite(p) || p < 0 || p > 1000)) || (sleep && (!Number.isFinite(s) || s < 0 || s > 24))) {
      setLogMessage('Kiểm tra lại: kcal 0–20.000, protein 0–1.000 g, giấc ngủ 0–24 giờ.')
      return
    }
    setSaving(true)
    setLogMessage('')
    try {
      await db.transaction('rw', db.nutritionLogs, db.sleepLogs, async () => {
        const existingN = await db.nutritionLogs.where('date').equals(today).first()
        if (existingN?.id) {
          await db.nutritionLogs.update(existingN.id, { kcal: kcal ? k : undefined, proteinG: protein ? p : undefined })
        } else if (kcal || protein) {
          await db.nutritionLogs.add({ date: today, kcal: kcal ? k : undefined, proteinG: protein ? p : undefined })
        }
        const existingS = await db.sleepLogs.where('date').equals(today).first()
        if (existingS?.id) {
          await db.sleepLogs.update(existingS.id, { hours: sleep ? s : undefined })
        } else if (sleep) {
          await db.sleepLogs.add({ date: today, hours: s })
        }
      })
      setLogMessage('Đã lưu nhật ký hôm nay trên thiết bị.')
    } catch { setLogMessage('Chưa lưu được nhật ký. Kiểm tra dung lượng thiết bị và thử lại.') }
    finally { setSaving(false) }
  }

  const R = 30, C = 2 * Math.PI * R

  /** Check-in: thắp lửa ngày hôm nay — không cần chụp ảnh. */
  const checkin = async () => {
    await db.transaction('rw', db.checkins, async () => {
      const existing = await db.checkins.where('date').equals(today).first()
      if (!existing) await db.checkins.add({ date: today, ts: new Date() })
    })
  }

  return (
    <>
      <div className="today-heading">
        <div className="eyebrow">{DAYS[new Date().getDay()]} · {new Date().toLocaleDateString('vi-VN')}</div>
        <h1 className="h">{greeting(getActiveSlot()?.name)}</h1>
        <p className="meta">Một chút tiến bộ. Mỗi ngày.</p>
        <div style={{ marginTop: 10 }}>
          <span className="streak"><FlameIcon /> {streak > 0 ? `${streak} ngày giữ lửa` : 'Bắt đầu lửa hôm nay'}</span>
        </div>
      </div>

      <div className={`card training-hero ${checkedInToday ? 'is-lit' : ''}`}>
        <FlameIcon className="hero-flame" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="eyebrow">CHECK IN HẰNG NGÀY</div>
          <h2 className="h hero-title">{checkedInToday ? <>Lửa đang cháy.<br /><em>Giữ nhịp nhé.</em></> : <>Bắt đầu nhỏ.<br /><em>Giữ lửa lớn.</em></>}</h2>
          <p className="hero-caption">Dành một khoảnh khắc cho bản thân.<br />Hôm nay cũng là một bước tiến.</p>
          <div className="week-rhythm" aria-label="Check-in 7 ngày gần nhất">
            {last7.map(d => (
              <span key={d.date} className={`rhythm-day ${d.lit ? 'lit' : ''} ${d.date === today ? 'current' : ''}`}
                title={`${d.date}: ${d.lit ? 'đã giữ lửa' : 'chưa check-in'}`}>
                <small>{['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][new Date(d.date + 'T12:00:00').getDay()]}</small>
                <span>{d.lit ? <FlameIcon /> : Number(d.date.slice(-2))}</span>
              </span>
            ))}
          </div>
        </div>
        {checkedInToday ? (
          <div className="hero-complete"><FlameIcon /> Đã check in <span>Hẹn bạn ngày mai ↗</span></div>
        ) : (
          <button className="btn hero-cta"
            onClick={checkin}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
              <FlameIcon /> THẮP LỬA
            </span>
          </button>
        )}
      </div>

      <div className="week-overview" aria-label="Tổng quan tuần này">
        <div><span className="metric-value">{weekSessions + weekRuns.length}<small> buổi</small></span><span>Tuần này</span></div>
        <div><span className="metric-value">{weekKm.toFixed(1)}<small> km</small></span><span>Đã chạy</span></div>
        <div><span className="metric-value">{streak}<small> ngày</small></span><span>Giữ lửa liên tiếp</span></div>
      </div>

      <div className="card row">
        <svg width="72" height="72" viewBox="0 0 72 72" role="img" aria-label={pct != null ? `Tiến độ ${pct}%` : 'Chưa đặt mục tiêu cân nặng'}>
          <circle cx="36" cy="36" r={R} fill="none" stroke="var(--line-2)" strokeWidth="6" />
          {pct != null && (
            <circle cx="36" cy="36" r={R} fill="none" stroke="var(--red)" strokeWidth="6" strokeLinecap="round"
              strokeDasharray={`${(C * pct) / 100} ${C}`} transform="rotate(-90 36 36)" />
          )}
          <text x="36" y="41" textAnchor="middle" fill="var(--text-1)" fontSize="14" fontWeight="700">
            {pct != null ? `${pct}%` : '—'}
          </text>
        </svg>
        <div style={{ flex: 1 }}>
          <div className="card-title">Mục tiêu: {goalLabel}{target ? ` — ${toDisplayW(target, unit).toFixed(1)} ${unit}` : ''}</div>
          <div className="meta ringnum">
            Hiện tại ~{toDisplayW(current, unit).toFixed(1)} {unit} · bắt đầu {toDisplayW(start, unit).toFixed(1)} {unit}
            {plan.weeksToTarget != null ? ` · còn ~${plan.weeksToTarget} tuần` : ''}
          </div>
        </div>
        {profile.targetPhoto && <TargetPhoto blob={profile.targetPhoto} />}
      </div>

      {showWeeklyNudge && (
        <div className="card" style={{ borderColor: 'var(--red-deep)' }}>
          <div className="eyebrow">CUỐI TUẦN · LÊN LỊCH</div>
          <h2 className="h" style={{ marginTop: 4 }}>Tuần tới muốn tập những ngày nào, nhóm cơ nào?</h2>
          <div className="meta">Chọn ngày + nhóm cơ trên bản đồ cơ thể, hệ thống gợi ý bài để bạn tự chọn — 2 phút là xong.</div>
          <button className="btn" style={{ marginTop: 12 }} onClick={onOpenPlanner}>LẬP LỊCH TUẦN MỚI</button>
          <button type="button" onClick={async () => { await db.settings.put({ key: 'weeklyNudgeOff', value: weekKey() }) }}
            style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 12, marginTop: 10 }}>
            Để sau — tuần sau nhắc lại
          </button>
        </div>
      )}

      <TodayPlanCard onStart={onQuickStart} onGoPlans={onGoGym} />

      {profile.sex === 'female' && cycleQ && (() => {
        const lastStart = cycleQ.find(c => c.kind === 'start')?.date
        if (!lastStart) return null
        const ci = cycleInfo(lastStart, profile.cycleLenDays ?? 28)
        return (
          <div className="card">
            <div className="eyebrow">CHU KỲ · {PHASE_LABEL[ci.phase].toUpperCase()}</div>
            <h2 className="h" style={{ marginTop: 4 }}>Ngày {ci.day} chu kỳ</h2>
            <div className="meta">{ci.tip}</div>
          </div>
        )
      })()}

      <div className="card">
        <div className="eyebrow">NHẬT KÝ NHANH · 10 GIÂY</div>
        <div className="grid2" style={{ marginTop: 4 }}>
          <div>
            <label className="f" htmlFor="kcal">Kcal đã ăn</label>
            <input id="kcal" type="number" inputMode="numeric" placeholder={`Mục tiêu ${plan.kcal}`} value={kcal} onChange={e => setKcal(e.target.value)} />
          </div>
          <div>
            <label className="f" htmlFor="prot">Protein (g)</label>
            <input id="prot" type="number" inputMode="numeric" placeholder={`Mục tiêu ${plan.proteinG}`} value={protein} onChange={e => setProtein(e.target.value)} />
          </div>
        </div>
        <label className="f" htmlFor="sleep">Giấc ngủ đêm qua (giờ)</label>
        <input id="sleep" type="number" inputMode="decimal" step="0.5" placeholder="7.5" value={sleep} onChange={e => setSleep(e.target.value)} />
        <button className="btn ghost" style={{ marginTop: 12 }} disabled={saving} onClick={saveQuickLog}>{saving ? 'Đang lưu…' : 'Lưu nhật ký hôm nay'}</button>
        {logMessage && <p className="note" role="status">{logMessage}</p>}
      </div>
    </>
  )
}
