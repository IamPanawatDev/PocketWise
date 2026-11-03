const { chromium } = require('../../frontend/pocketwise-web/node_modules/playwright');
const path = require('path');
const fs = require('fs');

const SCREENSHOT_DIR = path.resolve('C:/Users/Panawat/.gemini/antigravity/brain/7635fa53-6dcc-4384-a0e0-5513657f6c00/screenshots');
const BASE_URL = 'http://localhost:3000';

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function loginUser(page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  const altBtn = page.locator('button:has-text("เข้าสู่ระบบด้วยบัญชีอื่น")');
  if (await altBtn.isVisible()) {
    await altBtn.click();
    await page.waitForTimeout(400);
  }
  await page.fill('#email', 'admin.test@pocketwise.local');
  await page.fill('#password', 'Password123!');
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
  console.log('Login successful! Current URL:', page.url());
}

(async () => {
  console.log('======================================================================');
  console.log('   POCKETWISE QA - MOBILE HUB DRAWER & RECURRING SUMMARY TEST');
  console.log('======================================================================\n');

  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true,
  });

  try {
    console.log('=== Step 1: Mobile Hub Drawer Testing (390x844) ===');
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const mobilePage = await mobileContext.newPage();

    // 1. Login
    await loginUser(mobilePage);

    // 2. Open Mobile Hub Drawer by clicking "เมนู"
    console.log('Opening Mobile Hub Drawer...');
    const menuButton = mobilePage.locator('nav[aria-label="เมนูด่วนบนมือถือ"] button[aria-label="เมนูทั้งหมด"]');
    await menuButton.click();
    await mobilePage.waitForTimeout(600);

    // Take screenshot of Mobile Command Hub Drawer
    const drawerPath = path.join(SCREENSHOT_DIR, '15_mobile_hub_drawer_opened.png');
    await mobilePage.screenshot({ path: drawerPath });
    console.log(`Saved screenshot: ${drawerPath}`);

    // Verify shortcuts are present, click "รายการประจำ"
    const recurringShortcut = mobilePage.locator('aside a[href="/recurring-transactions"]');
    await recurringShortcut.first().click();
    await mobilePage.waitForURL('**/recurring-transactions', { timeout: 10000 });
    await mobilePage.waitForTimeout(1000);

    // 3. Capture Recurring Transactions View on Mobile
    const mobileRecurringPath = path.join(SCREENSHOT_DIR, '16_mobile_recurring_view_with_summary.png');
    await mobilePage.screenshot({ path: mobileRecurringPath });
    console.log(`Saved screenshot: ${mobileRecurringPath}`);

    await mobileContext.close();

    console.log('\n=== Step 2: Desktop Viewport Testing (1280x800) ===');
    const desktopContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    const desktopPage = await desktopContext.newPage();

    // Login on desktop
    await loginUser(desktopPage);

    // Navigate to recurring transactions
    await desktopPage.goto(`${BASE_URL}/recurring-transactions`, { waitUntil: 'networkidle' });
    await desktopPage.waitForTimeout(1200);

    const desktopRecurringPath = path.join(SCREENSHOT_DIR, '17_desktop_recurring_summary_and_cards.png');
    await desktopPage.screenshot({ path: desktopRecurringPath });
    console.log(`Saved screenshot: ${desktopRecurringPath}`);

    await desktopContext.close();
    console.log('\n=== QA Browser Testing COMPLETED 100% SUCCESS ===');
  } catch (err) {
    console.error('QA Test error:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
