import type { Exercise, Profile, RoutineDay } from '../db'
import { ALLOWED_EQUIPMENT } from '../data/routines.seed'
import { exNames } from './gym'

/**
 * EMBER Coach — chatbot offline 100% (không server, không API key).
 * Engine rule-based: nhận biết ý bằng từ khoá, dẫn dắt bằng quick-chips,
 * sinh lịch tập theo lựa chọn của người dùng (số buổi / kiểu chia /
 * nhóm cơ hôm nay) và có thể áp thẳng vào kế hoạch đang dùng.
 */

export type CoachAction =
  | { kind: 'apply-plan'; name: string; daysSpec: RoutineDay[] }
  | { kind: 'apply-today'; slugs: string[] }

export interface CoachMsg {
  id: number
  from: 'bot' | 'user'
  text: string
  chips?: string[]
  planLines?: string[]
  planName?: string
  todaySlugs?: string[]
}

export type CoachState =
  | { flow: 'idle' }
  | { flow: 'plan-days' }
  | { flow: 'plan-split'; draft: { days: number } }
  | { flow: 'plan-preview'; draft: { name: string; daysSpec: RoutineDay[] } }
  | { flow: 'today-focus' }
  | { flow: 'today-preview'; draft: { focus: string; slugs: string[] } }

export interface CoachCtx {
  sex: Profile['sex']
  equipment: Profile['equipment']
  kcal: number
  proteinG: number
  exercises: Exercise[]
}

/* ----------------- Kho bài theo kiểu buổi (slug từ seed) ----------------- */

const POOLS: Record<string, string[]> = {
  push: ['bench-press', 'incline-db-press', 'seated-db-press', 'lateral-raise', 'triceps-pushdown', 'cable-fly', 'dips', 'rear-delt-fly'],
  pull: ['lat-pulldown', 'barbell-row', 'face-pull', 'barbell-curl', 'cable-curl', 'one-arm-row', 'pull-up', 'hammer-curl'],
  legs: ['back-squat', 'rdl', 'leg-press', 'leg-extension', 'leg-curl', 'standing-calf', 'seated-calf', 'walking-lunge'],
  glutes: ['hip-thrust', 'bulgarian-split', 'glute-bridge', 'cable-kickback', 'hip-abduction', 'db-step-up', 'rdl', 'back-squat', 'walking-lunge'],
  full: ['back-squat', 'bench-press', 'barbell-row', 'deadlift', 'ohp', 'lat-pulldown', 'leg-press', 'incline-db-press', 'one-arm-row'],
  upper: ['bench-press', 'barbell-row', 'ohp', 'incline-db-press', 'lat-pulldown', 'one-arm-row', 'lateral-raise', 'barbell-curl', 'triceps-pushdown', 'face-pull'],
  core: ['plank', 'hanging-leg-raise', 'cable-crunch', 'russian-twist']
}

function pickFrom(pool: string[], ctx: CoachCtx, n: number, offset: number): string[] {
  const allowed = ALLOWED_EQUIPMENT[ctx.equipment] ?? null
  const available = pool.filter(s => {
    const ex = ctx.exercises.find(e => e.slug === s)
    return ex != null && (allowed == null || allowed.includes(ex.equipment))
  })
  const src = available.length > 0 ? available : pool
  const out: string[] = []
  for (let i = 0; i < Math.min(n, src.length); i++) out.push(src[(offset + i) % src.length])
  return out
}

const SPLITS_FOR = (days: number, sex: Profile['sex']): string[] => {
  const opts: string[] = []
  if (days === 3) {
    opts.push('Full body 3 buổi')
    if (sex === 'female') opts.push('Mông & chân 3 buổi (nữ)')
  } else if (days === 4) {
    opts.push('Upper/Lower 4 buổi')
    opts.push('PHUL 4 buổi')
    if (sex === 'female') opts.push('Mông & Upper 4 buổi (nữ)')
  } else if (days === 5) {
    opts.push('PPL + Upper/Lower 5 buổi')
    if (sex === 'female') opts.push('Mông & chân 5 buổi (nữ)')
  } else {
    opts.push('PPL 6 buổi')
    if (sex === 'female') opts.push('Mông & Upper 6 buổi (nữ)')
  }
  return opts
}

