const { chromium } = require('d:/Projects/PocketWise/frontend/pocketwise-web/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = 'C:\\Users\\Panawat\\.gemini\\antigravity\\brain\\7635fa53-6dcc-4384-a0e0-5513657f6c00\\screenshots';
const BASE_URL = 'http://localhost:3000';

async function run() {
  console.log('======================================================================');
  console.log('   POCKETWISE QA - PLAYWRIGHT E2E TESTS');
  console.log('   Features: Monthly Report Export, PWA Support, Quick Math & Shortcuts');
  console.log('======================================================================\n');

  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({
    headless: true,
    channel: 'msedge',
  });

  const desktopContext = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await desktopContext.newPage();

  // ----------------------------------------------------
  // Feature 2 Check 1: manifest.webmanifest validation
  // ----------------------------------------------------
  console.log('--- 1. Testing manifest.webmanifest ---');
  const manifestRes = await page.request.get(`${BASE_URL}/manifest.webmanifest`);
  console.log('Manifest status:', manifestRes.status());
  if (manifestRes.status() !== 200) {
    throw new Error(`Manifest returned status ${manifestRes.status()}`);
  }
  const manifestJson = await manifestRes.json();
  console.log('Manifest short_name:', manifestJson.short_name);
  console.log('Manifest display:', manifestJson.display);
  console.log('Manifest categories:', manifestJson.categories);
  console.log('Manifest shortcuts:', manifestJson.shortcuts?.map(s => s.name));

  if (!manifestJson.categories || !manifestJson.categories.includes('finance')) {
    throw new Error('Manifest missing expected finance category');
  }
  if (!manifestJson.shortcuts || manifestJson.shortcuts.length < 3) {
    throw new Error('Manifest missing expected shortcuts');
  }
  console.log('✓ manifest.webmanifest is valid and accessible publicly\n');

  // ----------------------------------------------------
  // Authentication Flow
  // ----------------------------------------------------
  console.log('--- 2. Authenticating as Admin ---');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });

  const altBtn = page.locator('button:has-text("เข้าสู่ระบบด้วยบัญชีอื่น")');
  if (await altBtn.isVisible()) {
    await altBtn.click();
    await page.waitForTimeout(400);
  }

  if (page.url().includes('/login')) {
    await page.fill('#email', 'admin.test@pocketwise.local');
    await page.fill('#password', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
  }
  console.log('Logged in successfully, current URL:', page.url());

  // Save cookies/storage state
  const storageState = await desktopContext.storageState();

  // ----------------------------------------------------
  // Feature 1: Monthly Report Export (Desktop)
  // ----------------------------------------------------
  console.log('\n--- 3. Testing Feature 1: Monthly Report Export on Desktop ---');
  await page.goto(`${BASE_URL}/reports`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  const exportBtn = page.locator('button:has-text("ส่งออกข้อมูลรายงาน")');
  await exportBtn.waitFor({ state: 'visible', timeout: 10000 });
  console.log('Found "ส่งออกข้อมูลรายงาน" button, clicking...');
  await exportBtn.click();
  await page.waitForTimeout(600);

  // Verify BottomSheet opened
  const exportTitle = page.locator('text=ส่งออกข้อมูลรายงาน (Export Report)');
  await exportTitle.waitFor({ state: 'visible', timeout: 5000 });
  console.log('Export Report BottomSheet/Modal is open');

  // Toggle to "เลือกรายเดือนเฉพาะ"
  const specificMonthBtn = page.locator('button:has-text("เลือกรายเดือนเฉพาะ")');
  await specificMonthBtn.waitFor({ state: 'visible', timeout: 5000 });
  await specificMonthBtn.click();
  await page.waitForTimeout(500);

  // Verify month dropdown appeared
  const selectTrigger = page.locator('button[role="combobox"]').or(page.locator('button:has-text("เลือกเดือน")')).or(page.locator('[data-slot="select-trigger"]'));
  await selectTrigger.first().waitFor({ state: 'visible', timeout: 5000 });
  console.log('Specific month selector is visible');

  // Screenshot 25: Desktop Reports Export BottomSheet
  const shot25 = path.join(SCREENSHOT_DIR, '25_desktop_reports_export_bottomsheet.png');
  await page.screenshot({ path: shot25, fullPage: false });
  console.log('✓ Captured: screenshots/25_desktop_reports_export_bottomsheet.png');

  // Close export bottomsheet with Esc
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // ----------------------------------------------------
  // Feature 1: Monthly Report Export (Mobile)
  // ----------------------------------------------------
  console.log('\n--- 4. Testing Feature 1: Monthly Report Export on Mobile ---');
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    storageState: storageState,
    isMobile: true,
    hasTouch: true,
  });
  const mobilePage = await mobileContext.newPage();

  await mobilePage.goto(`${BASE_URL}/reports`, { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(1500);

  const mobileExportBtn = mobilePage.locator('button:has-text("ส่งออกข้อมูลรายงาน")');
  await mobileExportBtn.waitFor({ state: 'visible', timeout: 10000 });
  await mobileExportBtn.click();
  await mobilePage.waitForTimeout(600);

  const mobileSpecificMonthBtn = mobilePage.locator('button:has-text("เลือกรายเดือนเฉพาะ")');
  await mobileSpecificMonthBtn.waitFor({ state: 'visible', timeout: 5000 });
  await mobileSpecificMonthBtn.click();
  await mobilePage.waitForTimeout(500);

  // Screenshot 26: Mobile Reports Export BottomSheet
  const shot26 = path.join(SCREENSHOT_DIR, '26_mobile_reports_export_bottomsheet.png');
  await mobilePage.screenshot({ path: shot26, fullPage: false });
  console.log('✓ Captured: screenshots/26_mobile_reports_export_bottomsheet.png');

  // ----------------------------------------------------
  // Feature 2: Mobile PWA Install Card
  // ----------------------------------------------------
  console.log('\n--- 5. Testing Feature 2: Mobile PWA Install Card ---');
  await mobilePage.goto(`${BASE_URL}/transactions`, { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(1000);

  // Open Mobile Menu Drawer (bottom nav "เมนู" button)
  const menuNavBtn = mobilePage.locator('nav[aria-label="เมนูด่วนบนมือถือ"] button:has-text("เมนู")');
  await menuNavBtn.waitFor({ state: 'visible', timeout: 5000 });
  await menuNavBtn.click();
  await mobilePage.waitForTimeout(700);

  // Verify "ติดตั้งเป็นแอปมือถือ" card
  const pwaCard = mobilePage.locator('text=ติดตั้งเป็นแอปมือถือ');
  await pwaCard.scrollIntoViewIfNeeded();
  await pwaCard.waitFor({ state: 'visible', timeout: 5000 });

  const installBtn = mobilePage.locator('button:has-text("ติดตั้งแอป")');
  await installBtn.waitFor({ state: 'visible', timeout: 5000 });
  console.log('PWA Install card and "ติดตั้งแอป" button are visible');

  // Screenshot 27: Mobile PWA Install Card
  const shot27 = path.join(SCREENSHOT_DIR, '27_mobile_pwa_install_card.png');
  await mobilePage.screenshot({ path: shot27, fullPage: false });
  console.log('✓ Captured: screenshots/27_mobile_pwa_install_card.png');

  // Close mobile drawer
  const closeDrawerBtn = mobilePage.locator('button[aria-label="ปิดเมนู"]');
  if (await closeDrawerBtn.isVisible()) {
    await closeDrawerBtn.click();
    await mobilePage.waitForTimeout(400);
  }

  // ----------------------------------------------------
  // Feature 3: Global Keyboard Shortcuts (Desktop)
  // ----------------------------------------------------
  console.log('\n--- 6. Testing Feature 3: Global Keyboard Shortcuts on Desktop ---');
  await page.goto(`${BASE_URL}/transactions`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Ensure body is focused and not an input
  await page.locator('body').click({ position: { x: 500, y: 150 } });
  await page.waitForTimeout(300);

  console.log('Pressing "?" key for Keyboard Shortcuts...');
  await page.keyboard.press('?');
  await page.waitForTimeout(600);

  // Verify Shortcuts dialog
  const shortcutsDialogTitle = page.locator('text=คีย์ลัดสำหรับคีย์บอร์ด');
  await shortcutsDialogTitle.waitFor({ state: 'visible', timeout: 5000 });

  // Verify keys: N, Ctrl + K, ?, Esc, + - * / =
  const shortcutN = page.locator('kbd:has-text("N")');
  const shortcutCtrlK = page.locator('kbd:has-text("Ctrl + K")');
  const shortcutEsc = page.locator('kbd:has-text("Esc")');
  const shortcutMath = page.locator('kbd:has-text("+ - * / =")');

  await shortcutN.waitFor({ state: 'visible' });
  await shortcutCtrlK.waitFor({ state: 'visible' });
  await shortcutEsc.waitFor({ state: 'visible' });
  await shortcutMath.waitFor({ state: 'visible' });
  console.log('All shortcut keys (N, Ctrl+K, ?, Esc, Quick Math) verified');

  // Screenshot 28: Desktop Keyboard Shortcuts Cheat Sheet
  const shot28 = path.join(SCREENSHOT_DIR, '28_desktop_keyboard_shortcuts_cheat_sheet.png');
  await page.screenshot({ path: shot28, fullPage: false });
  console.log('✓ Captured: screenshots/28_desktop_keyboard_shortcuts_cheat_sheet.png');

  // Close shortcuts dialog with Esc
  console.log('Pressing Esc to close shortcuts dialog...');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(600);

  // Press 'N' key to open New Transaction form
  console.log('Pressing "n" key to open New Transaction form...');
  await page.keyboard.press('n');
  await page.waitForTimeout(800);

  const amountInput = page.locator('input#transaction-amount');
  await amountInput.waitFor({ state: 'visible', timeout: 5000 });
  console.log('New Transaction form opened via "N" shortcut');

  // Test Quick Math: type "85+15"
  await amountInput.click();
  await amountInput.fill('85+15');
  await page.waitForTimeout(500);

  // Verify live calculation badge "= 100฿"
  const calcBadge = page.locator('button:has-text("= 100฿")');
  await calcBadge.waitFor({ state: 'visible', timeout: 5000 });
  console.log('Quick Math live calculation badge "= 100฿" is visible');

  // Screenshot 29: Desktop Quick Math Input Evaluation
  const shot29 = path.join(SCREENSHOT_DIR, '29_desktop_quick_math_input_eval.png');
  await page.screenshot({ path: shot29, fullPage: false });
  console.log('✓ Captured: screenshots/29_desktop_quick_math_input_eval.png');

  // Press Enter to evaluate
  await amountInput.press('Enter');
  await page.waitForTimeout(400);
  const evalValue = await amountInput.inputValue();
  console.log('Evaluated input value on Desktop:', evalValue);
  if (evalValue !== '100') {
    throw new Error(`Expected evaluated amount to be '100', got '${evalValue}'`);
  }
  console.log('✓ Desktop Quick Math evaluated successfully to 100');

  // Close Quick Add
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // ----------------------------------------------------
  // Feature 3: Mobile Quick Math Input
  // ----------------------------------------------------
  console.log('\n--- 7. Testing Feature 3: Mobile Quick Math Input ---');
  await mobilePage.goto(`${BASE_URL}/transactions`, { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(1000);

  // Open Quick Add via center plus button
  const quickAddBtn = mobilePage.locator('button[aria-label="จดรายการด่วน"]');
  await quickAddBtn.waitFor({ state: 'visible', timeout: 5000 });
  await quickAddBtn.click();
  await mobilePage.waitForTimeout(800);

  const mobileAmountInput = mobilePage.locator('input#transaction-amount');
  await mobileAmountInput.waitFor({ state: 'visible', timeout: 5000 });
  await mobileAmountInput.click();
  await mobileAmountInput.fill('85+15');
  await mobilePage.waitForTimeout(500);

  const mobileCalcBadge = mobilePage.locator('button:has-text("= 100฿")');
  await mobileCalcBadge.waitFor({ state: 'visible', timeout: 5000 });
  console.log('Mobile Quick Math live calculation badge "= 100฿" is visible');

  // Screenshot 30: Mobile Quick Math Input
  const shot30 = path.join(SCREENSHOT_DIR, '30_mobile_quick_math_input.png');
  await mobilePage.screenshot({ path: shot30, fullPage: false });
  console.log('✓ Captured: screenshots/30_mobile_quick_math_input.png');

  // Press Enter to evaluate
  await mobileAmountInput.press('Enter');
  await mobilePage.waitForTimeout(400);
  const mobileEvalValue = await mobileAmountInput.inputValue();
  console.log('Evaluated input value on Mobile:', mobileEvalValue);
  if (mobileEvalValue !== '100') {
    throw new Error(`Expected evaluated mobile amount to be '100', got '${mobileEvalValue}'`);
  }
  console.log('✓ Mobile Quick Math evaluated successfully to 100');

  await browser.close();
  console.log('\n======================================================================');
  console.log('   ALL 3 FEATURES VERIFIED & 6 SCREENSHOTS CAPTURED SUCCESSFULLY!');
  console.log('======================================================================');
}

run().catch((err) => {
  console.error('\n❌ Test run failed with error:', err);
  process.exit(1);
});
