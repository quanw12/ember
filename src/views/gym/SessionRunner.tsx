import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, todayStr, type SetEntry } from '../../db'
import ExercisePicker from './ExercisePicker'

interface Row {
  id?: number
  kg: string
  reps: string
  done: boolean
  prev: string
}

/** Các set đã hoàn thành của bài này trong những buổi TRƯỚC, gộp theo buổi gần nhất. */
async function prevSetsFor(slug: string, currentSessionId: number): Promise<string[]> {
  const all = await db.sets.where('exerciseSlug').equals(slug).toArray()
  const done = all.filter(s => s.done && s.sessionId !== currentSessionId)
  if (done.length === 0) return []
  const sessionIds = [...new Set(done.map(s => s.sessionId))]
  const sessions = (await db.sessions.bulkGet(sessionIds)).filter(s => s != null) as { id: number; startedAt: Date }[]
  sessions.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
  const latest = sessions[0]
  if (!latest) return []
  return done
    .filter(s => s.sessionId === latest.id)
    .sort((a, b) => a.idx - b.idx)
    .map(s => `${s.kg}×${s.reps}`)
}

function parsePrev(prev: string): { kg: string; reps: string } {
  const m = prev.match(/^([\d.]+)×(\d+)$/)
  if (m) return { kg: m[1], reps: m[2] }
  return { kg: '', reps: '' }
}

function fmtDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60
  const mm = String(m).padStart(2, '0'), ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`
}

export default function SessionRunner({ id, onDone }: { id: number; onDone: () => void }) {
  const [slugs, setSlugs] = useState<string[]>([])
  const [rows, setRows] = useState<Record<string, Row[]>>({})
  const [prevBySlug, setPrevBySlug] = useState<Record<string, string[]>>({})
  const [loaded, setLoaded] = useState(false)
  const [picker, setPicker] = useState(false)
  const [now, setNow] = useState(Date.now())
  const [restLeft, setRestLeft] = useState<number | null>(null)
  const [restSec, setRestSec] = useState(90)
  const [summary, setSummary] = useState<null | { volume: number; setsDone: number; exercises: number; durationMin: number }>(null)

  const session = useLiveQuery(() => db.sessions.get(id))
  const exercises = useLiveQuery(() => db.exercises.toArray())
  const nameOf = useMemo(() => {
    const m = new Map((exercises ?? []).map(e => [e.slug, e]))
    return (slug: string) => m.get(slug)?.name ?? slug
  }, [exercises])

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (restLeft == null || restLeft <= 0) return
    const t = setInterval(() => setRestLeft(v => (v != null && v > 0 ? v - 1 : null)), 1000)
    return () => clearInterval(t)
  }, [restLeft != null && restLeft > 0])

  useEffect(() => {
    void (async () => {
      const s = await db.sessions.get(id)
      const order = s?.slugs ?? []
      const existing = await db.sets.where('sessionId').equals(id).toArray()
      const grouped: Record<string, Row[]> = {}
      for (const st of [...existing].sort((a, b) => a.idx - b.idx)) {
        ;(grouped[st.exerciseSlug] ??= []).push({ id: st.id, kg: String(st.kg), reps: String(st.reps), done: st.done, prev: '' })
      }
      const prevs: Record<string, string[]> = {}
      for (const slug of order) prevs[slug] = await prevSetsFor(slug, id)
      const filled: Record<string, Row[]> = {}
      for (const slug of order) {
        const p = prevs[slug] ?? []
        filled[slug] = (grouped[slug] ?? []).map((r, i) => ({ ...r, prev: p[i] ?? p[p.length - 1] ?? '' }))
      }
      setSlugs(order); setRows(filled); setPrevBySlug(prevs); setLoaded(true)
    })()
  }, [id])

  const saveOrder = async (order: string[]) => {
    await db.sessions.update(id, { slugs: order })
  }

  const addExercise = async (slug: string) => {
    if (slugs.includes(slug)) { setPicker(false); return }
    const prev = await prevSetsFor(slug, id)
    setPrevBySlug(p => ({ ...p, [slug]: prev }))
    const order = [...slugs, slug]
    setSlugs(order)
    setRows(r => ({ ...r, [slug]: [makeRow(slug, 0, prev)] }))
    await saveOrder(order)
    setPicker(false)
  }

  const makeRow = (slug: string, idx: number, prev: string[]): Row => {
    const p = prev[idx] ?? prev[prev.length - 1] ?? ''
    const parsed = parsePrev(p)
    return { kg: parsed.kg, reps: parsed.reps, done: false, prev: p }
  }

  const addSet = (slug: string) => {
    setRows(r => {
      const arr = r[slug] ?? []
      const row = makeRow(slug, arr.length, prevBySlug[slug] ?? [])
      return { ...r, [slug]: [...arr, row] }
    })
  }

  const updateRow = (slug: string, idx: number, patch: Partial<Row>) => {
    setRows(r => {
      const arr = [...(r[slug] ?? [])]
      arr[idx] = { ...arr[idx], ...patch }
      return { ...r, [slug]: arr }
    })
  }

  const tick = async (slug: string, idx: number) => {
    const row = rows[slug]?.[idx]
    if (!row) return
    if (!row.done) {
      const kg = Number(row.kg), reps = Number(row.reps)
      if (!(kg >= 0 && reps > 0)) return
      const entry: SetEntry = { sessionId: id, exerciseSlug: slug, idx, kg, reps, done: true, ts: new Date() }
      if (row.id != null) {
        await db.sets.update(row.id, { kg, reps, done: true })
        updateRow(slug, idx, { done: true })
      } else {
        const newId = await db.sets.add(entry)
        updateRow(slug, idx, { id: newId, done: true })
      }
      setRestLeft(restSec)
    } else {
      if (row.id != null) await db.sets.update(row.id, { done: false })
      updateRow(slug, idx, { done: false })
    }
  }

  const removeExercise = async (slug: string) => {
    await db.sets.where('sessionId').equals(id).and(s => s.exerciseSlug === slug).delete()
    const order = slugs.filter(s => s !== slug)
    setSlugs(order)
    await saveOrder(order)
  }

  const finish = async () => {
    if (!window.confirm('Kết thúc buổi tập?')) return
    const allRows = slugs.flatMap(slug => rows[slug] ?? [])
    const doneRows = allRows.filter(r => r.done)
    const volume = doneRows.reduce((a, r) => a + Number(r.kg || 0) * Number(r.reps || 0), 0)
    const ended = new Date()
    await db.sessions.update(id, { endedAt: ended })
    setRestLeft(null)
    setSummary({
      volume: Math.round(volume),
      setsDone: doneRows.length,
      exercises: slugs.length,
      durationMin: Math.max(1, Math.round((ended.getTime() - session!.startedAt.getTime()) / 60000))
    })
  }

  if (!loaded || !session) return null

  if (summary) {
    return (
      <>
        <div style={{ paddingTop: 28, textAlign: 'center' }}>
          <div className="eyebrow">HOÀN THÀNH</div>
          <h1 className="h">Lửa hôm nay đã thổi rồi.</h1>
        </div>
        <div className="card">
          <div className="kv"><b>Thời lượng</b><span className="ringnum">~{summary.durationMin} phút</span></div>
          <div className="kv"><b>Bài tập</b><span className="ringnum">{summary.exercises}</span></div>
          <div className="kv"><b>Set hoàn thành</b><span className="ringnum">{summary.setsDone}</span></div>
          <div className="kv"><b>Tổng volume</b><span className="ringnum">{summary.volume} kg×lần</span></div>
        </div>
        <button className="btn" style={{ marginTop: 14 }} onClick={onDone}>Xong</button>
      </>
    )
  }

  const started = session.startedAt.getTime()

  return (
    <>
      <div style={{ paddingTop: 18 }}>
        <button type="button" onClick={onDone} style={{ background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer', fontSize: 13, padding: 0 }}>← Thoát (buổi vẫn được lưu)</button>
        <h1 className="h">{session.name}</h1>
        <div className="meta ringnum">{todayStr()} · đã tập {fmtDuration(now - started)}</div>
      </div>

      {slugs.map(slug => (
        <div className="card" key={slug} style={{ padding: 14 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div className="card-title" style={{ flex: 1 }}>{nameOf(slug)}</div>
            <button type="button" onClick={() => removeExercise(slug)} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 16 }} aria-label={`Bỏ ${nameOf(slug)}`}>×</button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8, fontSize: 13 }}>
            <thead>
              <tr style={{ color: 'var(--text-3)', fontSize: 11, letterSpacing: '.1em' }}>
                <th style={{ textAlign: 'left', padding: '4px 0', fontWeight: 600 }}>HIỆP</th>
                <th style={{ textAlign: 'left', padding: '4px 0', fontWeight: 600 }}>TRƯỚC</th>
                <th style={{ textAlign: 'left', padding: '4px 0', fontWeight: 600 }}>KG</th>
                <th style={{ textAlign: 'left', padding: '4px 0', fontWeight: 600 }}>LẶP</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {(rows[slug] ?? []).map((row, idx) => (
                <tr key={idx} style={{ borderTop: '1px solid var(--line)' }}>
                  <td style={{ padding: '8px 0', color: row.done ? 'var(--ok)' : 'var(--text-2)', fontWeight: 600 }}>{idx + 1}</td>
                  <td style={{ padding: '8px 0', color: 'var(--text-3)', fontSize: 12 }}>{row.prev}</td>
                  <td style={{ padding: '4px 6px 4px 0' }}>
                    <input type="number" inputMode="decimal" step="0.25" placeholder="kg" value={row.kg}
                      onChange={e => updateRow(slug, idx, { kg: e.target.value })}
                      style={{ width: 72, padding: '8px 8px', fontSize: 14 }} aria-label={`Hiệp ${idx + 1} kg`} />
                  </td>
                  <td style={{ padding: '4px 0' }}>
                    <input type="number" inputMode="numeric" step="1" placeholder="reps" value={row.reps}
                      onChange={e => updateRow(slug, idx, { reps: e.target.value })}
                      style={{ width: 60, padding: '8px 8px', fontSize: 14 }} aria-label={`Hiệp ${idx + 1} lần`} />
                  </td>
                  <td>
                    <button type="button" onClick={() => tick(slug, idx)} aria-label={`Hoàn thành hiệp ${idx + 1}`}
                      style={{ width: 34, height: 34, borderRadius: '50%', border: row.done ? 'none' : '1px solid var(--line-2)', background: row.done ? 'var(--ok)' : 'transparent', color: row.done ? '#06281A' : 'var(--text-3)', cursor: 'pointer', fontSize: 15, fontWeight: 700 }}>
                      ✓
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="btn ghost" style={{ marginTop: 8, padding: 10, fontSize: 12 }} onClick={() => addSet(slug)}>+ Thêm hiệp</button>
        </div>
      ))}

      <button className="btn ghost" style={{ marginTop: 14 }} onClick={() => setPicker(true)}>+ Thêm bài tập</button>
      <button className="btn" style={{ marginTop: 10 }} onClick={finish}>KẾT THÚC BUỔI</button>

      {picker && (
        <ExercisePicker exercises={exercises ?? []} picked={slugs} onPick={addExercise} onClose={() => setPicker(false)} />
      )}

      {restLeft != null && restLeft > 0 && (
        <div className="restbar" role="timer" aria-live="polite">
          <div className="inner">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="time">{fmtDuration(restLeft * 1000)}</span>
              <div className="btns">
                {[60, 90, 120].map(sec => (
                  <button key={sec} type="button" className={`chip ${restSec === sec ? 'on' : ''}`} onClick={() => { setRestSec(sec); setRestLeft(sec) }}>{sec}s</button>
                ))}
                <button type="button" className="chip" onClick={() => setRestLeft(v => (v ?? 0) + 15)}>+15s</button>
                <button type="button" className="chip" onClick={() => setRestLeft(null)}>Bỏ qua</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

