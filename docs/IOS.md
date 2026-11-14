# IPA để người dùng tự ký

Bản iOS đã nằm trên `main`. Build bằng macOS/Xcode trên GitHub Actions, tạo app cho thiết bị iOS rồi đóng gói `Payload/App.app` vào `ember-ios-unsigned.ipa`. Không chứa chứng chỉ, tài khoản Apple hoặc provisioning profile. File chưa ký không cài trực tiếp; người dùng cần công cụ sideload và Apple Account của chính mình. Personal Team miễn phí cần tái ký/cài lại theo chu kỳ bảy ngày. Không đưa mật khẩu Apple vào repo hay gửi cho người phát triển. Không build IPA trên Windows. `Info.plist` bật `NSAllowsLocalNetworking` để iPhone gọi PocketBase bằng HTTP trong cùng Wi-Fi. Trong app, nhập IP máy tính hoặc `https://` của máy chủ. `127.0.0.1` trên iPhone là chính iPhone. Bản này chưa được cài và kiểm tra trên iPhone vật lý.

Trước khi tái ký hoặc gỡ app, xuất backup JSON. Việc giữ lại dữ liệu phụ thuộc công cụ ký, bundle ID và cách cài; không bảo đảm dữ liệu sống qua thao tác gỡ cài đặt. Bản này chưa có kiểm chứng trên iPhone vật lý; cần thử GPS foreground, Files, nhập/xuất ảnh, offline và vùng tai thỏ. Không hỗ trợ GPS nền.

Build trên Mac: `npm ci`, `npm run build`, `npx cap sync ios`, sau đó chạy lệnh `xcodebuild` và đóng gói trong `.github/workflows/ios-sideload.yml`. Không build iOS bằng Windows.
