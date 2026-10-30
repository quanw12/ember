import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, epley, type Exercise, type SetEntry, type Session } from '../../db'
import { MUSCLES, EQUIPMENT } from '../../data/exercises.seed'
import MuscleFigure from '../../components/MuscleFigure'

const eqLabel = (id: string): string => EQUIPMENT.find(e => e.id === id)?.label ?? id
const muscleLabel = (id: string): string => MUSCLES.find(m => m.id === id)?.label ?? id

const tiktokSearch = (nameEn: string): string =>
  `https://www.tiktok.com/search?q=${encodeURIComponent(`${nameEn} form tutorial`)}`
const youtubeSearch = (nameEn: string): string =>
  `https://www.youtube.com/results?search_query=${encodeURIComponent(`${nameEn} form tutorial`)}`

function weekStart(d: Date): Date {
  const x = new Date(d)
  const day = (x.getDay() + 6) % 7
  x.setDate(x.getDate() - day)
  x.setHours(0, 0, 0, 0)
  return x
}

type Tab = 'about' | 'history' | 'progress' | 'records'

interface SessionGroup { session: Session; sets: SetEntry[] }

export default function ExerciseDetail({ slug, onBack }: { slug: string; onBack: () => void }) {
  const [pinUrl, setPinUrl] = useState('')
  const [tab, setTab] = useState<Tab>('about')
  const exercise = useLiveQuery(() => db.exercises.where('slug').equals(slug).first())

  const history = useLiveQuery(async (): Promise<SessionGroup[]> => {
    const all = await db.sets.where('exerciseSlug').equals(slug).toArray()
    const done = all.filter(s => s.done)
    if (done.length === 0) return []
    const sessionIds = [...new Set(done.map(s => s.sessionId))]
    const sessions = (await db.sessions.bulkGet(sessionIds)).filter(s => s != null) as Session[]
    const byId = new Map(sessions.map(s => [s.id!, s]))
    const groups = new Map<number, SetEntry[]>()
    for (const s of done) {
      const arr = groups.get(s.sessionId) ?? []
      arr.push(s)
      groups.set(s.sessionId, arr)
    }
    return [...groups.entries()]
      .map(([sid, sets]) => ({ session: byId.get(sid)!, sets: sets.sort((a, b) => a.idx - b.idx) }))
      .filter(g => g.session)
      .sort((a, b) => b.session.startedAt.getTime() - a.session.startedAt.getTime())
  }, [slug])

  if (!exercise) return null
  const ex: Exercise = exercise

  const pin = async () => {
    const url = pinUrl.trim()
    if (!/^https?:\/\//.test(url)) return
    if (ex.id != null) await db.exercises.update(ex.id, { pinnedVideoUrl: url })
    setPinUrl('')
  }
  const unpin = async () => {
    if (ex.id != null) await db.exercises.update(ex.id, { pinnedVideoUrl: undefined })
  }

  const groups = history ?? []
  const maxWeight = groups.flatMap(g => g.sets).reduce<SetEntry | null>((best, s) => (!best || s.kg > best.kg ? s : best), null)
  const bestE1rm = groups.flatMap(g => g.sets).reduce<number>((best, s) => Math.max(best, epley(s.kg, s.reps)), 0)
  const bestVolumeGroup = groups.map(g => ({ g, v: g.sets.reduce((a, s) => a + s.kg * s.reps, 0) })).sort((a, b) => b.v - a.v)[0]

  const weeks: { start: Date; volume: number }[] = []
  if (groups.length > 0) {
    const now0 = weekStart(new Date())
    for (let i = 7; i >= 0; i--) {
      const start = new Date(now0); start.setDate(start.getDate() - i * 7)
      const end = new Date(start); end.setDate(end.getDate() + 7)
      const volume = groups
        .filter(g => g.session.startedAt >= start && g.session.startedAt < end)
        .flatMap(g => g.sets)
        .reduce((a, s) => a + s.kg * s.reps, 0)
      weeks.push({ start, volume })
    }
  }
  const maxWeekVolume = Math.max(1, ...weeks.map(w => w.volume))

  return (
    <>
      <div style={{ paddingTop: 18 }}>
        <button type="button" onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer', fontSize: 13, padding: 0 }}>
          ← Thư viện
        </button>
        <h1 className="h">{ex.name}</h1>
        <div className="meta">{ex.nameEn}</div>
        <div className="seg" style={{ marginTop: 10 }}>
          <span className="streak" style={{ color: 'var(--text-2)', fontWeight: 500 }}>{muscleLabel(ex.muscle)}</span>
          <span className="streak" style={{ color: 'var(--text-2)', fontWeight: 500 }}>{eqLabel(ex.equipment)}</span>
          {ex.level && <span className="streak" style={{ color: 'var(--text-2)', fontWeight: 500 }}>{ex.level}</span>}
        </div>
      </div>

      {ex.muscle !== 'other' && (
        <div className="card">
          <div className="eyebrow">NHÓM CƠ ĐÍCH · {muscleLabel(ex.muscle).toUpperCase()}</div>
          <div className="row" style={{ marginTop: 10, justifyContent: 'center', gap: 30 }}>
            <MuscleFigure highlight={[ex.muscle]} view="front" height={185} />
            <MuscleFigure highlight={[ex.muscle]} view="back" height={185} />
          </div>
          <div className="note">Nhóm cơ bài này nhắm tới sẽ sáng đỏ — mặt trước bên trái, mặt sau bên phải.</div>
        </div>
      )}

      {ex.images && ex.images.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex' }}>
            {ex.images.map(u => (
              <img key={u} src={u} alt={`Minh họa ${ex.name}`} loading="lazy"
                style={{ width: '50%', display: 'block', background: '#FFFFFF' }}
                onError={e => { e.currentTarget.style.display = 'none' }} />
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div className="eyebrow">VIDEO HƯỚNG DẪN</div>
        {ex.pinnedVideoUrl && (
          <div className="kv">
            <b><a href={ex.pinnedVideoUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--ember)' }}>▶ Video bạn đã ghim</a></b>
            <span><button type="button" onClick={unpin} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 12 }}>bỏ ghim</button></span>
          </div>
        )}
        <div className="row" style={{ marginTop: ex.pinnedVideoUrl ? 0 : 8 }}>
          <div style={{ flex: 1 }}>
            <a className="btn ghost" style={{ textAlign: 'center', textDecoration: 'none' }} href={tiktokSearch(ex.nameEn)} target="_blank" rel="noreferrer">TikTok</a>
          </div>
          <div style={{ flex: 1 }}>
            <a className="btn ghost" style={{ textAlign: 'center', textDecoration: 'none' }} href={youtubeSearch(ex.nameEn)} target="_blank" rel="noreferrer">YouTube</a>
          </div>
        </div>
        {!ex.pinnedVideoUrl && (
          <>
            <label className="f" htmlFor="pin">Ghim video bạn ưng (dán link TikTok/YouTube)</label>
            <div className="row">
              <input id="pin" type="text" placeholder="https://..." value={pinUrl} onChange={e => setPinUrl(e.target.value)} style={{ flex: 1 }} />
              <button className="btn ghost" style={{ width: 'auto', padding: '10px 14px', margin: 0 }} onClick={pin} disabled={!/^https?:\/\//.test(pinUrl.trim())}>Ghim</button>
            </div>
            <div className="note">Nguồn video cuối cùng do bạn tuyển chọn — link ghim hiển thị trên đầu trang này.</div>
          </>
        )}
      </div>

      <div className="nav nav-pills" style={{ marginTop: 16, display: 'flex', gap: 6, flexWrap: 'wrap' }} role="tablist" aria-label="Mục thông tin bài tập">
        {([['about', 'Về'], ['history', 'Lịch sử'], ['progress', 'Tiến độ'], ['records', 'Kỷ lục']] as [Tab, string][]).map(([id, label]) => (
          <button key={id} type="button" onClick={() => setTab(id)}
            style={{ background: tab === id ? 'var(--red)' : 'transparent', border: '1px solid ' + (tab === id ? 'var(--red)' : 'var(--line-2)'), color: tab === id ? '#fff' : 'var(--text-2)', borderRadius: 999, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'about' && (
        <>
          {ex.steps && ex.steps.length > 0 && (
            <div className="card">
              <div className="eyebrow">THỰC HIỆN</div>
              <ol style={{ margin: '8px 0 0 18px', color: 'var(--text-1)', fontSize: 14, lineHeight: 1.6 }}>
                {ex.steps.map((s, i) => <li key={i} style={{ marginBottom: 6 }}>{s}</li>)}
              </ol>
            </div>
          )}
          {ex.mistakes && (
            <div className="card" style={{ borderColor: 'var(--red-deep)' }}>
              <div className="eyebrow">LỖI THƯỜNG GẶP</div>
              <div style={{ marginTop: 6, fontSize: 14, lineHeight: 1.55, color: 'var(--text-1)' }}>{ex.mistakes}</div>
            </div>
          )}
        </>
      )}

      {tab === 'history' && (
        <div className="card" style={{ padding: 14 }}>
          {groups.length === 0 && <div className="meta">Chưa có lịch sử — các set bạn tick trong buổi tập sẽ hiện ở đây.</div>}
          {groups.map(({ session, sets }) => {
            const best = sets.reduce((b, s) => Math.max(b, epley(s.kg, s.reps)), 0)
            return (
              <div className="kv" key={session.id}>
                <b>
                  {session.startedAt.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  <span style={{ display: 'block', fontWeight: 400, color: 'var(--text-2)', fontSize: 12 }} className="ringnum">
                    {sets.map(s => `${s.kg}×${s.reps}`).join(' · ')}
                  </span>
                </b>
                <span className="ringnum">e1RM {Math.round(best)} kg</span>
              </div>
            )
          })}
        </div>
      )}

      {tab === 'progress' && (
        <div className="card" style={{ padding: 14 }}>
          {groups.length === 0 ? (
            <div className="meta">Biểu đồ khối lượng theo tuần sẽ xuất hiện sau buổi tập đầu tiên.</div>
          ) : (
            <>
              <div className="eyebrow">VOLUME / TUẦN (KG×LẦN)</div>
              <svg viewBox="0 0 320 130" style={{ width: '100%', height: 'auto', marginTop: 10 }} role="img" aria-label="Khối lượng tập theo tuần">
                {weeks.map((w, i) => {
                  const bw = 320 / 8 - 6
                  const h = Math.round((w.volume / maxWeekVolume) * 90)
                  return (
                    <g key={i}>
                      <rect x={i * (320 / 8) + 3} y={110 - h} width={bw} height={Math.max(h, w.volume > 0 ? 3 : 0)} rx="4"
                        fill={i === 7 ? 'var(--red)' : 'var(--line-2)'} />
                      {w.volume > 0 && (
                        <text x={i * (320 / 8) + 3 + bw / 2} y={104 - h} textAnchor="middle" fontSize="9" fill="var(--text-2)" className="ringnum">{w.volume}</text>
                      )}
                    </g>
                  )
                })}
                <text x="3" y="126" fontSize="9" fill="var(--text-3)">8 tuần trước</text>
                <text x="317" y="126" textAnchor="end" fontSize="9" fill="var(--text-3)">Tuần này</text>
              </svg>
            </>
          )}
        </div>
      )}

      {tab === 'records' && (
        <div className="card" style={{ padding: 14 }}>
          {groups.length === 0 ? (
            <div className="meta">Chưa có kỷ lục — cứ tập, EMBER tự ghi cho.</div>
          ) : (
            <>
              <div className="kv"><b>Nặng nhất</b><span className="ringnum">{maxWeight ? `${maxWeight.kg} kg × ${maxWeight.reps} lần` : '—'}</span></div>
              <div className="kv"><b>1RM ước lượng (Epley)</b><span className="ringnum">{Math.round(bestE1rm)} kg</span></div>
              <div className="kv"><b>Buổi volume cao nhất</b><span className="ringnum">{bestVolumeGroup ? `${bestVolumeGroup.v} kg×lần · ${bestVolumeGroup.g.session.startedAt.toLocaleDateString('vi-VN')}` : '—'}</span></div>
              <p className="note">1RM theo công thức Epley: kg × (1 + lần/30) — chỉ dùng để theo dõi xu hướng, không phải mức nên thử trực tiếp.</p>
            </>
          )}
        </div>
      )}
    </>
  )
}
