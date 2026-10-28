import { useState } from 'react'
import { db, type Profile } from '../db'
import { ACTIVITY_OPTIONS, GOAL_OPTIONS, macroPlan, fmtWeeks } from '../lib/calc'
import { ensureTemplatesFor } from '../data/routines.seed'
import { compressImage } from '../lib/image'
import TargetPhoto from '../components/TargetPhoto'

type Draft = Pick<Profile, 'sex' | 'age' | 'heightCm' | 'weightKg' | 'activity' | 'expLevel' | 'daysGym' | 'daysRun' | 'equipment' | 'goal' | 'targetWeightKg'>

const INITIAL: Draft = {
  sex: 'male',
  age: 25,
  heightCm: 170,
  weightKg: 65,
  activity: 'light',
  expLevel: 'new',
  daysGym: 3,
  daysRun: 1,
  equipment: 'full',
  goal: 'cut',
  targetWeightKg: undefined
}

const num = (v: string): number | undefined => {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

export default function Onboarding() {
  const [step, setStep] = useState(0)
  const [d, setD] = useState<Draft>(INITIAL)
  const [targetPhoto, setTargetPhoto] = useState<Blob | null>(null)
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD(p => ({ ...p, [k]: v }))

  const pickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setTargetPhoto(await compressImage(f))
  }

  const valid =
    d.age >= 13 && d.age <= 90 &&
    d.heightCm >= 120 && d.heightCm <= 230 &&
    d.weightKg >= 30 && d.weightKg <= 250 &&
    (!d.targetWeightKg || (d.targetWeightKg >= 30 && d.targetWeightKg <= 250))

  const plan = macroPlan(d)

  const save = async () => {
    await db.profile.put({ ...d, id: 1, targetPhoto: targetPhoto ?? undefined, createdAt: new Date(), updatedAt: new Date() })
    await db.bodyLogs.add({ date: new Date().toISOString().slice(0, 10), weightKg: d.weightKg })
    await ensureTemplatesFor(d.equipment, d.sex)
  }

  return (
    <div className="app">
      <div className="steps">{[0, 1, 2, 3].map(i => <i key={i} className={i <= step ? 'on' : ''} />)}</div>

      {step === 0 && (
        <>
          <div className="eyebrow">Chào mừng đến EMBER</div>
          <h1 className="h">Mình cần biết bạn một chút.</h1>
          <div className="card">
            <div className="grid2">
              <button type="button" className={`optcard ${d.sex === 'male' ? 'on' : ''}`} onClick={() => set('sex', 'male')}>
                <b>Nam</b><span>Công thức calo nam</span>
              </button>
              <button type="button" className={`optcard ${d.sex === 'female' ? 'on' : ''}`} onClick={() => set('sex', 'female')}>
                <b>Nữ</b><span>Theo chu kỳ · template mông/chân riêng</span>
              </button>
            </div>
            <label className="f" htmlFor="age">Tuổi</label>
            <input id="age" type="number" inputMode="numeric" value={d.age} onChange={e => set('age', Number(e.target.value))} />
            <label className="f" htmlFor="h">Chiều cao (cm)</label>
            <input id="h" type="number" inputMode="numeric" value={d.heightCm} onChange={e => set('heightCm', Number(e.target.value))} />
            <label className="f" htmlFor="w">Cân nặng hiện tại (kg)</label>
            <input id="w" type="number" inputMode="decimal" step="0.1" value={d.weightKg} onChange={e => set('weightKg', Number(e.target.value))} />
          </div>
          <div className="spacer" />
          <button className="btn" disabled={!valid} onClick={() => setStep(1)}>Tiếp tục</button>
        </>
      )}

      {step === 1 && (
        <>
          <div className="eyebrow">Nền tảng của bạn</div>
          <h1 className="h">Vận động và kinh nghiệm.</h1>
          <div className="card">
            <label className="f">Mức vận động hằng ngày</label>
            <select value={d.activity} onChange={e => set('activity', e.target.value as Draft['activity'])}>
              {ACTIVITY_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label} — {o.desc}</option>)}
            </select>
            <label className="f">Kinh nghiệm tập</label>
            <div className="seg">
              {(['new', 'mid', 'pro'] as const).map(l => (
                <button key={l} type="button" className={d.expLevel === l ? 'on' : ''} onClick={() => set('expLevel', l)}>
                  {l === 'new' ? 'Mới' : l === 'mid' ? '1–3 năm' : '3+ năm'}
                </button>
              ))}
            </div>
            <label className="f" htmlFor="dg">Số buổi gym mỗi tuần</label>
            <input id="dg" type="number" inputMode="numeric" min={1} max={7} value={d.daysGym} onChange={e => set('daysGym', Number(e.target.value))} />
            <label className="f" htmlFor="dr">Số buổi chạy mỗi tuần</label>
            <input id="dr" type="number" inputMode="numeric" min={0} max={7} value={d.daysRun} onChange={e => set('daysRun', Number(e.target.value))} />
          </div>
          <div className="spacer" />
          <button className="btn" onClick={() => setStep(2)}>Tiếp tục</button>
          <button className="btn ghost" onClick={() => setStep(0)}>Quay lại</button>
        </>
      )}

      {step === 2 && (
        <>
          <div className="eyebrow">Đích đến</div>
          <h1 className="h">Bạn muốn gì từ cơ thể mình?</h1>
          <div className="card">
            <div className="grid2">
              {GOAL_OPTIONS.map(g => (
                <button key={g.id} type="button" className={`optcard ${d.goal === g.id ? 'on' : ''}`} onClick={() => set('goal', g.id)}>
                  <b>{g.label}</b><span>{g.desc}</span>
                </button>
              ))}
            </div>
            <label className="f" htmlFor="tw">Cân nặng mục tiêu (kg) — tùy chọn</label>
            <input id="tw" type="number" inputMode="decimal" step="0.1" placeholder="Ví dụ 60" value={d.targetWeightKg ?? ''} onChange={e => set('targetWeightKg', num(e.target.value))} />
            <label className="f" htmlFor="tp">Ảnh "body mong muốn" — tùy chọn</label>
            {targetPhoto && (
              <div className="row" style={{ marginTop: 6 }}>
                <TargetPhoto blob={targetPhoto} />
                <button type="button" className="btn ghost" style={{ width: 'auto', padding: '8px 12px', margin: 0 }} onClick={() => setTargetPhoto(null)}>Bỏ ảnh</button>
              </div>
            )}
            {!targetPhoto && (
              <label className="btn ghost" style={{ marginTop: 6, textAlign: 'center', cursor: 'pointer' }}>
                + Chụp / chọn ảnh
                <input id="tp" type="file" accept="image/*" style={{ display: 'none' }} onChange={pickPhoto} />
              </label>
            )}
            <div className="note">Đổi được sau trong Hồ sơ, kể cả đổi chế độ giữa chừng.</div>
          </div>
          <div className="spacer" />
          <button className="btn" disabled={!valid} onClick={() => setStep(3)}>Xem kết quả</button>
          <button className="btn ghost" onClick={() => setStep(1)}>Quay lại</button>
        </>
      )}

      {step === 3 && (
        <>
          <div className="eyebrow">Kế hoạch của bạn</div>
          <h1 className="h">Con số khởi đầu.</h1>
          <div className="card">
            <div className="kv"><b>Nguồn năng lượng</b><span className="ringnum">{plan.kcal} kcal/ngày</span></div>
            <div className="kv"><b>TDEE (giữ cân)</b><span className="ringnum">{plan.tdee} kcal</span></div>
            <div className="kv"><b>BMR</b><span className="ringnum">{plan.bmr} kcal</span></div>
            <div className="kv"><b>Protein</b><span className="ringnum">{plan.proteinG} g</span></div>
            <div className="kv"><b>Chất béo</b><span className="ringnum">{plan.fatG} g</span></div>
            <div className="kv"><b>Carb</b><span className="ringnum">{plan.carbG} g</span></div>
            <div className="kv"><b>Tốc độ an toàn</b><span className="ringnum">{Math.abs(plan.rateKgPerWeek).toFixed(2)} kg/tuần</span></div>
            {d.targetWeightKg && (
              <div className="kv"><b>Tới mục tiêu {d.targetWeightKg} kg</b><span className="ringnum">{fmtWeeks(plan.weeksToTarget)}</span></div>
            )}
          </div>
          <p className="note">
            Nguồn: BMR theo Mifflin-St Jeor (1990) · protein theo vị trí ISSN 2017 (1.6–2.2 g/kg) · tốc độ giảm mỡ an toàn 0.5–1% cân nặng/tuần, lean bulk +200–500 kcal/ngày. Tất cả chỉnh được sau trong Hồ sơ. EMBER không thay thế tư vấn y tế.
          </p>
          <div className="spacer" />
          <button className="btn" onClick={save}>Bắt đầu dùng EMBER</button>
          <button className="btn ghost" onClick={() => setStep(2)}>Quay lại</button>
        </>
      )}
    </div>
  )
}
