import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, todayStr, type Exercise, type Profile } from '../../db'
import { WEEKDAYS, WEEKDAYS_SHORT } from '../../data/routines.seed'
import { MUSCLES } from '../../data/exercises.seed'
import { recommendFor, orderAdvice, sortDaySlugs, suggestSplit } from '../../lib/recommend'
import { makeNameOf } from '../../lib/gym'
import BodyMap from '../../components/BodyMap'
import '../../planner.css'

const muscleLabel = (id: string): string => MUSCLES.find(m => m.id === id)?.label ?? id

/**
 * Lập lịch tuần: chọn ngày → chọn nhóm cơ trên bản đồ cơ thể → chọn bài từ gợi ý.
 * Hệ thống chỉ XẾP HẠNG bài để gợi ý, không tự chọn sẵn bài nào.
 * Lưu xong: tạo kế hoạch mới, đặt làm kế hoạch hoạt động, ghi weeklyPlannedOn
 * để tắt nhắc cuối tuần.
 */
export default function WeeklyPlanner({ onBack }: { onBack: () => void }) {
  const exercises = useLiveQuery(() => db.exercises.toArray())
  const profile = useLiveQuery(() => db.profile.get(1))

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [days, setDays] = useState<number[]>([])
  const [dayIdx, setDayIdx] = useState(0)
  const [dayMuscles, setDayMuscles] = useState<Record<number, string[]>>({})
  const [daySlugs, setDaySlugs] = useState<Record<number, string[]>>({})
  const [preview, setPreview] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  if (!profile) return null
  const exs = exercises ?? []
  const nameOf = makeNameOf(exs)
  const wd = days[dayIdx]
  const curMuscles = dayMuscles[wd] ?? []
  const curSlugs = daySlugs[wd] ?? []
  const bySlug = new Map<string, Exercise>(exs.map(e => [e.slug, e]))

  /* ---- thay đổi state ---- */
  const toggleDay = (d: number) => {
    setDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort((a, b) => a - b))
  }
  const applySplit = () => {
    const split = suggestSplit(profile.daysGym, profile.sex)
    setDays(split.map(([d]) => d))
    setDayMuscles(Object.fromEntries(split))
    setDayIdx(0)
  }
  const toggleMuscle = (m: string) => {
    setPreview(m)
    setDayMuscles(prev => {
      const cur = prev[wd] ?? []
      return { ...prev, [wd]: cur.includes(m) ? cur.filter(x => x !== m) : [...cur, m] }
    })
  }
  const toggleSlug = (slug: string) => {
    setDaySlugs(prev => {
      const cur = prev[wd] ?? []
      return { ...prev, [wd]: cur.includes(slug) ? cur.filter(x => x !== slug) : [...cur, slug] }
    })
  }
  const moveSlug = (idx: number, dir: -1 | 1) => {
    const j = idx + dir
    if (j < 0 || j >= curSlugs.length) return
    const arr = [...curSlugs]
    ;[arr[idx], arr[j]] = [arr[j], arr[idx]]
    setDaySlugs(prev => ({ ...prev, [wd]: arr }))
  }
  const sortCur = () => setDaySlugs(prev => ({ ...prev, [wd]: sortDaySlugs(curSlugs, exs) }))

  const goStep2 = () => {
    // mỗi ngày đã chọn mặc định chưa có nhóm cơ — người dùng bấm chọn trên bản đồ
    setDayMuscles(prev => {
      const next = { ...prev }
      for (const d of days) if (!next[d]) next[d] = []
      return next
    })
    setDayIdx(0); setPreview(null); setStep(2)
  }
  const goStep3 = () => { setDayIdx(0); setStep(3) }

  const allDaysHaveMuscles = days.every(d => (dayMuscles[d] ?? []).length > 0)
  const canSave = days.some(d => (daySlugs[d] ?? []).length > 0)

  const save = async () => {
    const daysOut = days.map(d => ({ weekday: d, slugs: daySlugs[d] ?? [] })).filter(x => x.slugs.length > 0)
    if (daysOut.length === 0) return
    const name = `Lịch tuần ${new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}`
    const id = await db.routines.add({ name, source: 'custom', days: daysOut, createdAt: new Date() })
    await db.settings.put({ key: 'activeRoutineId', value: id })
    await db.settings.put({ key: 'weeklyPlannedOn', value: todayStr() })
    onBack()
  }

  /* ---- mảnh UI dùng lại ---- */
  const DayTabs = () => (
    <div className="wp-daytabs" role="tablist" aria-label="Ngày đang soạn">
      {days.map((d, i) => (
        <button key={d} type="button" role="tab" aria-selected={i === dayIdx}
          className={`wp-daytab${i === dayIdx ? ' on' : ''}`} onClick={() => setDayIdx(i)}>
          {WEEKDAYS_SHORT[d - 1]}
          <span style={{ opacity: .7, marginLeft: 4, fontSize: 10 }}>
            {(dayMuscles[d] ?? []).length > 0 ? `· ${(dayMuscles[d] ?? []).length} nhóm` : ''}
          </span>
        </button>
      ))}
    </div>
  )

  const recList = (m: string) => recommendFor(m, exs, profile.equipment)

  return (
    <>
      <div style={{ paddingTop: 18 }}>
        <button type="button" onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer', fontSize: 13, padding: 0 }}>← Kế hoạch</button>
        <h1 className="h">Lập lịch tuần mới.</h1>
        <div className="meta">Bước {step}/3 — {step === 1 ? 'chọn ngày tập' : step === 2 ? 'chọn nhóm cơ từng ngày' : 'chọn bài từ gợi ý'}</div>
      </div>

      {/* ---------- BƯỚC 1: chọn ngày ---------- */}
      {step === 1 && (
        <div className="card">
          <div className="eyebrow">1 · NGÀY NÀO TẬP?</div>
          <div className="wp-daytabs" style={{ marginTop: 10 }}>
            {[1, 2, 3, 4, 5, 6, 7].map(d => (
              <button key={d} type="button" className={`wp-daytab${days.includes(d) ? ' on' : ''}`}
                onClick={() => toggleDay(d)} aria-pressed={days.includes(d)}>
                {WEEKDAYS_SHORT[d - 1]}
              </button>
            ))}
          </div>
          <div className="meta" style={{ marginTop: 8 }}>
            {days.length === 0 ? 'Bấm chọn ngày trong tuần bạn muốn tập.' : `Đã chọn ${days.length} ngày: ${days.map(d => WEEKDAYS[d - 1]).join(', ')}`}
          </div>
          <button type="button" className="btn ghost" style={{ marginTop: 12 }} onClick={applySplit}>
            GỢI Ý SPLIT {profile.daysGym} BUỔI {profile.sex === 'female' ? '(NỮ)' : ''}
          </button>
          <div className="note">Split gợi ý chia nhóm cơ theo số buổi bạn khai báo ở hồ sơ — vẫn sửa được ở bước sau.</div>
          <button className="btn" style={{ marginTop: 12 }} disabled={days.length === 0} onClick={goStep2}>
            TIẾP TỤC — CHỌN NHÓM CƠ
          </button>
        </div>
      )}

      {/* ---------- BƯỚC 2: nhóm cơ theo ngày ---------- */}
      {step === 2 && (
        <>
          <div className="card">
            <div className="eyebrow">2 · {WEEKDAYS[wd - 1].toUpperCase()} — CHỌN NHÓM CƠ</div>
            <div className="meta" style={{ marginTop: 4 }}>Bấm thẳng vào khối cơ trên hình, hoặc dùng chip bên dưới. Bài tập cho từng nhóm sẽ hiện ở bước sau.</div>
            <div style={{ marginTop: 8 }}>
              <BodyMap selected={curMuscles} onToggle={toggleMuscle} />
            </div>
            {preview && (
              <div style={{ marginTop: 12, padding: '10px 12px', background: 'var(--bg-1)', border: '1px solid var(--line-2)', borderRadius: 12 }}>
                <b style={{ fontSize: 13 }}>{muscleLabel(preview)}</b>
                <div className="meta" style={{ marginTop: 2 }}>
                  {recList(preview).length > 0
                    ? `${recList(preview).length} bài gợi ý · ví dụ: ${recList(preview).slice(0, 3).map(r => r.ex.nameEn).join(', ')}`
                    : 'Chưa có bài nào khớp dụng cụ của bạn'}
                </div>
              </div>
            )}
          </div>
          <div className="card">
            <DayTabs />
            <button className="btn" style={{ marginTop: 12 }} disabled={!allDaysHaveMuscles} onClick={goStep3}>
              TIẾP TỤC — CHỌN BÀI TẬP
            </button>
            {!allDaysHaveMuscles && <div className="note">Còn ngày chưa chọn nhóm cơ nào — mỗi ngày tập cần ít nhất 1 nhóm.</div>}
          </div>
        </>
      )}

      {/* ---------- BƯỚC 3: chọn bài từ gợi ý ---------- */}
      {step === 3 && (
        <>
          <div className="card">
            <div className="eyebrow">3 · {WEEKDAYS[wd - 1].toUpperCase()} — CHỌN BÀI</div>
            <div className="meta" style={{ marginTop: 4 }}>Nguyên tắc thứ tự: compound lớn đầu buổi → isolation giữa buổi → core/cơ nhỏ cuối buổi. Bạn tự bấm chọn, hệ thống không chọn sẵn bài nào.</div>

            <div style={{ marginTop: 10 }}>
              <b style={{ fontSize: 14 }}>Đã chọn ({curSlugs.length})</b>
              {curSlugs.length > 1 && (
                <button type="button" onClick={sortCur} style={{ float: 'right', background: 'none', border: 'none', color: 'var(--red-soft)', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                  Sắp theo thứ tự gợi ý
                </button>
              )}
              {curSlugs.length === 0 && <div className="meta" style={{ marginTop: 6 }}>Chưa có bài nào — chọn từ gợi ý bên dưới.</div>}
              {curSlugs.map((slug, idx) => {
                const ex = bySlug.get(slug)
                return (
                  <div className="kv" key={slug}>
                    <b>
                      <span style={{ color: 'var(--text-3)', marginRight: 6 }}>{idx + 1}.</span>
                      {nameOf(slug).en}
                      <span className="wp-ordernote" style={{ display: 'block' }}>{orderAdvice(ex)}</span>
                    </b>
                    <span style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                      <IconBtn label="Lên" disabled={idx === 0} onClick={() => moveSlug(idx, -1)}>↑</IconBtn>
                      <IconBtn label="Xuống" disabled={idx === curSlugs.length - 1} onClick={() => moveSlug(idx, 1)}>↓</IconBtn>
                      <IconBtn label="Bỏ" onClick={() => toggleSlug(slug)}>×</IconBtn>
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {curMuscles.map(m => {
            const recs = recList(m)
            const key = `${wd}:${m}`
            const shown = expanded[key] ? recs : recs.slice(0, 6)
            return (
              <div className="card" key={m}>
                <div className="eyebrow">{muscleLabel(m).toUpperCase()} · {recs.length} GỢI Ý</div>
                <div style={{ marginTop: 4 }}>
                  {recs.length === 0 && <div className="meta">Không có bài nào khớp dụng cụ của bạn cho nhóm này.</div>}
                  {shown.map(r => {
                    const added = curSlugs.includes(r.ex.slug)
                    return (
                      <button key={r.ex.slug} type="button" className="wp-pickrow" onClick={() => toggleSlug(r.ex.slug)}
                        aria-pressed={added}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <b>{r.ex.nameEn}{added ? ' — đã chọn' : ''}</b>
                          <span className="sub">
                            {r.secondary.length > 0
                              ? `Nhắm chính: ${muscleLabel(r.ex.muscle)} · phụ: ${r.secondary.map(s => muscleLabel(s)).join(', ')}`
                              : `Nhắm chính: ${muscleLabel(r.ex.muscle)}`}
                            {r.ex.nameEn !== r.ex.name ? ` · ${r.ex.name}` : ''}
                          </span>
                        </div>
                        <span className={`wp-role${r.role === 'compound' ? ' compound' : ''}`}>{r.role === 'compound' ? 'Compound' : 'Isolation'}</span>
                        <span style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid ' + (added ? 'var(--red)' : 'var(--line-2)'), color: added ? 'var(--red-soft)' : 'var(--text-2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>
                          {added ? '✓' : '＋'}
                        </span>
                      </button>
                    )
                  })}
                  {recs.length > 6 && (
                    <button type="button" onClick={() => setExpanded(p => ({ ...p, [key]: !p[key] }))}
                      style={{ background: 'none', border: 'none', color: 'var(--red-soft)', cursor: 'pointer', fontSize: 12, fontWeight: 700, padding: '10px 0' }}>
                      {expanded[key] ? '− Thu gọn' : `+ Xem thêm ${recs.length - 6} bài từ thư viện`}
                    </button>
                  )}
                </div>
              </div>
            )
          })}

          <div className="card">
            <DayTabs />
            <button className="btn" style={{ marginTop: 12 }} disabled={!canSave} onClick={save}>
              LƯU KẾ HOẠCH TUẦN & DÙNG NGAY
            </button>
            {!canSave && <div className="note">Cần ít nhất một ngày có bài tập thì mới lưu được.</div>}
            <div className="note">Lưu xong kế hoạch được đặt làm "ĐANG DÙNG" — tab Hôm nay sẽ tự chỉ bài theo đúng thứ. Nhắc cuối tuần tự tắt cho tuần này.</div>
          </div>
        </>
      )}

      <div className="spacer" />
    </>
  )
}

function IconBtn({ children, onClick, disabled, label }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; label: string }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label}
      style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--line-2)', background: 'transparent', color: disabled ? 'var(--text-3)' : 'var(--text-2)', cursor: disabled ? 'default' : 'pointer', fontSize: 14, opacity: disabled ? 0.4 : 1 }}>
      {children}
    </button>
  )
}
