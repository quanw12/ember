# Bản Android thử nghiệm

Đây là bản Capacitor chạy các tài nguyên web đóng gói trong APK, chưa phải bản phát hành ổn định. Application ID hiện tại `io.github.quanw12.ember` là lựa chọn thử nghiệm; cần chốt trước khi phát hành chính thức.

## Chạy từ mã nguồn

Yêu cầu Node 22+, JDK 21, Android SDK Platform 36 và Build Tools 36.0.0. Cài SDK bằng Android Studio và chấp nhận license trong SDK Manager. Không commit `android/local.properties`, keystore hoặc thông tin ký.

```bash
npm ci
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
```

Windows dùng `gradlew.bat assembleDebug`. APK ở `android/app/build/outputs/apk/debug/app-debug.apk`. Workflow Android preview trên nhánh thử nghiệm cũng build và lưu APK dưới dạng Actions artifact.

APK debug được ký bằng khóa debug của môi trường build, dùng để thử nghiệm; không dùng làm bản phát hành lâu dài. Không cài đè APK được ký bằng khóa khác. Bản chính thức cần khóa release do chủ dự án giữ an toàn, cấu hình sao lưu khóa và versionCode tăng dần.

## Chuyển dữ liệu và kiểm tra thiết bị

Trong PWA, vào Hồ sơ → Xuất backup JSON. Trong APK, tạo hồ sơ mới, vào Hồ sơ → Khôi phục từ backup JSON. Hai bản có bộ nhớ riêng, không tự đồng bộ. Khi xuất backup từ Android, chọn ứng dụng hoặc vị trí lưu trong bảng chia sẻ, sau đó kiểm tra file đã được lưu.

Trên điện thoại thật cần kiểm tra lần đầu: cài APK, cập nhật Android System WebView, từ chối/cấp lại quyền vị trí, GPS khi app mở, ảnh, nhập/xuất backup qua Files, mở lại offline và các khu vực mép màn hình. Tính năng GPS nền và thông báo hẹn giờ khi đóng app chưa được triển khai. Không xóa bản PWA hoặc dữ liệu gốc cho đến khi đã kiểm tra backup và dữ liệu trên APK.
