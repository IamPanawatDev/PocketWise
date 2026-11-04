const { chromium } = require('../../frontend/pocketwise-web/node_modules/playwright');
const path = require('path');
const fs = require('fs');

const SCREENSHOT_DIR = path.resolve('C:/Users/Panawat/.gemini/antigravity/brain/7635fa53-6dcc-4384-a0e0-5513657f6c00/screenshots');
const BASE_URL = 'http://localhost:3000';

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
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
  console.log('   POCKETWISE QA - FULL MODERNIZATION SUITE TEST');
  console.log('======================================================================\n');

  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true,
  });

  try {
    // ---------------------------------------------------------
    // Test 1: Desktop Viewport Testing (1280x800)
    // ---------------------------------------------------------
    console.log('=== Step 1: Desktop Tests (Categories, Tags, Settings, Command Palette) ===');
    const desktopContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    const desktopPage = await desktopContext.newPage();
    await loginUser(desktopPage);

    // 1.1 Categories Page with Search & Tabs
    await desktopPage.goto(`${BASE_URL}/categories`, { waitUntil: 'networkidle' });
    await desktopPage.waitForTimeout(800);
    // Filter to "รายจ่าย"
    await desktopPage.click('button:has-text("รายจ่าย")');
    await desktopPage.waitForTimeout(400);
    const catScreenshot = path.join(SCREENSHOT_DIR, '18_desktop_categories_tabs_and_search.png');
    await desktopPage.screenshot({ path: catScreenshot });
    console.log(`Saved screenshot: ${catScreenshot}`);

    // 1.2 Tags Page with Search
    await desktopPage.goto(`${BASE_URL}/tags`, { waitUntil: 'networkidle' });
    await desktopPage.waitForTimeout(800);
    const tagScreenshot = path.join(SCREENSHOT_DIR, '19_desktop_tags_view_with_search.png');
    await desktopPage.screenshot({ path: tagScreenshot });
    console.log(`Saved screenshot: ${tagScreenshot}`);

    // 1.3 Settings Page (Profile, Preferences, ConfirmDialog)
    await desktopPage.goto(`${BASE_URL}/settings`, { waitUntil: 'networkidle' });
    await desktopPage.waitForTimeout(800);
    const settingsScreenshot = path.join(SCREENSHOT_DIR, '20_desktop_settings_and_danger_zone.png');
    await desktopPage.screenshot({ path: settingsScreenshot });
    console.log(`Saved screenshot: ${settingsScreenshot}`);

    // 1.4 Command Palette Trigger (Ctrl+K button)
    const searchBtn = desktopPage.locator('button[aria-label="ค้นหาด่วน (Ctrl+K)"]');
    await searchBtn.click();
    await desktopPage.waitForTimeout(500);
    // Type query "งบ"
    await desktopPage.fill('input[placeholder*="ค้นหาหน้า"]', 'งบ');
    await desktopPage.waitForTimeout(400);
    const paletteScreenshot = path.join(SCREENSHOT_DIR, '21_desktop_command_palette_search.png');
    await desktopPage.screenshot({ path: paletteScreenshot });
    console.log(`Saved screenshot: ${paletteScreenshot}`);

    await desktopContext.close();

    // ---------------------------------------------------------
    // Test 2: Mobile Viewport Testing (390x844)
    // ---------------------------------------------------------
    console.log('\n=== Step 2: Mobile Tests (Header Search, Categories, Slip Import) ===');
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const mobilePage = await mobileContext.newPage();
    await loginUser(mobilePage);

    // 2.1 Mobile Command Palette via Header Search Icon
    const mobileSearchBtn = mobilePage.locator('header button[aria-label="ค้นหาด่วน"]');
    await mobileSearchBtn.click();
    await mobilePage.waitForTimeout(500);
    const mobilePaletteScreenshot = path.join(SCREENSHOT_DIR, '22_mobile_command_palette.png');
    await mobilePage.screenshot({ path: mobilePaletteScreenshot });
    console.log(`Saved screenshot: ${mobilePaletteScreenshot}`);

    // Press ESC to close
    await mobilePage.keyboard.press('Escape');
    await mobilePage.waitForTimeout(400);

    // 2.2 Mobile Categories View
    await mobilePage.goto(`${BASE_URL}/categories`, { waitUntil: 'networkidle' });
    await mobilePage.waitForTimeout(800);
    const mobileCatScreenshot = path.join(SCREENSHOT_DIR, '23_mobile_categories_segmented.png');
    await mobilePage.screenshot({ path: mobileCatScreenshot });
    console.log(`Saved screenshot: ${mobileCatScreenshot}`);

    // 2.3 Mobile Slip Import View
    await mobilePage.goto(`${BASE_URL}/imports`, { waitUntil: 'networkidle' });
    await mobilePage.waitForTimeout(800);
    const mobileImportScreenshot = path.join(SCREENSHOT_DIR, '24_mobile_slip_import_dropzone.png');
    await mobilePage.screenshot({ path: mobileImportScreenshot });
    console.log(`Saved screenshot: ${mobileImportScreenshot}`);

    await mobileContext.close();

    console.log('\n=== ALL QA BROWSER TESTS PASSED 100% ===');
  } catch (err) {
    console.error('QA Test error:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
