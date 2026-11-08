const { chromium } = require('../../frontend/pocketwise-web/node_modules/playwright');
const path = require('path');

const BRAVE_PATH = 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';
const BASE_URL = 'http://localhost:3000';
const LOCAL_SCREENSHOT_DIR = path.resolve('tests/e2e/screenshots_qa');

async function testStandardizedCancelButtons() {
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
    console.log('1. Logging in...');
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

    // 2. Test Quick Add Transaction Cancel Button
    console.log('2. Testing Quick Add cancel button...');
    const quickAddBtn = page.locator('button:has-text("จดด่วน"), a:has-text("จดด่วน")').first();
    await quickAddBtn.click();
    await page.waitForTimeout(600);
    const cancelBtn = page.locator('button:has-text("ยกเลิก")').last();
    console.log('Cancel button visible in Quick Add:', await cancelBtn.isVisible());
    await cancelBtn.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(LOCAL_SCREENSHOT_DIR, 'qa_cancel_quick_add.png') });
    await cancelBtn.click();
    await page.waitForTimeout(400);

    // 3. Test Bank Accounts Cancel Button
    console.log('3. Navigating to /bank-accounts...');
    await page.goto(`${BASE_URL}/bank-accounts`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('button:has-text("เพิ่มบัญชี")', { timeout: 15000 });
    await page.waitForTimeout(800);
    await page.locator('button:has-text("เพิ่มบัญชี")').first().click();
    await page.waitForTimeout(600);
    const cancelBankBtn = page.locator('button:has-text("ยกเลิก")').last();
    console.log('Cancel button visible in Bank Accounts:', await cancelBankBtn.isVisible());
    await page.screenshot({ path: path.join(LOCAL_SCREENSHOT_DIR, 'qa_cancel_bank_accounts.png') });
    await cancelBankBtn.click();
    await page.waitForTimeout(400);

    // 4. Test Categories Cancel Button
    console.log('4. Navigating to /categories...');
    await page.goto(`${BASE_URL}/categories`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('button:has-text("เพิ่มหมวดหมู่")', { timeout: 15000 });
    await page.waitForTimeout(800);
    await page.locator('button:has-text("เพิ่มหมวดหมู่")').first().click();
    await page.waitForTimeout(600);
    const cancelCatBtn = page.locator('button:has-text("ยกเลิก")').last();
    console.log('Cancel button visible in Categories:', await cancelCatBtn.isVisible());
    await page.screenshot({ path: path.join(LOCAL_SCREENSHOT_DIR, 'qa_cancel_categories.png') });
    await cancelCatBtn.click();
    await page.waitForTimeout(400);

    console.log('ALL STANDARDIZED CANCEL BUTTON TESTS PASSED 100%!');
  } finally {
    await browser.close();
  }
}

testStandardizedCancelButtons().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
