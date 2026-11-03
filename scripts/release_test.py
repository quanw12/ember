"""Production checks on Chromium/Android and WebKit/iPhone sized browsers.

These are browser simulations; physical iPhone/Android QA is still required.
Run with npm run test:release after npm run build.
"""
import json
import os
import urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = 'http://127.0.0.1:4173/ember/'
OUT = Path('output/playwright')
OUT.mkdir(parents=True, exist_ok=True)
PNG = Path('public/icon-192.png').read_bytes()
MOCK_GPS = """() => {
  window.__rejections = [];
  window.__clicks = [];
  document.addEventListener('click', e => window.__clicks.push(e.target.closest('button')?.textContent || e.target.tagName), true);
  window.addEventListener('unhandledrejection', e => window.__rejections.push(String(e.reason)));
  Object.defineProperty(navigator, 'geolocation', { value: {
    watchPosition: callback => { window.__gps = callback; return 1 },
    clearWatch: () => { window.__gps = null }
  }});
}"""


def nav(page, label):
    page.locator('.tab').filter(has_text=label).click()


def export(page):
    nav(page, 'Hồ sơ')
    with page.expect_download() as download:
        page.get_by_role('button', name='Xuất backup JSON', exact=True).click()
    return Path(download.value.path()).read_bytes()


def gps(page, lat, stamp):
    page.evaluate("""([latitude, timestamp]) => window.__gps({ timestamp, coords: {
      latitude, longitude: 106.7, accuracy: 5
    } })""", [lat, stamp])


def origin_offline(offline):
    request = urllib.request.Request('http://127.0.0.1:4173/_test/network', data=b'offline' if offline else b'online', method='POST')
    with urllib.request.urlopen(request) as response:
        assert response.status == 204


