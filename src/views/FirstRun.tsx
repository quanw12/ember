import { useState } from 'react'
import { createSlot } from '../db'
import iconUrl from '../assets/brand/icon.svg'
import AccountPanel from '../components/AccountPanel'

/** Màn hình đầu tiên khi chưa có hồ sơ nào trên máy — mỗi người một kho riêng. */
export default function FirstRun({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  const create = () => {
    const n = name.trim()
    if (!n) return
    try { createSlot(n); onDone() }
    catch { setError('Chưa tạo được hồ sơ. Hãy cho phép lưu dữ liệu trang web và thử lại.') }
  }

  return (
    <main className="app welcome">
      <div className="welcome-brand"><img src={iconUrl} alt="" /><span>EMBER</span><small>KEEP THE FIRE</small></div>
      <div className="welcome-art" aria-hidden="true"><div /><div /><div /><img src={iconUrl} alt="" /></div>
      <div className="eyebrow">KHỞI ĐẦU CỦA MỘT THÓI QUEN</div>
      <h1 className="welcome-title">Ngọn lửa nhỏ.<br /><em>Thay đổi lớn.</em></h1>
      <p className="welcome-copy">Tập theo cách của bạn. Ghi từng bước tiến.<br />Một nơi cho gym, chạy bộ và chính bạn.</p>
      <div className="welcome-form card">
        <label className="f" htmlFor="fname">Tên của bạn</label>
        <input id="fname" type="text" autoComplete="given-name" maxLength={60} placeholder="Mọi người gọi bạn là…" value={name}
          onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') create() }} />
        <button className="btn" style={{ marginTop: 14 }} disabled={!name.trim()} onClick={create}>TẠO HỒ SƠ</button>
        {error && <p className="note" role="alert">{error}</p>}
        <p className="note">Không cần tài khoản. Dữ liệu lưu trên thiết bị của bạn.</p>
      </div>
      <div className="welcome-features"><span>01 · GYM</span><span>02 · CHẠY BỘ</span><span>03 · TIẾN TRÌNH</span></div>
      <AccountPanel onChanged={onDone} />
    </main>
  )
}
