# EMBER — Plan & Requirement (v1.1 chốt)

> App luyện tập cá nhân (gym + chạy bộ) dạng PWA, cài lên iPhone Home Screen, chi phí 0đ, dữ liệu lưu trên máy.

## 1. Tầm nhìn & nguyên tắc

Một "coach cá nhân" trên điện thoại: biết hôm nay tập gì, hướng dẫn tập sao cho đúng, ghi lại mọi nỗ lực, và cho thấy mình đang tiến tới body mục tiêu bao nhiêu phần trăm.

Nguyên tắc thiết kế:
1. **Fast logging trên hết** — log một set ≤ 3 chạm (bài học từ Hevy/Strong).
2. **Honest data** — mọi con số sinh từ công thức công bố; nội dung AI gợi ý được gắn nhãn và sửa được.
3. **Nhắc nhở tử tế** — tối đa 1 thông báo/ngày, im khi đã tập, không dọa nạt.
4. **Local-first** — không cần tài khoản, chạy offline, backup là file JSON do người dùng giữ.
5. **Chống AI slop** — không gradient tím mặc định, không emoji làm icon, không dashboard chất đầy thẻ rác, không social feed.

## 2. Nền tảng & kiến trúc

| Thành phần | Lựa chọn | Chi phí |
|---|---|---|
| App | React + Vite + TypeScript, PWA (service worker, offline) | 0đ |
| Dữ liệu | IndexedDB qua Dexie, sync đa thiết bị để sau (Phase 3) | 0đ |
| Bản đồ | Leaflet + OpenStreetMap tile | 0đ |
| Host | Cloudflare Pages | 0đ |
| Nhắc nhở | Web Push qua Cloudflare Workers (free tier) + VAPID | 0đ |
| Cài lên iPhone | Safari → Share → Add to Home Screen (không chứng chỉ, không tái ký 7 ngày) | 0đ |
| Backup | Xuất/nhập file JSON | 0đ |

Giới hạn cứng của iOS PWA (đã thống nhất): không GPS ngầm khi khóa màn hình (Wake Lock giữ màn hình sáng khi đang tập/chạy), không đọc HealthKit (ăn/ngủ nhập tay nhanh).

## 3. Nhận diện thương hiệu

- **Tên: EMBER** — "than hồng giữ lửa": mỗi buổi tập là một lần thổi lửa, streak là ngọn lửa thật sự lớn dần. Tagline: *Keep the fire* (quốc tế) / "Giữ lửa mỗi ngày" (Việt). (Phương án dự phòng: RÈN, THÉP, IGNIS.)
- **Logo**: thân thể nam line-art (nét đứt có chủ ý — không khắc họa hoàn toàn), tia lửa rèn, gradient lửa đỏ → đỏ đậm; biến thể nền đen (chính), nền đỏ, mono. Mark phụ: ngọn lửa (streak/nhắc nhở).
- **Màu**: nền #0A0A0C · thẻ #141419 · đỏ #E8232A · đỏ đậm #8F0F1D · hổ phách #FF7A45 · chữ #F2F2F4 / #9A9AA3 · thành công #3DD68C. Dark mode mặc định, chỉ có dark.
- **Font**: Be Vietnam Pro (400/600/700/800/900) — hỗ trợ dấu tiếng Việt đầy đủ, tự host để chạy offline.
- File thiết kế: `ren-brand-preview.html` (bản preview đã duyệt trong hội thoại) → tách asset SVG vào `src/assets/brand/` khi code.
- **Phát hành & quảng bá (public repo)**: repo GitHub đề xuất tên **`ember-fit`** — tránh đặt repo là `ember` vì trùng framework Ember.js và package npm, rất bất lợi khi quảng bá; README song ngữ Việt/Anh; license MIT cho code; tôn trọng giấy phép hình minh họa nguồn mở khi công khai (ghi credit free-exercise-db / wger); deploy tự động từ repo qua GitHub Pages hoặc Cloudflare Pages; disclaimer y tế ở README và trong app.

## 4. Điều hướng — 5 tab

**Hôm nay** (mặc định) · **Gym** · **Chạy** · **Tiến trình** · **Hồ sơ**

Gym và Chạy là hai lĩnh vực tách biệt hoàn toàn (kháng lực vs cardio) — tab riêng, không trộn màn hình.

## 5. Spec tính năng

