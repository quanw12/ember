import type { Profile } from '../db'

export type Sex = Profile['sex']
export type Goal = Profile['goal']

const ACTIVITY_FACTOR: Record<Profile['activity'], number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  athlete: 1.9
}

export const ACTIVITY_OPTIONS: { id: Profile['activity']; label: string; desc: string }[] = [
  { id: 'sedentary', label: 'Ít vận động', desc: 'Làm việc bàn ghế, hầu như không tập' },
  { id: 'light', label: 'Nhẹ', desc: 'Vận động nhẹ 1–3 buổi/tuần' },
  { id: 'moderate', label: 'Vừa', desc: 'Tập 3–5 buổi/tuần' },
  { id: 'active', label: 'Nhiều', desc: 'Tập 6–7 buổi/tuần' },
  { id: 'athlete', label: 'Vận động viên', desc: 'Tập 2 lần/ngày, lao động nặng' }
]

export const GOAL_OPTIONS: { id: Goal; label: string; desc: string }[] = [
  { id: 'cut', label: 'Cutting', desc: 'Giảm mỡ, giữ cơ — thâm hụt calo có kiểm soát' },
  { id: 'bulk', label: 'Bulking', desc: 'Tăng cơ tăng cân — dư thừa nhỏ, tăng mỡ tối thiểu' },
  { id: 'maintain', label: 'Maintenance', desc: 'Giữ form, tăng sức mạnh' },
  { id: 'recomp', label: 'Recomp', desc: 'Vừa giảm mỡ vừa tăng cơ — đối tượng mới/k comeback' }
]

/** BMR theo Mifflin-St Jeor (1990) — chuẩn hiện hành cho cả nam và nữ. */
export function bmr(sex: Sex, weightKg: number, heightCm: number, age: number): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  return sex === 'male' ? base + 5 : base - 161
}

export function tdee(bmrValue: number, activity: Profile['activity']): number {
  return bmrValue * ACTIVITY_FACTOR[activity]
}

export interface MacroPlan {
  bmr: number
  tdee: number
  kcal: number
  proteinG: number
  fatG: number
  carbG: number
  /** Tốc độ thay đổi cân bền vững (kg/tuần) — dấu theo hướng mục tiêu. */
  rateKgPerWeek: number
  /** Số tuần dự kiến tới cân mục tiêu (null nếu không đặt). */
  weeksToTarget: number | null
  proteinSource: string
}

/**
 * Kcal mục tiêu + macro.
 * Nguồn: Mifflin-St Jeor (BMR); ISSN 2017 (protein 1.6–2.2 g/kg);
 * tốc độ cut an toàn 0.5–1% BW/tuần; lean bulk +200–500 kcal/ngày.
 */
export function macroPlan(p: Pick<Profile, 'sex' | 'age' | 'heightCm' | 'weightKg' | 'activity' | 'goal' | 'targetWeightKg' | 'kcalOverride'>): MacroPlan {
  const b = bmr(p.sex, p.weightKg, p.heightCm, p.age)
  const t = tdee(b, p.activity)
  const floor = p.sex === 'male' ? 1500 : 1200

  let kcal = t
  let rate = 0
  if (p.goal === 'cut') {
    rate = Math.min(Math.max(0.005, 0.0075) * p.weightKg, 0.01 * p.weightKg)
    kcal = t - (rate * 7700) / 7
  } else if (p.goal === 'bulk') {
    kcal = t + 350
    rate = 0.0025 * p.weightKg
  } else if (p.goal === 'recomp') {
    kcal = t - 150
    rate = -0.0015 * p.weightKg
  }
  kcal = Math.max(kcal, floor)
  if (p.kcalOverride && p.kcalOverride >= floor) kcal = p.kcalOverride

  const proteinPerKg = p.goal === 'cut' || p.goal === 'recomp' ? 2.0 : p.goal === 'bulk' ? 1.8 : 1.6
  const proteinG = Math.round(proteinPerKg * p.weightKg)
  const fatG = Math.round((p.goal === 'cut' ? 0.9 : 0.8) * p.weightKg)
  const carbG = Math.max(0, Math.round((kcal - proteinG * 4 - fatG * 9) / 4))

  let weeksToTarget: number | null = null
  if (p.targetWeightKg && p.targetWeightKg > 0 && p.targetWeightKg !== p.weightKg) {
    const diff = Math.abs(p.weightKg - p.targetWeightKg)
    const weekly = Math.abs(rate) > 0.05 ? Math.abs(rate) : 0.25
    weeksToTarget = Math.round(diff / weekly)
  }

  return {
    bmr: Math.round(b),
    tdee: Math.round(t),
    kcal: Math.round(kcal),
    proteinG,
    fatG,
    carbG,
    rateKgPerWeek: Math.round(rate * 100) / 100,
    weeksToTarget,
    proteinSource: 'ISSN 2017'
  }
}

export function fmtWeeks(weeks: number | null): string {
  if (weeks == null) return '—'
  if (weeks < 1) return '< 1 tuần'
  return `~${weeks} tuần`
}

export type CyclePhase = 'kinh' | 'noi-tiet' | 'rung-trung' | 'hoang-the'

export const PHASE_LABEL: Record<CyclePhase, string> = {
  'kinh': 'Kỳ kinh',
  'noi-tiet': 'Nội tiết cao',
  'rung-trung': 'Rụng trứng',
  'hoang-the': 'Hoàng thể'
}

/**
 * Ước lượng pha chu kỳ từ ngày đầu kỳ kinh gần nhất (giả sử chu kỳ đều).
 * Gợi ý cường độ theo pha — mức phổ biến được ghi nhận trong tài liệu huấn luyện nữ,
 * mang tính tham khảo, không thay thế tư vấn y tế.
 */
export function cycleInfo(lastStartISO: string, cycleLen: number, today = new Date()): { day: number; phase: CyclePhase; tip: string } {
  const start = new Date(lastStartISO + 'T00:00:00')
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const days = Math.floor((t0.getTime() - start.getTime()) / 86400000)
  const day = (days % cycleLen) + 1
  if (day <= 5) {
    return { day, phase: 'kinh', tip: 'Tuần kinh: giảm nhẹ cường độ nếu thấy mệt, ưu tiên phục hồi, uống đủ nước và bổ sung sắt (thịt đỏ, rau xanh đậm).' }
  }
  if (day <= 13) {
    return { day, phase: 'noi-tiet', tip: 'Nội tiết đang tăng: cơ thể hồi phục tốt — đây là lúc hợp lý để tăng tải (nâng nặng hơn hoặc thêm một set).' }
  }
  if (day <= 16) {
    return { day, phase: 'rung-trung', tip: 'Giai đoạn rụng trứng: nhiều người thấy khỏe nhất, nhưng dây chằng lỏng hơn — giữ kỹ thuật chuẩn, cẩn thận khi thử mức nặng hoàn toàn mới.' }
  }
  return { day, phase: 'hoang-the', tip: 'Tuần hoàng thể: có thể thấy nặng nề và dễ đói hơn — giữ lịch tập, giảm nhẹ nếu cần, tăng protein và ngủ đủ.' }
}
