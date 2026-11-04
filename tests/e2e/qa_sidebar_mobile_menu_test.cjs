const { chromium } = require('d:/Projects/PocketWise/frontend/pocketwise-web/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = 'C:\\Users\\Panawat\\.gemini\\antigravity\\brain\\7635fa53-6dcc-4384-a0e0-5513657f6c00\\screenshots';
const BASE_URL = 'http://localhost:3000';

async function loginUser(page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });

  const altBtn = page.locator('button:has-text("เข้าสู่ระบบด้วยบัญชีอื่น")');
  if (await altBtn.isVisible()) {
    await altBtn.click();
    await page.waitForTimeout(400);
  }

  if (page.url().includes('/login')) {
    // Try admin@pocketwise.local / Admin@123456 first, or fallback
    const credentials = [
      { email: 'admin@pocketwise.local', pass: 'Admin@123456' },
      { email: 'admin.test@pocketwise.local', pass: 'Password123!' },
    ];

    let loggedIn = false;
    for (const cred of credentials) {
      console.log(`Trying login with: ${cred.email}`);
      await page.fill('#email', cred.email);
      await page.fill('#password', cred.pass);
      await page.click('button[type="submit"]');

      try {
        await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 6000 });
        loggedIn = true;
        console.log(`Login succeeded with: ${cred.email}`);
        break;
      } catch (e) {
        console.log(`Login failed with ${cred.email}, trying next...`);
        // clear inputs
        await page.fill('#email', '');
        await page.fill('#password', '');
      }
    }

    if (!loggedIn) {
      throw new Error('Failed to log in with available admin credentials');
    }
  }
}