### 5.1 Onboarding (lần đầu, sửa được mọi lúc trong Hồ sơ)
- Nhập: giới tính (nam/nữ), tuổi, chiều cao, cân nặng, số đo cơ bản (vòng bụng/cổ/hông — tuỳ chọn), kinh nghiệm (mới/1 năm+/lâu năm), số buổi/tuần (gym ×, chạy ×), dụng cụ có (gym full / tạ tại nhà / bodyweight).
- Chọn mục tiêu: **cutting / bulking / maintenance / recomp** + số kg + deadline (tuỳ chọn) + ảnh "body mong muốn" (lưu cục bộ).
- App tính và hiển thị kèm nguồn: BMR (Mifflin-St Jeor), TDEE, kcal mục tiêu (cut −15…−25% hoặc −0.5–1% kg/tuần; lean bulk +200–500 kcal), macro (protein 1.6–2.2 g/kg, fat ≥ 0.8 g/kg, phần còn lại carb), timeline ước tính. Công thức chỉnh được thủ công nếu muốn override.

### 5.2 Tab Hôm nay
- Thẻ buổi tập hôm nay (từ kế hoạch): tên buổi, nhóm cơ, số bài/set, thời lượng ước tính, **nút BẮT ĐẦU TẬP** to.
- Streak "giữ lửa" (mark lửa phát triển theo độ tuân thủ) + chấm điểm tuần T2–CN.
- Thẻ mục tiêu: ring % tiến độ (cân hiện tại vs mục tiêu, dùng trung bình trượt 7 ngày).
- Nếu hôm nay là ngày chạy: thẻ buổi chạy tương ứng (kế hoạch C25K/10K).
- Trạng thái rảnh: gợi ý "Buổi phục hồi — đi bộ nhẹ, giãn cơ" (không bắt buộc).

### 5.3 Tab Gym
**a) Buổi tập đang diễn ra (màn hình log — theo pattern tham chiếu)**
- Bảng mỗi bài: HIỆP | TRƯỚC | KG | LẶP | ✓ — cột TRƯỚC tự điền từ buổi trước; nút "+ Thêm hiệp"; đồng hồ nghỉ tự bật sau khi tick (thời gian nghỉ cấu hình theo bài: sức mạnh 3′ / tăng cơ 90″ / cơ nhỏ 60″).
- **Tùy chỉnh lực tùy thích**: đề xuất thông minh theo double progression (hoàn thành đủ rep ở set cuối → đề xuất +2.5 kg hoặc +1 rep), nhưng mọi ô nhập tay được 100%; mỗi set gắn thêm (tuỳ chọn): RPE 1–10, kỹ thuật (drop set / superset / rest-pause / AMRAP / warmup "W"); chọn "mức buổi" Nhẹ/Vừa/Nặng điều chỉnh % khối lượng mục tiêu của cả buổi.
- Kết thúc buổi: tổng volume, số set, thời gian, tổng повыш tải tuần — lưu tự động từng set (thoát app không mất).

**b) Thư viện bài tập**
- **Chọn theo nhóm cơ**: hình giải phẫu SVG tự vẽ phong cách line-art EMBER (trước/sau), highlight nhóm cơ bằng đỏ thương hiệu khi chọn. 12 nhóm: Ngực, Lưng, Vai, Bắp tay (biceps), Cổ tay sau (triceps), Cơ bụng/core, Tứ đầu, Gân kheo, Mông, Bắp chân, Cẳng tay, Cổ.
- Danh sách bài theo nhóm: thumbnail minh họa, lọc dụng cụ (tạ đòn/tạ đơn/máy/cable/bodyweight/dây kháng lực/lò xo), tìm kiếm.
- **Trang chi tiết bài tập** với tab: **Về** (hướng dẫn từng bước, nhóm cơ chính/phụ tô trên hình giải phẫu, lỗi thường gặp, biến thể) · **Lịch sử** (mỗi buổi: set × kg × rep, cột 1RM) · **Tiến độ** (biểu đồ volume & 1RM theo tuần, ước lượng 1RM công thức Epley) · **Kỷ lục** (PR: nặng nhất, 1RM cao nhất, volume cao nhất).
- **Video hướng dẫn**: nút mở tìm kiếm **TikTok** (`tiktok.com/search?q=<tên bài + "hướng dẫn">`) và **YouTube** (search tương tự) — deep link theo từ khóa, không cần API; thêm **ghim video yêu thích**: dán link TikTok/YouTube ưng ý vào bài tập, video ghim hiển thị trên đầu trang chi tiết.
- Tự thêm bài tập riêng (tên, nhóm cơ, dụng cụ, ảnh/ghi chú riêng).

