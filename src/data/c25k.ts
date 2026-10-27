/**
 * Kế hoạch NHS Couch to 5K — 9 tuần × 3 buổi, xen kẽ ngày nghỉ.
 * Nguồn cấu trúc: NHS Couch to 5K (nhs.uk), diễn giải tiếng Việt.
 */
export interface C25KWeek {
  label: string
  days: [string, string, string]
}

export const C25K: C25KWeek[] = [
  {
    label: 'Tuần 1',
    days: [
      'Đi bộ nhanh 5 phút → (chạy nhẹ 1 phút / đi bộ 90 giây) × 8 → đi bộ 5 phút',
      'Đi bộ nhanh 5 phút → (chạy nhẹ 1 phút / đi bộ 90 giây) × 8 → đi bộ 5 phút',
      'Đi bộ nhanh 5 phút → (chạy nhẹ 1 phút / đi bộ 90 giây) × 8 → đi bộ 5 phút'
    ]
  },
  {
    label: 'Tuần 2',
    days: [
      'Đi bộ nhanh 5 phút → (chạy 90 giây / đi bộ 2 phút) × 6 → đi bộ 5 phút',
      'Đi bộ nhanh 5 phút → (chạy 90 giây / đi bộ 2 phút) × 6 → đi bộ 5 phút',
      'Đi bộ nhanh 5 phút → (chạy 90 giây / đi bộ 2 phút) × 6 → đi bộ 5 phút'
    ]
  },
  {
    label: 'Tuần 3',
    days: [
      'Đi bộ 5 phút → (chạy 90 giây / đi bộ 90 giây / chạy 3 phút / đi bộ 3 phút) × 2',
      'Đi bộ 5 phút → (chạy 90 giây / đi bộ 90 giây / chạy 3 phút / đi bộ 3 phút) × 2',
      'Đi bộ 5 phút → (chạy 90 giây / đi bộ 90 giây / chạy 3 phút / đi bộ 3 phút) × 2'
    ]
  },
  {
    label: 'Tuần 4',
    days: [
      'Đi bộ 5 phút → chạy 3 phút / đi bộ 90 giây / chạy 5 phút / đi bộ 2,5 phút / chạy 3 phút / đi bộ 90 giây / chạy 5 phút',
      'Đi bộ 5 phút → chạy 3 phút / đi bộ 90 giây / chạy 5 phút / đi bộ 2,5 phút / chạy 3 phút / đi bộ 90 giây / chạy 5 phút',
      'Đi bộ 5 phút → chạy 3 phút / đi bộ 90 giây / chạy 5 phút / đi bộ 2,5 phút / chạy 3 phút / đi bộ 90 giây / chạy 5 phút'
    ]
  },
  {
    label: 'Tuần 5',
    days: [
      'Đi bộ 5 phút → (chạy 5 phút / đi bộ 3 phút) × 3',
      'Đi bộ 5 phút → chạy 8 phút / đi bộ 5 phút / chạy 8 phút',
      'Đi bộ 5 phút → chạy 20 phút không nghỉ'
    ]
  },
  {
    label: 'Tuần 6',
    days: [
      'Đi bộ 5 phút → chạy 5 phút / đi bộ 3 phút / chạy 8 phút / đi bộ 3 phút / chạy 5 phút',
      'Đi bộ 5 phút → chạy 10 phút / đi bộ 3 phút / chạy 10 phút',
      'Đi bộ 5 phút → chạy 25 phút không nghỉ'
    ]
  },
  {
    label: 'Tuần 7',
    days: [
      'Đi bộ 5 phút → chạy 25 phút',
      'Đi bộ 5 phút → chạy 25 phút',
      'Đi bộ 5 phút → chạy 25 phút'
    ]
  },
  {
    label: 'Tuần 8',
    days: [
      'Đi bộ 5 phút → chạy 28 phút',
      'Đi bộ 5 phút → chạy 28 phút',
      'Đi bộ 5 phút → chạy 28 phút'
    ]
  },
  {
    label: 'Tuần 9',
    days: [
      'Đi bộ 5 phút → chạy 30 phút — cự ly 5K trong tầm tay',
      'Đi bộ 5 phút → chạy 30 phút — cự ly 5K trong tầm tay',
      'Đi bộ 5 phút → chạy 30 phút — 5K hoàn thành'
    ]
  }
]

export const C25K_TOTAL = 27
