# EMBER 0.3.0-beta.1 — chuẩn bị beta qua link

Ngày rà soát: 03/11/2026. Phạm vi: PWA cài trên màn hình chính Android/iPhone; lên store ở giai đoạn sau.

## Các lỗi được xử lý

| Vấn đề trong 0.2.1 | Thay đổi trong beta |
| --- | --- |
| JSON.stringify làm Blob ảnh thành `{}`, không có nhập backup | Backup có format/version, giữ Blob + Date; kiểm tra file trước khi thay thế trong một transaction |
| Chuyển tab huỷ RunTracker và mất buổi chạy | Giữ các tab đã mở; checkpoint mỗi 5 giây, khôi phục bản nháp ở trạng thái tạm dừng |
| GPS bỏ điểm đầu; khoảng cách/thời gian khi pause dễ sai | Ghi điểm đầu; bỏ fix lúc pause, lọc nhảy quá 12 m/s, chia đoạn lộ trình sau resume; timer dựa trên thời gian thực |
| Bản đồ lịch sử chạy không khởi tạo khi DB trả dữ liệu sau mount | Khởi tạo sau khi có run, resize khi đổi tab |
| Lỗi khởi động dẫn đến màn hình trắng | Error boundary và màn hình thử lại, giữ nguyên dữ liệu |
| Migration legacy ghi metadata trước khi copy hoàn tất | Copy atomic trước, chỉ công bố hồ sơ sau khi thành công |
| Async seed có thể ghi sang hồ sơ vừa chuyển | Giữ DB instance cho từng công việc seed; đóng kết nối cũ khi chuyển |
| WebKit gặp lỗi trong optimistic cache của Dexie khi cập nhật ảnh | Tắt optimistic cache, liveQuery đọc dữ liệu đã commit; ưu tiên nhất quán dữ liệu |
| WebKit trong kiểm thử từ chối lưu Blob ảnh vào IndexedDB | Ảnh mới lưu bằng Uint8Array + MIME; vẫn đọc ảnh Blob cũ, chuyển Blob sang bytes trước restore transaction |
| PWA tự cập nhật có thể làm mất nội dung đang nhập | Hiện thông báo cập nhật; chặn cập nhật khi đang chạy, xác nhận trước khi reload |
| Bundle đầu vào khoảng 553 KB | Lazy load Gym/Run/Progress/Profile, đầu vào khoảng 323 KB trước gzip |
| Vite 5 có cảnh báo mức high, đã ngoài dải hỗ trợ | Vite 7.3.7, plugin React 5, PWA 2; khóa phiên bản bằng package-lock |
| Nhắc nhở dùng Notification constructor không phù hợp mobile | Ưu tiên service worker showNotification; lưu ngày đã nhắc theo hồ sơ |

Giao diện: welcome mới, hero check-in, lịch lửa 7 ngày, thống kê tuần từ dữ liệu thật, bố cục desktop hai cột; tương phản, focus bàn phím, font nhập 16px và safe area. Có hướng dẫn cài, trạng thái offline và trang quyền riêng tư.

## Kiểm chứng tự động

Chạy trên Node 24 và Python 3.13:

```sh
npm ci
pip install -r requirements-test.txt
python -m playwright install chromium webkit
npm run build
npm run test:smoke
npm run test:release
npm audit --omit=dev
```

