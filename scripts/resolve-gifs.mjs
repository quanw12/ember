/**
 * Dò link GIF minh họa động trên fitnessprogramer cho từng bài tập seed.
 * Chạy: node scripts/resolve-gifs.mjs  -> in JSON mapping ra stdout.
 * Kết quả được copy tay vào src/data/exercise-gifs.ts (chỉ lấy URL đã verify 200).
 */
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }

const EXERCISES = [
  ['bench-press', 'Barbell Bench Press'],
  ['incline-db-press', 'Incline Dumbbell Press'],
  ['push-up', 'Push-up'],
  ['cable-fly', 'Cable Chest Fly'],
  ['dips', 'Chest Dips'],
  ['deadlift', 'Barbell Deadlift'],
  ['lat-pulldown', 'Lat Pulldown'],
  ['barbell-row', 'Barbell Row'],
  ['one-arm-row', 'One-Arm Dumbbell Row'],
  ['pull-up', 'Pull-up'],
  ['face-pull', 'Face Pull'],
  ['ohp', 'Overhead Press'],
  ['seated-db-press', 'Seated Dumbbell Press'],
  ['lateral-raise', 'Dumbbell Lateral Raise'],
  ['rear-delt-fly', 'Rear Delt Fly'],
  ['barbell-curl', 'Barbell Curl'],
  ['hammer-curl', 'Dumbbell Hammer Curl'],
  ['cable-curl', 'Cable Curl'],
  ['triceps-pushdown', 'Triceps Pushdown'],
  ['skull-crusher', 'Skull Crusher'],
  ['oh-triceps-ext', 'Overhead Triceps Extension'],
  ['back-squat', 'Barbell Squat'],
  ['front-squat', 'Front Squat'],
  ['leg-press', 'Leg Press'],
  ['walking-lunge', 'Walking Lunge'],
  ['leg-extension', 'Leg Extension'],
  ['rdl', 'Romanian Deadlift'],
  ['leg-curl', 'Leg Curl'],
  ['good-morning', 'Good Morning'],
  ['hip-thrust', 'Barbell Hip Thrust'],
  ['glute-bridge', 'Glute Bridge'],
  ['bulgarian-split', 'Bulgarian Split Squat'],
  ['standing-calf', 'Standing Calf Raise'],
  ['seated-calf', 'Seated Calf Raise'],
  ['plank', 'Plank'],
  ['hanging-leg-raise', 'Hanging Leg Raise'],
  ['cable-crunch', 'Cable Crunch'],
  ['russian-twist', 'Russian Twist'],
  ['wrist-curl', 'Dumbbell Wrist Curl']
]

const kebab = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
const sleep = ms => new Promise(r => setTimeout(r, ms))

async function get(url) {
  const res = await fetch(url, { headers: UA, redirect: 'follow' })
  if (!res.ok) return null
  return await res.text()
}

async function findExercisePageUrl(query) {
  // 1) thử đoán slug trực tiếp
  const direct = `https://fitnessprogramer.com/exercise/${kebab(query)}/`
  const directHtml = await get(direct)
  if (directHtml && !directHtml.includes('404') && directHtml.toLowerCase().includes('gif')) return direct
  await sleep(400)
  // 2) tìm kiếm WordPress, lấy link /exercise/ đầu tiên
  const html = await get(`https://fitnessprogramer.com/?s=${encodeURIComponent(query)}`)
  if (!html) return null
  const m = html.match(/https:\/\/fitnessprogramer\.com\/exercise\/[a-z0-9-]+\//i)
  return m ? m[0] : null
}

const result = {}
for (const [slug, name] of EXERCISES) {
  try {
    const pageUrl = await findExercisePageUrl(name)
    if (!pageUrl) { console.error(`MISS  ${slug} (${name}): không tìm thấy trang`); continue }
    const html = await get(pageUrl)
    if (!html) { console.error(`MISS  ${slug} (${name}): trang lỗi`); continue }
    const gifs = [...new Set(html.match(/https:\/\/fitnessprogramer\.com\/wp-content\/uploads\/[^"'\s)]+\.gif/gi) ?? [])]
    if (gifs.length === 0) { console.error(`MISS  ${slug} (${name}): trang ${pageUrl} không có gif`); continue }
    // lấy gif đầu tiên mà HEAD trả 200 + image/gif
    let ok = null
    for (const g of gifs) {
      const head = await fetch(g, { method: 'HEAD', headers: UA })
      if (head.ok && (head.headers.get('content-type') ?? '').includes('gif')) { ok = g; break }
      await sleep(200)
    }
    if (ok) { result[slug] = { gif: ok, page: pageUrl }; console.log(`OK    ${slug} -> ${ok}`) }
    else console.error(`MISS  ${slug} (${name}): gif không verify được`)
  } catch (e) {
    console.error(`ERR   ${slug}: ${e.message}`)
  }
  await sleep(600)
}
console.log('\n===JSON===')
console.log(JSON.stringify(result, null, 2))
