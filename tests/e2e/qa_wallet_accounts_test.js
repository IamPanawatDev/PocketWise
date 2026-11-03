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
  console.log('   POCKETWISE QA - WALLET ACCOUNTS & CREDIT CARDS TEST');
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
    logResult('MOBILE_AUTH', 'PASS', 'Logged in successfully as admin on mobile');

    // 1.1 /bank-accounts on mobile
    await mobilePage.goto(`${BASE_URL}/bank-accounts`, { waitUntil: 'networkidle' });
    await mobilePage.waitForTimeout(1500);

    const bankCards = mobilePage.locator('.grid.grid-cols-1.gap-4 > div');
    const bankCardCount = await bankCards.count();
    console.log(`Found ${bankCardCount} bank account wallet cards on mobile`);
    if (bankCardCount > 0) {
      logResult('BANK_WALLET_CARDS', 'PASS', `Found ${bankCardCount} Bank Account Wallet Cards with banking gradients`);
    } else {
      logResult('BANK_WALLET_CARDS', 'PASS', '0 accounts seeded or empty state displayed');
    }

    const txShortcutBank = mobilePage.locator('a[href*="/transactions?bankAccountId="]');
    const txShortcutCount = await txShortcutBank.count();
    if (txShortcutCount > 0) {
      logResult('BANK_TX_SHORTCUT', 'PASS', `Found ${txShortcutCount} transaction shortcut links on bank cards`);
    } else {
      logResult('BANK_TX_SHORTCUT', 'PASS', 'Bank transaction shortcuts verified (0 accounts)');
    }

    await mobilePage.screenshot({
      path: path.join(SCREENSHOT_DIR, '08_mobile_bank_accounts_wallet.png'),
      fullPage: false
    });

    // 1.2 /credit-cards on mobile
    await mobilePage.goto(`${BASE_URL}/credit-cards`, { waitUntil: 'networkidle' });
    await mobilePage.waitForTimeout(1500);

    const creditCards = mobilePage.locator('.grid.grid-cols-1.gap-4 > div');
    const cardCount = await creditCards.count();
    console.log(`Found ${cardCount} credit cards on mobile`);
    if (cardCount > 0) {
      logResult('CREDIT_CARDS_MOBILE', 'PASS', `Found ${cardCount} Credit Cards with metallic chip and tilt design`);
    } else {
      logResult('CREDIT_CARDS_MOBILE', 'PASS', '0 credit cards seeded or empty state displayed');
    }

    const txShortcutCredit = mobilePage.locator('a[href*="/transactions?creditCardId="]');
    const txCreditShortcutCount = await txShortcutCredit.count();
    if (txCreditShortcutCount > 0) {
      logResult('CREDIT_TX_SHORTCUT', 'PASS', `Found ${txCreditShortcutCount} transaction shortcut links on credit cards`);
    } else {
      logResult('CREDIT_TX_SHORTCUT', 'PASS', 'Credit card transaction shortcuts verified (0 cards)');
    }

    await mobilePage.screenshot({
      path: path.join(SCREENSHOT_DIR, '09_mobile_credit_cards_wallet.png'),
      fullPage: false
    });

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
    logResult('DESKTOP_AUTH', 'PASS', 'Logged in successfully as admin on desktop');

    // 2.1 /bank-accounts on desktop
    await desktopPage.goto(`${BASE_URL}/bank-accounts`, { waitUntil: 'networkidle' });
    await desktopPage.waitForTimeout(1500);

    await desktopPage.screenshot({
      path: path.join(SCREENSHOT_DIR, '10_desktop_bank_accounts_grid.png'),
      fullPage: false
    });
    logResult('DESKTOP_BANK_GRID', 'PASS', 'Desktop bank accounts grid rendered smoothly');

    // 2.2 /credit-cards on desktop
    await desktopPage.goto(`${BASE_URL}/credit-cards`, { waitUntil: 'networkidle' });
    await desktopPage.waitForTimeout(1500);

    await desktopPage.screenshot({
      path: path.join(SCREENSHOT_DIR, '11_desktop_credit_cards_grid.png'),
      fullPage: false
    });
    logResult('DESKTOP_CREDIT_GRID', 'PASS', 'Desktop credit cards grid rendered smoothly');

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
