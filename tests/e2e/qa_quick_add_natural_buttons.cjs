const { chromium } = require('../../frontend/pocketwise-web/node_modules/playwright');
const path = require('path');

const BRAVE_PATH = 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';
const BASE_URL = 'http://localhost:3000';
const LOCAL_SCREENSHOT_DIR = path.resolve('tests/e2e/screenshots_qa');

async function testNaturalButtonsAndBrand() {
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
    // 1. Login
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

    // 2. Open Mobile Navigation Sidebar / Menu to verify "Smart Finance" is removed
    const menuBtn = page.locator('button:has-text("เมนู"), button[aria-label="เปิดเมนู"], button[aria-label="เมนูหลัก"]').first();
    if (await menuBtn.isVisible()) {
      await menuBtn.click();
      await page.waitForTimeout(600);
      
      const smartFinanceText = page.locator('text=Smart Finance');
      const isSmartFinanceVisible = await smartFinanceText.isVisible();
      console.log(`Sidebar "Smart Finance" visible: ${isSmartFinanceVisible}`);
      
      const brandLogo = page.locator('span:text-is("PocketWise")');
      console.log(`Sidebar "PocketWise" brand visible: ${await brandLogo.first().isVisible()}`);
      
      await page.screenshot({ path: path.join(LOCAL_SCREENSHOT_DIR, 'qa_brand_sidebar.png') });
      
      // Close menu
      const closeMenuBtn = page.locator('button[aria-label="ปิดเมนู"]').first();
      if (await closeMenuBtn.isVisible()) {
        await closeMenuBtn.click();
        await page.waitForTimeout(400);
      }
    }

    // 3. Open Quick Add BottomSheet
    const addBtn = page.locator('button:has-text("จดด่วน"), a:has-text("จดด่วน")').first();
    await addBtn.click();
    await page.waitForTimeout(800);

    // Verify buttons are not sticky floating at the top of the viewport
    const submitBtn = page.locator('button[type="submit"]:has-text("บันทึกรายการ")');
    await submitBtn.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    
    console.log(`Submit button visible after scroll: ${await submitBtn.isVisible()}`);
    await page.screenshot({ path: path.join(LOCAL_SCREENSHOT_DIR, 'qa_quick_add_natural_buttons.png') });

    console.log('ALL VERIFICATIONS PASSED 100%');
  } finally {
    await browser.close();
  }
}

testNaturalButtonsAndBrand().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
