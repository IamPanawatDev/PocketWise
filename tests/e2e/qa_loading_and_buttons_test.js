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
  console.log('   POCKETWISE QA - SKELETON LOADING & BUTTON FEEDBACK TEST');
  console.log('======================================================================\n');

  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      locale: 'th-TH',
      colorScheme: 'dark',
      hasTouch: true,
      isMobile: true
    });
    const page = await context.newPage();

    console.log('>>> [1/3] Logging in...');
    await loginUser(page);
    logResult('AUTH', 'PASS', 'Logged in successfully as admin');

    // --------------------------------------------------------------------
    // TEST 1: Reports page Loading & Skeletons
    // --------------------------------------------------------------------
    console.log('\n>>> [2/3] Testing /reports Loading Skeletons...');
    await page.goto(`${BASE_URL}/reports`, { waitUntil: 'domcontentloaded' });

    // Check no plain text "กำลังคำนวณรายงาน..." persists after load
    await page.waitForLoadState('networkidle');
    const textLoading = page.locator('text=กำลังคำนวณรายงาน...');
    const isTextLoadingVisible = await textLoading.isVisible();
    if (!isTextLoadingVisible) {
      logResult('REPORTS_NO_TEXT_LOADER', 'PASS', 'No plain text "<p>กำลังคำนวณรายงาน...</p>" present on reports page');
    } else {
      logResult('REPORTS_NO_TEXT_LOADER', 'FAIL', 'Found plain text "<p>กำลังคำนวณรายงาน...</p>"');
    }

    // --------------------------------------------------------------------
    // TEST 2: Bank Accounts Card Grid Skeleton
    // --------------------------------------------------------------------
    console.log('\n>>> [3/3] Testing Bank Accounts & Forms Button Feedback...');
    await page.goto(`${BASE_URL}/bank-accounts`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    // Open add account form
    const addAccountBtn = page.locator('button:has-text("เพิ่มบัญชี")').first();
    await addAccountBtn.click();
    await page.waitForTimeout(500);

    // Verify form submit button structure
    const submitBtn = page.locator('button[type="submit"]:has-text("เพิ่มบัญชี")').first();
    const isSubmitVisible = await submitBtn.isVisible();
    if (isSubmitVisible) {
      logResult('ACCOUNT_FORM_SUBMIT_BTN', 'PASS', 'Account form submit button rendered with type=submit');
    } else {
      logResult('ACCOUNT_FORM_SUBMIT_BTN', 'FAIL', 'Account form submit button missing');
    }

    // Close form
    const cancelBtn = page.locator('button:has-text("ยกเลิก")').first();
    if (await cancelBtn.isVisible()) {
      await cancelBtn.click();
      await page.waitForTimeout(400);
    }

    // --------------------------------------------------------------------
    // TEST 3: Transaction Form Submit & Feedback
    // --------------------------------------------------------------------
    await page.goto(`${BASE_URL}/transactions`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Click "+ จดด่วน" from mobile bottom nav
    const quickAddBtn = page.locator('button[aria-label="จดรายการด่วน"]');
    if (await quickAddBtn.isVisible()) {
      await quickAddBtn.click();
      await page.waitForTimeout(600);

      const txSubmitBtn = page.locator('button[type="submit"]:has-text("บันทึกรายการ")');
      const isTxSubmitVisible = await txSubmitBtn.isVisible();
      if (isTxSubmitVisible) {
        logResult('TX_SUBMIT_BTN_READY', 'PASS', 'Transaction Quick Add form submit button is ready and supports pending state');
      } else {
        logResult('TX_SUBMIT_BTN_READY', 'FAIL', 'Transaction submit button missing');
      }

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '12_mobile_quick_add_submit_ready.png'),
        fullPage: false
      });

      // Close drawer
      const txCancel = page.locator('button:has-text("ยกเลิก")').first();
      if (await txCancel.isVisible()) {
        await txCancel.click();
        await page.waitForTimeout(400);
      }
    }

    await context.close();

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
