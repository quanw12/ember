import type { Exercise } from '../db'

export const MUSCLES: { id: string; label: string }[] = [
  { id: 'chest', label: 'Ngực' },
  { id: 'back', label: 'Lưng' },
  { id: 'shoulders', label: 'Vai' },
  { id: 'biceps', label: 'Bắp tay trước' },
  { id: 'triceps', label: 'Bắp tay sau' },
  { id: 'core', label: 'Cơ bụng' },
  { id: 'quads', label: 'Tứ đầu' },
  { id: 'hamstrings', label: 'Gân kheo' },
  { id: 'glutes', label: 'Cơ mông' },
  { id: 'calves', label: 'Bắp chân' },
  { id: 'forearms', label: 'Cẳng tay' }
]

export const EQUIPMENT: { id: string; label: string }[] = [
  { id: 'barbell', label: 'Tạ đòn' },
  { id: 'dumbbell', label: 'Tạ đơn' },
  { id: 'machine', label: 'Máy' },
  { id: 'cable', label: 'Cable' },
  { id: 'bodyweight', label: 'Bodyweight' }
]

const ex = (
  slug: string, name: string, nameEn: string, muscle: string, equipment: string
): Exercise => ({
  slug, name, nameEn, muscle, equipment,
  keywords: nameEn.toLowerCase().split(/\s+/).filter(w => w.length > 2)
})

/** Seed ban đầu ~40 bài phổ biến. Giai đoạn sau: import đầy đủ từ free-exercise-db. */
export const EXERCISE_SEED: Exercise[] = [
  ex('bench-press', 'Bench Press — Đẩy ngực tạ đòn', 'Barbell Bench Press', 'chest', 'barbell'),
  ex('incline-db-press', 'Đẩy ngực dốc tạ đơn', 'Incline Dumbbell Press', 'chest', 'dumbbell'),
  ex('push-up', 'Hít đất', 'Push-up', 'chest', 'bodyweight'),
  ex('cable-fly', 'Bay cáp ngực', 'Cable Chest Fly', 'chest', 'cable'),
  ex('dips', 'Xô kép (dips)', 'Dips', 'chest', 'bodyweight'),
  ex('deadlift', 'Deadlift — Nhấc đất', 'Barbell Deadlift', 'back', 'barbell'),
  ex('lat-pulldown', 'Kéo ngang cáp sau (pulldown)', 'Lat Pulldown', 'back', 'machine'),
  ex('barbell-row', 'Lưu xà tạ đòn', 'Barbell Row', 'back', 'barbell'),
  ex('one-arm-row', 'Lưu xà tạ đơn 1 tay', 'One-Arm Dumbbell Row', 'back', 'dumbbell'),
  ex('pull-up', 'Ngủ xà (pull-up)', 'Pull-up', 'back', 'bodyweight'),
  ex('face-pull', 'Face Pull — Kéo mặt cáp', 'Cable Face Pull', 'back', 'cable'),
  ex('ohp', 'Đẩy vai tạ đòn (OHP)', 'Overhead Press', 'shoulders', 'barbell'),
  ex('seated-db-press', 'Đẩy vai ngồi tạ đơn', 'Seated Dumbbell Press', 'shoulders', 'dumbbell'),
  ex('lateral-raise', 'Giơ ngang tạ đơn', 'Dumbbell Lateral Raise', 'shoulders', 'dumbbell'),
  ex('rear-delt-fly', 'Bay ngược vai sau', 'Rear Delt Fly', 'shoulders', 'dumbbell'),
  ex('barbell-curl', 'Gập tay tạ đòn', 'Barbell Curl', 'biceps', 'barbell'),
  ex('hammer-curl', 'Gập búa tạ đơn', 'Dumbbell Hammer Curl', 'biceps', 'dumbbell'),
  ex('cable-curl', 'Gập tay cáp', 'Cable Curl', 'biceps', 'cable'),
  ex('triceps-pushdown', 'Đẩy sau cáp (pushdown)', 'Triceps Pushdown', 'triceps', 'cable'),
  ex('skull-crusher', 'Skull Crusher — Nâng sau nằm', 'Barbell Skull Crusher', 'triceps', 'barbell'),
  ex('oh-triceps-ext', 'Đẩy sau quá đầu tạ đơn', 'Overhead Triceps Extension', 'triceps', 'dumbbell'),
  ex('back-squat', 'Squat tạ đòn', 'Barbell Back Squat', 'quads', 'barbell'),
  ex('front-squat', 'Front Squat — Squat trước', 'Barbell Front Squat', 'quads', 'barbell'),
  ex('leg-press', 'Đẩy chân máy', 'Leg Press', 'quads', 'machine'),
  ex('walking-lunge', 'Lunges bước đi', 'Walking Lunge', 'quads', 'dumbbell'),
  ex('leg-extension', 'Duỗi chân máy', 'Leg Extension', 'quads', 'machine'),
  ex('rdl', 'RDL — Chết hông Rumani', 'Romanian Deadlift', 'hamstrings', 'barbell'),
  ex('leg-curl', 'Gập chân máy', 'Leg Curl', 'hamstrings', 'machine'),
  ex('good-morning', 'Good Morning tạ đòn', 'Barbell Good Morning', 'hamstrings', 'barbell'),
  ex('hip-thrust', 'Hip Thrust tạ đòn', 'Barbell Hip Thrust', 'glutes', 'barbell'),
  ex('glute-bridge', 'Nâng hông nằm', 'Glute Bridge', 'glutes', 'bodyweight'),
  ex('bulgarian-split', 'Bulgarian Split Squat', 'Bulgarian Split Squat', 'glutes', 'dumbbell'),
  ex('standing-calf', 'Nhón gót đứng máy', 'Standing Calf Raise', 'calves', 'machine'),
  ex('seated-calf', 'Nhón gót ngồi', 'Seated Calf Raise', 'calves', 'machine'),
  ex('plank', 'Plank — Chống khuỷu', 'Plank', 'core', 'bodyweight'),
  ex('hanging-leg-raise', 'Nâng chân trên xà', 'Hanging Leg Raise', 'core', 'bodyweight'),
  ex('cable-crunch', 'Crunch cáp quỳ', 'Cable Crunch', 'core', 'cable'),
  ex('russian-twist', 'Russian Twist — Xoay thân', 'Russian Twist', 'core', 'bodyweight'),
  ex('wrist-curl', 'Gập cổ tay tạ đơn', 'Dumbbell Wrist Curl', 'forearms', 'dumbbell')
]