**c) Kế hoạch tập**
- Template có sẵn (kèm nguồn): Full Body 3 buổi, Upper/Lower 4 buổi, PPL 6 buổi, StrongLifts 5×5, 5/3/1 (Jim Wendler), PHUL — chọn theo số buổi/tuần + kinh nghiệm.
- **Tự dựng kế hoạch tùy thích**: tạo routine (tên, gán thứ trong tuần), thêm bài từ thư viện (search + lọc nhóm cơ), sắp thứ tự kéo-thả, đặt set×rep×kg mục tiêu từng bài, gom superset (Phase 2).
- Xem trước cả tuần; bấm vào buổi → vào tập luôn.

### 5.4 Tab Chạy
- **Buổi chạy**: GPS theo dõi real-time, bản đồ OSM **vẽ đường đi** trong khi chạy, quãng đường, pace hiện tại + pace trung bình, thời gian; Wake Lock giữ màn hình; pause/tiếp tục/kết thúc; phát GPS mất tín hiệu thì ghi khoảng trống, không bẻ cong dữ liệu.
- Lịch sử buổi chạy: bản đồ mini, km, thời gian, pace, split mỗi km.
- Kế hoạch chạy: NHS Couch to 5K (9 tuần), kế hoạch 10K — trộn buổi chạy + ngày nghỉ đúng chuẩn.
- Thống kê tuần/tháng: tổng km, thời gian, buổi số.

### 5.5 Tab Tiến trình
- **Cân nặng**: nhập nhanh hằng ngày, biểu đồ điểm thô (mờ) + đường trung bình trượt 7 ngày (nét đậm) — chống nhiễu nước, đúng chuẩn đánh giá trend.
- **Số đo cơ thể**: vòng bụng/ngực/đùi/tay/hông… + ước lượng body-fat (công thức Navy, công thức riêng nam/nữ).
- **Ảnh progress**: chụp/thêm ảnh theo tháng, so sánh 2 mốc cạnh nhau — lưu cục bộ, không upload đâu.
- **Nhật ký nhanh (≤ 10 giây)**: kcal + protein đã ăn (pre-set mục tiêu, nhập số hoặc nút ±), giờ ngủ đêm qua.
- Dashboard: biểu đồ cân / volume gym / km chạy / giờ ngủ, streak, chữ kết luận mỗi tuần ("Tuần này volume +8%, cân −0.4 kg — đúng tốc độ an toàn").
- Chế độ nữ: chu kỳ kinh nguyệt (nhập 1 lần, dự đoán), gợi ý điều chỉnh cường độ theo pha (tuần kinh: giảm nhẹ, ưu tiên phục hồi), ghi chú sắt/protein. Toàn bộ là gợi ý có tắt được, kèm disclaimer y tế.

### 5.6 Tab Hồ sơ
- Sửa mục tiêu/số liệu/chế độ (đổi cut ↔ bulk → tính lại calo/macro ngay).
- **Nhắc nhở**: bật/tắt, giờ hằng ngày, tách lịch gym vs ngày chạy; luật tử tế (mục 7).
- **Lịch**: xuất tuần ra file .ics → thêm vào Apple Calendar một chạm.
- **Dữ liệu**: xuất toàn bộ ra JSON (backup), nhập lại; xoá dữ liệu.
- Đổi theme accent (đỏ mặc định) — nhẹ nhàng, không phải chủ đề sáng.

### 5.7 Nhắc nhở (Web Push, Phase 2 của thông báo nhưng thiết kế từ đầu)
- 1 thông báo/ngày tại giờ chọn: "Hôm nay: Push — Ngực · Vai · Tay sau · ~50 phút" hoặc "Hôm nay: chạy dễ 4 km (C25K W5D2)".
- Im nếu buổi đã log. Ngày nghỉ: không nhắc (tuỳ chọn nhắc "phục hồi"). Lỡ ≥ 2 ngày: đổi giọng khích lệ. Im 22:00–06:00.
- Xin quyền thông báo sau buổi tập đầu tiên (không xin khi mở app lần đầu).
- Hạ tầng: Cloudflare Worker cron + web-push/VAPID (free tier); phương án dự phòng 0đ tuyệt đối: iOS Shortcuts hẹn giờ mở app.

