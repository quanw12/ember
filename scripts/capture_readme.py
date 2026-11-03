"""Capture the real UI in an isolated browser using fictional demonstration data.

Run from the repo root:
python scripts/with_server.py --server "npm run dev -- --port 5173 --strictPort" --port 5173 -- python scripts/capture_readme.py
Requires requirements-test.txt and Playwright Chromium. No personal profile is read.
"""
from datetime import datetime, timedelta, timezone
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

OUT = Path('docs/screenshots')
OUT.mkdir(parents=True, exist_ok=True)
DEMO_TIME = datetime(2026, 11, 3, 18, 20, tzinfo=timezone(timedelta(hours=7)))

SEED_DEMO = """async () => {
  const { db } = await import('/src/db.ts');
  const day = (ago) => { const d = new Date(); d.setDate(d.getDate() - ago); return d };
  const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const weights = [70,70.2,70.1,70.4,70.3,70.5,70.7,70.6,70.8,71,70.9,71.2,71.1,71.3];
  await db.bodyLogs.clear();
  await db.bodyLogs.bulkAdd(weights.map((weightKg,i) => ({ date: iso(day(13-i)), weightKg })));
  await db.checkins.bulkAdd(Array.from({length:6},(_,i)=>({date:iso(day(i)),ts:day(i)})));
  const slugs = ['bench-press','barbell-row','back-squat','plank'];
  const planId = await db.routines.add({name:'Full Body · 3 buổi',source:'custom',createdAt:day(14),days:[2,4,6].map(weekday=>({weekday,slugs}))});
  await db.settings.put({key:'activeRoutineId',value:planId});
  await db.settings.put({key:'weeklyPlannedOn',value:iso(day(1))});
  await db.settings.put({key:'c25kDone',value:6});
  for (const ago of [1,3,6]) {
    const startedAt = day(ago); startedAt.setHours(18,0,0,0);
    const sessionId = await db.sessions.add({date:iso(startedAt),startedAt,endedAt:new Date(+startedAt+48*60000),name:'Full Body',slugs});
    await db.sets.bulkAdd(slugs.slice(0,3).flatMap((exerciseSlug,j)=>[1,2,3].map(idx=>({sessionId,exerciseSlug,idx,kg:[50,45,60][j],reps:10,done:true,ts:startedAt}))));
  }
  for (const [ago,distanceKm,durationSec] of [[0,4.2,1620],[2,2.8,1140],[8,3.5,1380]]) {
    const startedAt=day(ago); startedAt.setHours(6,30,0,0);
    await db.runs.add({date:iso(startedAt),startedAt,endedAt:new Date(+startedAt+durationSec*1000),points:[],distanceKm,durationSec});
  }
  await db.nutritionLogs.bulkAdd(Array.from({length:7},(_,i)=>({date:iso(day(6-i)),kcal:[2450,2580,2490,2640,2550,2610,2530][i],proteinG:[128,135,122,140,130,136,132][i]})));
  await db.sleepLogs.bulkAdd(Array.from({length:7},(_,i)=>({date:iso(day(6-i)),hours:[7,7.5,8,7,7.5,8,7.5][i]})));
}"""


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width':390,'height':960}, device_scale_factor=1,
                                  reduced_motion='reduce', timezone_id='Asia/Ho_Chi_Minh')
    page = context.new_page()
    page.clock.set_fixed_time(DEMO_TIME)
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))

    def capture(name, full=False):
        page.evaluate('document.fonts.ready')
        page.evaluate('window.scrollTo(0,0)')
        page.wait_for_timeout(350)
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), name
        page.screenshot(path=str(OUT / name), full_page=full, animations='disabled')
        print('CAPTURED', name, flush=True)

    def nav(label):
        page.locator('.tab').filter(has_text=label).click()

    page.goto('http://localhost:5173')
    expect(page.locator('#fname')).to_be_visible()
    capture('08-welcome-mobile.png')
    page.fill('#fname','Minh')
    page.get_by_role('button',name='TẠO HỒ SƠ',exact=True).click()
    page.fill('#age','27')
    page.fill('#h','174')
    page.fill('#w','70')
    page.get_by_role('button',name='Tiếp tục',exact=True).click()
    page.get_by_role('button',name='Tiếp tục',exact=True).click()
    page.get_by_role('button',name='Bulking',exact=False).click()
    page.fill('#tw','75')
    page.get_by_role('button',name='Xem kết quả',exact=True).click()
    page.get_by_role('button',name='Bắt đầu dùng EMBER',exact=True).click()
    expect(page.locator('.today-heading')).to_contain_text('Minh')
    page.wait_for_function("async () => (await (await import('/src/db.ts')).db.exercises.count()) > 500")
    page.evaluate(SEED_DEMO)
    expect(page.locator('.hero-complete')).to_contain_text('Đã check in')
    expect(page.locator('.streak').filter(has_text='7 ngày giữ lửa')).to_be_visible()
    capture('02-today-mobile.png')
    page.set_viewport_size({'width':1440,'height':1080})
    capture('01-today-desktop.png', full=True)
    page.set_viewport_size({'width':390,'height':960})

    nav('Tiến trình')
    expect(page.get_by_text('Trung bình trượt 7 ngày',exact=True)).to_be_visible()
    expect(page.locator('section[aria-label="Tiến trình"] svg').first).to_be_visible()
    capture('05-progress-mobile.png')
    nav('Chạy')
    expect(page.get_by_role('button',name='BẮT ĐẦU CHẠY',exact=True)).to_be_visible()
    capture('06-run-mobile.png')

    nav('Gym')
    page.get_by_role('button',name='LẬP LỊCH TUẦN MỚI',exact=False).click()
    page.locator('button.wp-daytab').filter(has_text='T2').click()
    page.locator('button.wp-daytab').filter(has_text='T4').click()
    page.get_by_role('button',name='TIẾP TỤC — CHỌN NHÓM CƠ',exact=True).click()
    page.locator('[aria-label^="Ngực ("]').first.click()
    page.locator('[aria-label^="Tay trước ("]').first.click()
    capture('03-planner-mobile.png')

    page.get_by_role('button',name='Thư viện',exact=True).click()
    page.get_by_role('button',name='Bench Press',exact=False).first.click()
    expect(page.get_by_role('heading',name='Barbell Bench Press',exact=True)).to_be_visible()
    # Only the shipped local animation is displayed; no external demo image is injected.
    page.locator('img[alt^="Động tác minh họa"]').wait_for(state='visible')
    capture('07-exercise-mobile.png')
    nav('Hôm nay')
    page.get_by_role('button',name='BẮT ĐẦU TẬP',exact=True).click()
    expect(page.get_by_role('button',name='KẾT THÚC BUỔI',exact=True)).to_be_visible()
    capture('04-session-mobile.png')
    assert not errors, errors
    browser.close()
print('All README screenshots captured from the real app using demo data.')
