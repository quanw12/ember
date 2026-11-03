import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, todayStr, listSlots, getActiveSlot, setActiveSlot, activateSlotDb, createSlot, renameSlot, deleteSlot } from '../db'
import { ACTIVITY_OPTIONS, GOAL_OPTIONS, macroPlan, fmtWeeks, cycleInfo, PHASE_LABEL, toDisplayW, type Unit } from '../lib/calc'
import { exportIcs } from '../lib/calendar'
import type { ReminderCfg } from '../lib/reminders'
import { compressImage } from '../lib/image'
import TargetPhoto from '../components/TargetPhoto'
import StreakCalendar from '../components/StreakCalendar'
import { exportBackup, parseBackup, restoreBackup } from '../lib/backup'

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
  const [notifPermission, setNotifPermission] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'unsupported')
  const [newUserName, setNewUserName] = useState('')
  const [backupBusy, setBackupBusy] = useState(false)
  const [backupMessage, setBackupMessage] = useState('')
  const unitRow = useLiveQuery(() => db.settings.get('unit'))
  const unit = (unitRow?.value as Unit | undefined) ?? 'kg'

  if (!profile) return null
  const plan = macroPlan(profile)
  const actLabel = ACTIVITY_OPTIONS.find(a => a.id === profile.activity)?.label ?? profile.activity
  const goalLabel = GOAL_OPTIONS.find(g => g.id === profile.goal)?.label ?? profile.goal

  const exportJson = async () => {
    setBackupBusy(true)
    setBackupMessage('')
    try {
      const slot = getActiveSlot()
      const blob = new Blob([await exportBackup()], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ember-${(slot?.name ?? 'ho-so').toLowerCase().replace(/[^a-z0-9]+/gi, '-')}-${todayStr()}.json`
      document.body.append(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 30_000)
      setBackupMessage('Đã tạo backup gồm nhật ký và ảnh. Hãy lưu file ở nơi an toàn.')
    } catch (error) { setBackupMessage(error instanceof Error ? error.message : 'Không thể xuất backup.') }
    finally { setBackupBusy(false) }
  }

  const importJson = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setBackupBusy(true)
    setBackupMessage('')
    try {
      if (file.size > 50 * 1024 * 1024) throw new Error('File vượt quá 50 MB. Hãy liên hệ hỗ trợ để khôi phục backup lớn.')
      const backup = parseBackup(await file.text())
      if (!window.confirm(`Thay thế dữ liệu hồ sơ đang mở bằng backup này? Ảnh và nhật ký hiện tại sẽ được thay thế. Hãy xuất backup hiện tại trước.`)) return
      await restoreBackup(backup)
      onUsersChanged()
    } catch (error) { setBackupMessage(error instanceof Error ? error.message : 'Không thể khôi phục backup. Dữ liệu hiện tại được giữ nguyên.') }
    finally { setBackupBusy(false) }
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

  const changeTargetPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    await db.profile.update(1, { targetPhoto: await compressImage(f) })
  }

  const removeTargetPhoto = async () => {
    await db.profile.update(1, { targetPhoto: undefined })
  }

  const setUnit = (u: Unit) => {
    void db.settings.put({ key: 'unit', value: u })
  }

  const setRem = (patch: Partial<ReminderCfg>) => {
    const next: ReminderCfg = { enabled: rem?.enabled ?? false, hour: rem?.hour ?? 18, minute: rem?.minute ?? 0, ...patch }
    void db.settings.put({ key: 'reminder', value: next })
  }
  const askPermission = async () => {
    if (typeof Notification !== 'undefined') {
      try { setNotifPermission(await Notification.requestPermission()) }
      catch { setBackupMessage('Không thể xin quyền thông báo. Trên iPhone, hãy thêm EMBER vào màn hình chính rồi thử lại.') }
    }
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
        <div className="row" style={{ marginTop: 10 }}>
          {profile.targetPhoto && <TargetPhoto blob={profile.targetPhoto} />}
          <label className="btn ghost" style={{ width: 'auto', padding: '8px 12px', margin: 0, cursor: 'pointer' }}>
            {profile.targetPhoto ? 'Đổi ảnh mục tiêu' : '+ Ảnh body mục tiêu'}
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={changeTargetPhoto} />
          </label>
          {profile.targetPhoto && <MiniBtn onClick={removeTargetPhoto}>Bỏ ảnh</MiniBtn>}
        </div>
        <div className="kv" style={{ marginTop: 8 }}><b>Đơn vị cân nặng</b>
          <span style={{ display: 'flex', gap: 4 }}>
            {(['kg', 'lb'] as Unit[]).map(u => (
              <button key={u} type="button" onClick={() => setUnit(u)}
                style={{ background: unit === u ? 'var(--red)' : 'none', color: unit === u ? '#fff' : 'var(--text-2)', border: '1px solid ' + (unit === u ? 'var(--red)' : 'var(--line-2)'), borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                {u}
              </button>
            ))}
          </span>
        </div>
        <p className="note">Tạ trong buổi tập vẫn tính theo kg — đĩa tạ ở phòng gym VN chuẩn kg.</p>
        <div className="kv"><b>Giới tính / tuổi</b><span>{profile.sex === 'male' ? 'Nam' : 'Nữ'} · {profile.age}</span></div>
        <div className="kv"><b>Chiều cao / cân nặng</b><span className="ringnum">{profile.heightCm} cm · {toDisplayW(profile.weightKg, unit).toFixed(1)} {unit}</span></div>
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
        <div className="eyebrow">LỬA CHECK-IN · LỊCH THÁNG</div>
        <StreakCalendar />
      </div>

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
          Bản EMBER này chỉ nhắc khi app đang mở, chưa tích hợp Web Push nền. Để có lịch nhắc khi đóng app, xuất file .ics và thêm vào ứng dụng Lịch trên điện thoại.
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
        <p className="note">EMBER {__APP_VERSION__} · PWA</p>
        <div className="meta" style={{ marginTop: 6 }}>EMBER không có tài khoản, không server. Backup là file JSON do bạn giữ.</div>
        <button className="btn ghost" style={{ marginTop: 12 }} disabled={backupBusy} onClick={exportJson}>{backupBusy ? 'Đang xử lý…' : 'Xuất backup JSON'}</button>
        <label className="btn ghost backup-import" aria-disabled={backupBusy}>
          Khôi phục từ backup JSON
          <input type="file" accept=".json,application/json" disabled={backupBusy} onChange={importJson} />
        </label>
        {backupMessage && <p className="note" role="status">{backupMessage}</p>}
        <p className="note">Backup bao gồm ảnh và ngày giờ. Dữ liệu chưa tự đồng bộ giữa các máy. Xoá dữ liệu trình duyệt hoặc gỡ app có thể làm mất nhật ký; hãy backup thường xuyên.</p>
        <p className="note"><a href={`${import.meta.env.BASE_URL}privacy.html`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--ember)' }}>Quyền riêng tư & dữ liệu</a> · <a href="https://github.com/quanw12/ember/issues" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-2)' }}>Góp ý cho bản beta</a></p>
        <button className="btn danger" onClick={wipe}>Xoá toàn bộ dữ liệu</button>
      </div>
    </>
  )
}