async function run() {
  console.log('======================================================================');
  console.log('   POCKETWISE QA - SIDEBAR & MOBILE MENU VERIFICATION');
  console.log('======================================================================\n');

  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({
    headless: true,
    channel: 'msedge',
  });

  try {
    // =========================================================================
    // 1. Desktop Sidebar Verification (1280x800)
    // =========================================================================
    console.log('--- 1. Desktop Sidebar Header & Avatar Bell Verification ---');
    const desktopContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    const desktopPage = await desktopContext.newPage();

    await loginUser(desktopPage);

    // Save auth state for mobile context
    const storageState = await desktopContext.storageState();

    // Navigate to /transactions
    await desktopPage.goto(`${BASE_URL}/transactions`, { waitUntil: 'networkidle' });
    await desktopPage.waitForTimeout(1500);

    const sidebar = desktopPage.locator('aside');
    await sidebar.waitFor({ state: 'visible', timeout: 5000 });

    // A. Verify text "สวัสดี คุณ..." is GONE from sidebar
    const sidebarText = await sidebar.innerText();
    const hasGreeting = sidebarText.includes('สวัสดี') || sidebarText.includes('สวัสดี คุณ');
    console.log(`[Check 1A] "สวัสดี คุณ..." is GONE from Desktop sidebar: ${!hasGreeting ? 'PASS ✓' : 'FAIL ✗'}`);
    if (hasGreeting) {
      throw new Error('Found "สวัสดี" greeting in sidebar text!');
    }

    // B. Verify Notification Bell is positioned neatly inside User Profile Card next to avatar
    // User profile card has avatar and NotificationBell
    const userCard = sidebar.locator('div.rounded-2xl.border').first();
    await userCard.waitFor({ state: 'visible', timeout: 5000 });

    const avatar = userCard.locator('div.rounded-xl.bg-gradient-to-tr');
    const bellBtn = userCard.locator('button[aria-label*="แจ้งเตือน"]').or(userCard.locator('button:has(svg.lucide-bell)'));

    const avatarVisible = await avatar.isVisible();
    const bellVisible = await bellBtn.isVisible();

    console.log(`[Check 1B] Avatar visible inside User Card: ${avatarVisible ? 'PASS ✓' : 'FAIL ✗'}`);
    console.log(`[Check 1B] Notification Bell visible inside User Card: ${bellVisible ? 'PASS ✓' : 'FAIL ✗'}`);

    if (!avatarVisible || !bellVisible) {
      throw new Error('User profile card missing avatar or notification bell!');
    }

    // Check display name
    const userNameLocator = userCard.locator('p.truncate.font-semibold');
    const userName = await userNameLocator.innerText();
    console.log(`[Check 1B] User display name rendered: "${userName}"`);

    // Capture desktop screenshot
    const desktopScreenshotPath = path.join(SCREENSHOT_DIR, '31_desktop_sidebar_avatar_bell.png');
    await desktopPage.screenshot({ path: desktopScreenshotPath, fullPage: false });
    console.log(`[Screenshot Captured] -> ${desktopScreenshotPath}\n`);

    await desktopContext.close();

    // =========================================================================
    // 2. Mobile Drawer Grouped Shortcut Cards Verification (390x844)
    // =========================================================================
    console.log('--- 2. Mobile Drawer Grouped Shortcut Cards Verification ---');
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      storageState,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      hasTouch: true,
      isMobile: true,
    });
    const mobilePage = await mobileContext.newPage();

    await mobilePage.goto(`${BASE_URL}/transactions`, { waitUntil: 'networkidle' });
    await mobilePage.waitForTimeout(1500);

    // Locate bottom nav "เมนู" button
    const menuBtn = mobilePage.locator('nav[aria-label="เมนูด่วนบนมือถือ"] button:has-text("เมนู")');
    await menuBtn.waitFor({ state: 'visible', timeout: 5000 });
    console.log('Found mobile bottom nav "เมนู" button. Clicking to open drawer...');
    await menuBtn.click();
    await mobilePage.waitForTimeout(800);

    // Verify Mobile Drawer is open (aside has translate-x-0)
    const mobileSidebar = mobilePage.locator('aside');
    await mobileSidebar.waitFor({ state: 'visible', timeout: 5000 });

    // A. Verify "สวัสดี คุณ..." is GONE in Mobile Drawer
    const mobileDrawerText = await mobileSidebar.innerText();
    const hasMobileGreeting = mobileDrawerText.includes('สวัสดี') || mobileDrawerText.includes('สวัสดี คุณ');
    console.log(`[Check 2A] "สวัสดี คุณ..." is GONE from Mobile drawer: ${!hasMobileGreeting ? 'PASS ✓' : 'FAIL ✗'}`);
    if (hasMobileGreeting) {
      throw new Error('Found "สวัสดี" greeting in mobile drawer!');
    }

    // B. Verify Notification Bell inside user profile card next to avatar
    const mobileUserCard = mobileSidebar.locator('div.rounded-2xl.border').first();
    const mobileAvatar = mobileUserCard.locator('div.rounded-xl.bg-gradient-to-tr');
    const mobileBell = mobileUserCard.locator('button[aria-label*="แจ้งเตือน"]').or(mobileUserCard.locator('button:has(svg.lucide-bell)'));

    const mAvatarVis = await mobileAvatar.isVisible();
    const mBellVis = await mobileBell.isVisible();
    console.log(`[Check 2B] Avatar visible inside Mobile Card: ${mAvatarVis ? 'PASS ✓' : 'FAIL ✗'}`);
    console.log(`[Check 2B] Notification Bell visible inside Mobile Card: ${mBellVis ? 'PASS ✓' : 'FAIL ✗'}`);

    if (!mAvatarVis || !mBellVis) {
      throw new Error('Mobile user card missing avatar or notification bell!');
    }

    // C. Verify Grouped Menus as 2-column cards
    const expectedGroups = [
      'ธุรกรรม & การเงิน',
      'วางแผน & วิเคราะห์',
      'จัดการ & ตั้งค่า',
      'ผู้ดูแลระบบ (Admin)'
    ];

    for (const groupName of expectedGroups) {
      const groupHeader = mobileSidebar.locator(`text="${groupName}"`);
      const isHeaderVis = await groupHeader.first().isVisible();
      console.log(`[Check 2C] Group "${groupName}" header visible: ${isHeaderVis ? 'PASS ✓' : 'FAIL ✗'}`);
      if (!isHeaderVis) {
        throw new Error(`Group header "${groupName}" not found or visible!`);
      }
    }

    // Verify 2-column grid cards in Mobile Drawer
    const cardGrids = mobileSidebar.locator('div.grid.grid-cols-2');
    const gridCount = await cardGrids.count();
    console.log(`[Check 2C] 2-column card grid containers found: ${gridCount}`);
    if (gridCount < 3) {
      throw new Error(`Expected at least 3-4 card grids, found ${gridCount}`);
    }

    // Inspect individual card items (should have icons with colored bg boxes)
    const cards = mobileSidebar.locator('div.grid.grid-cols-2 a[href]');
    const totalCards = await cards.count();
    console.log(`[Check 2C] Total shortcut card links found: ${totalCards}`);
    if (totalCards < 8) {
      throw new Error(`Expected at least 8 menu shortcut cards, found ${totalCards}`);
    }

    // Capture mobile screenshot
    const mobileScreenshotPath = path.join(SCREENSHOT_DIR, '32_mobile_drawer_grouped_shortcut_cards.png');
    await mobilePage.screenshot({ path: mobileScreenshotPath, fullPage: false });
    console.log(`[Screenshot Captured] -> ${mobileScreenshotPath}\n`);

    await mobileContext.close();

    console.log('======================================================================');
    console.log('   ALL E2E VERIFICATION CHECKS PASSED SUCCESSFULLY!');
    console.log('======================================================================');

  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('\n❌ TEST RUN FAILED with error:');
  console.error(err);
  process.exit(1);
});
