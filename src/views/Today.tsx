import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, todayStr, movingAvg, getActiveSlot } from '../db'
import { macroPlan, GOAL_OPTIONS } from '../lib/calc'
import { weekdayShort, jsDayToWeekday } from '../data/routines.seed'
import { FlameIcon, DumbbellIcon } from '../components/icons'
import TargetPhoto from '../components/TargetPhoto'

function greeting(name?: string): string {
  const h = new Date().getHours()
  const base = h < 11 ? 'Chào buổi sáng' : h < 14 ? 'Buổi trưa rồi' : h < 18 ? 'Chiều rồi' : 'Buổi tối rồi'
  return name ? `${base}, ${name}.` : `${base}.`
}

const DAYS = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy']

export default function Today({ onGoGym, onQuickStart }: { onGoGym: () => void; onQuickStart: (slugs: string[], name: string) => void }) {
  const today = todayStr()
  const profile = useLiveQuery(() => db.profile.get(1))
  const bodyLogs = useLiveQuery(() => db.bodyLogs.orderBy('date').toArray())
  const todayNutrition = useLiveQuery(() => db.nutritionLogs.where('date').equals(today).first())
  const todaySleep = useLiveQuery(() => db.sleepLogs.where('date').equals(today).first())
  const sessions = useLiveQuery(() => db.sessions.toArray())
  const activeRow = useLiveQuery(() => db.settings.get('activeRoutineId'))
  const routines = useLiveQuery(() => db.routines.toArray())
  const exercises = useLiveQuery(() => db.exercises.toArray())

  const [kcal, setKcal] = useState('')
  const [protein, setProtein] = useState('')
  const [sleep, setSleep] = useState('')

  useEffect(() => {
    if (todayNutrition?.kcal != null) setKcal(String(todayNutrition.kcal))
    if (todayNutrition?.proteinG != null) setProtein(String(todayNutrition.proteinG))
  }, [todayNutrition?.id])
  useEffect(() => {
    if (todaySleep?.hours != null) setSleep(String(todaySleep.hours))
  }, [todaySleep?.id])

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

  // Streak: số ngày liên tục có buổi tập, đếm từ hôm nay/lùi về sau
  const sessionDates = new Set((sessions ?? []).map(s => s.date))
  let streak = 0
  const cursor = new Date()
  while (sessionDates.has(cursor.toISOString().slice(0, 10))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }

  const goalLabel = GOAL_OPTIONS.find(g => g.id === profile.goal)?.label ?? profile.goal

  const activeRoutine = routines?.find(r => r.id === (activeRow?.value as number | undefined))
  const weekday = jsDayToWeekday(new Date().getDay())
  const todayPlanDay = activeRoutine?.days.find(d => d.weekday === weekday)
  const planSlugs = todayPlanDay?.slugs ?? []
  const nameOf = (slug: string): string => exercises?.find(e => e.slug === slug)?.name ?? slug

  const saveQuickLog = async () => {
    const k = Number(kcal), p = Number(protein), s = Number(sleep)
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
  }

  const R = 30, C = 2 * Math.PI * R

  return (
    <>
      <div style={{ paddingTop: 22 }}>
        <div className="eyebrow">{DAYS[new Date().getDay()]} · {new Date().toLocaleDateString('vi-VN')}</div>
        <h1 className="h">{greeting(getActiveSlot()?.name)}</h1>
        <div style={{ marginTop: 10 }}>
          <span className="streak"><FlameIcon /> {streak > 0 ? `${streak} ngày giữ lửa` : 'Bắt đầu lửa hôm nay'}</span>
        </div>
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
          <div className="card-title">Mục tiêu: {goalLabel}{target ? ` — ${target} kg` : ''}</div>
          <div className="meta ringnum">
            Hiện tại ~{current.toFixed(1)} kg · bắt đầu {start} kg
            {plan.weeksToTarget != null ? ` · còn ~${plan.weeksToTarget} tuần` : ''}
          </div>
        </div>
        {profile.targetPhoto && <TargetPhoto blob={profile.targetPhoto} />}
      </div>

      {planSlugs.length > 0 && activeRoutine ? (
        <div className="card">
          <div className="eyebrow">GYM · {weekdayShort(weekday).toUpperCase()} · {activeRoutine.name.toUpperCase()}</div>
          <h2 className="h" style={{ marginTop: 4 }}>Hôm nay: {planSlugs.length} bài</h2>
          <div className="meta">{planSlugs.map(nameOf).join(' · ')}</div>
          <button className="btn" style={{ marginTop: 12 }} onClick={() => onQuickStart(planSlugs, `${activeRoutine.name} · ${weekdayShort(weekday)}`)}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
              <DumbbellIcon /> BẮT ĐẦU TẬP
            </span>
          </button>
        </div>
      ) : (
        <div className="card">
          <div className="eyebrow">GYM · HÔM NAY</div>
          <h2 className="h" style={{ marginTop: 4 }}>Buổi tập đang trên đường về.</h2>
          <div className="meta">Chọn kế hoạch ở tab Gym để Hôm nay tự chỉ bài — hoặc tập tự do ngay.</div>
          <button className="btn" style={{ marginTop: 12 }} onClick={onGoGym}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
              <DumbbellIcon /> BẮT ĐẦU TẬP
            </span>
          </button>
        </div>
      )}

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
        <button className="btn ghost" style={{ marginTop: 12 }} onClick={saveQuickLog}>Lưu nhật ký hôm nay</button>
      </div>
    </>
  )
}
