# Quy ước Git

- `main`: phiên bản tích hợp, phát hành qua quy trình review/CI.
- `feature/<ten-tinh-nang>`: tính năng mới, ví dụ `feature/auth-local`.
- `fix/<ten-loi>`: sửa lỗi trong quá trình phát triển.
- `hotfix/<ten-loi>`: sửa lỗi khẩn cấp trên phiên bản đã phát hành; tách từ phiên bản đang chạy và đưa bản sửa trở lại các nhánh liên quan.
- `release/<phien-ban>`: ổn định và chuẩn bị một phiên bản, ví dụ `release/0.3.0-beta.1`.
- `docs/<noi-dung>`, `ci/<noi-dung>`, `chore/<noi-dung>`: tài liệu, pipeline và bảo trì.

Dùng chữ thường, dấu gạch nối; mỗi nhiệm vụ có commit riêng theo Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`, `ci:`, `chore:`). Push nhánh và mở PR để review, kiểm tra CI trước khi merge. Nhánh phụ thuộc dùng PR xếp tầng với base là nhánh chứa phần phụ thuộc; khi base đã merge cần cập nhật base PR tiếp theo về main.

`feature/android-prototype`, `feature/ios-sideload` và `feature/auth-local` đã merge vào main. Các nhánh đó không tự phát hành bản production. CI kiểm tra các prefix ở trên và mọi pull request.

Ngày 2026-11-03 đã đổi toàn bộ nhánh `feat/*` thành `feature/*`, ba nhánh native/auth sang `feature/*` và nhánh chuẩn bị beta sang `release/0.3.0-beta.1`. Nhánh chính, các nhánh `fix/*`, `ci/*`, `chore/*` giữ nguyên tên. Khi cập nhật clone khác: `git branch -m <ten-cu> <ten-moi>`, `git fetch origin --prune`, rồi `git branch -u origin/<ten-moi> <ten-moi>`.
