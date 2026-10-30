import { useState } from 'react'
import { createSlot } from '../db'
import iconUrl from '../assets/brand/icon.svg'

/** Màn hình đầu tiên khi chưa có hồ sơ nào trên máy — mỗi người một kho riêng. */
export default function FirstRun({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('')

  const create = () => {
    const n = name.trim()
    if (!n) return
    createSlot(n)
    onDone()
  }

  return (
    <div className="app" style={{ paddingTop: '14vh', textAlign: 'center' }}>
      <img src={iconUrl} alt="EMBER" style={{ width: 96, height: 96, borderRadius: 24, display: 'block', margin: '0 auto' }} />
      <h1 className="h" style={{ fontSize: 30, marginTop: 14 }}>EMBER</h1>
      <div className="meta">Keep the fire · mỗi người một kho dữ liệu riêng trên máy này</div>
      <div style={{ maxWidth: 320, margin: '26px auto 0', textAlign: 'left' }}>
        <label className="f" htmlFor="fname">Tên của bạn</label>
        <input id="fname" type="text" placeholder="Tên của bạn" value={name}
          onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') create() }} />
        <button className="btn" style={{ marginTop: 14 }} disabled={!name.trim()} onClick={create}>TẠO HỒ SƠ</button>
        <p className="note" style={{ textAlign: 'center' }}>
          Bạn bè dùng chung máy? Thêm hồ sơ cho họ ở tab Hồ sơ — dữ liệu và kế hoạch tách biệt hoàn toàn.
        </p>
      </div>
    </div>
  )
}
