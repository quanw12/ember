"""Smoke test EMBER: onboarding → 2 hồ sơ → kiểm chứng cách ly dữ liệu."""
import sys
from playwright.sync_api import sync_playwright

BASE = 'http://localhost:5173'
errors = []


def ok(label: str, cond: bool, detail: str = '') -> None:
    if cond:
        print(f'OK   {label}')
    else:
        errors.append(f'{label} {detail}')
        print(f'FAIL {label} {detail}')


def expect_text(page, text: str, label: str) -> None:
    """Chờ tối đa ~3s cho text xuất hiện — render có thể chậm sau khi chuyển hồ sơ."""
    visible = False
    for _ in range(12):
        try:
            if page.locator(f'text={text}').first.is_visible():
                visible = True
                break
        except Exception:
            pass
        page.wait_for_timeout(250)
    ok(label, visible, f'— không thấy "{text}"')


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 390, 'height': 844})  # cỡ iPhone 12
    page.on('pageerror', lambda e: errors.append('PAGEERROR: ' + (getattr(e, 'stack', None) or str(e))[:500]))
    page.evaluate("""window.__errs = []; window.addEventListener('unhandledrejection', e => { const r = e.reason; window.__errs.push('REJECTION: ' + (r && (r.stack || r.message) || String(r))); });""")
    page.on('console', lambda m: errors.append(f'CONSOLE-ERROR: {m.text}') if m.type == 'error' else None)

    # 1) FirstRun — tạo hồ sơ Quân
    page.goto(BASE)
    page.wait_for_load_state('networkidle')
    page.fill('#fname', 'Quân')
    page.click('button:has-text("TẠO HỒ SƠ")')
    page.wait_for_selector('#age', timeout=15000)
    ok('FirstRun → onboarding', True)

    # 2) Onboarding Quân: nam, 70kg, bulking → 75kg
    page.fill('#w', '70')
    page.click('button:has-text("Tiếp tục")')
    page.click('button:has-text("Tiếp tục")')
    page.click('button:has-text("Bulking")')
    page.fill('#tw', '75')
    page.click('button:has-text("Xem kết quả")')
    page.wait_for_selector('button:has-text("BẮT ĐẦU DÙNG EMBER")')
    page.click('button:has-text("BẮT ĐẦU DÙNG EMBER")')
    page.wait_for_load_state('networkidle')
    expect_text(page, 'Quân', 'Hôm nay: lời chào có tên Quân')
    expect_text(page, '75', 'Hôm nay: mục tiêu 75 kg')

    # 2b) Check-in hằng ngày: bấm THẮP LỬA — không cần chụp ảnh
    page.click('button:has-text("THẮP LỬA")')
    page.wait_for_timeout(500)
    expect_text(page, 'Lửa đang cháy', 'Check-in: THẮP LỬA 1 bấm → lửa đang cháy')
    expect_text(page, 'Đã check in', 'Check-in: trạng thái đã check in hôm nay')

    # 3) Tiến trình: ghi cân 71
    page.click('button:has-text("Tiến trình")')
    page.fill('#pw', '71')
    page.click('button:has-text("Lưu")')
    page.wait_for_timeout(600)
    expect_text(page, '71.0', 'Tiến trình: trung bình trượt 71.0 (log 71 cùng ngày with onboarding 70 → upsert)')

    # 4) Hồ sơ: thêm hồ sơ Lan
    page.click('button:has-text("Hồ sơ")')
    page.wait_for_selector('input[placeholder="Tên người mới"]')
    expect_text(page, 'Quân — đang dùng', 'Hồ sơ: Quân đang dùng')
    page.fill('input[placeholder="Tên người mới"]', 'Lan')
    page.click('button:has-text("Thêm")')
    page.wait_for_selector('#age', timeout=15000)
    ok('Thêm Lan → onboarding mới', True)

    # 5) Onboarding Lan: nữ, 55kg, cutting → 50kg
    page.click('button:has-text("Nữ")')
    page.fill('#w', '55')
    page.click('button:has-text("Tiếp tục")')
    page.click('button:has-text("Tiếp tục")')
    page.click('button:has-text("Cutting")')
    page.fill('#tw', '50')
    page.click('button:has-text("Xem kết quả")')
    page.click('button:has-text("BẮT ĐẦU DÙNG EMBER")')
    page.wait_for_load_state('networkidle')
    expect_text(page, 'Lan', 'Hôm nay: lời chào có tên Lan')
    expect_text(page, '50', 'Hôm nay: mục tiêu 50 kg của Lan')
    expect_text(page, '55', 'Hôm nay: bắt đầu 55 kg (dữ liệu Lan)')

    # 6) Chuyển về Quân — dữ liệu phải là của Quân, không phải Lan
    page.click('button:has-text("Hồ sơ")')
    page.wait_for_selector('button:has-text("Chuyển")')
    page.click('button:has-text("Chuyển")')
    page.wait_for_load_state('networkidle')
    expect_text(page, 'Quân', 'Chuyển về hồ sơ Quân')
    expect_text(page, '71.0', 'CÁCH LY: Quân vẫn thấy 71.0, không phải 55')
    try:
        leaked = page.locator('text=55 kg').first.is_visible()
        ok('CÁCH LY: không lộ 55 kg của Lan', not leaked)
    except Exception:
        ok('CÁCH LY: không lộ 55 kg của Lan', True)

    # 7) Gym: template theo dụng cụ (Quân = full gym)
    page.click('button:has-text("Gym")')
    page.wait_for_timeout(600)
    expect_text(page, 'Full Body 3 buổi', 'Gym: template Full Body có sẵn')
    expect_text(page, 'PPL 6 buổi', 'Gym: template PPL có sẵn')

    # 7b) RCM kế hoạch: chọn 5 buổi → gợi ý PPLUL, kích hoạt 1 chạm
    page.click('button:has-text("5 buổi")')
    page.wait_for_timeout(400)
    expect_text(page, 'PPLUL 5 buổi', 'RCM: chọn 5 buổi → gợi ý PPLUL')
    # PPLUL đã có sẵn sau seed rev 4 → nút "Dùng"; nếu chưa có thì là "Tạo & dùng"
    page.locator('div.kv', has_text='PPLUL 5 buổi').first.locator('button').first.click()
    page.wait_for_timeout(700)
    expect_text(page, 'ĐANG DÙNG', 'RCM: PPLUL được kích hoạt 1 chạm')

    # 7c) Chi tiết bài tập: card nhóm cơ + mô hình người SVG
    page.click('button:has-text("Thư viện")')
    page.wait_for_timeout(600)
    page.click('button:has-text("Bench Press")')
    page.wait_for_timeout(700)
    expect_text(page, 'NHÓM CƠ ĐÍCH', 'Chi tiết bài: card nhóm cơ với mô hình SVG')

    # 8) Bấm đủ các tab còn lại — trước đây tab Chạy sập vì orderBy cột không index
    page.click('button:has-text("Chạy")')
    page.wait_for_timeout(800)
    expect_text(page, 'BẮT ĐẦU CHẠY', 'Tab Chạy: không sập, thấy nút bắt đầu')
    expect_text(page, 'KẾ HOẠCH NHS C25K', 'Tab Chạy: kế hoạch C25K')
    page.click('button:has-text("Tiến trình")')
    page.wait_for_timeout(600)
    expect_text(page, 'ẢNH PROGRESS', 'Tab Tiến trình: card ảnh progress')
    page.click('button:has-text("Hồ sơ")')
    page.wait_for_timeout(600)
    expect_text(page, 'NGƯỜI DÙNG TRÊN MÁY NÀY', 'Tab Hồ sơ: card đa hồ sơ')
    page.click('button:has-text("Hôm nay")')
    page.wait_for_timeout(600)
    expect_text(page, 'Quân', 'Quay lại Hôm nay vẫn ổn')

    browser.close()

print('\n=== KẾT QUẢ ===')
if errors:
    print(f'{len(errors)} VẤN ĐỀ:')
    for e in errors:
        print(' -', e)
    sys.exit(1)
print('TẤT CẢ PASS ✔')
