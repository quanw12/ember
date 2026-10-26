import { useLiveQuery } from 'dexie-react-hooks'
import { db, todayStr } from '../db'
import { ACTIVITY_OPTIONS, GOAL_OPTIONS, macroPlan, fmtWeeks } from '../lib/calc'

export default function ProfileView() {
  const profile = useLiveQuery(() => db.profile.get(1))

  if (!profile) return null
  const plan = macroPlan(profile)
  const actLabel = ACTIVITY_OPTIONS.find(a => a.id === profile.activity)?.label ?? profile.activity
  const goalLabel = GOAL_OPTIONS.find(g => g.id === profile.goal)?.label ?? profile.goal

  const exportJson = async () => {
    const out: Record<string, unknown[]> = {}
    for (const t of db.tables) out[t.name] = await t.toArray()
    const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ember-backup-${todayStr()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const wipe = async () => {
    if (!window.confirm('Xoá TOÀN BỘ dữ liệu EMBER trên máy này? Hãy xuất backup trước nếu cần.')) return
    await db.delete()
    location.reload()
  }

  return (
    <>
      <div style={{ paddingTop: 22 }}>
        <div className="eyebrow">HỒ SƠ</div>
        <h1 className="h">Con số của bạn.</h1>
      </div>

      <div className="card">
        <div className="kv"><b>Mục tiêu</b><span>{goalLabel}{profile.targetWeightKg ? ` — ${profile.targetWeightKg} kg` : ''}</span></div>
        <div className="kv"><b>Tới mục tiêu</b><span>{fmtWeeks(plan.weeksToTarget)}</span></div>
        <div className="kv"><b>Giới tính / tuổi</b><span>{profile.sex === 'male' ? 'Nam' : 'Nữ'} · {profile.age}</span></div>
        <div className="kv"><b>Chiều cao / cân nặng</b><span className="ringnum">{profile.heightCm} cm · {profile.weightKg} kg</span></div>
        <div className="kv"><b>Vận động</b><span>{actLabel}</span></div>
        <div className="kv"><b>Buổi tập/tuần</b><span className="ringnum">{profile.daysGym} gym · {profile.daysRun} chạy</span></div>
      </div>

      <div className="card">
        <div className="eyebrow">MỤC TIÊU DINH DƯỠNG</div>
        <div className="kv"><b>Nguồn năng lượng</b><span className="ringnum">{plan.kcal} kcal/ngày</span></div>
        <div className="kv"><b>Protein / Béo / Carb</b><span className="ringnum">{plan.proteinG} / {plan.fatG} / {plan.carbG} g</span></div>
        <div className="kv"><b>BMR / TDEE</b><span className="ringnum">{plan.bmr} / {plan.tdee} kcal</span></div>
        <p className="note">
          Nguồn: BMR Mifflin-St Jeor (1990) · protein ISSN 2017 (1.6–2.2 g/kg) · tốc độ đổi cân an toàn 0.5–1%/tuần · lean bulk +200–500 kcal. Số liệu tự tính lại mỗi khi bạn đổi thông tin. EMBER không thay thế tư vấn y tế.
        </p>
      </div>

      <div className="card">
        <div className="eyebrow">DỮ LIỆU — CỦA BẠN, TRÊN MÁY BẠN</div>
        <div className="meta" style={{ marginTop: 6 }}>EMBER không có tài khoản, không server. Backup là file JSON do bạn giữ.</div>
        <button className="btn ghost" style={{ marginTop: 12 }} onClick={exportJson}>Xuất backup JSON</button>
        <button className="btn danger" onClick={wipe}>Xoá toàn bộ dữ liệu</button>
      </div>
    </>
  )
}
