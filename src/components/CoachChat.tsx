import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, getActiveSlot, type RoutineDay } from '../db'
import { macroPlan } from '../lib/calc'
import {
  coachGreeting, coachRespond,
  type CoachCtx, type CoachMsg, type CoachState
} from '../lib/coach'

let idSeq = 100_000

export default function CoachChat({ onClose }: { onClose: () => void }) {
  const profile = useLiveQuery(() => db.profile.get(1))
  const exercises = useLiveQuery(() => db.exercises.toArray())
  const activeRow = useLiveQuery(() => db.settings.get('activeRoutineId'))
  const routines = useLiveQuery(() => db.routines.toArray())

  const [msgs, setMsgs] = useState<CoachMsg[]>([])
  const [state, setState] = useState<CoachState>({ flow: 'idle' })
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const greeted = useRef(false)

  // Chào khi đã nạp đủ context (chỉ 1 lần).
  useEffect(() => {
    if (!greeted.current && profile && exercises) {
      greeted.current = true
      setMsgs([coachGreeting(getActiveSlot()?.name, profile.sex)])
    }
  }, [profile, exercises])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [msgs])

  const ctx: CoachCtx | null = (() => {
    if (!profile || !exercises) return null
    const plan = macroPlan(profile)
    return {
      sex: profile.sex,
      equipment: profile.equipment,
      kcal: plan.kcal,
      proteinG: plan.proteinG,
      exercises
    }
  })()

  const lastChips = [...msgs].reverse().find(m => m.chips)?.chips ?? []

  const pushBot = (newMsgs: CoachMsg[]) => setMsgs(prev => [...prev, ...newMsgs])

  const send = (text: string) => {
    const t = text.trim()
    if (!t || !ctx || busy) return
    setMsgs(prev => [...prev, { id: idSeq++, from: 'user', text: t }])
    setBusy(true)
    setTimeout(() => {
      const { state: next, msgs: botMsgs, action } = coachRespond(t, state, ctx)
      void (async () => {
        if (action?.kind === 'apply-plan') {
          const id = await db.routines.add({ name: action.name, source: 'custom', days: action.daysSpec, createdAt: new Date() })
          await db.settings.put({ key: 'activeRoutineId', value: id })
        } else if (action?.kind === 'apply-today') {
          await applyToday(action.slugs)
        }
        pushBot(botMsgs)
        setState(next)
        setBusy(false)
      })()
    }, 250)
  }

  /** Ghi slugs vào ngày hôm nay của kế hoạch đang dùng (tạo mới nếu chưa có kế hoạch nào). */
  const applyToday = async (slugs: string[]): Promise<void> => {
    const weekday = (new Date().getDay() === 0 ? 7 : new Date().getDay()) as RoutineDay['weekday']
    const id = activeRow?.value as number | undefined
    const routine = id != null ? routines?.find(r => r.id === id) : undefined
    if (routine?.id != null) {
      const days = routine.days.map(d => (d.weekday === weekday ? { ...d, slugs } : d))
      if (!days.some(d => d.weekday === weekday)) days.push({ weekday, slugs })
      await db.routines.update(routine.id, { days })
    } else {
      const newId = await db.routines.add({ name: 'Coach · lịch của tôi', source: 'custom', days: [{ weekday, slugs }], createdAt: new Date() })
      await db.settings.put({ key: 'activeRoutineId', value: newId })
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(6,6,8,.75)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
      <div className="coach-panel" onClick={e => e.stopPropagation()}>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
          <div>
            <div className="eyebrow">EMBER COACH</div>
            <h2 className="h">Chat với Coach của bạn</h2>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer', fontSize: 22 }} aria-label="Đóng">×</button>
        </div>
        <div className="meta" style={{ marginBottom: 10 }}>Offline 100% — chạy ngay trên máy bạn, không gửi dữ liệu đi đâu.</div>

        <div className="coach-msgs" ref={listRef}>
          {msgs.map(m => (
            <div key={m.id} className={`coach-msg ${m.from}`}>
              {m.text}
              {m.planName && <div className="coach-plan-name">{m.planName}</div>}
              {m.planLines && (
                <ul className="coach-plan">
                  {m.planLines.map((l, i) => <li key={i}>{l}</li>)}
                </ul>
              )}
              {m.todaySlugs && <div className="coach-plan-name">{m.todaySlugs.join(' · ')}</div>}
            </div>
          ))}
          {busy && <div className="coach-msg bot" style={{ opacity: .5 }}>…</div>}
          {lastChips.length > 0 && !busy && (
            <div className="coach-chips">
              {lastChips.map(chip => (
                <button key={chip} type="button" className="coach-chip" onClick={() => send(chip)}>{chip}</button>
              ))}
            </div>
          )}
        </div>

        <div className="row" style={{ marginTop: 10 }}>
          <input type="text" placeholder="Hỏi Coach: lịch tuần, đổi buổi, protein…" value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { send(input); setInput('') } }}
            aria-label="Nhắn cho Coach" style={{ flex: 1 }} />
          <button className="btn" style={{ width: 'auto', padding: '12px 18px', margin: 0 }} disabled={!input.trim() || busy} onClick={() => { send(input); setInput('') }}>Gửi</button>
        </div>
      </div>
    </div>
  )
}