function buildDaysSpec(split: string, days: number, ctx: CoachCtx): RoutineDay[] {
  const out: RoutineDay[] = []
  const push = (weekday: number, pools: string[][], counts: number[], offset: number) => {
    const slugs: string[] = []
    pools.forEach((p, i) => slugs.push(...pickFrom(p, ctx, counts[i] ?? 4, offset + i * 2)))
    const uniq = [...new Set(slugs)]
    if (uniq.length > 0) out.push({ weekday, slugs: uniq })
  }
  const seq = [2, 3, 4, 5, 6, 7, 1] // T2..CN (bỏ CN cho lịch đều, đầy đủ 7 khi days=7)
  if (split.startsWith('Full body')) {
    for (let i = 0; i < days; i++) push(seq[i], [POOLS.full, POOLS.core], [5, 1], i * 4)
  } else if (split.startsWith('Upper/Lower')) {
    for (let i = 0; i < days; i++) {
      if (i % 2 === 0) push(seq[i], [POOLS.upper, POOLS.core], [5, 1], i * 3)
      else push(seq[i], [POOLS.legs], [5], i * 3)
    }
  } else if (split.startsWith('PHUL')) {
    push(seq[0], [POOLS.upper], [5], 0)
    push(seq[1], [POOLS.legs], [5], 0)
    push(seq[3], [POOLS.upper], [6], 4)
    push(seq[4], [POOLS.legs], [6], 4)
  } else if (split.startsWith('PPL +')) {
    push(seq[0], [POOLS.push], [5], 0)
    push(seq[1], [POOLS.pull], [5], 0)
    push(seq[2], [POOLS.legs], [5], 0)
    push(seq[3], [POOLS.upper], [5], 0)
    push(seq[4], [POOLS.legs, POOLS.core], [4, 2], 3)
  } else if (split.startsWith('PPL 6')) {
    for (let i = 0; i < 6; i++) {
      const p = [POOLS.push, POOLS.pull, POOLS.legs][i % 3]
      push(seq[i], [p], [5], Math.floor(i / 3) * 4)
    }
  } else if (split.startsWith('Mông & chân')) {
    for (let i = 0; i < days; i++) {
      if (i % 2 === 0) push(seq[i], [POOLS.glutes, POOLS.core], [5, 1], i * 3)
      else push(seq[i], [POOLS.legs, POOLS.glutes], [4, 2], i * 3)
    }
  } else if (split.startsWith('Mông & Upper')) {
    for (let i = 0; i < days; i++) {
      if (i % 2 === 0) push(seq[i], [POOLS.glutes, POOLS.core], [5, 1], i * 3)
      else push(seq[i], [POOLS.upper], [5], i * 3)
    }
  }
  return out
}

/* ----------------- Sinh buổi hôm nay theo nhóm cơ ----------------- */

export const TODAY_FOCUS_OPTIONS = ['Toàn thân', 'Ngực', 'Lưng', 'Vai', 'Tay', 'Chân', 'Mông', 'Core'] as const

const FOCUS_POOLS: Record<string, string[][]> = {
  'Toàn thân': [POOLS.full, POOLS.core],
  Ngực: [POOLS.push],
  Lưng: [POOLS.pull],
  Vai: [['ohp', 'seated-db-press', 'lateral-raise', 'rear-delt-fly', 'face-pull']],
  Tay: [['barbell-curl', 'hammer-curl', 'cable-curl', 'triceps-pushdown', 'skull-crusher', 'oh-triceps-ext']],
  Chân: [POOLS.legs],
  Mông: [POOLS.glutes],
  Core: [POOLS.core]
}

function buildTodaySlugs(focus: string, ctx: CoachCtx): string[] {
  const pools = FOCUS_POOLS[focus] ?? FOCUS_POOLS['Toàn thân']
  const counts = focus === 'Toàn thân' ? [4, 2] : [6]
  const slugs: string[] = []
  pools.forEach((p, i) => slugs.push(...pickFrom(p, ctx, counts[i] ?? 4, 0)))
  return [...new Set(slugs)]
}

/* ----------------- Engine ----------------- */

let msgSeq = 1
const bot = (text: string, extra?: Partial<CoachMsg>): CoachMsg => ({ id: msgSeq++, from: 'bot', text, ...extra })

const WEEKDAY_LABEL = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

function planLinesOf(daysSpec: RoutineDay[], ctx: CoachCtx): string[] {
  return daysSpec.map(d =>
    `${WEEKDAY_LABEL[d.weekday % 7]}: ${d.slugs.map(s => {
      const ex = ctx.exercises.find(e => e.slug === s)
      return ex ? exNames(ex).en : s
    }).join(', ')}`
  )
}

export interface CoachReply {
  state: CoachState
  msgs: CoachMsg[]
  action?: CoachAction
}

