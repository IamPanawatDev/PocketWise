/**
 * PocketWise QA Automated Browser Test Suite
 * Task: Verify Quick Period Pills & Mobile Financial Cards on /reports & /transactions
 */

const { chromium } = require('../../frontend/pocketwise-web/node_modules/playwright');
const path = require('path');
const fs = require('fs');

const SCREENSHOT_DIR = 'C:\\Users\\Panawat\\.gemini\\antigravity\\brain\\ba4e17ac-3809-44d8-af1c-256486b0da51\\screenshots';
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
  await page.fill('#email', 'qa.tester.check@pocketwise.local');
  await page.fill('#password', 'Password123!');
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });
}

(async () => {
  console.log('======================================================================');
  console.log('   POCKETWISE QA BROWSER TEST - QUICK PERIOD PILLS & MOBILE CARDS');
  console.log('======================================================================\n');

  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true
  });

  try {
    // --------------------------------------------------------------------
    // TEST SUITE 1: Desktop Testing (1280x800)
    // --------------------------------------------------------------------
    const desktopContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      locale: 'th-TH',
      colorScheme: 'dark'
    });
    const page = await desktopContext.newPage();

    console.log('>>> [1/4] Logging in on Desktop context...');
    await loginUser(page);
    logResult('AUTH_DESKTOP', 'PASS', 'Logged in successfully as QA test user');

    // --------------------------------------------------------------------
    // 1. /reports page testing
    // --------------------------------------------------------------------
    console.log('\n>>> [2/4] Testing /reports Page (Desktop)...');
    await page.goto(`${BASE_URL}/reports`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // 1.1 Verify Quick Period Pills exist: [วันนี้ | สัปดาห์นี้ | เดือนนี้ | ปีนี้]
    const reportsPillLabels = ['วันนี้', 'สัปดาห์นี้', 'เดือนนี้', 'ปีนี้'];
    for (const label of reportsPillLabels) {
      const pill = page.locator(`button:has-text("${label}")`).first();
      const isVisible = await pill.isVisible();
      if (isVisible) {
        logResult('REPORTS_PILL_VISIBILITY', 'PASS', `Quick Period Pill "${label}" is visible on /reports`);
      } else {
        logResult('REPORTS_PILL_VISIBILITY', 'FAIL', `Quick Period Pill "${label}" not found on /reports`);
      }
    }

    // 1.2 Click "สัปดาห์นี้" (week)
    const weekPill = page.locator('button:has-text("สัปดาห์นี้")').first();
    await weekPill.click();
    await page.waitForTimeout(600);

    // Verify "สัปดาห์นี้" is selected and highlighted (active/blue style)
    const weekClasses = await weekPill.getAttribute('class');
    const isWeekActive = weekClasses.includes('bg-[var(--pw-primary)]') || weekClasses.includes('text-white');
    if (isWeekActive) {
      logResult('REPORTS_WEEK_ACTIVE_STYLE', 'PASS', '"สัปดาห์นี้" is successfully selected and highlighted with active primary style', { classes: weekClasses });
    } else {
      logResult('REPORTS_WEEK_ACTIVE_STYLE', 'FAIL', '"สัปดาห์นี้" does not have active style', { classes: weekClasses });
    }

    // Verify date range displayed is Sunday to Saturday (2026-11-01 to 2026-11-07)
    const rangeLocator = page.locator('span:has-text("ช่วงเวลา:")').first();
    const rangeText = await rangeLocator.textContent();
    const hasSundayToSaturday = rangeText.includes('2026-11-01') && rangeText.includes('2026-11-07');
    if (hasSundayToSaturday) {
      logResult('REPORTS_WEEK_DATE_RANGE', 'PASS', `Date range displays Sunday to Saturday correctly: "${rangeText.trim()}"`);
    } else {
      logResult('REPORTS_WEEK_DATE_RANGE', 'FAIL', `Expected 2026-11-01 to 2026-11-07 but got: "${rangeText.trim()}"`);
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_reports_desktop_week_selected.png'), fullPage: false });

    // 1.3 Test clicking "วันนี้", "เดือนนี้", "ปีนี้" smoothly without error
    // Click "วันนี้"
    const todayPill = page.locator('button:has-text("วันนี้")').first();
    await todayPill.click();
    await page.waitForTimeout(500);
    const todayClasses = await todayPill.getAttribute('class');
    const isTodayActive = todayClasses.includes('bg-[var(--pw-primary)]');
    const todayRangeText = await page.locator('span:has-text("ช่วงเวลา:")').first().textContent();
    if (isTodayActive && (todayRangeText.includes('2026-11-03') || todayRangeText.includes('2026-11-02'))) {
      logResult('REPORTS_TODAY_CLICK', 'PASS', `"วันนี้" activates smoothly and updates date range: "${todayRangeText.trim()}"`);
    } else {
      logResult('REPORTS_TODAY_CLICK', 'FAIL', `"วันนี้" activation issue: active=${isTodayActive}, range="${todayRangeText.trim()}"`);
    }

    // Click "เดือนนี้"
    const monthPill = page.locator('button:has-text("เดือนนี้")').first();
    await monthPill.click();
    await page.waitForTimeout(500);
    const monthClasses = await monthPill.getAttribute('class');
    const isMonthActive = monthClasses.includes('bg-[var(--pw-primary)]');
    const monthRangeText = await page.locator('span:has-text("ช่วงเวลา:")').first().textContent();
    if (isMonthActive && monthRangeText.includes('2026-11-01') && monthRangeText.includes('2026-11-30')) {
      logResult('REPORTS_MONTH_CLICK', 'PASS', `"เดือนนี้" activates smoothly and updates date range: "${monthRangeText.trim()}"`);
    } else {
      logResult('REPORTS_MONTH_CLICK', 'FAIL', `"เดือนนี้" activation issue: active=${isMonthActive}, range="${monthRangeText.trim()}"`);
    }

    // Click "ปีนี้"
    const yearPill = page.locator('button:has-text("ปีนี้")').first();
    await yearPill.click();
    await page.waitForTimeout(500);
    const yearClasses = await yearPill.getAttribute('class');
    const isYearActive = yearClasses.includes('bg-[var(--pw-primary)]');
    const yearRangeText = await page.locator('span:has-text("ช่วงเวลา:")').first().textContent();
    if (isYearActive && yearRangeText.includes('2026-01-01') && yearRangeText.includes('2026-12-31')) {
      logResult('REPORTS_YEAR_CLICK', 'PASS', `"ปีนี้" activates smoothly and updates date range: "${yearRangeText.trim()}"`);
    } else {
      logResult('REPORTS_YEAR_CLICK', 'FAIL', `"ปีนี้" activation issue: active=${isYearActive}, range="${yearRangeText.trim()}"`);
    }

    // --------------------------------------------------------------------
    // 2. /transactions page testing (Desktop)
    // --------------------------------------------------------------------
    console.log('\n>>> [3/4] Testing /transactions Page (Desktop)...');
    await page.goto(`${BASE_URL}/transactions`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // 2.1 Verify Quick Period Pills exist: [ทั้งหมด | วันนี้ | สัปดาห์นี้ | เดือนนี้ | ปีนี้]
    const txPillLabels = ['ทั้งหมด', 'วันนี้', 'สัปดาห์นี้', 'เดือนนี้', 'ปีนี้'];
    for (const label of txPillLabels) {
      const pill = page.locator(`button:has-text("${label}")`).first();
      const isVisible = await pill.isVisible();
      if (isVisible) {
        logResult('TX_PILL_VISIBILITY', 'PASS', `Quick Period Pill "${label}" is visible on /transactions`);
      } else {
        logResult('TX_PILL_VISIBILITY', 'FAIL', `Quick Period Pill "${label}" not found on /transactions`);
      }
    }

    // 2.2 Click "สัปดาห์นี้" -> verify active, filters list, displays Sunday-Saturday
    const txWeekPill = page.locator('button:has-text("สัปดาห์นี้")').first();
    await txWeekPill.click();
    await page.waitForTimeout(800);

    const txWeekClasses = await txWeekPill.getAttribute('class');
    const isTxWeekActive = txWeekClasses.includes('bg-[var(--pw-primary)]') || txWeekClasses.includes('text-white');
    if (isTxWeekActive) {
      logResult('TX_WEEK_ACTIVE_STYLE', 'PASS', '"สัปดาห์นี้" on /transactions is active with primary style');
    } else {
      logResult('TX_WEEK_ACTIVE_STYLE', 'FAIL', '"สัปดาห์นี้" on /transactions does not have active style', { classes: txWeekClasses });
    }

    // Check filter badge showing Sunday-Saturday (2026-11-01 to 2026-11-07)
    const activeBadge = page.locator('text=ช่วงวันที่').first();
    const isBadgeVisible = await activeBadge.isVisible();
    const badgeText = isBadgeVisible ? await activeBadge.textContent() : '';
    const hasTxWeekDates = badgeText.includes('2026-11-01') && badgeText.includes('2026-11-07');
    if (hasTxWeekDates) {
      logResult('TX_WEEK_DATE_RANGE', 'PASS', `Active filter badge displays Sunday-Saturday: "${badgeText.trim()}"`);
    } else {
      logResult('TX_WEEK_DATE_RANGE', 'FAIL', `Filter badge missing Sunday-Saturday dates: "${badgeText.trim()}"`);
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_transactions_desktop_week_selected.png'), fullPage: false });

    // 2.3 Test clicking "วันนี้", "เดือนนี้", "ปีนี้", "ทั้งหมด"
    // Click "วันนี้"
    const txTodayPill = page.locator('button:has-text("วันนี้")').first();
    await txTodayPill.click();
    await page.waitForTimeout(600);
    const txTodayClasses = await txTodayPill.getAttribute('class');
    if (txTodayClasses.includes('bg-[var(--pw-primary)]')) {
      logResult('TX_TODAY_CLICK', 'PASS', '"วันนี้" on /transactions successfully activated');
    } else {
      logResult('TX_TODAY_CLICK', 'FAIL', '"วันนี้" failed to activate');
    }

    // Click "เดือนนี้"
    const txMonthPill = page.locator('button:has-text("เดือนนี้")').first();
    await txMonthPill.click();
    await page.waitForTimeout(600);
    const txMonthClasses = await txMonthPill.getAttribute('class');
    if (txMonthClasses.includes('bg-[var(--pw-primary)]')) {
      logResult('TX_MONTH_CLICK', 'PASS', '"เดือนนี้" on /transactions successfully activated');
    } else {
      logResult('TX_MONTH_CLICK', 'FAIL', '"เดือนนี้" failed to activate');
    }

    // Click "ปีนี้"
    const txYearPill = page.locator('button:has-text("ปีนี้")').first();
    await txYearPill.click();
    await page.waitForTimeout(600);
    const txYearClasses = await txYearPill.getAttribute('class');
    if (txYearClasses.includes('bg-[var(--pw-primary)]')) {
      logResult('TX_YEAR_CLICK', 'PASS', '"ปีนี้" on /transactions successfully activated');
    } else {
      logResult('TX_YEAR_CLICK', 'FAIL', '"ปีนี้" failed to activate');
    }

    // Click "ทั้งหมด"
    const txAllPill = page.locator('button:has-text("ทั้งหมด")').first();
    await txAllPill.click();
    await page.waitForTimeout(600);
    const txAllClasses = await txAllPill.getAttribute('class');
    if (txAllClasses.includes('bg-[var(--pw-primary)]')) {
      logResult('TX_ALL_CLICK', 'PASS', '"ทั้งหมด" on /transactions successfully activated and cleared date filter');
    } else {
      logResult('TX_ALL_CLICK', 'FAIL', '"ทั้งหมด" failed to activate');
    }

    await desktopContext.close();

    // --------------------------------------------------------------------
    // TEST SUITE 2: Mobile Viewport Testing (375x812 - iPhone 13 Pro)
    // --------------------------------------------------------------------
    console.log('\n>>> [4/4] Testing Mobile Viewport (375x812)...');
    const mobileContext = await browser.newContext({
      viewport: { width: 375, height: 812 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      locale: 'th-TH',
      colorScheme: 'dark'
    });
    const mobilePage = await mobileContext.newPage();
    await loginUser(mobilePage);

    // Mobile /reports Financial Hero Card
    await mobilePage.goto(`${BASE_URL}/reports`, { waitUntil: 'networkidle' });
    await mobilePage.waitForTimeout(1000);

    // Select "ปีนี้" on mobile so report data is populated and Hero Card is active
    const mobileYearBtn = mobilePage.locator('button:has-text("ปีนี้")').first();
    await mobileYearBtn.click();
    await mobilePage.waitForTimeout(1500);

    // Look for Financial Hero Card
    const heroCardText = await mobilePage.evaluate(() => {
      const el = document.querySelector('.block.sm\\:hidden');
      return el ? el.innerText : null;
    });

    const hasHeroCard = heroCardText !== null && 
      (heroCardText.includes('คงเหลือสุทธิ') || heroCardText.includes('รายรับรวม') || heroCardText.includes('รายจ่ายรวม'));

    if (hasHeroCard) {
      logResult('MOBILE_REPORTS_HERO_CARD', 'PASS', 'Financial Hero Card displays properly on mobile view', { preview: heroCardText.slice(0, 100) });
    } else {
      logResult('MOBILE_REPORTS_HERO_CARD', 'FAIL', 'Financial Hero Card missing or incomplete on mobile view');
    }

    await mobilePage.screenshot({ path: path.join(SCREENSHOT_DIR, '03_reports_mobile_hero_card.png'), fullPage: false });

    // Mobile /transactions Compact Financial Pulse Bar
    await mobilePage.goto(`${BASE_URL}/transactions`, { waitUntil: 'networkidle' });
    await mobilePage.waitForTimeout(1000);

    const pulseBarInfo = await mobilePage.evaluate(() => {
      const el = document.querySelector('.block.sm\\:hidden');
      if (!el) return null;
      const text = el.innerText;
      const hasIncome = text.includes('รายรับ');
      const hasExpense = text.includes('รายจ่าย');
      const hasBalance = text.includes('คงเหลือ');
      const columns = el.querySelectorAll('.grid-cols-3 > div');
      return {
        text,
        hasIncome,
        hasExpense,
        hasBalance,
        columnCount: columns.length
      };
    });

    if (pulseBarInfo && pulseBarInfo.hasIncome && pulseBarInfo.hasExpense && pulseBarInfo.hasBalance && pulseBarInfo.columnCount === 3) {
      logResult('MOBILE_TX_PULSE_BAR', 'PASS', 'Compact Financial Pulse Bar on mobile displays the 3 columns (รายรับ, รายจ่าย, คงเหลือ)', pulseBarInfo);
    } else {
      logResult('MOBILE_TX_PULSE_BAR', 'FAIL', 'Compact Financial Pulse Bar missing 3 columns or not properly rendered', pulseBarInfo);
    }

    await mobilePage.screenshot({ path: path.join(SCREENSHOT_DIR, '04_transactions_mobile_pulse_bar.png'), fullPage: false });

    await mobileContext.close();

  } catch (err) {
    console.error('Fatal test error:', err);
    logResult('FATAL_ERROR', 'FAIL', err.message);
  } finally {
    await browser.close();
  }

  console.log('\n======================================================================');
  console.log(`TEST SUMMARY: ${testResults.passed} PASSED | ${testResults.failed} FAILED`);
  console.log('======================================================================');

  fs.writeFileSync(path.join(SCREENSHOT_DIR, 'test_results.json'), JSON.stringify(testResults, null, 2));
})();
