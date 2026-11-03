"""Real browser registration and account snapshot against a temporary local server."""
import secrets
from playwright.sync_api import sync_playwright, expect

with sync_playwright() as p:
    b=p.chromium.launch(headless=True)
    page=b.new_page(viewport={'width':390,'height':900})
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    email='ui-'+secrets.token_hex(5)+'@example.test'
    page.goto('http://localhost:5173')
    page.get_by_role('button',name='Đăng ký',exact=True).click()
    page.fill('#account-name','Account demo')
    page.fill('#account-email',email)
    page.fill('#account-password','Demo-password-12345')
    page.get_by_role('button',name='Tạo tài khoản',exact=True).click()
    page.wait_for_selector('#age')
    page.fill('#w','70')
    for name in ['Tiếp tục','Tiếp tục','Xem kết quả','Bắt đầu dùng EMBER']:
        page.get_by_role('button',name=name,exact=True).click()
    page.locator('.tab').filter(has_text='Hồ sơ').click()
    expect(page.get_by_text('Đã đăng nhập: '+email,exact=True)).to_be_visible()
    page.get_by_role('button',name='Lưu lên máy chủ',exact=True).click()
    expect(page.get_by_role('status').filter(has_text='Đã lưu bản sao')).to_be_visible(timeout=15000)
    page.get_by_role('button',name='Đăng xuất',exact=True).click()
    expect(page.locator('#account-email')).to_be_visible()
    page.fill('#account-email',email)
    page.fill('#account-password','Demo-password-12345')
    page.get_by_role('button',name='Đăng nhập email',exact=True).click()
    expect(page.locator('.today-heading')).to_be_visible()
    page.locator('.tab').filter(has_text='Hồ sơ').click()
    page.once('dialog',lambda d:d.accept())
    page.get_by_role('button',name='Khôi phục từ máy chủ',exact=True).click()
    expect(page.locator('.today-heading')).to_be_visible(timeout=15000)
    assert not errors, errors
    print('PASS: browser registration, account profile, private snapshot upload, logout, login and restore.')
    b.close()
