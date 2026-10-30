const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SCREENSHOT_DIR = 'C:\\Users\\Panawat\\.gemini\\antigravity\\brain\\99e29c13-c495-4a42-b0fa-1288be0adb2e\\screenshots';

async function run() {
  console.log('🚀 Starting PocketWise Feature F9 Playwright E2E Test Suite...');
  
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    locale: 'th-TH',
    colorScheme: 'light'
  });

  const page = await context.newPage();

  try {
    // ----------------------------------------------------
    // STEP 1: Log in as Admin
    // ----------------------------------------------------
    console.log('\n[Step 1] Navigating to http://localhost:3000/login ...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    
    // Check if auto-restore is showing and click other account if needed
    const altLoginBtn = page.locator('button:has-text("เข้าสู่ระบบด้วยบัญชีอื่น")');
    if (await altLoginBtn.isVisible()) {
      console.log('Clicking "เข้าสู่ระบบด้วยบัญชีอื่น"...');
      await altLoginBtn.click();
      await page.waitForTimeout(500);
    }

    console.log('Filling admin credentials (admin.test@pocketwise.local)...');
    await page.fill('#email', 'admin.test@pocketwise.local');
    await page.fill('#password', 'Password123!');
    
    console.log('Submitting login form...');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 }).catch(() => {}),
      page.click('button[type="submit"]')
    ]);

    await page.waitForTimeout(2000);
    console.log(`Current URL after login: ${page.url()}`);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_login_success.png'), fullPage: true });
    console.log('📸 Saved 01_login_success.png');

    // ----------------------------------------------------
    // STEP 2: Admin Overview (/admin/overview)
    // ----------------------------------------------------
    console.log('\n[Step 2] Navigating to /admin/overview ...');
    await page.goto('http://localhost:3000/admin/overview', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_admin_overview.png'), fullPage: true });
    console.log('📸 Saved 02_admin_overview.png');

    // ----------------------------------------------------
    // STEP 3: Admin User Operations (/admin/users) - PRIMARY FOCUS
    // ----------------------------------------------------
    console.log('\n[Step 3] Navigating to /admin/users ...');
    await page.goto('http://localhost:3000/admin/users', { waitUntil: 'networkidle' });
    
    // Wait for the user rows to be loaded
    console.log('Waiting for user table to populate...');
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    await page.waitForTimeout(1000);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_users_list_desktop.png'), fullPage: true });
    console.log('📸 Saved 03_users_list_desktop.png');

    // 3A: Search filter test
    console.log('Searching for "Somchai"...');
    const searchInput = page.locator('input[placeholder*="ค้นหา"]');
    await searchInput.fill('Somchai');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_users_search_somchai.png'), fullPage: true });
    console.log('📸 Saved 04_users_search_somchai.png');

    // Clear search
    console.log('Clearing search filter...');
    await searchInput.fill('');
    await page.waitForTimeout(1000);

    // 3B: Inspect user details modal
    console.log('Clicking "ตรวจสอบ" on Somchai Sukjai...');
    const somchaiRow = page.locator('tr:has-text("Somchai Sukjai")');
    await somchaiRow.locator('button:has-text("ตรวจสอบ")').click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_user_modal_profile.png') });
    console.log('📸 Saved 05_user_modal_profile.png (Profile tab)');

    // 3C: Inspect Sessions Tab
    console.log('Switching to "เซสชันและอุปกรณ์" tab...');
    await page.locator('button:has-text("เซสชัน")').click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_user_modal_sessions.png') });
    console.log('📸 Saved 06_user_modal_sessions.png (Sessions tab)');

    // 3D: Inspect Security Events Tab
    console.log('Switching to "ประวัติความปลอดภัย" tab...');
    await page.locator('button:has-text("ประวัติความปลอดภัย")').click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_user_modal_security_history.png') });
    console.log('📸 Saved 07_user_modal_security_history.png (Security tab)');

    // Close detail modal
    console.log('Closing detail modal...');
    await page.locator('div.fixed.inset-0.z-50 button:has(svg.lucide-x)').click();
    await page.waitForTimeout(500);

    // 3E: Test Suspend Account modal
    console.log('Opening "ระงับบัญชี" modal for testing...');
    const aliceRow = page.locator('tr:has-text("Alice Wonderland")');
    if (await aliceRow.isVisible()) {
      await aliceRow.locator('button:has-text("ระงับบัญชี")').click();
    } else {
      await page.locator('button:has-text("ระงับบัญชี")').first().click();
    }
    
    await page.waitForTimeout(1000);
    const textarea = page.locator('textarea');
    if (await textarea.isVisible()) {
      await textarea.fill('ทดสอบการระงับบัญชีโดยระบบตรวจสอบความปลอดภัย (Automated E2E Audit)');
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08_user_suspend_dialog.png') });
    console.log('📸 Saved 08_user_suspend_dialog.png');
    
    // Cancel suspend modal
    console.log('Cancelling suspend modal...');
    await page.getByRole('button', { name: 'ยกเลิก', exact: true }).click();
    await page.waitForTimeout(500);

    // 3F: Test Mobile Responsive View
    console.log('Testing Mobile responsive view (390x844)...');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09_users_mobile_view.png'), fullPage: true });
    console.log('📸 Saved 09_users_mobile_view.png');

    // Restore desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(500);

    // ----------------------------------------------------
    // STEP 4: Admin Import Jobs (/admin/imports)
    // ----------------------------------------------------
    console.log('\n[Step 4] Navigating to /admin/imports ...');
    await page.goto('http://localhost:3000/admin/imports', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10_admin_imports_dashboard.png'), fullPage: true });
    console.log('📸 Saved 10_admin_imports_dashboard.png');

    // ----------------------------------------------------
    // STEP 5: Admin Security Events Audit (/admin/security-events)
    // ----------------------------------------------------
    console.log('\n[Step 5] Navigating to /admin/security-events ...');
    await page.goto('http://localhost:3000/admin/security-events', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '11_admin_security_events.png'), fullPage: true });
    console.log('📸 Saved 11_admin_security_events.png');

    // ----------------------------------------------------
    // STEP 6: Admin Announcements (/admin/announcements)
    // ----------------------------------------------------
    console.log('\n[Step 6] Navigating to /admin/announcements ...');
    await page.goto('http://localhost:3000/admin/announcements', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    
    console.log('Opening "สร้างประกาศใหม่" modal...');
    const createAnnouncementBtn = page.locator('button:has-text("สร้างประกาศใหม่")');
    if (await createAnnouncementBtn.isVisible()) {
      await createAnnouncementBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '12_admin_announcements_modal.png') });
      console.log('📸 Saved 12_admin_announcements_modal.png');

      await page.getByRole('button', { name: 'ยกเลิก', exact: true }).click();
      await page.waitForTimeout(500);
    }

    // ----------------------------------------------------
    // STEP 7: Admin Settings (/admin/settings)
    // ----------------------------------------------------
    console.log('\n[Step 7] Navigating to /admin/settings ...');
    await page.goto('http://localhost:3000/admin/settings', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '13_admin_settings_maintenance.png'), fullPage: true });
    console.log('📸 Saved 13_admin_settings_maintenance.png');

    // ----------------------------------------------------
    // STEP 8: User Dashboard with Active Announcements Banner (/transactions)
    // ----------------------------------------------------
    console.log('\n[Step 8] Navigating to /transactions to verify ActiveAnnouncementsBanner ...');
    await page.goto('http://localhost:3000/transactions', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '14_user_banner_alert.png'), fullPage: true });
    console.log('📸 Saved 14_user_banner_alert.png');

    console.log('\n✨ ALL F9 E2E TESTS & SCREENSHOTS COMPLETED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Test failed with error:', err);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'error_screenshot.png'), fullPage: true }).catch(() => {});
  } finally {
    await browser.close();
  }
}

run();
