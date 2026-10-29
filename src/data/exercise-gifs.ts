/**
 * GIF minh họa động cho bài tập (ưu tiên hiển thị thay ảnh tĩnh).
 * File nằm ở public/gifs/<slug>.gif — đã gói vào precache của service worker
 * nên xem offline được. Nguồn gốc: fitnessprogramer.com (tải về bằng
 * scripts/download-gifs.mjs; tìm URL mới bằng scripts/resolve-gifs.mjs).
 * Nếu GIF lỗi khi load, ExerciseDetail fallback về ảnh tĩnh cũ của bài đó.
 */

/** slug bài seed → file GIF local (đường dẫn tương đối, khớp base './' khi deploy sub-path) */
export const EXERCISE_GIFS: Record<string, string> = {
  'bench-press': 'gifs/bench-press.gif',
  'incline-db-press': 'gifs/incline-db-press.gif',
  'push-up': 'gifs/push-up.gif',
  'cable-fly': 'gifs/cable-fly.gif',
  'dips': 'gifs/dips.gif',
  'deadlift': 'gifs/deadlift.gif',
  'lat-pulldown': 'gifs/lat-pulldown.gif',
  'barbell-row': 'gifs/barbell-row.gif',
  'one-arm-row': 'gifs/one-arm-row.gif',
  'pull-up': 'gifs/pull-up.gif',
  'face-pull': 'gifs/face-pull.gif',
  'ohp': 'gifs/ohp.gif',
  'seated-db-press': 'gifs/seated-db-press.gif',
  'lateral-raise': 'gifs/lateral-raise.gif',
  'rear-delt-fly': 'gifs/rear-delt-fly.gif',
  'barbell-curl': 'gifs/barbell-curl.gif',
  'hammer-curl': 'gifs/hammer-curl.gif',
  'cable-curl': 'gifs/cable-curl.gif',
  'triceps-pushdown': 'gifs/triceps-pushdown.gif',
  'skull-crusher': 'gifs/skull-crusher.gif',
  'oh-triceps-ext': 'gifs/oh-triceps-ext.gif',
  'back-squat': 'gifs/back-squat.gif',
  'front-squat': 'gifs/front-squat.gif',
  'leg-press': 'gifs/leg-press.gif',
  'walking-lunge': 'gifs/walking-lunge.gif',
  'leg-extension': 'gifs/leg-extension.gif',
  'rdl': 'gifs/rdl.gif',
  'leg-curl': 'gifs/leg-curl.gif',
  'good-morning': 'gifs/good-morning.gif',
  'hip-thrust': 'gifs/hip-thrust.gif',
  'glute-bridge': 'gifs/glute-bridge.gif',
  'bulgarian-split': 'gifs/bulgarian-split.gif',
  'standing-calf': 'gifs/standing-calf.gif',
  'seated-calf': 'gifs/seated-calf.gif',
  'plank': 'gifs/plank.gif',
  'hanging-leg-raise': 'gifs/hanging-leg-raise.gif',
  'cable-crunch': 'gifs/cable-crunch.gif',
  'russian-twist': 'gifs/russian-twist.gif',
  'wrist-curl': 'gifs/wrist-curl.gif'
}

const norm = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

/** Bảng phụ theo tên tiếng Anh chuẩn hóa — để bài import từ thư viện mở (slug -fx) cũng khớp được. */
const NAME_GIFS: Record<string, string> = Object.fromEntries(
  Object.entries(EXERCISE_GIFS).map(([slug, url]) => {
    const nameEn: Record<string, string> = {
      'bench-press': 'barbell bench press',
      'incline-db-press': 'incline dumbbell press',
      'cable-fly': 'cable chest fly',
      'dips': 'dips',
      'ohp': 'overhead press',
      'seated-db-press': 'seated dumbbell press',
      'rear-delt-fly': 'rear delt fly',
      'barbell-curl': 'barbell curl',
      'hammer-curl': 'dumbbell hammer curl',
      'triceps-pushdown': 'triceps pushdown',
      'oh-triceps-ext': 'overhead triceps extension',
      'back-squat': 'barbell back squat',
      'rdl': 'romanian deadlift',
      'good-morning': 'barbell good morning',
      'glute-bridge': 'glute bridge',
      'standing-calf': 'standing calf raise',
      'seated-calf': 'seated calf raise',
      'plank': 'plank',
      'wrist-curl': 'dumbbell wrist curl'
    }
    return [nameEn[slug] ?? slug.replace(/-/g, ' '), url]
  })
)

/** GIF cho một bài tập: khớp slug trước, sau đó khớp tên tiếng Anh. */
export function gifFor(ex: { slug: string; nameEn: string }): string | undefined {
  return EXERCISE_GIFS[ex.slug] ?? NAME_GIFS[norm(ex.nameEn)]
}
