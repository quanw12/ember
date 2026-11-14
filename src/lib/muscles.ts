import type { Exercise } from '../db'

export interface MuscleInfo {
  id: string
  title: string
  about: string
  /** Mặt nên quay tới khi mở nhóm này. */
  view: 'front' | 'back' | 'side'
}

export const MUSCLE_INFO: Record<string, MuscleInfo> = {
  biceps: {
    id: 'biceps', title: 'Tay trước', view: 'front',
    about: 'Bắp tay trước gập khuỷu và xoay cẳng tay ngửa. Bổ sung bằng curl tạ đòn, tạ đơn hoặc cáp — khuỷu giữ yên, không đung đưa thân.'
  },
  triceps: {
    id: 'triceps', title: 'Tay sau', view: 'back',
    about: 'Bắp tay sau duỗi khuỷu và chiếm phần lớn vòng tay. Bổ sung bằng đẩy cáp xuống, skull crusher và duỗi tay qua đầu.'
  },
  traps: {
    id: 'traps', title: 'Cơ thang (trap)', view: 'back',
    about: 'Cơ thang chạy từ cổ xuống giữa lưng trên, nâng vai và siết hai bả vai. Bổ sung bằng shrug và face pull, vai không nhún khi kéo xà.'
  },
  lats: {
    id: 'lats', title: 'Cơ xô (lat)', view: 'back',
    about: 'Cơ xô tạo cánh lưng, kéo cánh tay từ trên cao về thân. Bổ sung bằng pull-up, kéo xà và row — kéo bằng khuỷu, không bằng cổ tay.'
  },
  chest: {
    id: 'chest', title: 'Ngực', view: 'front',
    about: 'Ngực đẩy tay ra trước và khép tay vào giữa. Bổ sung bằng bench press, đẩy dốc và bay ngực. Hạ tạ kiểm soát, không nảy vào ngực.'
  },
  shoulders: {
    id: 'shoulders', title: 'Vai', view: 'side',
    about: 'Vai gồm ba bó: trước, giữa, sau. Bổ sung bằng đẩy vai qua đầu, nâng ngang và bay vai sau. Khuỷu hơi gập, không nhún trap.'
  },
  back: {
    id: 'back', title: 'Lưng giữa', view: 'back',
    about: 'Phần lưng giữa và cơ dựng sống giữ cột sống khi kéo và nhấc. Bổ sung bằng row và deadlift, lưng trung tính suốt buổi.'
  },
  core: {
    id: 'core', title: 'Cơ bụng', view: 'front',
    about: 'Bụng gập thân, xoay và giữ vững hông. Bổ sung bằng plank, crunch cáp và nâng chân. Đừng nín thở hay kéo cổ.'
  },
  quads: {
    id: 'quads', title: 'Đùi trước', view: 'front',
    about: 'Tứ đầu duỗi gối và tham gia squat, bước, đạp chân. Bổ sung bằng squat, leg press và duỗi chân. Gối đi cùng hướng mũi chân.'
  },
  hamstrings: {
    id: 'hamstrings', title: 'Đùi sau', view: 'back',
    about: 'Gân kheo gập gối và kéo hông về sau. Bổ sung bằng RDL, good morning và leg curl. Hạ chậm, lưng không còng.'
  },
  glutes: {
    id: 'glutes', title: 'Cơ mông', view: 'side',
    about: 'Mông duỗi hông và giữ gối ổn định. Bổ sung bằng hip thrust, glute bridge và Bulgarian split. Siết mông ở đỉnh, không ưỡn thắt lưng.'
  },
  calves: {
    id: 'calves', title: 'Bắp chân', view: 'side',
    about: 'Bắp chân kiễng gót và hấp thụ lực khi chạy. Bổ sung bằng đứng kiễng và ngồi kiễng. Giữ 1 nhịp ở đỉnh, hạ hết tầm.'
  },
  forearms: {
    id: 'forearms', title: 'Cẳng tay', view: 'front',
    about: 'Cẳng tay nắm và gập cổ tay. Bổ sung bằng wrist curl và giữ tạ lâu hơn ở các bài kéo. Cổ tay thẳng khi bench và deadlift.'
  }
}

const RULES: { id: string; re: RegExp }[] = [
  { id: 'biceps', re: /tay trước|bắp tay trước|bicep/ },
  { id: 'triceps', re: /tay sau|bắp tay sau|tricep/ },
  { id: 'traps', re: /\btraps?\b|cơ thang|lưng xà/ },
  { id: 'lats', re: /\blats?\b|cánh lưng|cơ xô|latissimus/ },
  { id: 'chest', re: /ngực|chest|\bpec/ },
  { id: 'shoulders', re: /\bvai\b|shoulder|delt/ },
  { id: 'core', re: /cơ bụng|bụng|core|\babs\b/ },
  { id: 'quads', re: /đùi trước|tứ đầu|quad/ },
  { id: 'hamstrings', re: /đùi sau|gân kheo|hamstring/ },
  { id: 'glutes', re: /mông|glute/ },
  { id: 'calves', re: /bắp chân|calf|calves/ },
  { id: 'forearms', re: /cẳng tay|forearm/ },
  { id: 'back', re: /\blưng\b/ },
  { id: 'atlas', re: /nhóm cơ|mô hình|cơ thể/ }
]

/** Nhận nhóm cơ trong câu hỏi. `atlas` = muốn xem mô hình, chưa chỉ một nhóm. */
export function detectMuscle(raw: string): string | null {
  const low = raw.toLowerCase()
  for (const rule of RULES) {
    if (rule.re.test(low)) return rule.id
  }
  return null
}

function blobOf(ex: Pick<Exercise, 'name' | 'nameEn' | 'keywords'>): string {
  return `${ex.name} ${ex.nameEn} ${(ex.keywords ?? []).join(' ')}`.toLowerCase()
}

export function matchesRegion(ex: Pick<Exercise, 'muscle' | 'name' | 'nameEn' | 'keywords'>, region: string): boolean {
  const blob = blobOf(ex)
  if (region === 'traps') return ex.muscle === 'back' && /trap|shrug|thang|face pull|face-pull/.test(blob)
  if (region === 'lats') return ex.muscle === 'back' && /lat|pulldown|pull-up|pull up|chin-up|chin up|row|cánh|xô/.test(blob)
  if (region === 'back') return ex.muscle === 'back' && !matchesRegion(ex, 'traps') && !matchesRegion(ex, 'lats')
  return ex.muscle === region
}

export function exercisesForRegion(list: Exercise[], region: string): Exercise[] {
  return list
    .filter(ex => matchesRegion(ex, region))
    .sort((a, b) => a.nameEn.localeCompare(b.nameEn, 'en'))
}
