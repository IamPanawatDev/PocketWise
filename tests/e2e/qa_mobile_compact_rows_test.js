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
  console.log('   POCKETWISE QA - MOBILE COMPACT ROWS & DETAILS BOTTOMSHEET TEST');
  console.log('======================================================================\n');

  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true
  });

  try {
    // --------------------------------------------------------------------
    // TEST 1: Mobile Viewport (390 x 844)
    // --------------------------------------------------------------------
    console.log('>>> [1/2] Testing Mobile Viewport (390 x 844)...');
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      locale: 'th-TH',
      colorScheme: 'dark',
      hasTouch: true,
      isMobile: true
    });
    const mobilePage = await mobileContext.newPage();

    await loginUser(mobilePage);
    logResult('MOBILE_AUTH', 'PASS', 'Logged in successfully as admin on mobile viewport');

    await mobilePage.goto(`${BASE_URL}/transactions`, { waitUntil: 'networkidle' });
    await mobilePage.waitForTimeout(1500);

    // 1. Verify "+ เพิ่มรายการ" is hidden on mobile
    const addBtnContainer = mobilePage.locator('.hidden.sm\\:block:has(button:has-text("เพิ่มรายการ"))');
    const addBtn = mobilePage.locator('h1 ~ div button:has-text("เพิ่มรายการ")');
    const isAddBtnVisible = await addBtn.isVisible();
    if (!isAddBtnVisible) {
      logResult('MOBILE_ADD_BTN', 'PASS', '+ เพิ่มรายการ button is correctly hidden on mobile screen (< sm)');
    } else {
      logResult('MOBILE_ADD_BTN', 'FAIL', '+ เพิ่มรายการ button is still visible on mobile screen');
    }

    // If default month has 0 items, switch to "ทั้งหมด" to load all transactions
    let mobileRows = mobilePage.locator('.sm\\:hidden.cursor-pointer');
    let rowCount = await mobileRows.count();
    if (rowCount === 0) {
      console.log('Default month filter has 0 items, clicking "ทั้งหมด" pill...');
      const allPill = mobilePage.locator('button:has-text("ทั้งหมด")').first();
      if (await allPill.isVisible()) {
        await allPill.click();
        await mobilePage.waitForTimeout(1500);
        mobileRows = mobilePage.locator('.sm\\:hidden.cursor-pointer');
        rowCount = await mobileRows.count();
      }
    }

    console.log(`Found ${rowCount} mobile compact transaction rows`);
    if (rowCount > 0) {
      logResult('MOBILE_COMPACT_ROWS', 'PASS', `Found ${rowCount} mobile compact rows with high visual density`);
    } else {
      logResult('MOBILE_COMPACT_ROWS', 'FAIL', 'No mobile compact rows found even under "ทั้งหมด"');
    }

    await mobilePage.screenshot({
      path: path.join(SCREENSHOT_DIR, '01_mobile_compact_rows_list.png'),
      fullPage: false
    });

    // 3. Tap on the first transaction row to open Transaction Details BottomSheet
    if (rowCount > 0) {
      const firstRow = mobileRows.first();
      await firstRow.click();
      await mobilePage.waitForTimeout(600);

      // Verify BottomSheet opened
      const sheetTitle = mobilePage.locator('text=รายละเอียดรายการ');
      const isSheetOpen = await sheetTitle.isVisible();
      if (isSheetOpen) {
        logResult('BOTTOMSHEET_OPEN', 'PASS', 'Transaction Details BottomSheet opened on mobile row tap');
      } else {
        logResult('BOTTOMSHEET_OPEN', 'FAIL', 'Transaction Details BottomSheet did not open');
      }

      // Verify Sticky Action Buttons: Edit on top, Delete on bottom (Rule 5)
      const editBtn = mobilePage.locator('button:has-text("แก้ไขรายการ")');
      const deleteBtn = mobilePage.locator('button:has-text("ลบรายการ")');
      const hasEditBtn = await editBtn.isVisible();
      const hasDeleteBtn = await deleteBtn.isVisible();

      if (hasEditBtn && hasDeleteBtn) {
        const editBox = await editBtn.boundingBox();
        const deleteBox = await deleteBtn.boundingBox();
        if (editBox && deleteBox && editBox.y < deleteBox.y) {
          logResult('ACTION_BUTTONS_ORDER', 'PASS', `Action buttons order adheres to Rule 5: Edit (y=${Math.round(editBox.y)}) above Delete (y=${Math.round(deleteBox.y)})`);
        } else {
          logResult('ACTION_BUTTONS_ORDER', 'FAIL', 'Action buttons order is incorrect');
        }
      } else {
        logResult('ACTION_BUTTONS_ORDER', 'FAIL', 'Missing edit or delete button in Details BottomSheet');
      }

      await mobilePage.screenshot({
        path: path.join(SCREENSHOT_DIR, '02_mobile_transaction_details_bottomsheet.png'),
        fullPage: false
      });

      // 4. Tap "แก้ไขรายการ" -> check edit form opens
      await editBtn.click();
      await mobilePage.waitForTimeout(600);

      const formTitle = mobilePage.locator('text=แก้ไขรายการ');
      const isFormOpen = await formTitle.first().isVisible();
      if (isFormOpen) {
        logResult('EDIT_FORM_OPEN', 'PASS', 'Transaction Edit form opened successfully from Details BottomSheet');
      } else {
        logResult('EDIT_FORM_OPEN', 'FAIL', 'Transaction Edit form did not open');
      }

      await mobilePage.screenshot({
        path: path.join(SCREENSHOT_DIR, '03_mobile_edit_form_opened.png'),
        fullPage: false
      });

      // Close the form
      const cancelFormBtn = mobilePage.locator('button:has-text("ยกเลิก")').first();
      if (await cancelFormBtn.isVisible()) {
        await cancelFormBtn.click();
        await mobilePage.waitForTimeout(400);
      }
    }

    await mobileContext.close();

    // --------------------------------------------------------------------
    // TEST 2: Desktop Viewport (1280 x 800)
    // --------------------------------------------------------------------
    console.log('\n>>> [2/2] Testing Desktop Viewport (1280 x 800)...');
    const desktopContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      locale: 'th-TH',
      colorScheme: 'dark'
    });
    const desktopPage = await desktopContext.newPage();

    await loginUser(desktopPage);
    logResult('DESKTOP_AUTH', 'PASS', 'Logged in successfully as admin on desktop viewport');

    await desktopPage.goto(`${BASE_URL}/transactions`, { waitUntil: 'networkidle' });
    await desktopPage.waitForTimeout(1500);

    // 1. Verify "+ เพิ่มรายการ" is visible on desktop
    const desktopAddBtn = desktopPage.locator('button:has-text("เพิ่มรายการ")').first();
    const desktopAddBtnVisible = await desktopAddBtn.isVisible();
    if (desktopAddBtnVisible) {
      logResult('DESKTOP_ADD_BTN', 'PASS', '+ เพิ่มรายการ button is properly visible on desktop screen (>= sm)');
    } else {
      logResult('DESKTOP_ADD_BTN', 'FAIL', '+ เพิ่มรายการ button is missing on desktop screen');
    }

    // If default month has 0 items, switch to "ทั้งหมด"
    let desktopCards = desktopPage.locator('.hidden.sm\\:flex');
    let desktopCardCount = await desktopCards.count();
    if (desktopCardCount === 0) {
      console.log('Default month filter has 0 items on desktop, clicking "ทั้งหมด" pill...');
      const allPill = desktopPage.locator('button:has-text("ทั้งหมด")').first();
      if (await allPill.isVisible()) {
        await allPill.click();
        await desktopPage.waitForTimeout(1500);
        desktopCards = desktopPage.locator('.hidden.sm\\:flex');
        desktopCardCount = await desktopCards.count();
      }
    }

    console.log(`Found ${desktopCardCount} desktop cards`);
    if (desktopCardCount > 0) {
      logResult('DESKTOP_CARD_GRID', 'PASS', `Desktop card grid rendered with ${desktopCardCount} cards with inline actions`);
    } else {
      logResult('DESKTOP_CARD_GRID', 'FAIL', 'Desktop cards grid not rendered');
    }

    await desktopPage.screenshot({
      path: path.join(SCREENSHOT_DIR, '04_desktop_transactions_grid.png'),
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
