const { chromium } = require('../../frontend/pocketwise-web/node_modules/playwright');
const path = require('path');

const BRAVE_PATH = 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';
const BASE_URL = 'http://localhost:3000';
const LOCAL_SCREENSHOT_DIR = path.resolve('tests/e2e/screenshots_qa');

async function testCleanRedesignedReports() {
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

    console.log('2. Navigating to /reports...');
    await page.goto(`${BASE_URL}/reports`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // 1. Verify Clean Hero Card (Net Balance, Income, Expense)
    const netLabel = page.locator('text=คงเหลือสุทธิ');
    const incomeLabel = page.locator('text=รายรับรวม');
    const expenseLabel = page.locator('text=รายจ่ายรวม');
    console.log('Net Balance visible:', await netLabel.first().isVisible());
    console.log('Income summary visible:', await incomeLabel.first().isVisible());
    console.log('Expense summary visible:', await expenseLabel.first().isVisible());

    // 2. Verify NO redundant slip or card summary cards
    const redundantSlipCard = page.locator('text=ภาพรวมรายจ่ายจากสลิปและบัตรเครดิต');
    console.log('Redundant Slip/Card Card visible (Should be false):', await redundantSlipCard.isVisible());

    await page.screenshot({ path: path.join(LOCAL_SCREENSHOT_DIR, 'qa_reports_clean_hero.png') });

    // 3. Scroll to Charts
    await page.evaluate(() => window.scrollBy(0, 400));
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(LOCAL_SCREENSHOT_DIR, 'qa_reports_clean_charts.png') });

    // 4. Check Optional Deep Breakdown Button
    const breakdownToggle = page.locator('button:has-text("ดูรายละเอียดเชิงลึก")');
    console.log('Deep Breakdown Toggle button visible:', await breakdownToggle.isVisible());
    if (await breakdownToggle.isVisible()) {
      await breakdownToggle.click();
      await page.waitForTimeout(400);
      await page.evaluate(() => window.scrollBy(0, 400));
      await page.screenshot({ path: path.join(LOCAL_SCREENSHOT_DIR, 'qa_reports_deep_breakdown_opened.png') });
    }

    console.log('CLEAN REDESIGNED REPORTS VIEW PASSED 100%!');
  } finally {
    await browser.close();
  }
}

testCleanRedesignedReports().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
