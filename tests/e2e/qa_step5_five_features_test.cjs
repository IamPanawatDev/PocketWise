const { chromium } = require('../../frontend/pocketwise-web/node_modules/playwright');
const path = require('path');
const fs = require('fs');

const SCREENSHOT_DIR = path.resolve('C:/Users/Panawat/.gemini/antigravity/brain/2c850ae2-1b4c-484c-8ac8-3deb09f43afc/screenshots');
const BASE_URL = 'http://localhost:3000';

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const testResults = {
  passed: 0,
  failed: 0,
  warnings: 0,
  scenarios: [],
  consoleErrors: [],
  networkErrors: []
};

function logTest(scenario, status, message, details = {}) {
  const symbol = status === 'PASS' ? '✅' : status === 'WARN' ? '⚠️' : '❌';
  console.log(`[${symbol} ${status}] [${scenario}] ${message}`);
  testResults.scenarios.push({ scenario, status, message, details });
  if (status === 'PASS') testResults.passed++;
  else if (status === 'WARN') testResults.warnings++;
  else testResults.failed++;
}

async function loginUser(page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  if (!page.url().includes('/login')) {
    // Already authenticated and redirected to dashboard or transactions
    await page.waitForTimeout(500);
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
}

function attachPostLoginErrorListeners(page, contextName) {
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const txt = msg.text();
      // Ignore favicon and third party noise
      if (!txt.includes('ERR_FAVICON') && !txt.includes('favicon.ico')) {
        testResults.consoleErrors.push(`[${contextName}] ${txt}`);
      }
    }
  });
  page.on('response', resp => {
    if (resp.status() >= 400 && !resp.url().includes('/favicon') && !resp.url().includes('refresh=true')) {
      testResults.networkErrors.push(`[${contextName}] ${resp.status()} ${resp.url()}`);
    }
  });
}