export function coachRespond(rawInput: string, state: CoachState, ctx: CoachCtx): CoachReply {
  const input = rawInput.trim()
  const low = input.toLowerCase()

  /* ---------- áp dụng ---------- */
  if (state.flow === 'plan-preview' && low.includes('áp dụng')) {
    return {
      state: { flow: 'idle' },
      action: { kind: 'apply-plan', name: state.draft.name, daysSpec: state.draft.daysSpec },
      msgs: [bot(`Xong! "${state.draft.name}" đã thành kế hoạch đang dùng. Tab Hôm nay sẽ tự chỉ bài mỗi ngày — giữ lửa nhé 🔥`)]
    }
  }
  if (state.flow === 'today-preview' && low.includes('áp vào hôm nay')) {
    return {
      state: { flow: 'idle' },
      action: { kind: 'apply-today', slugs: state.draft.slugs },
      msgs: [bot('Đã thay buổi hôm nay trong kế hoạch đang dùng. Bấm "Bắt đầu tập" ở tab Hôm nay là lên sàn được luôn 💪')]
    }
  }
  if (low.includes('huỷ') || low === 'hủy') {
    return { state: { flow: 'idle' }, msgs: [bot('Đã huỷ. Cần gì cứ nói tiếp nhé.', { chips: MENU_CHIPS })] }
  }

  /* ---------- luồng lên lịch tuần ---------- */
  if (state.flow === 'plan-days') {
    const m = low.match(/([3-7])\s*(buổi|ngày)?/)
    if (m) {
      const days = Number(m[1])
      const chips = SPLITS_FOR(days, ctx.sex)
      return {
        state: { flow: 'plan-split', draft: { days } },
        msgs: [bot(`OK — ${days} buổi/tuần. Chọn kiểu chia cơ:`, { chips })]
      }
    }
  }
  if (state.flow === 'plan-split') {
    const chips = SPLITS_FOR(state.draft.days, ctx.sex)
    const hit = chips.find(c => low.includes(c.toLowerCase().replace(' (nữ)', '')) || low.includes(c.toLowerCase()))
    if (hit) {
      const daysSpec = buildDaysSpec(hit, state.draft.days, ctx)
      const name = `Coach · ${hit}`
      return {
        state: { flow: 'plan-preview', draft: { name, daysSpec } },
        msgs: [
          bot(`Đây là lịch "${hit}" — ${daysSpec.length} buổi/tuần, lọc theo dụng cụ của bạn:`, {
            planName: name,
            planLines: planLinesOf(daysSpec, ctx),
            chips: ['Áp dụng luôn', 'Đổi split', 'Đổi số buổi']
          })
        ]
      }
    }
  }
  if (state.flow === 'plan-preview') {
    if (low.includes('đổi split')) {
      return { state: { flow: 'plan-split', draft: { days: state.draft.daysSpec.length } }, msgs: [bot('Chọn lại kiểu chia cơ:', { chips: SPLITS_FOR(state.draft.daysSpec.length, ctx.sex) })] }
    }
    if (low.includes('đổi số buổi')) {
      return { state: { flow: 'plan-days' }, msgs: [bot('Vậy bạn muốn mấy buổi mỗi tuần?', { chips: ['3 buổi', '4 buổi', '5 buổi', '6 buổi'] })] }
    }
  }

  /* ---------- luồng đổi buổi hôm nay ---------- */
  if (state.flow === 'today-focus') {
    const hit = TODAY_FOCUS_OPTIONS.find(f => low.includes(f.toLowerCase()))
    if (hit) {
      const slugs = buildTodaySlugs(hit, ctx)
      if (slugs.length === 0) {
        return { state: { flow: 'today-focus' }, msgs: [bot('Nhóm này hết bài khớp dụng cụ của bạn — chọn nhóm khác nhé.', { chips: [...TODAY_FOCUS_OPTIONS] })] }
      }
      const names = slugs.map(s => { const ex = ctx.exercises.find(e => e.slug === s); return ex ? exNames(ex).en : s })
      return {
        state: { flow: 'today-preview', draft: { focus: hit, slugs } },
        msgs: [bot(`Buổi "${hit}" hôm nay gồm ${slugs.length} bài (đã lọc theo dụng cụ của bạn):`, { todaySlugs: names, chips: ['Áp vào hôm nay', 'Đổi nhóm cơ'] })]
      }
    }
  }
  if (state.flow === 'today-preview' && low.includes('đổi nhóm cơ')) {
    return { state: { flow: 'today-focus' }, msgs: [bot('Buổi hôm nay nhắm vào đâu?', { chips: [...TODAY_FOCUS_OPTIONS] })] }
  }

  /* ---------- mở luồng từ ý định tự do ---------- */
  if (/(lịch|kế hoạch|lên lịch|schedule|plan|tuần)/.test(low)) {
    return {
      state: { flow: 'plan-days' },
      msgs: [bot(`Sẵn sàng! Mỗi tuần bạn muốn tập mấy buổi gym? (Cơ thể bạn: mục tiêu ${ctx.kcal} kcal/ngày — lịch sẽ quanh quanh mức này.)`, { chips: ['3 buổi', '4 buổi', '5 buổi', '6 buổi'] })]
    }
  }
  if (/(hôm nay|đổi buổi|thay buổi|buổi.*nay|skip)/.test(low)) {
    return {
      state: { flow: 'today-focus' },
      msgs: [bot('Buổi hôm nay bạn muốn nhắm vào đâu?', { chips: [...TODAY_FOCUS_OPTIONS] })]
    }
  }

  /* ---------- FAQ ---------- */
  if (/protein|đạm|whey/.test(low)) {
    return { state, msgs: [bot(`Mục tiêu protein của bạn: ~${ctx.proteinG} g/ngày (nghiên cứu ISSN 2017: 1.6–2.2 g/kg cân nặng). Chia 3–4 bữa, mỗi bữa 30–40g hấp thu tốt nhất. Nguồn rẻ tốt: trứng, ức gà, thịt nạc, sữa, đậu hũ.`)] }
  }
  if (/calo|kcal|năng lượng|ăn/.test(low)) {
    return { state, msgs: [bot(`Mục tiêu năng lượng của bạn: ~${ctx.kcal} kcal/ngày. Ăn quanh mốc này ±10% là ổn; cứ cân mỗi sáng, đánh giá theo trung bình 7 ngày đừng hoảng số ngày lẻ.`)] }
  }
  if (/nghỉ|rest/.test(low)) {
    return { state, msgs: [bot('Quy tắc nghỉ giữa set: bài lớn (squat, deadlift, bench, lưng) 120 giây; vai, tay 90 giây; core, bắp chân 60 giây. EMBER tự đếm nghỉ theo nhóm cơ khi bạn tick set.')] }
  }
  if (/(giảm mỡ|cut| bụng|mỡ)/.test(low)) {
    return { state, msgs: [bot(`Giảm mỡ bền: thâm hụt ~${ctx.kcal} kcal/ngày (đã tính sẵn trong Hồ sơ), protein giữ ~${ctx.proteinG} g để giữ cơ, tạ 3–4 buổi/tuần + 1–2 buổi cardio nhẹ. Mục tiêu 0.5–1% cân nặng/tuần là an toàn.`)] }
  }
  if (/(tăng cơ|bulk|to lên|nặng)/.test(low)) {
    return { state, msgs: [bot('Tăng cơ: dư nhẹ ~300 kcal/ngày, ưu tiên compound (squat/bench/deadlift/hàng), cộng dồn tải dần (thêm rep rồi thêm kg), ngủ 7–9h. Tháng đầu tăng 0.5–1kg là đẹp.')] }
  }
  if (/(cardio|chạy|run|c25k)/.test(low)) {
    return { state, msgs: [bot('Cardio: chạy sau buổi tạ hoặc ngày nghỉ, đừng trước buổi chân. Giảm mỡ thì 2–3 buổi 20–30p Z2 (vừa nói được). Muốn lên 5K? Kế hoạch NHS C25K đã có sẵn ở tab Chạy.')] }
  }
  if (/(chu kỳ|kinh|kỳ nguyệt)/.test(low)) {
    if (ctx.sex === 'female') {
      return { state, msgs: [bot('Theo chu kỳ: tuần kinh → giảm nhẹ cường độ, ưu tiên phục hồi; tuần nội tiết → lúc này hợp lý để tăng tải; quanh rụng trứng → giữ kỹ thuật chuẩn; hoàng thể → giữ lịch, tăng protein + ngủ đủ. Ghi "Kinh bắt đầu hôm nay" ở Hồ sơ để EMBER theo dõi giúp bạn.')] }
    }
  }
  if (/(xê|sửa|adjust|thêm|bớt).*(lịch|bài)/.test(low)) {
    return { state: { flow: 'plan-days' }, msgs: [bot('Được — chọn lại khung để EMBER dựng lịch mới:', { chips: ['3 buổi', '4 buổi', '5 buổi', '6 buổi'] })] }
  }

  /* ---------- menu mặc định ---------- */
  return { state: { flow: 'idle' }, msgs: [bot('Mình có thể giúp:', { chips: MENU_CHIPS })] }
}

const MENU_CHIPS = ['Lên lịch tập tuần', 'Đổi buổi hôm nay', 'Protein ăn bao nhiêu?', 'Giảm mỡ thế nào?']

export function coachGreeting(name: string | undefined, sex: Profile['sex']): CoachMsg {
  return bot(
    `Chào ${name ?? 'bạn'}! Mình là EMBER Coach — tư vấn offline ngay trên máy bạn.${sex === 'female' ? ' Chế độ nữ đã bật: lịch sẽ có lựa chọn thiên về mông & chân, kèm gợi ý theo chu kỳ.' : ''} Muốn bắt đầu từ đâu?`,
    { chips: MENU_CHIPS }
  )
}
