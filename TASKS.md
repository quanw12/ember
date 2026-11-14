# Các nhiệm vụ triển khai

| Nhiệm vụ | Nhánh/base | Kết quả |
| --- | --- | --- |
| Android thử nghiệm | PR #14, đã trên main | APK debug build được. Chưa QA trên điện thoại thật |
| iOS sideload | PR #15, đã trên main | IPA chưa ký, người dùng tự ký. Không build IPA trên Windows |
| Backend local | PR #12, đã trên main | PocketBase, migrations, users/blocked, snapshot theo owner |
| Tài khoản trong app | PR #12, đã trên main | Email/mật khẩu, hồ sơ local theo tài khoản, snapshot thủ công. Nút Google chỉ bật khi máy chủ báo provider |
| Địa chỉ máy chủ trong app | main | Người dùng nhập `https://` hoặc IP trong mạng nhà. Trên điện thoại, `127.0.0.1` là chính máy đó. HTTP trong LAN được phép; ra ngoài mạng nhà cần HTTPS |
| Kích hoạt Google | Cấu hình của chủ máy chủ | Cần Client ID/Secret và domain HTTPS. Chưa kiểm thử với Google thật |
| QA điện thoại thật | Việc còn lại | Chưa chạy trên Android hoặc iPhone vật lý |

PR #12 (auth-local), #13 (release/0.3.0-beta.1), #14 (android-prototype) và #15 (ios-sideload) đã nằm trên main. Việc còn lại là thông tin Google, SMTP, QA máy thật và HTTPS khi truy cập từ ngoài mạng nhà. App không nhúng sẵn URL production. Không đưa database, mật khẩu quản trị, Google secret hoặc chứng chỉ ký vào Git.
