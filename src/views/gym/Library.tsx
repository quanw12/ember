import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Session } from '../../db'
import { MUSCLES, EQUIPMENT } from '../../data/exercises.seed'
import { todayStr } from '../../db'

const eqLabel = (id: string): string => EQUIPMENT.find(e => e.id === id)?.label ?? id

export default function Library({ onOpen, onStart, onResume }: {
  onOpen: (slug: string) => void
  onStart: (sessionId: number) => void
  onResume: (sessionId: number) => void
}) {
  const [q, setQ] = useState('')
  const [muscle, setMuscle] = useState<string | null>(null)
  const [equip, setEquip] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const openSession = useLiveQuery(async (): Promise<Session | undefined> => {
    const all = await db.sessions.toArray()
    return all.filter(s => s.endedAt === undefined).sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())[0]
  })

  const list = useLiveQuery(() => db.exercises.toArray())
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return (list ?? [])
      .filter(e => (muscle ? e.muscle === muscle : true))
      .filter(e => (equip ? e.equipment === equip : true))
      .filter(e => (term ? e.name.toLowerCase().includes(term) || e.nameEn.toLowerCase().includes(term) || e.keywords.some(k => k.includes(term)) : true))
      .sort((a, b) => a.name.localeCompare(b.name, 'vi'))
  }, [list, q, muscle, equip])

  const startNew = async () => {
    setBusy(true)
    const session: Session = { date: todayStr(), startedAt: new Date(), name: 'Buổi tập tự do' }
    const id = await db.sessions.add(session)
    setBusy(false)
    onStart(id)
  }

  return (
    <>
      <div style={{ paddingTop: 22 }}>
        <div className="eyebrow">GYM</div>
        <h1 className="h">Thư viện bài tập.</h1>
        {openSession && (
          <div className="card row" style={{ marginTop: 12, borderColor: 'var(--red-deep)' }}>
            <div style={{ flex: 1 }}>
              <div className="card-title">Buổi tập đang dở</div>
              <div className="meta">Bắt đầu lúc {openSession.startedAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
            <button className="btn" style={{ width: 'auto', padding: '10px 16px' }} onClick={() => onResume(openSession.id!)}>Tiếp tục</button>
          </div>
        )}
        <button className="btn" style={{ marginTop: 12 }} disabled={busy} onClick={startNew}>
          {busy ? 'Đang tạo...' : 'BẮT ĐẦU BUỔI TẬP MỚI'}
        </button>
      </div>

      <div className="card">
        <input type="text" placeholder="Tìm bài tập…" value={q} onChange={e => setQ(e.target.value)} aria-label="Tìm bài tập" />
        <div className="seg" style={{ marginTop: 10 }}>
          <button type="button" className={muscle === null ? 'on' : ''} onClick={() => setMuscle(null)}>Tất cả</button>
          {MUSCLES.map(m => (
            <button key={m.id} type="button" className={muscle === m.id ? 'on' : ''} onClick={() => setMuscle(m.id)}>{m.label}</button>
          ))}
        </div>
        <div className="seg" style={{ marginTop: 8 }}>
          <button type="button" className={equip === null ? 'on' : ''} onClick={() => setEquip(null)}>Mọi dụng cụ</button>
          {EQUIPMENT.map(e => (
            <button key={e.id} type="button" className={equip === e.id ? 'on' : ''} onClick={() => setEquip(e.id)}>{e.label}</button>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {filtered.length === 0 && <div className="meta" style={{ padding: 18 }}>Không có bài nào khớp bộ lọc.</div>}
        {filtered.map(ex => (
          <button key={ex.slug} type="button" className="kv" style={{ width: '100%', background: 'none', border: 'none', borderBottom: '1px solid var(--line)', cursor: 'pointer', textAlign: 'left' }}
            onClick={() => onOpen(ex.slug)}>
            <b style={{ display: 'block' }}>{ex.name}{ex.custom ? ' · của bạn' : ''}</b>
            <span>{MUSCLES.find(m => m.id === ex.muscle)?.label ?? ex.muscle} · {eqLabel(ex.equipment)}</span>
          </button>
        ))}
      </div>
    </>
  )
}
