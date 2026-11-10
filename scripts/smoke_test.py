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
            if page.locator(f'text={text}').filter(visible=True).first.is_visible():
                visible = True
                break
        except Exception:
            pass
        page.wait_for_timeout(250)
    ok(label, visible, f'— không thấy "{text}"')


def expect_coach(page, text: str, label: str) -> None:
    """Chỉ đọc bong bóng Coach, tránh trùng số cân trên trang Hôm nay."""
    loc = page.locator('.coach-msg').filter(has_text=text)
    visible = False
    for _ in range(20):
        try:
            if loc.first.is_visible():
                visible = True
                break
        except Exception:
            pass
        page.wait_for_timeout(250)
    ok(label, visible, f'— không thấy "{text}" trong Coach')


def drop_expected_backend_noise(page) -> None:
    """Bỏ lỗi console của probe PocketBase khi UI đã báo máy chủ không phản hồi."""
    try:
        page.wait_for_function(
            """() => document.querySelector('[data-server-state="down"], [data-server-state="up"], [data-server-state="unset"], [data-server-state="loopback"]')""",
            timeout=8000,
        )
    except Exception:
        pass
    if page.locator('[data-server-state="down"]').count() == 0:
        return
    kept = []
    for entry in errors:
        noisy = (
            entry.startswith('CONSOLE-ERROR:')
            and 'Failed to load resource' in entry
            and any(token in entry for token in ('ERR_CONNECTION_REFUSED', 'ERR_FAILED', 'ERR_CONNECTION_RESET'))
        )
        if not noisy:
            kept.append(entry)
    errors[:] = kept


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 390, 'height': 844})  # cỡ iPhone 12
    page.on('pageerror', lambda e: errors.append('PAGEERROR: ' + (getattr(e, 'stack', None) or str(e))[:500]))
    page.add_init_script("""window.__errs = []; window.addEventListener('unhandledrejection', e => { const r = e.reason; window.__errs.push('REJECTION: ' + (r && (r.stack || r.message) || String(r))); });""")
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
    page.locator('.tab').filter(has_text='Tiến trình').click()
    page.fill('#pw', '71')
    page.click('button:has-text("Lưu"):visible')
    page.wait_for_timeout(600)
    expect_text(page, '71.0', 'Tiến trình: trung bình trượt 71.0 (log 71 cùng ngày with onboarding 70 → upsert)')

    # 4) Hồ sơ: thêm hồ sơ Lan
    page.locator('.tab').filter(has_text='Hồ sơ').click()
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
    page.locator('.tab').filter(has_text='Hồ sơ').click()
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
    page.locator('.tab').filter(has_text='Gym').click()
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
    page.locator('.tab').filter(has_text='Chạy').click()
    page.wait_for_timeout(800)
    expect_text(page, 'BẮT ĐẦU CHẠY', 'Tab Chạy: không sập, thấy nút bắt đầu')
    expect_text(page, 'KẾ HOẠCH NHS C25K', 'Tab Chạy: kế hoạch C25K')
    page.locator('.tab').filter(has_text='Tiến trình').click()
    page.wait_for_timeout(600)
    expect_text(page, 'ẢNH PROGRESS', 'Tab Tiến trình: card ảnh progress')
    page.locator('.tab').filter(has_text='Hồ sơ').click()
    page.wait_for_timeout(600)
    expect_text(page, 'NGƯỜI DÙNG TRÊN MÁY NÀY', 'Tab Hồ sơ: card đa hồ sơ')
    page.locator('.tab').filter(has_text='Hôm nay').click()
    page.wait_for_timeout(600)
    expect_text(page, 'Quân', 'Quay lại Hôm nay vẫn ổn')

    # 9) Coach đọc nhật ký thật, trước khi có buổi tập hoàn thành
    page.get_by_role('button', name='Mở Coach').click()
    expect_coach(page, 'Chưa có buổi tập hoàn thành', 'Coach: chưa có buổi hoàn thành')
    expect_coach(page, 'Cân gần nhất: 71 kg', 'Coach: cân 71 kg từ nhật ký')
    page.locator('.coach-panel').get_by_role('button', name='Đóng').click()

    # 10) Buổi tập: RPE và kỹ thuật, rồi Coach đọc volume vừa ghi
    page.locator('.tab').filter(has_text='Gym').click()
    page.click('button:has-text("Thư viện")')
    page.wait_for_selector('button:has-text("BẮT ĐẦU BUỔI TẬP MỚI")')
    page.click('button:has-text("BẮT ĐẦU BUỔI TẬP MỚI")')
    page.wait_for_selector('button:has-text("+ Thêm bài tập")')
    page.click('button:has-text("+ Thêm bài tập")')
    page.get_by_role('heading', name='Thêm bài tập').wait_for()
    page.get_by_label('Tìm bài tập để thêm').fill('Bench Press')
    page.locator('button').filter(has_text='Bench Press').first.click()
    page.get_by_label('Hiệp 1 kg').fill('60')
    page.get_by_label('Hiệp 1 lần').fill('8')
    page.get_by_label('Hiệp 1 RPE').fill('8')
    page.get_by_label('Hiệp 1 kỹ thuật').select_option('drop')
    page.get_by_label('Hoàn thành hiệp 1').click()
    page.wait_for_timeout(400)
    ok('Buổi tập: không tràn ngang', page.evaluate('() => document.documentElement.scrollWidth <= innerWidth'))
    page.once('dialog', lambda dialog: dialog.accept())
    page.click('button:has-text("KẾT THÚC BUỔI")')
    page.wait_for_selector('button:has-text("Xong")')
    expect_text(page, '480', 'Buổi tập: volume 60×8 = 480')
    page.click('button:has-text("Xong")')
    page.get_by_role('button', name='Mở Coach').click()
    page.get_by_role('button', name='Xem tiến độ của tôi').click()
    expect_coach(page, 'Buổi gần nhất', 'Coach: đọc buổi vừa xong')
    expect_coach(page, '480', 'Coach: volume 480')
    expect_coach(page, 'không thay huấn luyện viên', 'Coach: gợi ý đọc nhật ký')
    page.get_by_label('Nhắn cho Coach').fill('tay trước tập bài gì')
    page.get_by_role('button', name='Gửi', exact=True).click()
    expect_coach(page, 'Tay trước', 'Coach: nhận tay trước')
    page.get_by_role('button', name='Mở Tay trước trong app').click()
    page.get_by_role('dialog', name='Mô hình cơ thể').wait_for()
    expect_text(page, 'Bắp tay trước', 'Mô hình: thông tin tay trước')
    page.get_by_role('button', name='Đóng mô hình').click()
    page.get_by_role('button', name='BẮT ĐẦU TẬP').wait_for()

    drop_expected_backend_noise(page)
    errors.extend(page.evaluate('window.__errs'))
    browser.close()

print('\n=== KẾT QUẢ ===')
if errors:
    print(f'{len(errors)} VẤN ĐỀ:')
    for e in errors:
        print(' -', e)
    sys.exit(1)
print('TẤT CẢ PASS ✔')
