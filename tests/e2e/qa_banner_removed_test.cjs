const { chromium } = require('../../frontend/pocketwise-web/node_modules/playwright');
const path = require('path');
const fs = require('fs');

const BRAVE_PATH = 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';
const BASE_URL = 'http://localhost:3000';
const LOCAL_SCREENSHOT_DIR = path.resolve('tests/e2e/screenshots_qa');

async function testBannerRemoved() {
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
    // Login
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

    // Open Quick Add
    const addBtn = page.locator('button:has-text("จดด่วน"), a:has-text("จดด่วน")').first();
    await addBtn.click();
    await page.waitForTimeout(800);

    // Check banner is GONE
    const banner = page.locator('text=สแกนสลิปโอนเงิน (AI)');
    const isBannerPresent = await banner.isVisible();
    console.log(`Banner present: ${isBannerPresent}`);

    // Check Top is now Type Toggle and Amount
    const typeToggle = page.locator('div[role="radiogroup"]');
    const isTypeVisible = await typeToggle.isVisible();
    console.log(`Type Toggle at top visible: ${isTypeVisible}`);

    await page.screenshot({ path: path.join(LOCAL_SCREENSHOT_DIR, 'qa_banner_removed_success.png') });
    console.log('Screenshot saved: qa_banner_removed_success.png');
  } finally {
    await browser.close();
  }
}

testBannerRemoved();
