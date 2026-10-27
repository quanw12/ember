import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, todayStr, listSlots, getActiveSlot, setActiveSlot, activateSlotDb, createSlot, renameSlot, deleteSlot } from '../db'
import { ACTIVITY_OPTIONS, GOAL_OPTIONS, macroPlan, fmtWeeks, cycleInfo, PHASE_LABEL } from '../lib/calc'
import { exportIcs } from '../lib/calendar'
import type { ReminderCfg } from '../lib/reminders'

const pad = (n: number): string => String(n).padStart(2, '0')

function MiniBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      style={{ background: 'none', border: '1px solid var(--line-2)', color: 'var(--text-2)', borderRadius: 8, padding: '4px 8px', fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}>
      {children}
    </button>
  )
}

export default function ProfileView({ onUsersChanged }: { onUsersChanged: () => void }) {
  const profile = useLiveQuery(() => db.profile.get(1))
  const cycleQ = useLiveQuery(() => db.cycleLogs.orderBy('date').reverse().toArray())
  const remRow = useLiveQuery(() => db.settings.get('reminder'))
  const rem = (remRow?.value ?? null) as ReminderCfg | null
  const notifPermission = typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  const [newUserName, setNewUserName] = useState('')

  if (!profile) return null
  const plan = macroPlan(profile)
  const actLabel = ACTIVITY_OPTIONS.find(a => a.id === profile.activity)?.label ?? profile.activity
  const goalLabel = GOAL_OPTIONS.find(g => g.id === profile.goal)?.label ?? profile.goal

  const exportJson = async () => {
    const slot = getActiveSlot()
    const out: Record<string, unknown[]> = {}
    for (const t of db.tables) out[t.name] = await t.toArray()
    const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ember-${(slot?.name ?? 'ho-so').toLowerCase().replace(/[^a-z0-9]+/gi, '-')}-${todayStr()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const wipe = async () => {
    const slot = getActiveSlot()
    if (!slot) return
    if (!window.confirm(`Xoá TOÀN BỘ dữ liệu của "${slot.name}" trên máy này? Hãy xuất backup trước nếu cần.`)) return
    await deleteSlot(slot.id)
    onUsersChanged()
  }

  const switchTo = (id: string) => {
    if (getActiveSlot()?.id === id) return
    setActiveSlot(id)
    activateSlotDb(id)
    onUsersChanged()
  }

  const addUser = () => {
    const n = newUserName.trim()
    if (!n) return
    createSlot(n)
    setNewUserName('')
    onUsersChanged()
  }

  const markCycleStart = async () => {
    await db.cycleLogs.add({ date: todayStr(), kind: 'start' })
  }

  const setRem = (patch: Partial<ReminderCfg>) => {
    const next: ReminderCfg = { enabled: rem?.enabled ?? false, hour: rem?.hour ?? 18, minute: rem?.minute ?? 0, ...patch }
    void db.settings.put({ key: 'reminder', value: next })
  }
  const askPermission = async () => {
    if (typeof Notification !== 'undefined') await Notification.requestPermission()
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

      {profile.sex === 'female' && (
        <div className="card">
          <div className="eyebrow">CHU KỲ — CHẾ ĐỘ NỮ</div>
          <label className="f" htmlFor="clen">Độ dài chu kỳ (ngày)</label>
          <input id="clen" type="number" inputMode="numeric" min={20} max={45}
            value={profile.cycleLenDays ?? 28}
            onChange={e => { const v = Number(e.target.value); if (v >= 20 && v <= 45) void db.profile.update(1, { cycleLenDays: v }) }} />
          {(() => {
            const lastStart = cycleQ?.find(c => c.kind === 'start')?.date
            return (
              <>
                <div className="kv"><b>Kỳ kinh gần nhất</b><span>{lastStart ? new Date(lastStart).toLocaleDateString('vi-VN') : 'chưa ghi'}</span></div>
                {lastStart && (() => {
                  const ci = cycleInfo(lastStart, profile.cycleLenDays ?? 28)
                  return <div className="kv"><b>Hôm nay</b><span>Ngày {ci.day} · {PHASE_LABEL[ci.phase]}</span></div>
                })()}
                <button className="btn ghost" style={{ marginTop: 12 }} onClick={markCycleStart}>Kinh bắt đầu hôm nay</button>
              </>
            )
          })()}
        </div>
      )}

      <div className="card">
        <div className="eyebrow">NHẮC NHỞ HẰNG NGÀY</div>
        <div className="seg" style={{ marginTop: 8 }}>
          <button type="button" className={!rem?.enabled ? 'on' : ''} onClick={() => setRem({ enabled: false })}>Tắt</button>
          <button type="button" className={rem?.enabled ? 'on' : ''} onClick={() => setRem({ enabled: true })}>Bật</button>
        </div>
        <label className="f" htmlFor="rtime">Giờ nhắc (mỗi ngày 1 lần — tập xong là im)</label>
        <input id="rtime" type="time" value={`${pad(rem?.hour ?? 18)}:${pad(rem?.minute ?? 0)}`}
          onChange={e => { const [h, m] = e.target.value.split(':').map(Number); if (Number.isFinite(h) && Number.isFinite(m)) setRem({ hour: h, minute: m }) }} />
        <div className="kv"><b>Quyền thông báo</b><span>
          {notifPermission === 'granted' ? 'Đã cấp'
            : notifPermission === 'denied' ? 'Bị chặn — bật lại trong Cài đặt Safari'
            : notifPermission === 'unsupported' ? 'Không hỗ trợ'
            : <button type="button" className="btn ghost" style={{ width: 'auto', padding: '8px 14px', fontSize: 11, margin: 0 }} onClick={askPermission}>Cấp quyền</button>}
        </span></div>
        <button className="btn ghost" style={{ marginTop: 12 }} onClick={() => void exportIcs()}>Xuất lịch 14 ngày (.ics → Apple Calendar)</button>
        <p className="note">
          iOS PWA không gửi thông báo khi app đóng — để nhắc đúng giờ tuyệt đối: mở file .ics và thêm vào Apple Calendar, hoặc dùng app <b>Shortcuts</b> tạo Automation "Time of Day" mở EMBER tại giờ đã hẹn. Khi app đang mở, EMBER tự thông báo đúng giờ hẹn.
        </p>
      </div>

      <div className="card">
        <div className="eyebrow">NGƯỜI DÙNG TRÊN MÁY NÀY</div>
        {(() => {
          const slots = listSlots()
          const active = getActiveSlot()
          return (
            <>
              {slots.map(s => (
                <div className="kv" key={s.id}>
                  <b>{s.name}{s.id === active?.id ? ' — đang dùng' : ''}</b>
                  <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    {s.id !== active?.id && <MiniBtn onClick={() => switchTo(s.id)}>Chuyển</MiniBtn>}
                    <MiniBtn onClick={() => { const n = window.prompt('Đổi tên hồ sơ:', s.name); if (n?.trim()) { renameSlot(s.id, n.trim()); onUsersChanged() } }}>Đổi tên</MiniBtn>
                    <MiniBtn onClick={async () => { if (window.confirm(`Xoá hồ sơ "${s.name}" và TOÀN BỘ dữ liệu của người này?`)) { await deleteSlot(s.id); onUsersChanged() } }}>Xoá</MiniBtn>
                  </span>
                </div>
              ))}
              <div className="row" style={{ marginTop: 10 }}>
                <input type="text" placeholder="Tên người mới" value={newUserName} onChange={e => setNewUserName(e.target.value)} style={{ flex: 1 }} />
                <button className="btn ghost" style={{ width: 'auto', padding: '10px 14px', margin: 0 }} disabled={!newUserName.trim()} onClick={addUser}>Thêm</button>
              </div>
              <p className="note">
                Mỗi hồ sơ là một kho dữ liệu riêng hoàn toàn trên máy này: mục tiêu, kế hoạch, lịch tập, ảnh, backup — tách biệt 100%. Thông báo nhắc chạy cho hồ sơ đang mở.
              </p>
            </>
          )
        })()}
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
