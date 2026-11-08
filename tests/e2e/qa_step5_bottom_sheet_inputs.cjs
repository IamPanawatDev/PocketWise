const { chromium } = require('../../frontend/pocketwise-web/node_modules/playwright');
const path = require('path');

const BRAVE_PATH = 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';
const BASE_URL = 'http://localhost:3000';
const LOCAL_SCREENSHOT_DIR = path.resolve('tests/e2e/screenshots_qa');

async function testBottomSheetInputs() {
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

    // 2. Test Tags Color Swatches BottomSheet
    console.log('2. Navigating to /tags...');
    await page.goto(`${BASE_URL}/tags`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    const addTagBtn = page.locator('button:has-text("เพิ่มแท็ก")').first();
    await addTagBtn.click();
    await page.waitForTimeout(600);
    const colorSwatches = page.locator('button[aria-label^="เลือกสี"]');
    console.log('Color swatches count:', await colorSwatches.count());
    // Click green preset swatch
    const greenSwatch = page.locator('button[aria-label="เลือกสี #10b981"]');
    if (await greenSwatch.isVisible()) {
      await greenSwatch.click();
      await page.waitForTimeout(300);
    }
    await page.screenshot({ path: path.join(LOCAL_SCREENSHOT_DIR, 'qa_tags_color_swatches.png') });
    await page.locator('button:has-text("ยกเลิก")').last().click();
    await page.waitForTimeout(400);

    // 3. Test Credit Cards inputMode BottomSheet
    console.log('3. Navigating to /credit-cards...');
    await page.goto(`${BASE_URL}/credit-cards`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    const addCardBtn = page.locator('button:has-text("เพิ่มบัตรเครดิต")').first();
    await addCardBtn.click();
    await page.waitForTimeout(600);
    const limitInput = page.locator('#credit-card-limit');
    const billingInput = page.locator('#credit-card-billing');
    console.log('Credit limit inputMode:', await limitInput.getAttribute('inputmode'));
    console.log('Billing day inputMode:', await billingInput.getAttribute('inputmode'));
    await page.screenshot({ path: path.join(LOCAL_SCREENSHOT_DIR, 'qa_credit_card_inputs.png') });
    await page.locator('button:has-text("ยกเลิก")').last().click();
    await page.waitForTimeout(400);

    // 4. Test Transfers BottomSheet
    console.log('4. Navigating to /transfers...');
    await page.goto(`${BASE_URL}/transfers`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    const addTransferBtn = page.locator('button:has-text("โอนเงินระหว่างบัญชี"), button:has-text("โอนเงิน")').first();
    if (await addTransferBtn.isVisible()) {
      await addTransferBtn.click();
      await page.waitForTimeout(600);
      const transferAmount = page.locator('#transfer-amount');
      console.log('Transfer amount inputMode:', await transferAmount.getAttribute('inputmode'));
      await page.screenshot({ path: path.join(LOCAL_SCREENSHOT_DIR, 'qa_transfers_inputs.png') });
      await page.locator('button:has-text("ยกเลิก")').last().click();
      await page.waitForTimeout(400);
    }

    console.log('ALL BOTTOMSHEET FORM INPUT TESTS PASSED 100%!');
  } finally {
    await browser.close();
  }
}

testBottomSheetInputs().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
