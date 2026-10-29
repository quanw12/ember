import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, todayStr } from '../db'
import { streakOf, workoutDates } from '../lib/gym'
import { FlameIcon } from './icons'

const DOW = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
const MONTHS_VI = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12']

interface Cell { date: string; day: number; lit: boolean; today: boolean; inMonth: boolean }

/** Lưới ngày của tháng đang xem — tuần bắt đầu thứ hai. */
function monthCells(year: number, month: number, lit: Set<string>): Cell[] {
  const today = todayStr()
  const cells: Cell[] = []
  const first = new Date(year, month, 1)
  const lead = (first.getDay() + 6) % 7 // 0=T2
  for (let i = 0; i < lead; i++) {
    const d = new Date(year, month, 1 - (lead - i))
    cells.push({ date: iso(d), day: d.getDate(), lit: lit.has(iso(d)), today: false, inMonth: false })
  }
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  for (let d = 1; d <= daysInMonth; d++) {
    const isoD = iso(new Date(year, month, d))
    cells.push({ date: isoD, day: d, lit: lit.has(isoD), today: isoD === today, inMonth: true })
  }
  const tail = (7 - (cells.length % 7)) % 7
  for (let i = 1; i <= tail; i++) {
    const d = new Date(year, month + 1, i)
    cells.push({ date: iso(d), day: d.getDate(), lit: lit.has(iso(d)), today: false, inMonth: false })
  }
  return cells
}

const iso = (d: Date): string => {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Vẽ thẻ khoe lửa ra PNG (canvas — không cần thư viện ngoài). */
function drawSharePng(monthLabel: string, cells: Cell[], streak: number, litCount: number): void {
  const W = 720, H = 860, cell = 84, gx = 48, gy = 300
  const c = document.createElement('canvas')
  c.width = W; c.height = H
  const g = c.getContext('2d')
  if (!g) return
  g.fillStyle = '#0A0A0C'
  g.fillRect(0, 0, W, H)
  g.fillStyle = '#E8232A'
  g.font = '700 26px "Segoe UI", sans-serif'
  g.fillText('E M B E R', 48, 92)
  g.fillStyle = '#F2F2F4'
  g.font = '800 44px "Segoe UI", sans-serif'
  g.fillText(monthLabel, 48, 150)
  g.fillStyle = '#FF7A45'
  g.font = '600 30px "Segoe UI", sans-serif'
  g.fillText(`🔥 Streak: ${streak} ngày giữ lửa · ${litCount} lửa tháng này`, 48, 205)

  for (let i = 0; i < 7; i++) {
    g.fillStyle = '#5C5C66'
    g.font = '600 20px "Segoe UI", sans-serif'
    g.textAlign = 'center'
    g.fillText(DOW[i], gx + i * cell + cell / 2, gy - 22)
  }
  g.textAlign = 'center'
  cells.forEach((cl, idx) => {
    const col = idx % 7
    const row = Math.floor(idx / 7)
    const x = gx + col * cell + cell / 2
    const y = gy + row * cell + 34
    if (cl.inMonth && cl.lit) {
      g.font = '30px sans-serif'
      g.fillText('🔥', x, y)
      g.fillStyle = '#F2F2F4'
      g.font = '600 16px "Segoe UI", sans-serif'
      g.fillText(String(cl.day), x, y + 22)
    } else if (cl.inMonth) {
      g.fillStyle = '#2C2C33'
      g.beginPath()
      g.arc(x, y - 6, 15, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = '#9A9AA3'
      g.font = '500 16px "Segoe UI", sans-serif'
      g.fillText(String(cl.day), x, y)
    } else {
      g.fillStyle = '#1B1B21'
      g.font = '500 16px "Segoe UI", sans-serif'
      g.fillText('·', x, y)
    }
  })
  g.textAlign = 'left'
  g.fillStyle = '#5C5C66'
  g.font = '400 20px "Segoe UI", sans-serif'
  g.fillText('Mỗi ngày tập là một ngọn lửa. Keep the fire.', 48, H - 40)

  c.toBlob(b => {
    if (!b) return
    const file = new File([b], `ember-lua-${monthLabel.replace(/\s+/g, '-').toLowerCase()}.png`, { type: 'image/png' })
    if (typeof navigator !== 'undefined' && 'share' in navigator && 'canShare' in navigator) {
      void navigator.share({ files: [file], title: 'EMBER — giữ lửa' } as ShareData)
        .catch(() => downloadPng(c, file.name))
    } else {
      downloadPng(c, file.name)
    }
  }, 'image/png')
}

function downloadPng(canvas: HTMLCanvasElement, name: string): void {
  canvas.toBlob(b => {
    if (!b) return
    const url = URL.createObjectURL(b)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    URL.revokeObjectURL(url)
  }, 'image/png')
}

export default function StreakCalendar() {
  const sessions = useLiveQuery(() => db.sessions.toArray())
  const runs = useLiveQuery(() => db.runs.toArray())
  const workedOut = useMemo(() => workoutDates(sessions, runs), [sessions, runs])
  const today = todayStr()
  const [offset, setOffset] = useState(0)
  const now = new Date()
  const view = new Date(now.getFullYear(), now.getMonth() + offset, 1)

  const cells = useMemo(() => monthCells(view.getFullYear(), view.getMonth(), workedOut), [view.getFullYear(), view.getMonth(), workedOut])
  const litCount = cells.filter(c => c.inMonth && c.lit).length
  const streak = streakOf(workedOut, today)
  const monthLabel = `${MONTHS_VI[view.getMonth()]} ${view.getFullYear()}`

  return (
    <>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
        <button type="button" className="mini-nav" onClick={() => setOffset(o => o - 1)} aria-label="Tháng trước">←</button>
        <b style={{ fontSize: 15 }}>{monthLabel}</b>
        <button type="button" className="mini-nav" onClick={() => setOffset(o => Math.min(0, o + 1))} disabled={offset >= 0} aria-label="Tháng sau">→</button>
      </div>
      <div className="cal-grid">
        {DOW.map(d => <div key={d} className="cal-dow">{d}</div>)}
        {cells.map(c => (
          <div key={c.date + c.day} className={`cal-cell ${c.inMonth ? '' : 'out'} ${c.today ? 'today' : ''}`} title={`${c.date}${c.lit ? ' — đã tập ✓' : ''}`}>
            {c.lit ? <FlameIcon className="cal-flame" /> : <span className={c.today ? 'cal-day' : 'cal-day dim'}>{c.day}</span>}
            {c.today && <i className="cal-dot" />}
          </div>
        ))}
      </div>
      <div className="row" style={{ marginTop: 12, justifyContent: 'space-between' }}>
        <span className="streak"><FlameIcon /> {streak > 0 ? `${streak} ngày giữ lửa` : 'Bắt đầu lửa hôm nay'}</span>
        <span className="meta">{litCount} lửa tháng này</span>
      </div>
      <button className="btn ghost" style={{ marginTop: 12 }} onClick={() => drawSharePng(monthLabel, cells, streak, litCount)}>
        📸 Chụp thẻ khoe lửa
      </button>
      <p className="note">Mỗi ngày có buổi tập hoàn thành (gym hoặc chạy) sẽ sáng một ngọn lửa. Thẻ PNG chụp ra để bạn khoe hoặc đăng story.</p>
    </>
  )
}
