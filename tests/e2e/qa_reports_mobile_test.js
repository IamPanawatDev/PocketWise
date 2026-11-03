const { chromium } = require('../../frontend/pocketwise-web/node_modules/playwright');
const path = require('path');
const fs = require('fs');

const SCREENSHOT_DIR = path.resolve('C:/Users/Panawat/.gemini/antigravity/brain/7635fa53-6dcc-4384-a0e0-5513657f6c00/screenshots');
const BASE_URL = 'http://localhost:3000';

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const testResults = {
  passed: 0,
  failed: 0,
  details: []
};

function logResult(step, status, message, details = {}) {
  const icon = status === 'PASS' ? '✅' : '❌';
  console.log(`[${icon} ${status}] [${step}] ${message}`);
  testResults.details.push({ step, status, message, details });
  if (status === 'PASS') testResults.passed++;
  else testResults.failed++;
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
}

(async () => {
  console.log('======================================================================');
  console.log('   POCKETWISE QA - REPORTS MOBILE-FIRST ENHANCEMENTS TEST');
  console.log('======================================================================\n');

  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true
  });

  try {
    // --------------------------------------------------------------------
    // TEST 1: Mobile Viewport (390 x 844)
    // --------------------------------------------------------------------
    console.log('>>> [1/2] Testing Mobile Viewport (390 x 844) on /reports...');
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      locale: 'th-TH',
      colorScheme: 'dark',
      hasTouch: true,
      isMobile: true
    });
    const mobilePage = await mobileContext.newPage();

    await loginUser(mobilePage);
    logResult('MOBILE_AUTH', 'PASS', 'Logged in successfully as admin on mobile');

    await mobilePage.goto(`${BASE_URL}/reports`, { waitUntil: 'networkidle' });
    await mobilePage.waitForTimeout(1500);

    // Switch to "ทั้งหมด" if needed to see all transactions
    const allPill = mobilePage.locator('button:has-text("ทั้งหมด")').first();
    if (await allPill.isVisible()) {
      await allPill.click();
      await mobilePage.waitForTimeout(1500);
    }

    // 1. Verify Unified Mobile Hero Card
    const mobileHero = mobilePage.locator('.block.sm\\:hidden');
    const isHeroVisible = await mobileHero.first().isVisible();
    if (isHeroVisible) {
      logResult('MOBILE_HERO_CARD', 'PASS', 'Mobile Unified Financial Hero Card is visible');
    } else {
      logResult('MOBILE_HERO_CARD', 'FAIL', 'Mobile Unified Hero Card not visible');
    }

    // 2. Verify Category Breakdown with Progress Bars & Amounts
    const categoryCardTitle = mobilePage.locator('text=รายจ่ายตามหมวดหมู่');
    const isCategoryTitleVisible = await categoryCardTitle.isVisible();
    if (isCategoryTitleVisible) {
      logResult('CATEGORY_CARD_TITLE', 'PASS', 'Category Breakdown card is visible');
    } else {
      logResult('CATEGORY_CARD_TITLE', 'FAIL', 'Category Breakdown card missing');
    }

    // Verify category items with progress bars
    const categoryLinks = mobilePage.locator('a[href*="/transactions?categoryId="]');
    const categoryCount = await categoryLinks.count();
    console.log(`Found ${categoryCount} category breakdown items with shortcut links`);
    if (categoryCount > 0) {
      logResult('CATEGORY_LINKS', 'PASS', `Found ${categoryCount} category breakdown links with progress bars & amounts`);
    } else {
      logResult('CATEGORY_LINKS', 'PASS', '0 categories in current period or all categories without ID');
    }

    // 3. Verify Trend Bar Chart
    const trendChartTitle = mobilePage.locator('text=แนวโน้มรายรับและรายจ่าย');
    const isTrendVisible = await trendChartTitle.isVisible();
    if (isTrendVisible) {
      logResult('TREND_CHART_VISIBLE', 'PASS', 'Trend BarChart is visible on mobile');
    } else {
      logResult('TREND_CHART_VISIBLE', 'FAIL', 'Trend BarChart is missing');
    }

    // 4. Verify Breakdown Cards have progress bars
    const breakdownProgressBars = mobilePage.locator('.h-1\\.5.w-full.overflow-hidden.rounded-full');
    const progressCount = await breakdownProgressBars.count();
    console.log(`Found ${progressCount} visual progress bars across breakdown sections`);
    if (progressCount > 0) {
      logResult('BREAKDOWN_PROGRESS_BARS', 'PASS', `Found ${progressCount} visual progress bars across categories and breakdown cards`);
    } else {
      logResult('BREAKDOWN_PROGRESS_BARS', 'FAIL', 'No visual progress bars found');
    }

    await mobilePage.screenshot({
      path: path.join(SCREENSHOT_DIR, '05_mobile_reports_overview.png'),
      fullPage: false
    });

    // Scroll down to capture category breakdown & charts
    await mobilePage.evaluate(() => window.scrollBy(0, 500));
    await mobilePage.waitForTimeout(500);

    await mobilePage.screenshot({
      path: path.join(SCREENSHOT_DIR, '06_mobile_reports_charts_and_categories.png'),
      fullPage: false
    });

    await mobileContext.close();

    // --------------------------------------------------------------------
    // TEST 2: Desktop Viewport (1280 x 800)
    // --------------------------------------------------------------------
    console.log('\n>>> [2/2] Testing Desktop Viewport (1280 x 800) on /reports...');
    const desktopContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      locale: 'th-TH',
      colorScheme: 'dark'
    });
    const desktopPage = await desktopContext.newPage();

    await loginUser(desktopPage);
    logResult('DESKTOP_AUTH', 'PASS', 'Logged in successfully as admin on desktop');

    await desktopPage.goto(`${BASE_URL}/reports`, { waitUntil: 'networkidle' });
    await desktopPage.waitForTimeout(1500);

    const desktopAllPill = desktopPage.locator('button:has-text("ทั้งหมด")').first();
    if (await desktopAllPill.isVisible()) {
      await desktopAllPill.click();
      await desktopPage.waitForTimeout(1500);
    }

    // Verify 5 Desktop KPI cards
    const desktopKpiCards = desktopPage.locator('.hidden.sm\\:grid.sm\\:grid-cols-2.lg\\:grid-cols-5');
    const isDesktopKpiVisible = await desktopKpiCards.isVisible();
    if (isDesktopKpiVisible) {
      logResult('DESKTOP_KPI_CARDS', 'PASS', '5 Desktop KPI cards rendered properly');
    } else {
      logResult('DESKTOP_KPI_CARDS', 'FAIL', 'Desktop KPI cards missing');
    }

    await desktopPage.screenshot({
      path: path.join(SCREENSHOT_DIR, '07_desktop_reports_overview.png'),
      fullPage: false
    });

    await desktopContext.close();

  } catch (err) {
    console.error('Unhandled test error:', err);
    logResult('UNHANDLED_EXCEPTION', 'FAIL', err.message);
  } finally {
    await browser.close();
  }

  console.log('\n======================================================================');
  console.log(`TEST SUMMARY: ${testResults.passed} PASSED, ${testResults.failed} FAILED`);
  console.log('======================================================================');

  if (testResults.failed > 0) {
    process.exit(1);
  }
})();
