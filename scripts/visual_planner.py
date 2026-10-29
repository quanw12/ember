"""Kiểm tra trực quan WeeklyPlanner: onboarding nhanh → planner 3 bước → screenshot từng bước."""
import sys
from playwright.sync_api import sync_playwright

BASE = 'http://localhost:5173'
OUT = sys.argv[1] if len(sys.argv) > 1 else '.'

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 390, 'height': 844})
    page.on('pageerror', lambda e: print('PAGEERROR:', str(e)[:300]))

    # Onboarding nhanh (nam, 70kg, bulking → 75)
    page.goto(BASE)
    page.wait_for_load_state('networkidle')
    page.fill('#fname', 'Quân')
    page.click('button:has-text("TẠO HỒ SƠ")')
    page.wait_for_selector('#age', timeout=15000)
    page.fill('#w', '70')
    page.click('button:has-text("Tiếp tục")')
    page.click('button:has-text("Tiếp tục")')
    page.click('button:has-text("Bulking")')
    page.fill('#tw', '75')
    page.click('button:has-text("Xem kết quả")')
    page.wait_for_selector('button:has-text("BẮT ĐẦU DÙNG EMBER")')
    page.click('button:has-text("BẮT ĐẦU DÙNG EMBER")')
    page.wait_for_load_state('networkidle')

    # Vào Gym → Kế hoạch → Lập lịch tuần
    page.click('button:has-text("Gym")')
    page.wait_for_timeout(600)
    page.click('button:has-text("LẬP LỊCH TUẦN MỚI")')
    page.wait_for_timeout(600)
    page.screenshot(path=f'{OUT}/wp-step1.png', full_page=True)

    # Bước 1: chọn T2, T4 + nút split gợi ý
    page.click('button.wp-daytab:has-text("T2")')
    page.click('button.wp-daytab:has-text("T4")')
    page.screenshot(path=f'{OUT}/wp-step1b.png', full_page=True)

    # Tiếp tục → bước 2: bấm khối cơ trên hình trước (ngực = path đầu với aria-label Ngực)
    page.click('button:has-text("TIẾP TỤC — CHỌN NHÓM CƠ")')
    page.wait_for_timeout(500)
    page.click('[aria-label^="Ngực ("]')
    page.click('[aria-label^="Tay trước ("]')
    page.wait_for_timeout(400)
    page.screenshot(path=f'{OUT}/wp-step2.png', full_page=True)
    # preview sau khi bấm
    print('preview visible:', page.locator('text=bài gợi ý').first.is_visible())

    # ngày T4 cũng cần nhóm cơ → chuyển tab ngày trong card dưới rồi bấm cơ
    page.locator('.wp-daytab:has-text("T4")').click()
    page.wait_for_timeout(300)
    page.click('[aria-label^="Lưng xà (cánh)"]')
    page.click('[aria-label^="Tay sau ("]')
    page.wait_for_timeout(300)
    page.screenshot(path=f'{OUT}/wp-step2b.png', full_page=True)

    # sang bước 3
    page.click('button:has-text("TIẾP TỤC — CHỌN BÀI TẬP")')
    page.wait_for_timeout(500)
    page.screenshot(path=f'{OUT}/wp-step3.png', full_page=True)

    # chọn 2 bài đầu gợi ý ngực (nếu có)
    rows = page.locator('button.wp-pickrow')
    n = min(2, rows.count())
    for i in range(n):
        rows.nth(i).click()
        page.wait_for_timeout(200)
    # chuyển sang ngày T4 (tab thứ 2) chọn 1 bài
    tabs = page.locator('.wp-daytab')
    if tabs.count() > 1:
        tabs.nth(1).click()
        page.wait_for_timeout(400)
        r2 = page.locator('button.wp-pickrow')
        if r2.count() > 0:
            r2.first.click()
            page.wait_for_timeout(200)
    page.screenshot(path=f'{OUT}/wp-step3b.png', full_page=True)

    # Lưu
    save = page.locator('button:has-text("LƯU KẾ HOẠCH TUẦN")')
    if save.is_enabled():
        save.click()
        page.wait_for_timeout(800)
        page.screenshot(path=f'{OUT}/wp-saved.png', full_page=True)
        print('saved OK — đã quay lại Kế hoạch:', page.locator('text=LẬP LỊCH TUẦN MỚI').first.is_visible())
    else:
        print('save DISABLED — canSave=false')

    browser.close()
    print('DONE')