def run(engine, name):
    browser = engine.launch(headless=True)
    context = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=1,
                                  reduced_motion='reduce', timezone_id='Asia/Ho_Chi_Minh')
    context.add_init_script('(' + MOCK_GPS + ')()')
    # Network fixtures keep map/image servers out of functional assertions.
    context.route('https://tile.openstreetmap.org/**', lambda route: route.fulfill(content_type='image/png', body=PNG))
    context.route('https://cdn.jsdelivr.net/**', lambda route: route.fulfill(content_type='image/png', body=PNG))
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('console', lambda message: print(f'{name} CONSOLE ERROR: {message.text}', flush=True) if message.type == 'error' else None)
    page.goto(BASE)
    expect(page.locator('#fname')).to_be_visible()
    page.screenshot(path=str(OUT / f'{name}-welcome.png'), full_page=True)
    page.fill('#fname', 'Minh')
    page.get_by_role('button', name='TẠO HỒ SƠ', exact=True).click()
    page.fill('#w', '70')
    page.get_by_role('button', name='Tiếp tục', exact=True).click()
    page.get_by_role('button', name='Tiếp tục', exact=True).click()
    page.get_by_role('button', name='Bulking', exact=False).click()
    page.fill('#tw', '75')
    page.get_by_role('button', name='Xem kết quả', exact=True).click()
    page.get_by_role('button', name='Bắt đầu dùng EMBER', exact=True).click()
    try:
        expect(page.locator('.today-heading')).to_contain_text('Minh', timeout=15000)
    except AssertionError:
        print('ONBOARDING DEBUG', name, errors, page.evaluate('({rejections: window.__rejections, clicks: window.__clicks})'), flush=True)
        raise
    page.get_by_role('button', name='THẮP LỬA', exact=True).click()
    try:
        expect(page.locator('.hero-complete')).to_contain_text('Đã check in', timeout=15000)
    except AssertionError:
        print('CHECK-IN DEBUG', name, errors, page.evaluate('({rejections: window.__rejections, clicks: window.__clicks})'), flush=True)
        print(page.evaluate("""() => new Promise(resolve => {
          const request = indexedDB.open('ember-' + localStorage.getItem('emberActive'));
          request.onsuccess = () => { const db = request.result; const q = db.transaction('checkins').objectStore('checkins').getAll(); q.onsuccess = () => { resolve(q.result); db.close() } };
        })"""))
        page.screenshot(path=str(OUT / f'{name}-failed-checkin.png'), full_page=True)
        raise
    for width in [320, 390, 768, 1440]:
        page.set_viewport_size({'width': width, 'height': 900})
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), f'{name}: overflow at {width}px'
        if width in [390, 1440]:
            page.screenshot(path=str(OUT / f'{name}-today-{width}.png'), full_page=True)
    page.set_viewport_size({'width': 390, 'height': 844})
    page.fill('#sleep', '-1')
    page.get_by_role('button', name='Lưu nhật ký hôm nay').click()
    expect(page.get_by_role('status').filter(has_text='Kiểm tra lại')).to_be_visible()
    page.fill('#sleep', '7.5')
    page.get_by_role('button', name='Lưu nhật ký hôm nay').click()
    expect(page.get_by_role('status').filter(has_text='Đã lưu nhật ký')).to_be_visible()

    # A real Blob must survive the export -> file -> restore boundary.
    nav(page, 'Tiến trình')
    page.locator('section[aria-label="Tiến trình"] input[type=file]').set_input_files({'name': 'progress.png', 'mimeType': 'image/png', 'buffer': PNG})
    expect(page.locator('section[aria-label="Tiến trình"] img').first).to_be_visible()
    data = export(page)
    backup = json.loads(data)
    assert backup['version'] == 1
    assert backup['tables']['photos'][0]['blob']['data']['$ember'] == 'bytes'
    assert backup['tables']['profile'][0]['createdAt']['$ember'] == 'date'
    page.locator('.backup-import input').set_input_files({'name': 'bad.json', 'mimeType': 'application/json', 'buffer': b'{}'})
    expect(page.get_by_role('status').filter(has_text='Backup cần có')).to_be_visible()
    assert json.loads(export(page))['tables'] == backup['tables'], 'invalid backup changed data'
    nav(page, 'Tiến trình')
    page.fill('#pw', '72')
    page.locator('button:has-text("Lưu"):visible').click()
    nav(page, 'Hồ sơ')
    page.once('dialog', lambda dialog: dialog.accept())
    page.locator('.backup-import input').set_input_files({'name': 'backup.json', 'mimeType': 'application/json', 'buffer': data})
    expect(page.locator('.today-heading')).to_be_visible(timeout=30000)
    restored = json.loads(export(page))
    assert restored['tables'] == backup['tables'], 'backup round trip changed rows, dates or photos'
    print(f'PASS {name}: onboarding, layout 320–1440, input validation, backup blobs/dates and invalid restore')

    # Record the first GPS fix, ignore paused movement and retain a run across tabs/reload.
    nav(page, 'Chạy')
    page.get_by_role('button', name='BẮT ĐẦU CHẠY', exact=True).click()
    expect(page.get_by_role('button', name='TẠM DỪNG', exact=True)).to_be_visible()
    stamp = page.evaluate('Date.now()')
    gps(page, 10.77, stamp)
    gps(page, 10.7703, stamp + 10000)
    page.get_by_role('button', name='TẠM DỪNG', exact=True).click()
    gps(page, 10.79, stamp + 20000)
    nav(page, 'Hôm nay')
    expect(page.locator('.tab').filter(has_text='Hồ sơ')).to_be_disabled()
    nav(page, 'Chạy')
    expect(page.get_by_role('button', name='TIẾP TỤC', exact=True)).to_be_visible()
    page.get_by_role('button', name='TIẾP TỤC', exact=True).click()
    gps(page, 10.79, stamp + 30000)
    gps(page, 10.7903, stamp + 40000)
    page.get_by_role('button', name='TẠM DỪNG', exact=True).click()
    page.wait_for_timeout(5500)
    page.once('dialog', lambda dialog: dialog.accept())
    page.reload()
    expect(page.locator('.today-heading')).to_be_visible()
    nav(page, 'Chạy')
    page.get_by_role('button', name='Khôi phục buổi chạy', exact=True).click()
    expect(page.get_by_role('button', name='TIẾP TỤC', exact=True)).to_be_visible()
    page.get_by_role('button', name='KẾT THÚC & LƯU', exact=True).click()
    expect(page.get_by_role('button', name='BẮT ĐẦU CHẠY', exact=True)).to_be_visible()
    saved = json.loads(export(page))['tables']
    assert len(saved['runs']) == 1
    assert len(saved['runs'][0]['points']) == 4, 'first GPS fix missing or paused GPS was recorded'
    assert saved['runs'][0]['segmentStarts'] == [0, 2], 'paused route was bridged'
    assert .06 <= saved['runs'][0]['distanceKm'] <= .08, 'paused distance was counted'
    assert not any(row['key'] == 'runDraft' for row in saved['settings'])
    print(f'PASS {name}: GPS first fix, pause, tab preservation, draft reload/recovery, atomic run save')
    nav(page, 'Chạy')
    page.locator('section[aria-label="Chạy"] button.kv').first.click()
    expect(page.locator('[aria-label="Lộ trình buổi chạy"].leaflet-container')).to_be_visible()
    # One route plus start/end circle markers.
    expect(page.locator('[aria-label="Lộ trình buổi chạy"] .leaflet-overlay-pane path')).to_have_count(3)

    # Offline must work with the production service worker on the /ember/ subpath.
    page.evaluate('navigator.serviceWorker.ready.then(() => true)')
    page.wait_for_function('navigator.serviceWorker.controller !== null')
    assert not [error for error in errors if 'tile.openstreetmap.org/' not in error], errors
    # A real origin outage also covers WebKit: setOffline rejects even literal
    # service-worker responses in Playwright (upstream issue #42775).
    origin_offline(True)
    if name == 'chromium':
        context.route('**/*', lambda route: route.abort())
        context.set_offline(True)
        expect(page.locator('.connection')).to_contain_text('Ngoại tuyến')
    page.reload()
    expect(page.locator('.today-heading')).to_be_visible()
    if name == 'chromium':
        context.set_offline(False)
        context.set_offline(True)
        expect(page.locator('.connection')).to_contain_text('Ngoại tuyến')
    assert page.evaluate("fetch('uncached-network-probe').then(() => false, () => true)"), 'network was not blocked'
    nav(page, 'Chạy')
    expect(page.get_by_role('button', name='BẮT ĐẦU CHẠY', exact=True)).to_be_visible()
    nav(page, 'Hồ sơ')
    expect(page.get_by_role('button', name='Xuất backup JSON', exact=True)).to_be_visible()
    errors.extend(page.evaluate('window.__rejections'))
    # Uncached map tiles are explicitly network-dependent in the product. WebKit
    # reports their expected SW fetch failures as page errors during the outage.
    unexpected = [error for error in errors if 'tile.openstreetmap.org/' not in error]
    assert not unexpected, unexpected
    origin_offline(False)
    print(f'PASS {name}: production service worker, offline reload and lazy views under /ember/')
    context.close()
    browser.close()


with sync_playwright() as p:
    for name in os.environ.get('EMBER_BROWSERS', 'chromium,webkit').split(','):
        run(getattr(p, name), name)
print('ALL PRODUCTION RELEASE CHECKS PASSED')
