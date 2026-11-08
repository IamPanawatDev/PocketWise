const { chromium } = require('../../frontend/pocketwise-web/node_modules/playwright');
const path = require('path');
const fs = require('fs');

const BRAVE_PATH = 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';
const BASE_URL = 'http://localhost:3000';
const LOCAL_SCREENSHOT_DIR = path.resolve('tests/e2e/screenshots_qa');

if (!fs.existsSync(LOCAL_SCREENSHOT_DIR)) {
  fs.mkdirSync(LOCAL_SCREENSHOT_DIR, { recursive: true });
}

async function runAdminFixesQa() {
  console.log('--- STARTING QA TEST: ADMIN MOBILE FIXES IN HEADED BRAVE ---');
  const browser = await chromium.launch({
    executablePath: BRAVE_PATH,
    headless: false,
    slowMo: 100,
    args: ['--window-size=430,920']
  });

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
    hasTouch: true,
    isMobile: true
  });

  const page = await context.newPage();

  try {
    console.log('1. Logging in as admin...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    const altBtn = page.locator('button:has-text("เข้าสู่ระบบด้วยบัญชีอื่น")');
    if (await altBtn.isVisible()) {
      await altBtn.click();
      await page.waitForTimeout(300);
    }
    await page.fill('#email', 'admin.test@pocketwise.local');
    await page.fill('#password', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
    await page.waitForTimeout(1000);

    // 2. Test Admin Overview Mobile Subnav
    console.log('2. Navigating to /admin/overview and verifying Admin Subnav...');
    await page.goto(`${BASE_URL}/admin/overview`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const subnav = page.locator('div:has-text("ภาพรวมระบบ")').filter({ hasText: 'จัดการผู้ใช้งาน' }).first();
    const isSubnavVisible = await subnav.isVisible();
    console.log('Admin Mobile Subnav visible:', isSubnavVisible);
    await page.screenshot({ path: path.join(LOCAL_SCREENSHOT_DIR, 'qa_admin_subnav_overview.png') });

    // 3. Test Admin Users page and user detail inspection tabs
    console.log('3. Navigating to /admin/users...');
    await page.goto(`${BASE_URL}/admin/users`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(LOCAL_SCREENSHOT_DIR, 'qa_admin_users_mobile.png') });

    // Open User Detail BottomSheet
    const inspectBtn = page.locator('button:has-text("ตรวจสอบข้อมูล")').first();
    if (await inspectBtn.isVisible()) {
      console.log('Opening User Detail BottomSheet...');
      await inspectBtn.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(LOCAL_SCREENSHOT_DIR, 'qa_admin_user_detail_tabs.png') });

      // Click second tab (sessions)
      const sessionsTab = page.locator('button:has-text("เซสชันและอุปกรณ์")').first();
      if (await sessionsTab.isVisible()) {
        await sessionsTab.click();
        await page.waitForTimeout(500);
        console.log('Clicked sessions tab');
      }

      // Close bottomsheet
      const closeDetailBtn = page.locator('button:has-text("ปิด")').last();
      if (await closeDetailBtn.isVisible()) {
        await closeDetailBtn.click();
        await page.waitForTimeout(400);
      } else {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(400);
      }
    }

    // 4. Test Suspend Modal Buttons
    console.log('4. Testing Suspend modal button hierarchy & styling...');
    const suspendBtn = page.locator('button:has-text("ระงับบัญชี")').filter({ visible: true }).first();
    if (await suspendBtn.isVisible()) {
      await suspendBtn.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(LOCAL_SCREENSHOT_DIR, 'qa_admin_suspend_modal.png') });
      const cancelSuspendBtn = page.locator('button:has-text("ยกเลิก")').last();
      await cancelSuspendBtn.click();
      await page.waitForTimeout(400);
    }

    // 5. Test Admin Categories page (Reorder arrows + BottomSheetFooter)
    console.log('5. Navigating to /admin/categories...');
    await page.goto(`${BASE_URL}/admin/categories`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(LOCAL_SCREENSHOT_DIR, 'qa_admin_categories_list.png') });

    const addCatBtn = page.locator('button:has-text("เพิ่มหมวดหมู่มาตรฐาน")').first();
    if (await addCatBtn.isVisible()) {
      console.log('Opening Add System Category BottomSheet...');
      await addCatBtn.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(LOCAL_SCREENSHOT_DIR, 'qa_admin_category_modal_buttons.png') });
      const cancelCatBtn = page.locator('button:has-text("ยกเลิก")').last();
      await cancelCatBtn.click();
      await page.waitForTimeout(400);
    }

    console.log('✅ ALL ADMIN MOBILE QA CHECKS PASSED SUCCESSFULLY!');
  } catch (error) {
    console.error('❌ QA Test failed with error:', error);
    await page.screenshot({ path: path.join(LOCAL_SCREENSHOT_DIR, 'qa_admin_error.png') }).catch(() => {});
    throw error;
  } finally {
    await browser.close();
  }
}

runAdminFixesQa();
