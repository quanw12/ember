# Các nhiệm vụ triển khai

| Nhiệm vụ | Nhánh/base | Kết quả |
| --- | --- | --- |
| Android thử nghiệm | codex/android-prototype / main | Build APK debug thành công, chưa QA thiết bị thật |
| iOS sideload | codex/ios-sideload / android-prototype | Commit 8857496, CI Mac thành công; có IPA chưa ký, người dùng tự ký |
| Backend local | codex/auth-local / ios-sideload | PocketBase Windows, migrations, quản trị users/blocked, snapshot theo owner; tests API thật |
| Tài khoản trong app | codex/auth-local | Email/password, hồ sơ local theo tài khoản, snapshot thủ công, Google OAuth được nối qua SDK; test browser email/upload/restore |
| Kích hoạt Google | Cấu hình của chủ máy chủ | Cần Client ID/Secret, consent screen/test users; chưa kiểm thử với Google thật |
| Truy cập từ điện thoại ngoài LAN | Cấu hình triển khai | Chưa có HTTPS/domain; bản local chỉ hoạt động từ PC, không phát hành endpoint loopback cho user |

Các nhánh phụ thuộc được giữ riêng, chưa merge main. IPA build trước bước auth nên chưa chứa tính năng tài khoản mới. Sau khi backend HTTPS và Google OAuth đã cấu hình/kiểm thử, cần build lại APK/IPA với URL thật. Không đưa database, admin credentials, Google secret hoặc chứng chỉ ký vào Git.