## 6. Nguồn dữ liệu (yêu cầu "đúng và chuẩn")

| Nội dung | Nguồn |
|---|---|
| Thư viện bài tập + hình minh họa line-art | free-exercise-db (yuhonas, ~800 bài) + wger (nguồn mở) — kiểm tra giấy phép khi build, tên dịch tiếng Việt có giữ tên Anh |
| Kỹ thuật tập, double progression, nghỉ giữa set | chuẩn luyện tập sức mạnh phổ biến (StrongLifts, 5/3/1, PHUL) |
| BMR/TDEE/macro | Mifflin-St Jeor; ISSN position stand (protein); hướng dẫn cut/bulk tốc độ an toàn |
| Kế hoạch chạy | NHS Couch to 5K; Hal Higdon 10K |
| Body-fat | Công thức US Navy (nam/nữ khác nhau) |
| Video | Deep link tìm kiếm TikTok/YouTube theo từ khóa + video người dùng ghim (người dùng tự kiểm duyệt nguồn) |

Mọi nội dung AI gợi ý thêm (mô tả bài, biến thể) được gắn nhãn "gợi ý — kiểm tra trước khi tin", sửa được. Disclaimer: app không thay thế bác sĩ/huấn luyện viên.

## 7. Cấu trúc dữ liệu (IndexedDB)

`exercises` (seed + custom) · `routines` + `routine_days` + `routine_entries` · `sessions` + `sets` (kg, rep, rpe, kỹ thuật, thời gian) · `runs` (điểm GPS, splits) · `body_logs` (cân, số đo, ảnh ref) · `nutrition_logs` · `sleep_logs` · `cycle_logs` (chế độ nữ) · `reminders` · `pinned_videos` · `settings/profile`.

Đơn vị: kg/km/phút mặc định (lb toggle trong Hồ sơ).

## 8. Lộ trình

**Phase 1 — dùng được hằng ngày (bắt đầu ngay sau khi duyệt plan)**
1. Khung app: PWA shell, 5 tab, dark theme EMBER, logo asset, offline cơ bản, cài Add to Home Screen chuẩn.
2. Onboarding + tính calo/macro (có nguồn).
3. Tab Gym: log buổi tập theo bảng HIỆP/TRƯỚC/KG/LẶP, đồng hồ nghỉ, lịch sử theo bài (Lịch sử/Tiến độ/Kỷ lục + 1RM Epley).
4. Thư viện: nhóm cơ SVG + danh sách bài + trang chi tiết + link TikTok/YouTube + ghim video.
5. Kế hoạch: 3 template đầu (Full Body, Upper/Lower, PPL) + tự dựng routine cơ bản.
6. Tab Chạy: GPS + vẽ đường + lưu buổi + lịch sử.
7. Tiến trình: cân + trung bình trượt + dashboard cơ bản.
8. Backup xuất/nhập JSON.

**Phase 2**: Web Push nhắc nhở + .ics · nhật ký ăn/ngủ · chế độ nữ theo chu kỳ · template còn lại (5×5, 5/3/1, PHUL, C25K, 10K) · superset/kỹ thuật nâng cao · ảnh progress.

**Phase 3**: MCP server trên PC (AI assistant đọc/sửa kế hoạch, phân tích tiến trình) · đồng bộ đa thiết bị · AI coach điều chỉnh kế hoạch theo dữ liệu (tư tưởng Fitbod recovery) · widget/bảng ngắn.

## 9. Cố ý loại bỏ (vì app cá nhân local-first)
- Bảng xếp hạng / mạng xã hội / bạn bè — không backend cộng đồng.
- Quảng cáo, paywall.
- Đọc HealthKit / GPS ngầm — giới hạn nền tảng PWA, đã nêu.

## 10. Đã duyệt
- Tên EMBER (đổi từ RÈN để thuận quảng bá quốc tế, repo đề xuất `ember-fit`) + hướng logo line-art đỏ đen — duyệt trong hội thoại (preview `ren-brand-preview.html`).
- Người dùng bổ sung (đã đưa vào spec): thư viện theo nhóm cơ có hình giải phẫu · video TikTok theo từ khóa · tùy chỉnh lực tập · lịch sử theo dõi mức tăng với 1RM · tự lên lịch tập tùy thích.
