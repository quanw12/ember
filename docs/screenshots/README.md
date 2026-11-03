# Bộ ảnh giao diện EMBER

Ảnh chụp trực tiếp từ giao diện EMBER beta 0.3 bằng Playwright Chromium, ngày 03/11/2026. Desktop: viewport 1440 × 1080 px; mobile: 390 × 960 px. Ảnh desktop chụp toàn trang; ảnh mobile chụp vùng nhìn thấy. Đây là mô phỏng kích thước trình duyệt, không phải ảnh chụp thiết bị vật lý.

Hồ sơ “Minh”, lịch tập, cân nặng, dinh dưỡng và lịch sử chạy đều là dữ liệu demo. Không sử dụng dữ liệu cá nhân. Các con số chỉ phục vụ giới thiệu giao diện, không phải kết quả luyện tập hay khuyến nghị cá nhân.

| File | Màn hình |
| --- | --- |
| `01-today-desktop.png` | Dashboard desktop, lịch lửa, mục tiêu, buổi tập và nhật ký nhanh |
| `02-today-mobile.png` | Dashboard mobile |
| `03-planner-mobile.png` | Chọn nhóm cơ khi lập lịch tuần |
| `04-session-mobile.png` | Ghi hiệp trong buổi gym |
| `05-progress-mobile.png` | Biểu đồ cân nặng và trung bình trượt |
| `06-run-mobile.png` | Kế hoạch C25K, thống kê và lịch sử chạy |
| `07-exercise-mobile.png` | Chi tiết Barbell Bench Press và nhóm cơ đích |
| `08-welcome-mobile.png` | Màn hình chào và tạo hồ sơ |

## Chụp lại

Từ thư mục gốc của repo, sau khi cài Node.js và Python:

```bash
npm ci
pip install -r requirements-test.txt
python -m playwright install chromium
python scripts/with_server.py --server "npm run dev -- --port 5173 --strictPort" --port 5173 -- python scripts/capture_readme.py
```

Script dùng một browser context mới và đóng nó sau khi hoàn tất. Chỉ dữ liệu demo trong context đó được tạo; hồ sơ của bạn trong trình duyệt thường không bị đọc hoặc thay đổi. Ảnh được chụp từ giao diện thật, không chèn số liệu vào ảnh hay sửa DOM để giả tính năng. Thời gian demo được cố định để có thể chụp lại nhất quán.

Cover SVG sáng/tối ở `docs/assets/` là minh họa nhận diện riêng cho README; không phải ảnh chụp màn hình app.
