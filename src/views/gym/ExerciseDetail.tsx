import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Exercise } from '../../db'
import { MUSCLES, EQUIPMENT } from '../../data/exercises.seed'

const eqLabel = (id: string): string => EQUIPMENT.find(e => e.id === id)?.label ?? id
const muscleLabel = (id: string): string => MUSCLES.find(m => m.id === id)?.label ?? id

const tiktokSearch = (nameEn: string): string =>
  `https://www.tiktok.com/search?q=${encodeURIComponent(`${nameEn} form tutorial`)}`
const youtubeSearch = (nameEn: string): string =>
  `https://www.youtube.com/results?search_query=${encodeURIComponent(`${nameEn} form tutorial`)}`

export default function ExerciseDetail({ slug, onBack }: { slug: string; onBack: () => void }) {
  const [pinUrl, setPinUrl] = useState('')
  const exercise = useLiveQuery(() => db.exercises.where('slug').equals(slug).first())

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
        </div>
      </div>

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
  )
}
