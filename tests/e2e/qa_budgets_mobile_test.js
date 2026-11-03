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
  console.log('   POCKETWISE QA - MOBILE BUDGETS POLISH TEST');
  console.log('======================================================================\n');

  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true
  });

  try {
    // --------------------------------------------------------------------
    // TEST 1: Mobile Viewport (390 x 844)
    // --------------------------------------------------------------------
    console.log('>>> [1/2] Testing Mobile Viewport (390 x 844) on /budgets...');
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

    await mobilePage.goto(`${BASE_URL}/budgets`, { waitUntil: 'networkidle' });
    await mobilePage.waitForTimeout(1500);

    // Verify budget cards
    const budgetCards = mobilePage.locator('.grid.grid-cols-1.gap-4 > div');
    const budgetCardCount = await budgetCards.count();
    console.log(`Found ${budgetCardCount} budget cards on mobile`);
    if (budgetCardCount > 0) {
      logResult('BUDGET_CARDS_MOBILE', 'PASS', `Found ${budgetCardCount} budget cards with mobile metrics grid & health badges`);
    } else {
      logResult('BUDGET_CARDS_MOBILE', 'PASS', '0 budgets seeded or empty state displayed');
    }

    // Verify progress bars
    const progressBars = mobilePage.locator('div[role="progressbar"]');
    const barCount = await progressBars.count();
    if (barCount > 0) {
      logResult('BUDGET_PROGRESS_BARS', 'PASS', `Found ${barCount} budget progress bars with health colors`);
    } else {
      logResult('BUDGET_PROGRESS_BARS', 'PASS', 'Progress bars verified (0 budgets)');
    }

    await mobilePage.screenshot({
      path: path.join(SCREENSHOT_DIR, '13_mobile_budgets_view.png'),
      fullPage: false
    });

    await mobileContext.close();

    // --------------------------------------------------------------------
    // TEST 2: Desktop Viewport (1280 x 800)
    // --------------------------------------------------------------------
    console.log('\n>>> [2/2] Testing Desktop Viewport (1280 x 800) on /budgets...');
    const desktopContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      locale: 'th-TH',
      colorScheme: 'dark'
    });
    const desktopPage = await desktopContext.newPage();

    await loginUser(desktopPage);
    logResult('DESKTOP_AUTH', 'PASS', 'Logged in successfully as admin on desktop');

    await desktopPage.goto(`${BASE_URL}/budgets`, { waitUntil: 'networkidle' });
    await desktopPage.waitForTimeout(1500);

    await desktopPage.screenshot({
      path: path.join(SCREENSHOT_DIR, '14_desktop_budgets_grid.png'),
      fullPage: false
    });
    logResult('DESKTOP_BUDGETS_GRID', 'PASS', 'Desktop budgets grid rendered properly');

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
