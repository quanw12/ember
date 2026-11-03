# Nhiệm vụ tài khoản và máy chủ local

Nhánh `codex/auth-local` dựa trên `codex/ios-sideload`, tiếp nối `codex/android-prototype`. Chưa merge vào main hoặc thay bản beta công khai. Các commit native, auth/schema và kiểm thử được tách riêng để review.

## Khởi động trên Windows

```powershell
python scripts/setup_backend.py
backend/bin/pocketbase.exe serve --http=127.0.0.1:8090 --dir backend/pb_data --migrationsDir backend/pb_migrations
```

Giữ terminal mở trong lúc dùng. API: `http://127.0.0.1:8090`; quản trị: `http://127.0.0.1:8090/_/`. Lần đầu dùng link thiết lập một lần được in trong terminal của PocketBase, hoặc chạy lệnh dưới đây và tự thay thông tin tài khoản quản trị:

```powershell
backend/bin/pocketbase.exe superuser create EMAIL_CUA_BAN MAT_KHAU_MANH --dir backend/pb_data
```

Không gửi mật khẩu quản trị vào chat hoặc commit nó. Tài khoản admin khác với user thường; chỉ admin có quyền xem toàn bộ user, đổi trạng thái `blocked`, xóa user và xem các bản sao qua trang quản trị. Mật khẩu user được PocketBase hash, không lưu dạng đọc được. Xóa user cũng xóa snapshot thuộc user đó.

Tạo `.env.local` ở thư mục gốc với `VITE_BACKEND_URL=http://127.0.0.1:8090`, chạy `npm run dev`. Hoặc copy `.env.example` thành `.env.local`. Frontend có đăng ký email/mật khẩu, đăng nhập, đăng xuất và khu vực tài khoản trong Hồ sơ hoặc màn hình chào.

Database và file upload nằm trong `backend/pb_data` (SQLite + storage). Sao lưu toàn bộ thư mục bằng chức năng backup trong trang quản trị, kiểm tra khôi phục định kỳ. Binary, database và `.env.local` đều bị gitignore. Không sao chép nóng riêng một file SQLite trong khi server đang ghi.

## Dữ liệu luyện tập

Mỗi tài khoản mở một hồ sơ local riêng trên thiết bị. Hồ sơ offline cũ không tự chuyển cho người vừa đăng nhập. Người dùng có thể xuất JSON ở hồ sơ cũ rồi nhập vào hồ sơ tài khoản.

Nút **Lưu lên máy chủ** lưu một bản backup JSON tối đa 50 MB, gồm nhật ký và ảnh, trong collection `snapshots`. **Khôi phục từ máy chủ** yêu cầu xác nhận trước khi thay dữ liệu thiết bị. Mỗi user chỉ có một snapshot; ghi đè phải xác nhận. Chưa có merge hoặc tự đồng bộ liên tục; dùng một thiết bị làm nguồn trước khi ghi đè từ thiết bị khác. File được bảo vệ bằng quyền owner và token tải có thời hạn. Không dùng user token hoặc endpoint superuser trong frontend.

Đăng xuất chỉ xóa phiên tài khoản; dữ liệu local vẫn tồn tại trên điện thoại dùng chung. Đây chưa phải khóa ứng dụng bằng mật khẩu hoặc mã hóa dữ liệu trên thiết bị.

## Google login

Tạo OAuth Client dạng Web application trong Google Cloud, cấu hình consent screen và test users. Redirect URI cho local: `http://127.0.0.1:8090/api/oauth2-redirect`. Trong PocketBase → Collections → users → Options → OAuth2, bật Google và điền Client ID/Client Secret. Secret chỉ nằm trong backend, không đặt vào biến `VITE_*`.

Nút Google tự khả dụng khi backend công bố provider đã bật. Trên native sử dụng trình duyệt hệ thống; cần kiểm tra thực tế với bộ thông tin OAuth của chủ dự án. Chưa có Client ID/Secret nên chưa thể chứng nhận Google login chạy end-to-end. Xác minh email và khôi phục mật khẩu qua email cần cấu hình SMTP; chưa bật các luồng đó trong UI bản thử.

## Điện thoại và public

`127.0.0.1` trong APK/IPA là điện thoại, không phải PC. Cấu hình hiện tại chỉ phục vụ browser trên PC để kiểm thử. Muốn điện thoại ngoài mạng nhà đăng nhập cần HTTPS trỏ tới PC, cấu hình firewall/proxy, Google redirect URI và build app với URL đó. Không mở admin dashboard thẳng ra Internet. Không phân phối APK/IPA với endpoint localhost rồi coi là đã kết nối tài khoản.

## Kiểm tra

`python scripts/test_accounts.py` dùng database tạm riêng, kiểm tra API thật và dừng server test khi hoàn tất. `npm run build` và `npm run test:smoke` kiểm tra frontend. Google OAuth, email thực, signed iOS và thiết bị vật lý cần kiểm tra thêm trước phát hành.