- Smoke: onboarding, hai hồ sơ và cách ly, check-in, log cân, kế hoạch, thư viện và các tab.
- Release: phục vụ bản dist tại `/ember/`, Chromium + WebKit; bố cục 320/390/768/1440px; nhập sai; backup/restore ảnh và Date; file backup hỏng không làm đổi dữ liệu; GPS/pause/resume; đổi tab; reload và khôi phục; bản đồ lịch sử; offline reload và lazy views.
- Ảnh kiểm chứng ở `output/playwright/` (không đưa vào source control).
- Kiểm tra offline thật bằng cách cắt phản hồi từ origin server. WebKit không dùng `setOffline()` cho bước navigation do [lỗi Playwright #42775](https://github.com/microsoft/playwright/issues/42775) từ chối cả response có sẵn trong service worker; không bỏ qua kiểm tra offline trên WebKit.
- CI áp dụng các kiểm tra trên trước deploy và trước đóng gói release. Kết quả local không thay thế QA trên máy thật.
- `npm audit --omit=dev`: không có cảnh báo trong dependencies production tại lần kiểm tra. Audit đầy đủ còn 10 cảnh báo low/moderate trong chuỗi build Workbox (deepmerge/glob/minimatch và các package phụ thuộc). Không ép downgrade hoặc override major không tương thích để che cảnh báo. Cần tiếp tục theo dõi upstream trước bản stable.

## Trước khi mở rộng beta

1. Kiểm tra trên ít nhất một iPhone/Safari/Home Screen và một Android/Chrome: cài, offline sau lần tải đầu, quyền GPS bị từ chối, pause/resume, ảnh, export/import qua Files và cập nhật PWA từ bản cũ. Kiểm tra icon maskable và các vùng tai thỏ/thanh home.
2. Test nâng cấp từ 0.2.1 bằng dữ liệu thật đã sao lưu. App cũ từng dùng auto-update: nên nhắc người dùng lưu buổi tập trước khi mở bản beta đầu tiên.
3. Chạy bộ trên PWA cần màn hình bật và app ở phía trước; không quảng cáo GPS nền. Checkpoint có thể mất tối đa phần thay đổi sau lần ghi cuối nếu hệ điều hành kết thúc app.
4. Không có cloud sync. Nhắc backup rõ ràng; dữ liệu cùng origin được chia sẻ giữa các bản deploy, vì vậy rollback không khôi phục dữ liệu cũ. Không xoá IndexedDB hay cache người dùng để sửa lỗi.
5. Ảnh remote và bản đồ chưa tải không bảo đảm offline. GIF tải theo nhu cầu. Cần audit quyền sử dụng/attribution của GIF và nguồn ảnh trước khi đưa lên store.
6. Thu phản hồi beta qua Issues; không yêu cầu đăng backup chứa ảnh, cơ thể hay vị trí công khai. Chưa có crash telemetry; nếu thêm sau này cần xin lựa chọn và cập nhật quyền riêng tư.

## Phát hành qua GitHub Pages

- Link: https://quanw12.github.io/ember/ . Bật Pages với source **GitHub Actions** nếu chưa bật.
- Merge/push commit đã kiểm chứng vào `main`: workflow Deploy build/test rồi deploy. Chỉ thông báo beta đã live sau khi workflow thành công và kiểm tra link thực tế.
- Tag `v0.3.0-beta.1`: workflow Release tạo ZIP + checksum và đánh dấu prerelease. ZIP phục vụ qua HTTP/HTTPS, không mở bằng `file://`.
- Bản này cài qua link, không phải APK/IPA. Trên iPhone: Safari → Chia sẻ → Thêm vào Màn hình chính; Android: Chrome → menu → Cài đặt ứng dụng.
- Nếu triển khai có lỗi, ưu tiên hotfix hoặc rollback tới bản có hỗ trợ `StoredImage` (Blob và bytes). **Không rollback mù về 0.2.1**: bản đó chưa đọc được ảnh dạng bytes do beta mới ghi. Giữ nguyên DB, kiểm tra backup và khả năng đọc dữ liệu trước khi deploy lại; không force-push lịch sử.

## Sau beta: Google Play và App Store

Chọn Capacitor để tái sử dụng UI hiện có; tạo dự án Android/iOS, tích hợp quyền vị trí/native lifecycle, backup qua Files/Share, kiểm tra WebView storage và thay reminder/GPS nền bằng native plugin nếu sản phẩm cần. Một wrapper đơn thuần chưa giải quyết giới hạn GPS nền hay bảo đảm được store duyệt.

Android cần cấu hình package ID, signing key, Android toolchain, kiểm thử nội bộ và thông tin Data safety. iOS cần macOS/Xcode, signing, tài khoản Apple Developer để phân phối, TestFlight và thông tin App Privacy. Phiên bản toolchain/SDK theo tài liệu hiện hành tại thời điểm làm native; không đưa khóa ký vào Git.

Nguồn chính thức: [Capacitor iOS](https://capacitorjs.com/docs/ios), [Capacitor Android](https://capacitorjs.com/docs/android), [WebKit: Web Push iOS](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/), [Vite releases](https://vite.dev/releases). iOS hỗ trợ Web Push cho Home Screen web app từ 16.4; giới hạn reminder nền nêu ở đây là của cách triển khai EMBER hiện tại.