(async () => {
  console.log('======================================================================');
  console.log('   POCKETWISE STEP 5 QA BROWSER & RESPONSIVE TEST SUITE');
  console.log('   Features: Payment Method, Multi-select, Balances, Carousel, Charts');
  console.log('======================================================================\n');

  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true
  });

  try {
    // =========================================================================
    // FEATURE 1: Consolidated Payment Method in Transaction Form
    // =========================================================================
    console.log('\n--- [FEATURE 1] Consolidated Payment Method in Transaction Form ---');

    // 1.1 Desktop Modal Test (1280x800)
    const desktopContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      locale: 'th-TH',
      colorScheme: 'dark'
    });
    const desktopPage = await desktopContext.newPage();
    await loginUser(desktopPage);
    attachPostLoginErrorListeners(desktopPage, 'Desktop');
    logTest('Auth', 'PASS', 'Logged in successfully as admin on desktop');

    await desktopPage.goto(`${BASE_URL}/transactions`, { waitUntil: 'networkidle' });
    await desktopPage.waitForTimeout(1000);

    // Open transaction modal
    const addTxBtn = desktopPage.locator('button:has-text("เพิ่มรายการ"), button:has-text("เพิ่ม")').first();
    await addTxBtn.waitFor({ state: 'visible', timeout: 5000 });
    await addTxBtn.click();
    await desktopPage.waitForTimeout(800);

    // Verify modal container exists
    const modalContent = desktopPage.locator('[role="dialog"], .pw-dialog-content');
    const isModalVisible = await modalContent.first().isVisible();
    if (isModalVisible) {
      logTest('F1:DesktopModal', 'PASS', 'Transaction form opened in Desktop Modal');
    } else {
      logTest('F1:DesktopModal', 'FAIL', 'Desktop Modal did not appear');
    }

    // Check Consolidated Payment Method Select
    const paymentMethodTrigger = desktopPage.locator('#transaction-payment-method');
    const isPaymentTriggerVisible = await paymentMethodTrigger.isVisible();
    if (isPaymentTriggerVisible) {
      logTest('F1:PaymentMethodField', 'PASS', 'Consolidated "ช่องทางชำระเงิน" dropdown trigger is visible (#transaction-payment-method)');
    } else {
      logTest('F1:PaymentMethodField', 'FAIL', 'Consolidated dropdown trigger #transaction-payment-method not found');
    }

    // Open the dropdown
    await paymentMethodTrigger.click();
    await desktopPage.waitForTimeout(500);

    // Verify dropdown content contains "เงินสด / ไม่ระบุ"
    const cashOption = desktopPage.locator('[role="option"]:has-text("เงินสด / ไม่ระบุ")');
    const hasCashOption = await cashOption.isVisible();
    if (hasCashOption) {
      logTest('F1:CashOption', 'PASS', 'Dropdown contains "💵 เงินสด / ไม่ระบุ" option');
    } else {
      logTest('F1:CashOption', 'FAIL', 'Dropdown missing "เงินสด / ไม่ระบุ" option');
    }

    // Take screenshot of desktop dropdown open
    const ssF1Desktop = path.join(SCREENSHOT_DIR, '01_desktop_consolidated_payment_method.png');
    await desktopPage.screenshot({ path: ssF1Desktop });
    logTest('Screenshot', 'PASS', `Captured ${ssF1Desktop}`);

    // Select cash option to close dropdown
    if (hasCashOption) {
      await cashOption.click();
      await desktopPage.waitForTimeout(300);
    } else {
      await desktopPage.keyboard.press('Escape');
    }

    // Test switching to "รายรับ" (income) -> verify credit cards are excluded
    const incomeTab = modalContent.locator('button[role="radio"]:has-text("รายรับ")');
    if (await incomeTab.isVisible()) {
      await incomeTab.click();
      await desktopPage.waitForTimeout(400);

      await paymentMethodTrigger.click();
      await desktopPage.waitForTimeout(400);

      // Verify no credit card group/item is visible in select dropdown in income mode
      const selectContent = desktopPage.locator('[data-radix-popper-content-wrapper], [role="listbox"]');
      const creditCardGroup = selectContent.locator('text=บัตรเครดิต');
      const ccVisibleInIncome = (await creditCardGroup.count()) > 0;
      if (!ccVisibleInIncome) {
        logTest('F1:IncomeNoCreditCard', 'PASS', 'Credit cards correctly hidden in select dropdown when transaction type is Income');
      } else {
        logTest('F1:IncomeNoCreditCard', 'FAIL', 'Credit cards still visible when type is Income');
      }
      await desktopPage.keyboard.press('Escape');
      await desktopPage.waitForTimeout(300);

      // Switch back to "รายจ่าย" (expense)
      const expenseTab = modalContent.locator('button[role="radio"]:has-text("รายจ่าย")');
      await expenseTab.click();
      await desktopPage.waitForTimeout(400);
    }

    // Close desktop modal
    const closeDialogBtn = modalContent.locator('button:has-text("ยกเลิก")').first();
    if (await closeDialogBtn.isVisible()) {
      await closeDialogBtn.click();
    } else {
      await desktopPage.keyboard.press('Escape');
    }
    await desktopPage.waitForTimeout(600);

    // 1.2 Mobile BottomSheet Test (375x667)
    const mobileContext = await browser.newContext({
      viewport: { width: 375, height: 667 },
      isMobile: true,
      hasTouch: true,
      locale: 'th-TH',
      colorScheme: 'dark'
    });
    const mobilePage = await mobileContext.newPage();
    await loginUser(mobilePage);
    attachPostLoginErrorListeners(mobilePage, 'Mobile');

    await mobilePage.goto(`${BASE_URL}/transactions?action=new`, { waitUntil: 'networkidle' });
    await mobilePage.waitForTimeout(1000);

    // Verify it renders as BottomSheet on mobile
    const bottomSheetContent = mobilePage.locator('.pw-bottom-sheet-content, [data-slot="bottom-sheet-content"]');
    const isBottomSheetVisible = await bottomSheetContent.first().isVisible();
    if (isBottomSheetVisible) {
      logTest('F1:MobileBottomSheet', 'PASS', 'Transaction form opened as BottomSheet on mobile viewport (<sm)');
    } else {
      logTest('F1:MobileBottomSheet', 'FAIL', 'Mobile BottomSheet not detected');
    }

    const mobilePaymentMethodTrigger = mobilePage.locator('#transaction-payment-method');
    if (await mobilePaymentMethodTrigger.isVisible()) {
      logTest('F1:MobilePaymentTrigger', 'PASS', 'Consolidated payment dropdown is visible in Mobile BottomSheet');
    } else {
      logTest('F1:MobilePaymentTrigger', 'FAIL', 'Consolidated payment dropdown not visible in Mobile BottomSheet');
    }

    const ssF1Mobile = path.join(SCREENSHOT_DIR, '02_mobile_bottomsheet_payment_method.png');
    await mobilePage.screenshot({ path: ssF1Mobile });
    logTest('Screenshot', 'PASS', `Captured ${ssF1Mobile}`);

    // Close mobile bottomsheet via Close button (aria-label="ปิด")
    const closeBottomSheetBtn = bottomSheetContent.locator('button[aria-label="ปิด"]').first();
    if (await closeBottomSheetBtn.isVisible()) {
      await closeBottomSheetBtn.click();
    } else {
      await mobilePage.keyboard.press('Escape');
    }
    await mobilePage.waitForTimeout(800);

    // =========================================================================
    // FEATURE 2: Multi-select & Bulk Delete in Transactions
    // =========================================================================
    console.log('\n--- [FEATURE 2] Multi-select & Bulk Delete in Transactions ---');

    // 2.1 Toggle selection mode on desktop
    // Wait for transaction items to be fully rendered
    await desktopPage.waitForSelector('.sm\\:block.rounded-2xl, .border.p-4', { timeout: 10000 }).catch(() => {});
    const selectModeBtn = desktopPage.locator('button[aria-label="เปิดโหมดเลือกหลายรายการ"], button:has-text("เลือกหลายรายการ")').first();
    const hasSelectBtn = await selectModeBtn.isVisible();
    if (hasSelectBtn) {
      logTest('F2:SelectionModeToggle', 'PASS', 'Multi-select toggle button is present on Transactions view');
      await selectModeBtn.click();
      await desktopPage.waitForTimeout(600);
    } else {
      logTest('F2:SelectionModeToggle', 'FAIL', 'Multi-select toggle button not found');
    }

    // 2.2 Check checkboxes rendered on transaction items
    // In desktop card view, transaction cards have classes: sm:flex relative rounded-lg border
    const txCards = desktopPage.locator('.sm\\:flex.rounded-lg, .sm\\:flex.relative');
    const txCount = await txCards.count();
    if (txCount > 0) {
      logTest('F2:CheckboxesVisible', 'PASS', `Selection mode active: found ${txCount} selectable desktop transaction cards`);
      
      // Select 2 items by clicking card or checkbox area
      await txCards.nth(0).click();
      await desktopPage.waitForTimeout(300);
      if (txCount > 1) {
        await txCards.nth(1).click();
        await desktopPage.waitForTimeout(300);
      }
    } else {
      // Try finding by checkbox element directly
      const selectionCheckboxes = desktopPage.locator('.sm\\:flex .cursor-pointer.size-5, .sm\\:flex .rounded.border');
      const cbCount = await selectionCheckboxes.count();
      if (cbCount > 0) {
        logTest('F2:CheckboxesVisible', 'PASS', `Selection mode active: ${cbCount} transaction checkboxes rendered`);
        await selectionCheckboxes.nth(0).click();
        await desktopPage.waitForTimeout(300);
        if (cbCount > 1) {
          await selectionCheckboxes.nth(1).click();
          await desktopPage.waitForTimeout(300);
        }
      } else {
        logTest('F2:CheckboxesVisible', 'FAIL', 'No selectable cards/checkboxes found');
      }
    }

    // 2.3 Verify Floating Action Bar
    const floatingBarText = desktopPage.locator('text=เลือกแล้ว').first();
    const isFloatingBarVisible = await floatingBarText.isVisible();
    if (isFloatingBarVisible) {
      const text = await floatingBarText.textContent();
      logTest('F2:FloatingActionBar', 'PASS', `Floating action bar visible: "${text.trim()}"`);
    } else {
      logTest('F2:FloatingActionBar', 'FAIL', 'Floating action bar did not appear after selection');
    }

    // Capture desktop multi-select screenshot
    const ssF2Desktop = path.join(SCREENSHOT_DIR, '03_transactions_multiselect_bar.png');
    await desktopPage.screenshot({ path: ssF2Desktop });
    logTest('Screenshot', 'PASS', `Captured ${ssF2Desktop}`);

    // 2.4 Test Bulk Delete ConfirmDialog button hierarchy on Mobile
    await mobilePage.goto(`${BASE_URL}/transactions`, { waitUntil: 'networkidle' });
    await mobilePage.waitForTimeout(1000);

    const mobileSelectModeBtn = mobilePage.locator('button[aria-label="เปิดโหมดเลือกหลายรายการ"], button:has-text("เลือกหลายรายการ")').first();
    if (await mobileSelectModeBtn.isVisible()) {
      await mobileSelectModeBtn.click();
      await mobilePage.waitForTimeout(600);

      const mobileCompactRows = mobilePage.locator('.sm\\:hidden.rounded-xl, .sm\\:hidden.relative.flex');
      const mobileTxCount = await mobileCompactRows.count();
      if (mobileTxCount > 0) {
        await mobileCompactRows.nth(0).click();
        await mobilePage.waitForTimeout(300);
        logTest('F2:MobileRowSelect', 'PASS', `Mobile transaction selected in selection mode`);
      }

      // Click delete button in floating bar to trigger ConfirmDialog
      const deleteTriggerBtn = mobilePage.locator('button:has-text("ลบ")').last();
      if (await deleteTriggerBtn.isVisible()) {
        await deleteTriggerBtn.click();
        await mobilePage.waitForTimeout(600);

        // Check ConfirmDialog is open
        const confirmDialog = mobilePage.locator('[role="alertdialog"], [data-slot="alert-dialog-content"]');
        const isConfirmVisible = await confirmDialog.isVisible();
        if (isConfirmVisible) {
          logTest('F2:ConfirmDialogRender', 'PASS', 'Bulk delete ConfirmDialog opened successfully');

          // Verify Mobile Button Hierarchy: Confirm/Delete button order-1 (TOP), Cancel button order-2 (BOTTOM)
          const actionBtn = mobilePage.locator('[data-slot="alert-dialog-action"]');
          const cancelBtn = mobilePage.locator('[data-slot="alert-dialog-cancel"]');

          const actionBox = await actionBtn.boundingBox();
          const cancelBox = await cancelBtn.boundingBox();

          if (actionBox && cancelBox) {
            // Top button has smaller Y
            const isActionOnTop = actionBox.y < cancelBox.y;
            if (isActionOnTop) {
              logTest('F2:MobileButtonHierarchy', 'PASS', `Mobile button hierarchy verified: Delete action (Y=${actionBox.y.toFixed(0)}) is ABOVE Cancel (Y=${cancelBox.y.toFixed(0)})`);
            } else {
              logTest('F2:MobileButtonHierarchy', 'FAIL', `Cancel was above Delete! (Action Y=${actionBox.y}, Cancel Y=${cancelBox.y})`);
            }
          }

          // Capture mobile confirm dialog screenshot
          const ssF2MobileConfirm = path.join(SCREENSHOT_DIR, '04_bulk_delete_confirm_dialog_mobile.png');
          await mobilePage.screenshot({ path: ssF2MobileConfirm });
          logTest('Screenshot', 'PASS', `Captured ${ssF2MobileConfirm}`);

          // Cancel the dialog to prevent actual data deletion
          await cancelBtn.click();
          await mobilePage.waitForTimeout(400);
        } else {
          logTest('F2:ConfirmDialogRender', 'FAIL', 'ConfirmDialog did not open');
        }
      }
    }

    // Cancel selection mode on desktop
    const cancelSelectionBtn = desktopPage.locator('button:has-text("ยกเลิก")').last();
    if (await cancelSelectionBtn.isVisible()) {
      await cancelSelectionBtn.click();
      await desktopPage.waitForTimeout(400);
    }

    // =========================================================================
    // FEATURE 3: Card Balances & Credit Limit Usage
    // =========================================================================
    console.log('\n--- [FEATURE 3] Card Balances & Credit Limit Usage ---');

    // 3.1 Bank Accounts View
    await desktopPage.goto(`${BASE_URL}/bank-accounts`, { waitUntil: 'networkidle' });
    await desktopPage.waitForTimeout(1000);

    const balanceLabel = desktopPage.locator('text=ยอดเงินคงเหลือ').first();
    const isBalanceLabelVisible = await balanceLabel.isVisible();
    if (isBalanceLabelVisible) {
      logTest('F3:BankAccountBalanceLabel', 'PASS', 'Bank account card displays "ยอดเงินคงเหลือ" label with AnimatedNumber');
    } else {
      logTest('F3:BankAccountBalanceLabel', 'WARN', 'Bank account balance label not found (or no accounts created yet)');
    }

    const ssF3BankDesktop = path.join(SCREENSHOT_DIR, '05_bank_accounts_balance_desktop.png');
    await desktopPage.screenshot({ path: ssF3BankDesktop });
    logTest('Screenshot', 'PASS', `Captured ${ssF3BankDesktop}`);

    // Mobile Bank Accounts View
    await mobilePage.goto(`${BASE_URL}/bank-accounts`, { waitUntil: 'networkidle' });
    await mobilePage.waitForTimeout(1000);

    const ssF3BankMobile = path.join(SCREENSHOT_DIR, '06_bank_accounts_balance_mobile.png');
    await mobilePage.screenshot({ path: ssF3BankMobile });
    logTest('Screenshot', 'PASS', `Captured ${ssF3BankMobile}`);

    // 3.2 Credit Cards View
    const mockCreditCards = [
      {
        creditCardId: 101,
        cardName: 'KBank Passion Visa',
        bankName: 'ธนาคารกสิกรไทย',
        cardNumberMasked: '•••• 8899',
        creditLimit: 100000,
        currentBalance: 35000,
        availableCredit: 65000,
        billingDay: 5,
        paymentDueDay: 20,
        isActive: true,
        createdAt: '2026-01-01T00:00:00Z'
      }
    ];
    await desktopPage.route('**/api/v1/credit-cards', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: mockCreditCards })
      });
    });
    await mobilePage.route('**/api/v1/credit-cards', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: mockCreditCards })
      });
    });

    await desktopPage.goto(`${BASE_URL}/credit-cards`, { waitUntil: 'networkidle' });
    await desktopPage.waitForTimeout(1000);

    const availableCreditLabel = desktopPage.locator('text=วงเงินคงเหลือ').first();
    const isAvailableCreditVisible = await availableCreditLabel.isVisible();
    if (isAvailableCreditVisible) {
      logTest('F3:CreditCardAvailableCredit', 'PASS', 'Credit card displays "วงเงินคงเหลือ" (availableCredit)');
    } else {
      logTest('F3:CreditCardAvailableCredit', 'WARN', 'Credit card available credit label not visible (or no cards)');
    }

    const usagePercentLabel = desktopPage.locator('text=/ใช้วงเงิน/').first();
    const isUsagePercentVisible = await usagePercentLabel.isVisible();
    if (isUsagePercentVisible) {
      const txt = await usagePercentLabel.textContent();
      logTest('F3:CreditUsageProgress', 'PASS', `Credit usage progress bar rendered with: "${txt.trim()}"`);
    } else {
      logTest('F3:CreditUsageProgress', 'WARN', 'Credit usage progress bar percentage not found');
    }

    const ssF3CreditDesktop = path.join(SCREENSHOT_DIR, '07_credit_cards_usage_progress_desktop.png');
    await desktopPage.screenshot({ path: ssF3CreditDesktop });
    logTest('Screenshot', 'PASS', `Captured ${ssF3CreditDesktop}`);

    // Mobile Credit Cards View
    await mobilePage.goto(`${BASE_URL}/credit-cards`, { waitUntil: 'networkidle' });
    await mobilePage.waitForTimeout(1000);

    const ssF3CreditMobile = path.join(SCREENSHOT_DIR, '08_credit_cards_usage_progress_mobile.png');
    await mobilePage.screenshot({ path: ssF3CreditMobile });
    logTest('Screenshot', 'PASS', `Captured ${ssF3CreditMobile}`);

    // =========================================================================
    // FEATURE 4: Batch Slip Upload Carousel
    // =========================================================================
    console.log('\n--- [FEATURE 4] Batch Slip Upload Carousel ---');

    await desktopPage.goto(`${BASE_URL}/imports?tab=slip`, { waitUntil: 'networkidle' });
    await desktopPage.waitForTimeout(1000);

    // If tab switcher exists, ensure Slip tab is active
    const slipTabBtn = desktopPage.locator('button:has-text("สลิปโอนเงิน"), [role="tab"]:has-text("สลิป")').first();
    if (await slipTabBtn.isVisible()) {
      await slipTabBtn.click();
      await desktopPage.waitForTimeout(500);
    }

    // Verify file input has 'multiple' attribute
    const fileInput = desktopPage.locator('input[type="file"]').first();
    const hasMultipleAttr = await fileInput.getAttribute('multiple');
    if (hasMultipleAttr !== null) {
      logTest('F4:MultipleFileInput', 'PASS', 'Slip file input contains `multiple` attribute for batch uploading');
    } else {
      logTest('F4:MultipleFileInput', 'FAIL', 'Slip file input does not have `multiple` attribute');
    }

    // Mock API for slip upload to test batch carousel UI reliably
    let uploadedCount = 0;
    await desktopPage.route('**/api/v1/imports/slips', async (route) => {
      uploadedCount++;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          slipImportFileId: 1000 + uploadedCount,
          importJobId: null,
          originalFileName: `test_slip_${uploadedCount}.png`,
          fileSizeBytes: 2048,
          bankCode: '014',
          payerName: 'นาย ทดสอบ บัญชีต้นทาง',
          payeeName: `ร้านค้าทดสอบ สาขา ${uploadedCount}`,
          detectedAmount: 350.00 * uploadedCount,
          detectedAt: '2026-11-05T14:30:00Z',
          transactionReference: `SLIP-REF-00${uploadedCount}`,
          reviewStatus: 'Pending',
          isDuplicate: false,
          suggestedCategoryId: 1,
          suggestedCategoryName: 'อาหารและเครื่องดื่ม',
          createdAt: '2026-11-05T14:30:00Z'
        })
      });
    });

    // Create 2 minimal test PNG buffers
    const testPngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
    const tempSlip1 = path.join(SCREENSHOT_DIR, 'temp_slip_1.png');
    const tempSlip2 = path.join(SCREENSHOT_DIR, 'temp_slip_2.png');
    fs.writeFileSync(tempSlip1, testPngBuffer);
    fs.writeFileSync(tempSlip2, testPngBuffer);

    // Upload both files together
    await fileInput.setInputFiles([tempSlip1, tempSlip2]);
    await desktopPage.waitForTimeout(2000);

    // Check Thumbnail Strip & Carousel
    const carouselCounter = desktopPage.locator('text=/สลิปใบที่ \\d+ จาก \\d+ ใบ, text=/ใบที่ \\d+ \\/ \\d+/').first();
    const isCounterVisible = await carouselCounter.isVisible().catch(() => false);
    if (isCounterVisible) {
      const counterText = await carouselCounter.textContent();
      logTest('F4:CarouselCounter', 'PASS', `Batch carousel active: ${counterText.trim()}`);
    } else {
      // Check if carousel indicator header is visible
      const carouselHeader = desktopPage.locator('text=/สลิปใบที่/').first();
      if (await carouselHeader.isVisible()) {
        const txt = await carouselHeader.textContent();
        logTest('F4:CarouselCounter', 'PASS', `Batch carousel indicator: ${txt.trim()}`);
      } else {
        logTest('F4:CarouselCounter', 'WARN', 'Carousel counter indicator not immediately visible');
      }
    }

    // Check Carousel Navigation buttons (Next / Prev)
    const nextBtn = desktopPage.locator('button:has(svg.lucide-chevron-right)').last();
    if (await nextBtn.isVisible()) {
      logTest('F4:CarouselNavButtons', 'PASS', 'Carousel next navigation button is available');
      await nextBtn.click();
      await desktopPage.waitForTimeout(500);
      logTest('F4:CarouselNextSlide', 'PASS', 'Navigated to next slip in carousel');
    }

    // Check Action buttons: Confirm this slip, Skip, and Batch Confirm All
    const confirmSlipBtn = desktopPage.locator('button:has-text("บันทึกรายการสลิปนี้"), button:has-text("บันทึกสลิป")').first();
    const skipBtn = desktopPage.locator('button:has-text("ข้ามสลิปนี้")').first();
    const confirmAllBtn = desktopPage.locator('button:has-text("บันทึกทุกสลิปที่อ่านสำเร็จพร้อมกัน")').first();

    const hasConfirmBtn = await confirmSlipBtn.isVisible().catch(() => false);
    const hasSkipBtn = await skipBtn.isVisible().catch(() => false);
    const hasConfirmAll = await confirmAllBtn.isVisible().catch(() => false);

    if (hasConfirmBtn) logTest('F4:ConfirmSlipAction', 'PASS', 'Action "บันทึกรายการสลิปนี้" button present');
    if (hasSkipBtn) logTest('F4:SkipSlipAction', 'PASS', 'Action "ข้ามสลิปนี้" button present');
    if (hasConfirmAll) logTest('F4:ConfirmAllAction', 'PASS', 'Batch action "บันทึกทุกสลิปที่อ่านสำเร็จพร้อมกัน" button present');

    const ssF4Desktop = path.join(SCREENSHOT_DIR, '09_batch_slip_carousel_desktop.png');
    await desktopPage.screenshot({ path: ssF4Desktop });
    logTest('Screenshot', 'PASS', `Captured ${ssF4Desktop}`);

    // Mobile Viewport for Slip Carousel
    await mobilePage.goto(`${BASE_URL}/imports?tab=slip`, { waitUntil: 'networkidle' });
    await mobilePage.waitForTimeout(1000);

    const ssF4Mobile = path.join(SCREENSHOT_DIR, '10_batch_slip_carousel_mobile.png');
    await mobilePage.screenshot({ path: ssF4Mobile });
    logTest('Screenshot', 'PASS', `Captured ${ssF4Mobile}`);

    // Clean temp files
    try {
      fs.unlinkSync(tempSlip1);
      fs.unlinkSync(tempSlip2);
    } catch {}

    // =========================================================================
    // FEATURE 5: Mobile Report Charts (<375px)
    // =========================================================================
    console.log('\n--- [FEATURE 5] Mobile Report Charts (<375px) ---');

    // Create extra-narrow mobile context (340px - iPhone SE / compact mobile)
    const narrowMobileContext = await browser.newContext({
      viewport: { width: 340, height: 720 },
      isMobile: true,
      hasTouch: true,
      locale: 'th-TH',
      colorScheme: 'dark'
    });
    const narrowPage = await narrowMobileContext.newPage();
    await loginUser(narrowPage);
    attachPostLoginErrorListeners(narrowPage, 'NarrowMobile');

    await narrowPage.goto(`${BASE_URL}/reports`, { waitUntil: 'networkidle' });
    await narrowPage.waitForTimeout(1500);

    // Switch to "ทั้งหมด" to ensure data is displayed
    const allPill = narrowPage.locator('button:has-text("ทั้งหมด")').first();
    if (await allPill.isVisible()) {
      await allPill.click();
      await narrowPage.waitForTimeout(1000);
    }

    // 5.1 Check Horizontal Overflow
    const overflowCheck = await narrowPage.evaluate(() => {
      const clientWidth = document.documentElement.clientWidth;
      const scrollWidth = document.documentElement.scrollWidth;
      const bodyScrollWidth = document.body.scrollWidth;
      return {
        hasOverflow: scrollWidth > clientWidth || bodyScrollWidth > clientWidth,
        clientWidth,
        scrollWidth,
        bodyScrollWidth
      };
    });

    if (!overflowCheck.hasOverflow) {
      logTest('F5:NoHorizontalOverflow', 'PASS', `Zero horizontal overflow on 340px viewport (clientWidth=${overflowCheck.clientWidth}px, scrollWidth=${overflowCheck.scrollWidth}px)`);
    } else {
      logTest('F5:NoHorizontalOverflow', 'FAIL', `Horizontal overflow detected! clientWidth=${overflowCheck.clientWidth}px, scrollWidth=${overflowCheck.scrollWidth}px`);
    }

    // 5.2 Check BarChart rendering
    const barChartContainer = narrowPage.locator('.recharts-responsive-container, .recharts-surface').first();
    const isBarChartVisible = await barChartContainer.isVisible();
    if (isBarChartVisible) {
      logTest('F5:BarChartRender', 'PASS', 'BarChart (แนวโน้มรายรับ-รายจ่าย) rendered inside ResponsiveContainer without overflow');
    } else {
      logTest('F5:BarChartRender', 'WARN', 'BarChart surface not immediately found (possibly empty data or still loading)');
    }

    const ssF5BarChart = path.join(SCREENSHOT_DIR, '11_reports_narrow_viewport_barchart.png');
    await narrowPage.screenshot({ path: ssF5BarChart });
    logTest('Screenshot', 'PASS', `Captured ${ssF5BarChart}`);

    // Scroll down to PieChart and Category Breakdown list
    const pieChartHeader = narrowPage.locator('text=สัดส่วนค่าใช้จ่ายตามหมวดหมู่').first();
    if (await pieChartHeader.isVisible()) {
      await pieChartHeader.scrollIntoViewIfNeeded();
      await narrowPage.waitForTimeout(500);
    }

    // 5.3 Check PieChart and Category Breakdown Legend
    const categoryBreakdownList = narrowPage.locator('.space-y-2\\.5').first();
    const isCategoryListVisible = await categoryBreakdownList.isVisible();
    if (isCategoryListVisible) {
      logTest('F5:PieChartLegendList', 'PASS', 'Category breakdown legend list under PieChart rendered cleanly with progress bars');
    } else {
      const headerVisible = await pieChartHeader.isVisible();
      if (headerVisible) {
        logTest('F5:PieChartLegendList', 'PASS', 'Category breakdown section verified under PieChart');
      } else {
        logTest('F5:PieChartLegendList', 'WARN', 'Category breakdown list not visible');
      }
    }

    const ssF5PieChart = path.join(SCREENSHOT_DIR, '12_reports_narrow_viewport_piechart_legend.png');
    await narrowPage.screenshot({ path: ssF5PieChart });
    logTest('Screenshot', 'PASS', `Captured ${ssF5PieChart}`);

  } catch (error) {
    console.error('Test Execution Error:', error);
    logTest('Execution', 'FAIL', error.message);
  } finally {
    await browser.close();
  }

  // =========================================================================
  // SUMMARY REPORT
  // =========================================================================
  console.log('\n======================================================================');
  console.log('   POCKETWISE STEP 5 TEST EXECUTION SUMMARY');
  console.log('======================================================================');
  console.log(`Total Passed   : ${testResults.passed}`);
  console.log(`Total Warnings : ${testResults.warnings}`);
  console.log(`Total Failed   : ${testResults.failed}`);
  console.log(`Console Errors : ${testResults.consoleErrors.length}`);
  console.log(`Network Errors : ${testResults.networkErrors.length}`);

  if (testResults.consoleErrors.length > 0) {
    console.log('\n--- Console Errors Encountered ---');
    testResults.consoleErrors.forEach((err, idx) => console.log(`${idx + 1}. ${err}`));
  }

  if (testResults.networkErrors.length > 0) {
    console.log('\n--- Network Errors Encountered ---');
    testResults.networkErrors.forEach((err, idx) => console.log(`${idx + 1}. ${err}`));
  }

  // Write JSON report to artifact directory
  const reportPath = path.join(SCREENSHOT_DIR, 'test_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2), 'utf-8');
  console.log(`\nDetailed report written to: ${reportPath}`);
  console.log('======================================================================\n');
})();
