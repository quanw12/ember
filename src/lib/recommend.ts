import type { Profile } from '../db'

/**
 * Gợi ý kế hoạch theo số buổi gym/tuần — tên phải khớp chính xác ROUTINE_TEMPLATES.
 * Thứ tự trong mảng = thứ tự ưu tiên hiển thị.
 */
export interface PlanSuggestion {
  name: string
  /** Vì sao lịch này hợp với người đó. */
  tagline: string
}

const TFB2: PlanSuggestion = { name: 'Full Body 2 buổi', tagline: 'Hai buổi full body vẫn đủ tiến bộ khi lịch dày — đánh toàn thân, nghỉ đủ giữa các buổi.' }
const TFB3: PlanSuggestion = { name: 'Full Body 3 buổi', tagline: 'Người mới tiến nhanh nhất khi mỗi nhóm cơ được đánh 2–3 lần/tuần với bài compound làm nền.' }
const TPPL3: PlanSuggestion = { name: 'PPL 3 buổi', tagline: 'Chia Push/Pull/Legs cho mỗi buổi gọn và tập trung — hợp khi đã quen kỹ thuật các bài chính.' }
const TUL4: PlanSuggestion = { name: 'Upper/Lower 4 buổi', tagline: 'Xen kẽ thân trên/thân dưới — mỗi nhóm cơ 2 lần/tuần, phục hồi tốt cho người mới.' }
const TPHUL: PlanSuggestion = { name: 'PHUL 4 buổi (Power + Hypertrophy)', tagline: 'Hai buổi power đầu tuần + hai buổi hypertrophy cuối tuần — tăng cả sức mạnh lẫn dung tích cơ.' }
const TPPLUL: PlanSuggestion = { name: 'PPLUL 5 buổi', tagline: 'Giữ nhịp PPL nửa đầu tuần, thêm Upper/Lower cuối tuần — đủ volume mà vẫn còn 2 ngày nghỉ.' }
const TPPL6: PlanSuggestion = { name: 'PPL 6 buổi', tagline: 'Mỗi nhóm cơ 2 lần/tuần, mỗi buổi tập trung một nhóm — lịch chuẩn cho người đã quen.' }

/**
 * RCM lịch tập: chọn số buổi → thứ tự lịch nên dùng.
 * Người mới (new) được ưu tiên full body/upper-lower; mid/pro được ưu tiên chia nhóm cơ.
 */
export function suggestPlans(daysGym: number, expLevel: Profile['expLevel']): PlanSuggestion[] {
  const d = Math.min(6, Math.max(2, Math.round(daysGym) || 3))
  switch (d) {
    case 2:
      return [TFB2]
    case 3:
      return expLevel === 'new' ? [TFB3, TPPL3] : [TPPL3, TFB3]
    case 4:
      return expLevel === 'new' ? [TUL4, TPHUL] : [TPHUL, TUL4]
    case 5:
      return [TPPLUL]
    default:
      return expLevel === 'new'
        ? [{ ...TPPL6, tagline: 'Sáu buổi PPL là lịch dày — nếu mới tập, cân nhắc bắt đầu 4 buổi rồi tăng dần.' }, TUL4]
        : [TPPL6, TPPLUL]
  }
}
