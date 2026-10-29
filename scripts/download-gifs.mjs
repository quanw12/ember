/**
 * Tải GIF minh họa bài tập về public/gifs/ để gói vào precache (xem offline).
 * Chạy: node scripts/download-gifs.mjs
 * Muốn tìm URL cho bài mới: dùng scripts/resolve-gifs.mjs rồi thêm vào REMOTE bên dưới.
 */
import { mkdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const OUT = join(process.cwd(), 'public', 'gifs')
mkdirSync(OUT, { recursive: true })

const FP = 'https://fitnessprogramer.com/wp-content/uploads/'
const REMOTE = {
  'bench-press': '2021/02/Barbell-Bench-Press.gif',
  'incline-db-press': '2021/02/Incline-Dumbbell-Press.gif',
  'push-up': '2021/02/Push-Up.gif',
  'cable-fly': '2021/02/Cable-Crossover.gif',
  'dips': '2021/06/Chest-Dips.gif',
  'deadlift': '2021/02/Barbell-Deadlift.gif',
  'lat-pulldown': '2021/02/Lat-Pulldown.gif',
  'barbell-row': '2021/02/Barbell-Bent-Over-Row.gif',
  'one-arm-row': '2021/02/Dumbbell-Row.gif',
  'pull-up': '2021/02/Pull-up.gif',
  'face-pull': '2021/02/Face-Pull.gif',
  'ohp': '2021/02/Barbell-Shoulder-Press.gif',
  'seated-db-press': '2021/02/Dumbbell-Shoulder-Press.gif',
  'lateral-raise': '2021/02/Dumbbell-Lateral-Raise.gif',
  'rear-delt-fly': '2021/02/Bent-Over-Lateral-Raise.gif',
  'barbell-curl': '2021/02/Barbell-Curl.gif',
  'hammer-curl': '2021/02/Hammer-Curl.gif',
  'cable-curl': '2021/02/cable-curl.gif',
  'triceps-pushdown': '2022/11/One-arm-triceps-pushdown.gif',
  'skull-crusher': '2022/02/Barbell-Reverse-Grip-Skullcrusher-1.gif',
  'oh-triceps-ext': '2021/02/Dumbbell-Triceps-Extension.gif',
  'back-squat': '2021/02/BARBELL-SQUAT.gif',
  'front-squat': '2021/06/front-squat.gif',
  'leg-press': '2015/11/Leg-Press.gif',
  'walking-lunge': '2023/09/dumbbell-lunges.gif',
  'leg-extension': '2021/02/LEG-EXTENSION.gif',
  'rdl': '2021/02/Barbell-Romanian-Deadlift.gif',
  'leg-curl': '2021/02/Leg-Curl.gif',
  'good-morning': '2021/02/Barbell-Good-Morning.gif',
  'hip-thrust': '2021/02/Barbell-Hip-Thrust.gif',
  'glute-bridge': '2021/02/Glute-Bridge-.gif',
  'bulgarian-split': '2021/05/Dumbbell-Bulgarian-Split-Squat.gif',
  'standing-calf': '2021/06/Standing-Calf-Raise.gif',
  'seated-calf': '2021/09/Barbell-Seated-Calf-Raise.gif',
  'plank': '2021/02/plank.gif',
  'hanging-leg-raise': '2021/02/Hanging-Knee-Raises.gif',
  'cable-crunch': '2021/02/Kneeling-Cable-Crunch.gif',
  'russian-twist': '2021/02/Russian-Twist.gif',
  'wrist-curl': '2021/06/Dumbbell-Wrist-Curl.gif'
}

let ok = 0, skip = 0, fail = 0
for (const [slug, path] of Object.entries(REMOTE)) {
  const dest = join(OUT, `${slug}.gif`)
  // đã có sẵn file gif > 10KB thì bỏ qua (idempotent)
  try {
    if (statSync(dest).size > 10_000) { skip++; continue }
  } catch { /* chưa có — tải */ }
  try {
    const res = await fetch(FP + path, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    if (!res.ok || !(res.headers.get('content-type') ?? '').includes('gif')) {
      console.error(`FAIL  ${slug}: HTTP ${res.status} ${res.headers.get('content-type')}`)
      fail++
      continue
    }
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length < 10_000) {
      console.error(`FAIL  ${slug}: file quá nhỏ (${buf.length}B) — nội dung lạ`)
      fail++
      continue
    }
    await import('node:fs').then(fs => fs.writeFileSync(dest, buf))
    console.log(`OK    ${slug}  ${(buf.length / 1024).toFixed(0)} KB`)
    ok++
  } catch (e) {
    console.error(`FAIL  ${slug}: ${e.message}`)
    fail++
  }
  await new Promise(r => setTimeout(r, 300))
}
console.log(`\nXong: ${ok} tải mới, ${skip} đã có, ${fail} lỗi`)
if (fail > 0) process.exit(1)
