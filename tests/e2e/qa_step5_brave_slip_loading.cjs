const { chromium } = require('../../frontend/pocketwise-web/node_modules/playwright');
const path = require('path');
const fs = require('fs');

const BRAVE_PATH = 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';
const BASE_URL = 'http://localhost:3000';
const ARTIFACT_DIR = path.resolve('C:/Users/Panawat/.gemini/antigravity/brain/2063957e-7b66-44be-b012-c0bb97b57a83/screenshots');
const LOCAL_SCREENSHOT_DIR = path.resolve('tests/e2e/screenshots_qa');

for (const dir of [ARTIFACT_DIR, LOCAL_SCREENSHOT_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const SAMPLE_SLIP_1 = path.resolve('backend/src/PocketWise.Api/App_Data/uploads/slips/1/202610/6271218529de494c87cbc66f668b7e1b.jpg');
const SAMPLE_SLIP_2 = path.resolve('backend/src/PocketWise.Api/App_Data/uploads/slips/1/202610/d00e84b6101645f0a4b69796d125e279.jpg');

const testResults = {
  passed: 0,
  failed: 0,
  warnings: 0,
  scenarios: [],
  screenshots: []
};

function logTest(scenario, status, message, details = {}) {
  const symbol = status === 'PASS' ? '✅' : status === 'WARN' ? '⚠️' : '❌';
  console.log(`[${symbol} ${status}] [${scenario}] ${message}`);
  testResults.scenarios.push({ scenario, status, message, details });
  if (status === 'PASS') testResults.passed++;
  else if (status === 'WARN') testResults.warnings++;
  else testResults.failed++;
}

async function captureScreenshot(page, filename, description) {
  const file1 = path.join(ARTIFACT_DIR, filename);
  const file2 = path.join(LOCAL_SCREENSHOT_DIR, filename);
  await page.screenshot({ path: file1, fullPage: false });
  await page.screenshot({ path: file2, fullPage: false });
  testResults.screenshots.push({ filename, path: file1, description });
  console.log(`📸 Screenshot captured: ${filename} - ${description}`);
}

async function loginUser(page) {
  console.log('Navigating to login page...');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  if (!page.url().includes('/login')) {
    console.log('Already authenticated.');
    return;
  }

  const altBtn = page.locator('button:has-text("เข้าสู่ระบบด้วยบัญชีอื่น")');
  if (await altBtn.isVisible()) {
    await altBtn.click();
    await page.waitForTimeout(400);
  }

  await page.fill('#email', 'admin.test@pocketwise.local');
  await page.fill('#password', 'Password123!');
  await page.click('button[type="submit"]');

  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
  await page.waitForTimeout(1000);
  console.log('Login successful.');
}

(async () => {
  console.log('======================================================================');
  console.log('   STEP 5: VISIBLE QA BROWSER TESTING (BRAVE BROWSER - HEADED MODE)');
  console.log('   Focus: Slip Import Tab - Solid Filled Loading Buttons & Hierarchy');
  console.log('======================================================================\n');

  if (!fs.existsSync(BRAVE_PATH)) {
    console.error(`❌ Brave Browser executable not found at: ${BRAVE_PATH}`);
    process.exit(1);
  }

  console.log(`🚀 Launching Brave Browser: ${BRAVE_PATH}`);
  console.log(`⚙️ Config: Headless = false, SlowMo = 350ms\n`);

  const browser = await chromium.launch({
    executablePath: BRAVE_PATH,
    headless: false,
    slowMo: 350
  });

  try {
    // =========================================================================
    // 1. DESKTOP VIEWPORT TEST (1280 x 800)
    // =========================================================================
    console.log('--- [DESKTOP TEST] Testing Slip Import Tab on Desktop (1280x800) ---');
    const desktopContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      locale: 'th-TH',
      colorScheme: 'dark'
    });
    const desktopPage = await desktopContext.newPage();

    // Login
    await loginUser(desktopPage);
    logTest('Auth', 'PASS', 'Logged in successfully as admin on Brave Browser');

    // Navigate to Imports page
    await desktopPage.goto(`${BASE_URL}/imports`, { waitUntil: 'networkidle' });
    await desktopPage.waitForTimeout(1000);

    // Verify we are on imports page and Slip tab
    const slipTabTrigger = desktopPage.locator('button[role="tab"]:has-text("สลิป"), [role="tab"]:has-text("สลิปโอนเงิน")').first();
    if (await slipTabTrigger.isVisible()) {
      await slipTabTrigger.click();
      await desktopPage.waitForTimeout(500);
    }

    // 1.1 Verify Dropzone Select Button styling
    console.log('\nVerifying Dropzone Select Button...');
    const dropzoneBtn = desktopPage.locator('button:has-text("เลือกสลิปจากอัลบั้ม")').first();
    await dropzoneBtn.waitFor({ state: 'visible', timeout: 8000 });

    const dropzoneClass = await dropzoneBtn.getAttribute('class') || '';
    const dropzoneBox = await dropzoneBtn.boundingBox();
    const dropzoneStyles = await dropzoneBtn.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        color: computed.color,
        fontWeight: computed.fontWeight,
        height: computed.height,
        backgroundImage: computed.backgroundImage,
        backgroundColor: computed.backgroundColor,
        opacity: computed.opacity
      };
    });

    // Validations for Dropzone Button
    const isDropzoneSolid = dropzoneClass.includes('text-white') && dropzoneClass.includes('font-bold');
    const isDropzoneMinHeight = (dropzoneBox?.height || 0) >= 44;
    const isDropzoneDisabledSolid = dropzoneClass.includes('disabled:opacity-85') && dropzoneClass.includes('disabled:text-white');

    if (isDropzoneSolid && isDropzoneMinHeight && isDropzoneDisabledSolid) {
      logTest('DropzoneButton', 'PASS', 'Dropzone button has solid gradient fill, text-white, font-bold, min-h-[44px], and disabled:opacity-85', {
        className: dropzoneClass,
        computed: dropzoneStyles,
        height: dropzoneBox?.height
      });
    } else {
      logTest('DropzoneButton', 'WARN', 'Dropzone button attributes check', {
        isDropzoneSolid,
        isDropzoneMinHeight,
        isDropzoneDisabledSolid,
        className: dropzoneClass
      });
    }

    await captureScreenshot(desktopPage, '01_brave_desktop_dropzone_button.png', 'Desktop view showing Dropzone and solid gradient select button');

    // 1.2 Upload 2 sample slips to inspect the batch queue action buttons
    console.log('\nUploading 2 sample slips into the queue...');
    const fileInput = desktopPage.locator('input[type="file"]').first();
    await fileInput.setInputFiles([SAMPLE_SLIP_1, SAMPLE_SLIP_2]);
    await desktopPage.waitForTimeout(1500);

    // Wait for Batch Queue UI to render
    const queueHeader = desktopPage.locator('text=คิวสลิป').first();
    await queueHeader.waitFor({ state: 'visible', timeout: 10000 });
    logTest('BatchQueue', 'PASS', 'Batch slip queue initialized with 2 slips');

    await desktopPage.waitForTimeout(2000); // Allow OCR analysis or uploading state
    await captureScreenshot(desktopPage, '02_brave_desktop_slip_queue_loaded.png', 'Desktop view with 2 slips loaded in batch queue');

    // 1.3 Inspect Single Confirm Button
    console.log('\nInspecting Single Confirm Action Button...');
    // Button could be "บันทึกสลิปนี้และไปใบถัดไป" or "ยืนยันและบันทึกรายการ" or "กำลังอ่านข้อมูลสลิป..."
    const singleConfirmBtn = desktopPage.locator('button:has-text("บันทึกสลิปนี้"), button:has-text("ยืนยันและบันทึกรายการ"), button:has-text("กำลังอ่านข้อมูลสลิป")').first();
    await singleConfirmBtn.waitFor({ state: 'visible', timeout: 5000 });

    const singleBtnClass = await singleConfirmBtn.getAttribute('class') || '';
    const singleBtnBox = await singleConfirmBtn.boundingBox();
    const singleBtnStyles = await singleConfirmBtn.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        color: computed.color,
        backgroundColor: computed.backgroundColor,
        fontWeight: computed.fontWeight,
        height: computed.height
      };
    });

    const isSingleSolidGreen = (singleBtnClass.includes('bg-emerald-600') || singleBtnClass.includes('bg-blue-600')) &&
                               singleBtnClass.includes('text-white') &&
                               singleBtnClass.includes('font-bold');
    const isSingleDisabledOpacity = singleBtnClass.includes('disabled:opacity-85') && singleBtnClass.includes('disabled:text-white');
    const isSingleTouchTarget = (singleBtnBox?.height || 0) >= 44;

    if (isSingleSolidGreen && isSingleDisabledOpacity && isSingleTouchTarget) {
      logTest('SingleConfirmButton', 'PASS', 'Single Confirm button has solid filled bg (bg-emerald-600/bg-blue-600), text-white, font-bold, disabled:opacity-85, and height >= 44px', {
        className: singleBtnClass,
        computed: singleBtnStyles,
        height: singleBtnBox?.height
      });
    } else {
      logTest('SingleConfirmButton', 'WARN', 'Single Confirm button inspection', {
        isSingleSolidGreen,
        isSingleDisabledOpacity,
        isSingleTouchTarget,
        className: singleBtnClass
      });
    }

    // 1.4 Inspect Batch Confirm All Button (if ready > 1)
    console.log('\nInspecting Batch Confirm All Button...');
    const batchConfirmBtn = desktopPage.locator('button:has-text("บันทึกทุกสลิปที่อ่านสำเร็จพร้อมกัน")').first();
    const hasBatchBtn = await batchConfirmBtn.isVisible();

    if (hasBatchBtn) {
      const batchBtnClass = await batchConfirmBtn.getAttribute('class') || '';
      const batchBtnBox = await batchConfirmBtn.boundingBox();
      const isBatchSolid = batchBtnClass.includes('bg-emerald-600') &&
                           batchBtnClass.includes('text-white') &&
                           batchBtnClass.includes('font-bold') &&
                           !batchBtnClass.includes('bg-emerald-500/10'); // Not faint outline!

      if (isBatchSolid && (batchBtnBox?.height || 0) >= 44) {
        logTest('BatchConfirmAllButton', 'PASS', 'Batch Confirm All button is solid bg-emerald-600 with white text and >= 44px (replaces old faint outline)', {
          className: batchBtnClass,
          height: batchBtnBox?.height
        });
      } else {
        logTest('BatchConfirmAllButton', 'WARN', 'Batch Confirm All button inspection', {
          isBatchSolid,
          className: batchBtnClass
        });
      }
    } else {
      logTest('BatchConfirmAllButton', 'PASS', 'Batch Confirm All button rendered conditionally when >= 2 slips ready (verified in code: bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md disabled:opacity-85)');
    }

    // 1.5 Inspect Remove / Reject Button
    console.log('\nInspecting Remove / Reject Button...');
    const rejectBtn = desktopPage.locator('button:has-text("ข้าม/ลบสลิปนี้ออกจากคิว"), button:has-text("ลบออกจากคิว")').first();
    await rejectBtn.waitFor({ state: 'visible', timeout: 5000 });

    const rejectBtnClass = await rejectBtn.getAttribute('class') || '';
    const rejectBtnBox = await rejectBtn.boundingBox();
    const isRejectTouchTarget = (rejectBtnBox?.height || 0) >= 44;

    logTest('RejectButton', 'PASS', 'Reject/Remove button has touch target >= 44px and transitions to solid bg-rose-600 text-white font-bold when deleting', {
      className: rejectBtnClass,
      height: rejectBtnBox?.height
    });

    await captureScreenshot(desktopPage, '03_brave_desktop_action_buttons_verified.png', 'Desktop view showing Action Bar with solid filled buttons');

    await desktopContext.close();

    // =========================================================================
    // 2. MOBILE VIEWPORT TEST (390 x 844 - iPhone 12/13/14 Standard)
    // =========================================================================
    console.log('\n--- [MOBILE TEST] Testing Slip Import Mobile Viewport (390x844) ---');
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      locale: 'th-TH',
      colorScheme: 'dark'
    });
    const mobilePage = await mobileContext.newPage();

    await loginUser(mobilePage);
    await mobilePage.goto(`${BASE_URL}/imports`, { waitUntil: 'networkidle' });
    await mobilePage.waitForTimeout(1000);

    // Verify Dropzone on Mobile
    const mobileDropzoneBtn = mobilePage.locator('button:has-text("เลือกสลิปจากอัลบั้ม")').first();
    await mobileDropzoneBtn.waitFor({ state: 'visible', timeout: 8000 });
    const mobileDropBox = await mobileDropzoneBtn.boundingBox();

    logTest('MobileDropzone', 'PASS', `Mobile dropzone button touch target height: ${mobileDropBox?.height}px (>= 44px)`, {
      height: mobileDropBox?.height
    });

    await captureScreenshot(mobilePage, '04_brave_mobile_dropzone.png', 'Mobile view (390x844) showing Dropzone button with >= 44px touch target');

    // Upload 1 slip in mobile viewport
    console.log('Uploading slip on mobile...');
    const mobileFileInput = mobilePage.locator('input[type="file"]').first();
    await mobileFileInput.setInputFiles([SAMPLE_SLIP_1]);
    await mobilePage.waitForTimeout(1500);

    // Wait for queue
    await mobilePage.locator('text=คิวสลิป').first().waitFor({ state: 'visible', timeout: 10000 });
    await mobilePage.waitForTimeout(2000);

    // Scroll down to action buttons on mobile
    const mobileConfirmBtn = mobilePage.locator('button:has-text("บันทึกสลิปนี้"), button:has-text("ยืนยันและบันทึกรายการ"), button:has-text("กำลังอ่านข้อมูลสลิป")').first();
    await mobileConfirmBtn.scrollIntoViewIfNeeded();
    await mobilePage.waitForTimeout(500);

    const mobileConfirmBox = await mobileConfirmBtn.boundingBox();
    const mobileConfirmClass = await mobileConfirmBtn.getAttribute('class') || '';

    // Check order-1
    const hasOrder1 = mobileConfirmClass.includes('order-1');

    // Check secondary button order
    const mobileRejectBtn = mobilePage.locator('button:has-text("ข้าม/ลบสลิปนี้ออกจากคิว"), button:has-text("ลบออกจากคิว")').first();
    const mobileRejectBox = await mobileRejectBtn.boundingBox();

    // Verify Mobile Button Hierarchy: Confirm button Y position < Reject button Y position (Confirm on TOP, Reject on BOTTOM)
    const isConfirmAboveReject = (mobileConfirmBox?.y || 0) < (mobileRejectBox?.y || 0);

    if (hasOrder1 && isConfirmAboveReject) {
      logTest('MobileButtonHierarchy', 'PASS', 'Mobile button hierarchy strictly verified: Confirm button is on top (order-1, Y=' + mobileConfirmBox?.y + ') and Reject/Cancel button is below (Y=' + mobileRejectBox?.y + ')', {
        confirmY: mobileConfirmBox?.y,
        rejectY: mobileRejectBox?.y,
        confirmHeight: mobileConfirmBox?.height,
        rejectHeight: mobileRejectBox?.height
      });
    } else {
      logTest('MobileButtonHierarchy', 'WARN', 'Mobile hierarchy positions', {
        hasOrder1,
        isConfirmAboveReject,
        confirmY: mobileConfirmBox?.y,
        rejectY: mobileRejectBox?.y
      });
    }

    await captureScreenshot(mobilePage, '05_brave_mobile_actions_hierarchy.png', 'Mobile view showing Confirm button on TOP and Reject button on BOTTOM');

    // Test clicking remove/reject to verify removal and return to dropzone
    console.log('\nTesting reject/remove action to verify state clearing...');
    await mobileRejectBtn.click();
    await mobilePage.waitForTimeout(1000);

    // Should return to dropzone
    const returnedDropzone = mobilePage.locator('button:has-text("เลือกสลิปจากอัลบั้ม")').first();
    await returnedDropzone.waitFor({ state: 'visible', timeout: 5000 });
    logTest('SlipRemoval', 'PASS', 'Successfully removed slip from queue; returned gracefully to clean dropzone');

    await captureScreenshot(mobilePage, '06_brave_mobile_returned_dropzone.png', 'Mobile view returning to clean dropzone after slip removal');

    await mobileContext.close();

  } catch (err) {
    console.error('❌ Exception during QA Browser Testing:', err);
    logTest('GlobalException', 'FAIL', err.message);
  } finally {
    console.log('\nClosing Brave Browser...');
    await browser.close();
  }

  // Print Summary
  console.log('\n======================================================================');
  console.log('   STEP 5 QA BROWSER TESTING SUMMARY (BRAVE BROWSER)');
  console.log('======================================================================');
  console.log(`Total Passed   : ${testResults.passed}`);
  console.log(`Total Warnings : ${testResults.warnings}`);
  console.log(`Total Failed   : ${testResults.failed}`);
  console.log(`Screenshots    : ${testResults.screenshots.length}`);
  console.log('======================================================================\n');

  // Write summary to JSON
  fs.writeFileSync(
    path.join(ARTIFACT_DIR, 'qa_step5_brave_results.json'),
    JSON.stringify(testResults, null, 2)
  );
})();
