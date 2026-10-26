# EMBER — Keep the fire

App luyện tập cá nhân dạng PWA: **gym + chạy bộ + tiến trình**, dữ liệu lưu ngay trên máy (local-first), chạy offline, chi phí 0đ. Cài lên iPhone/Android ngay từ trình duyệt — không cần App Store, không chứng chỉ, không tái ký.

> *Mỗi buổi tập là một lần thổi lửa. Streak của bạn chính là ngọn lửa.*

A personal training PWA (gym + running + progress tracking), local-first, offline-capable, zero cost. Install it straight from the browser — no App Store, no signing certificates, no 7-day resigning.

## Tính năng

- **Gym**: thư viện 876 bài tập (hình minh họa + hướng dẫn + mức độ, nguồn mở free-exercise-db), lọc theo nhóm cơ/dụng cụ, log buổi tập theo set (HIỆP · TRƯỚC · KG · LẶP) với prefill lần trước, đồng hồ nghỉ tự động, lịch sử + tiến độ + kỷ lục 1RM (Epley), link video TikTok/YouTube + ghim video ưng ý
- **Kế hoạch tập**: 4 template chuẩn (Full Body, Upper/Lower, PPL, PHUL) hoặc tự dựng từng ngày trong tuần; tab Hôm nay tự chỉ bài đúng thứ
- **Chạy bộ**: GPS vẽ đường real-time trên bản đồ (OpenStreetMap), pace/ngay lập tức, lịch sử + split từng km, kế hoạch NHS Couch to 5K 9 tuần
- **Tiến trình**: cân nặng với trung bình trượt 7 ngày, ảnh progress so sánh 2 mốc, kcal vs mục tiêu, giấc ngủ, chế độ nữ theo chu kỳ
- **Onboarding mục tiêu** (cut/bulk/maintain/recomp) tính kcal + macro từ Mifflin-St Jeor + ISSN
- **Nhắc nhở tử tế**: 1 thông báo/ngày, im khi đã tập; xuất .ics vào Apple Calendar; hướng dẫn iOS Shortcuts
- **Local-first**: không tài khoản, không server, chạy offline, backup/restore JSON

## Chạy dự án

```bash
npm install
npm run icons   # sinh icon PNG cho manifest từ SVG brand
npm run dev     # http://localhost:5173
npm run build   # build production vào dist/
```

Cài lên điện thoại: mở URL (qua HTTPS khi deploy) bằng Safari/Chrome → *Add to Home Screen*.

## Cài lên điện thoại (không cần App Store)

1. Merge vào `main` — GitHub Actions tự build và deploy lên **https://quanw12.github.io/ember/** (bật 1 lần: *Settings → Pages → Source: GitHub Actions*).
2. Mở đường dẫn trên bằng **Safari** trên iPhone → nút **Share** → **Add to Home Screen**.
3. Xong: icon EMBER nằm ở màn hình chính, chạy full màn hình, offline, dữ liệu nằm ngay trên máy. Không chứng chỉ, không tái ký 7 ngày.

## License & credit

- License: MIT (xem [LICENSE](./LICENSE))
- Nguồn dữ liệu: thư viện bài tập [free-exercise-db](https://github.com/yuhonas/free-exercise-db) + [wger](https://wger.de) (nguồn mở), kế hoạch chạy NHS Couch to 5K, bản đồ OpenStreetMap
- Disclaimer: EMBER không thay thế bác sĩ hay huấn luyện viên chuyên môn
