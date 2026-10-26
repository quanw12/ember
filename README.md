# EMBER — Keep the fire

App luyện tập cá nhân dạng PWA: **gym + chạy bộ + tiến trình**, dữ liệu lưu ngay trên máy (local-first), chạy offline, chi phí 0đ. Cài lên iPhone/Android ngay từ trình duyệt — không cần App Store, không chứng chỉ, không tái ký.

> *Mỗi buổi tập là một lần thổi lửa. Streak của bạn chính là ngọn lửa.*

A personal training PWA (gym + running + progress tracking), local-first, offline-capable, zero cost. Install it straight from the browser — no App Store, no signing certificates, no 7-day resigning.

## Tính năng (lộ trình)

Xem [PLAN.md](./PLAN.md) cho bản spec đầy đủ. Phase 1:

- Onboarding mục tiêu (cut / bulk / maintain / recomp) → tự tính kcal & macro từ công thức công bố (Mifflin-St Jeor, ISSN)
- Tab **Hôm nay**: mục tiêu hôm nay, ring tiến độ, nhật ký nhanh ăn/ngủ
- Tab **Gym**: log buổi tập theo set, thư viện bài tập theo nhóm cơ, lịch sử + 1RM (Epley), kế hoạch mẫu + tự dựng kế hoạch
- Tab **Chạy**: GPS vẽ đường real-time trên bản đồ, lịch sử, kế hoạch Couch to 5K
- Tab **Tiến trình**: cân nặng (trung bình trượt), số đo, ảnh progress, biểu đồ
- Nhắc nhở Web Push tử tế (tối đa 1 thông báo/ngày, im khi đã tập)
- Backup: xuất/nhập file JSON

## Chạy dự án

```bash
npm install
npm run icons   # sinh icon PNG cho manifest từ SVG brand
npm run dev     # http://localhost:5173
npm run build   # build production vào dist/
```

Cài lên điện thoại: mở URL (qua HTTPS khi deploy) bằng Safari/Chrome → *Add to Home Screen*.

## Phát hành & quảng bá

- Deploy tĩnh: GitHub Pages hoặc Cloudflare Pages (free) — build từ repo này
- License: MIT (xem [LICENSE](./LICENSE))
- Nguồn dữ liệu: thư viện bài tập [free-exercise-db](https://github.com/yuhonas/free-exercise-db) + [wger](https://wger.de) (nguồn mở), kế hoạch chạy NHS Couch to 5K, bản đồ OpenStreetMap
- Disclaimer: EMBER không thay thế bác sĩ hay huấn luyện viên chuyên môn
