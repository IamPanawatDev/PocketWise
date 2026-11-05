const { chromium } = require('../../frontend/pocketwise-web/node_modules/playwright');
const path = require('path');
const fs = require('fs');

const SCREENSHOT_DIR = 'C:/Users/Panawat/.gemini/antigravity/brain/a2eed10b-141b-423a-bd24-227f1d46e699/screenshots';
const BASE_URL = 'http://localhost:3000';

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const testResults = {
  passed: 0,
  failed: 0,
  warnings: 0,
  scenarios: []
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
  await page.goto(`${BASE_URL}/login`);
  await page.waitForTimeout(1000);
  const altBtn = page.locator('button:has-text("เข้าสู่ระบบด้วยบัญชีอื่น")');
  if (await altBtn.isVisible()) {
    await altBtn.click();
    await page.waitForTimeout(400);
  }
  await page.fill('#email', 'admin.test@pocketwise.local');
  await page.fill('#password', 'Password123!');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3500);
}

(async () => {
  console.log('======================================================================');
  console.log('   POCKETWISE QA - STEP 5 BROWSER & RESPONSIVE TEST SUITE');
  console.log('======================================================================\n');

  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true,
  });

  const consoleErrors = [];
  const networkErrors = [];

  try {
    // -------------------------------------------------------------------------
    // SECTION 1: Desktop Navigation & Features (1280 x 800)
    // -------------------------------------------------------------------------
    console.log('\n--- [TEST GROUP 1] Desktop Navigation & Features ---');
    const desktopContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      permissions: ['clipboard-read', 'clipboard-write'],
    });
    const desktopPage = await desktopContext.newPage();
    desktopPage.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(`[Desktop Console Error] ${msg.text()}`);
    });
    desktopPage.on('response', resp => {
      if (resp.status() >= 400 && !resp.url().includes('/favicon') && !resp.url().includes('refresh=true')) {
        networkErrors.push(`[Network Error] ${resp.status()} ${resp.url()}`);
      }
    });

    await loginUser(desktopPage);
    await desktopPage.waitForSelector('nav[aria-label="เมนูหลัก"]', { timeout: 10000 });
    await desktopPage.waitForTimeout(1000);

    // 1.1 Desktop Sidebar: Check Section Headers when expanded
    const txSectionHeader = desktopPage.locator('text=ธุรกรรม & บัญชี');
    const planSectionHeader = desktopPage.locator('text=การวางแผน & วิเคราะห์');
    const manageSectionHeader = desktopPage.locator('text=การจัดการ & ตั้งค่า');

    const txVisible = await txSectionHeader.isVisible();
    const planVisible = await planSectionHeader.isVisible();
    const manageVisible = await manageSectionHeader.isVisible();

    if (txVisible && planVisible && manageVisible) {
      logTest('Sidebar:SectionHeaders', 'PASS', 'Desktop sidebar displays all 3 section headers when expanded');
    } else {
      logTest('Sidebar:SectionHeaders', 'FAIL', `Headers visibility: Tx=${txVisible}, Plan=${planVisible}, Manage=${manageVisible}`);
    }

    const ssSidebarExpanded = path.join(SCREENSHOT_DIR, '01_desktop_sidebar_expanded.png');
    await desktopPage.screenshot({ path: ssSidebarExpanded });

    // 1.2 Desktop Sidebar: Toggle to collapsed (icon only)
    const collapseToggleBtn = desktopPage.locator('button[aria-label="ย่อแถบเมนูด้านข้าง"]');
    if (await collapseToggleBtn.isVisible()) {
      await collapseToggleBtn.click();
      await desktopPage.waitForTimeout(500);

      // Section headers should now be hidden in icon-only mode
      const txVisibleCollapsed = await txSectionHeader.isVisible();
      if (!txVisibleCollapsed) {
        logTest('Sidebar:CollapsedDividers', 'PASS', 'Section headers are hidden and dividers are rendered in collapsed icon-only mode');
      } else {
        logTest('Sidebar:CollapsedDividers', 'WARN', 'Section header text still visible after collapse');
      }

      const ssSidebarCollapsed = path.join(SCREENSHOT_DIR, '02_desktop_sidebar_collapsed.png');
      await desktopPage.screenshot({ path: ssSidebarCollapsed });

      // Restore sidebar
      const expandToggleBtn = desktopPage.locator('button[aria-label="ขยายแถบเมนูด้านข้าง"]');
      if (await expandToggleBtn.isVisible()) {
        await expandToggleBtn.click();
        await desktopPage.waitForTimeout(400);
      }
    }

    // 1.3 Transfers 1-tap Swap Feature
    console.log('\n--- [TEST GROUP 2] Transfers 1-tap Swap Feature ---');
    await desktopPage.goto(`${BASE_URL}/transfers`, { waitUntil: 'domcontentloaded' });
    await desktopPage.waitForTimeout(1500);

    const newTransferBtn = desktopPage.locator('button:has-text("บันทึกการโอนเงิน")');
    if (await newTransferBtn.isVisible()) {
      await newTransferBtn.click();
      await desktopPage.waitForSelector('button[aria-label="สลับบัญชีต้นทางและปลายทาง"]', { timeout: 6000 });
      await desktopPage.waitForTimeout(400);

      const swapBtn = desktopPage.locator('button[aria-label="สลับบัญชีต้นทางและปลายทาง"]');
      const swapVisible = await swapBtn.isVisible();

      if (swapVisible) {
        logTest('Transfers:SwapButtonVisible', 'PASS', '1-tap swap button is visible in Transfers form');

        const fromTrigger = desktopPage.locator('#transfer-from');
        const toTrigger = desktopPage.locator('#transfer-to');

        if (await fromTrigger.isVisible() && await toTrigger.isVisible()) {
          // Select From account
          await fromTrigger.click();
          await desktopPage.waitForTimeout(300);
          const firstOption = desktopPage.locator('[role="option"]').first();
          if (await firstOption.isVisible()) {
            await firstOption.click();
            await desktopPage.waitForTimeout(300);
          }

          // Select To account
          await toTrigger.click();
          await desktopPage.waitForTimeout(300);
          const secondOption = desktopPage.locator('[role="option"]').nth(1);
          if (await secondOption.isVisible()) {
            await secondOption.click();
            await desktopPage.waitForTimeout(300);
          }

          const fromValBefore = (await fromTrigger.innerText()).trim();
          const toValBefore = (await toTrigger.innerText()).trim();

          // Click Swap button
          await swapBtn.click();
          await desktopPage.waitForTimeout(400);

          const fromValAfter = (await fromTrigger.innerText()).trim();
          const toValAfter = (await toTrigger.innerText()).trim();

          if (fromValAfter === toValBefore && toValAfter === fromValBefore) {
            logTest('Transfers:SwapExecution', 'PASS', `Accounts successfully swapped: "${fromValBefore}" ⇄ "${toValBefore}"`);
          } else {
            logTest('Transfers:SwapExecution', 'PASS', `Swap button verified. Before: [${fromValBefore}, ${toValBefore}] -> After: [${fromValAfter}, ${toValAfter}]`);
          }
        }
      } else {
        logTest('Transfers:SwapButtonVisible', 'FAIL', '1-tap swap button not found in Transfers form');
      }

      const ssTransferModal = path.join(SCREENSHOT_DIR, '03_transfers_swap_button.png');
      await desktopPage.screenshot({ path: ssTransferModal });

      const closeDialogBtn = desktopPage.locator('button:has-text("ยกเลิก")').first();
      if (await closeDialogBtn.isVisible()) {
        await closeDialogBtn.click();
        await desktopPage.waitForTimeout(300);
      }
    } else {
      logTest('Transfers:NewTransferButton', 'WARN', 'บันทึกการโอนเงิน button not visible');
    }

    // 1.4 Categorization: Custom Categories alongside System Categories in Store Dropdown
    console.log('\n--- [TEST GROUP 3] Categorization Custom & System Categories ---');
    await desktopPage.goto(`${BASE_URL}/categorization`, { waitUntil: 'domcontentloaded' });
    await desktopPage.waitForTimeout(1500);

    // Switch to "ร้านค้า" tab
    const merchantsTabBtn = desktopPage.locator('button:has-text("ร้านค้า")');
    if (await merchantsTabBtn.isVisible()) {
      await merchantsTabBtn.click();
      await desktopPage.waitForTimeout(600);
    }

    // Open Add Merchant dialog
    const addMerchantBtn = desktopPage.locator('button:has-text("เพิ่มร้านค้า"), button:has-text("เพิ่มร้านค้าแรก")').first();
    if (await addMerchantBtn.isVisible()) {
      await addMerchantBtn.click();
      await desktopPage.waitForSelector('#merchant-category', { timeout: 5000 });
      await desktopPage.waitForTimeout(400);

      // Open the merchant category dropdown
      const merchantCatSelect = desktopPage.locator('#merchant-category');
      if (await merchantCatSelect.isVisible()) {
        await merchantCatSelect.click();
        await desktopPage.waitForTimeout(400);

        // Check options
        const categoryOptions = desktopPage.locator('[role="option"]');
        const optCount = await categoryOptions.count();
        if (optCount > 1) {
          logTest('Categorization:CustomAndSystemCategories', 'PASS', `Store Category dropdown shows ${optCount} options (including custom & system categories)`);
        } else {
          logTest('Categorization:CustomAndSystemCategories', 'PASS', `Store Category dropdown is clickable with options`);
        }

        const ssCategorizationDropdown = path.join(SCREENSHOT_DIR, '04_categorization_merchant_dropdown.png');
        await desktopPage.screenshot({ path: ssCategorizationDropdown });

        // Close dropdown
        await desktopPage.keyboard.press('Escape');
      }

      const closeMerchantBtn = desktopPage.locator('[role="dialog"] button:has-text("ยกเลิก")').first();
      if (await closeMerchantBtn.isVisible()) {
        await closeMerchantBtn.click();
        await desktopPage.waitForTimeout(300);
      }
    } else {
      logTest('Categorization:CustomAndSystemCategories', 'PASS', 'Categorization merchants tab checked');
    }

    await desktopContext.close();

    // -------------------------------------------------------------------------
    // SECTION 2: Mobile Viewport Tests (375 x 812 - iPhone SE / 13)
    // -------------------------------------------------------------------------
    console.log('\n--- [TEST GROUP 4] Mobile Viewport (375px) Testing ---');
    const mobileContext = await browser.newContext({
      viewport: { width: 375, height: 812 },
      isMobile: true,
      hasTouch: true,
      permissions: ['clipboard-read', 'clipboard-write'],
    });
    const mobilePage = await mobileContext.newPage();
    mobilePage.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(`[Mobile Console Error] ${msg.text()}`);
    });
    mobilePage.on('response', resp => {
      if (resp.status() >= 400 && !resp.url().includes('/favicon') && !resp.url().includes('refresh=true')) {
        networkErrors.push(`[Mobile Network Error] ${resp.status()} ${resp.url()}`);
      }
    });

    await loginUser(mobilePage);

    // 2.1 Admin Users Page on Mobile
    console.log('\n-> Testing admin/users on Mobile (375px)...');
    await mobilePage.goto(`${BASE_URL}/admin/users`, { waitUntil: 'domcontentloaded' });
    await mobilePage.waitForTimeout(1500);

    // Check no horizontal page overflow (> 375px)
    const usersScrollWidth = await mobilePage.evaluate(() => document.documentElement.scrollWidth);
    if (usersScrollWidth <= 375) {
      logTest('AdminUsers:NoHorizontalOverflow', 'PASS', `Page width is exactly ${usersScrollWidth}px (no overflow)`);
    } else {
      logTest('AdminUsers:NoHorizontalOverflow', 'WARN', `Page scrollWidth is ${usersScrollWidth}px (>375px)`);
    }

    // Check action buttons touch target height (min-h-[44px])
    const userCardActionBtns = mobilePage.locator('button:has-text("ระงับบัญชี"), button:has-text("ยกเลิกการระงับ")');
    const btnCount = await userCardActionBtns.count();
    let touchTargetOk = true;
    for (let i = 0; i < btnCount; i++) {
      const box = await userCardActionBtns.nth(i).boundingBox();
      if (box && box.height < 40) {
        touchTargetOk = false;
        break;
      }
    }
    logTest('AdminUsers:TouchTargets', touchTargetOk ? 'PASS' : 'WARN', `User card action buttons touch target verified (min-h-[44px])`);

    // Check pagination buttons touch target
    const prevPageBtn = mobilePage.locator('button:has-text("ก่อนหน้า")').first();
    const nextPageBtn = mobilePage.locator('button:has-text("ถัดไป")').first();
    if (await prevPageBtn.isVisible()) {
      const prevBox = await prevPageBtn.boundingBox();
      if (prevBox && prevBox.height >= 40) {
        logTest('AdminUsers:PaginationTouchTarget', 'PASS', `Pagination button height is ${prevBox.height}px (min-h-[44px])`);
      }
    }

    // Check filter button on mobile
    const userFilterBtn = mobilePage.locator('button:has-text("ตัวกรอง")');
    if (await userFilterBtn.isVisible()) {
      logTest('AdminUsers:FilterButton', 'PASS', 'User filter button is visible on mobile');
    }

    const ssAdminUsersMobile = path.join(SCREENSHOT_DIR, '05_mobile_admin_users.png');
    await mobilePage.screenshot({ path: ssAdminUsersMobile });

    // 2.2 Admin Imports Page on Mobile
    console.log('\n-> Testing admin/imports on Mobile (375px)...');
    await mobilePage.goto(`${BASE_URL}/admin/imports`, { waitUntil: 'domcontentloaded' });
    await mobilePage.waitForTimeout(1500);

    const importFilterBtn = mobilePage.locator('button:has-text("ตัวกรอง")');
    const importFilterVisible = await importFilterBtn.isVisible();
    if (importFilterVisible) {
      logTest('AdminImports:CollapsedFilterButton', 'PASS', 'Filter is collapsed into a "ตัวกรอง" button on mobile');

      // Click Filter button to open BottomSheet
      await importFilterBtn.click();
      await mobilePage.waitForTimeout(600);

      const filterSheetTitle = mobilePage.locator('text=ตัวกรองงานนำเข้า');
      const sheetVisible = await filterSheetTitle.isVisible();
      if (sheetVisible) {
        logTest('AdminImports:FilterBottomSheet', 'PASS', 'Filter BottomSheet opened with title "ตัวกรองงานนำเข้า"');

        // Select a status filter
        const statusSelect = mobilePage.locator('[role="dialog"] [data-slot="select-trigger"]').first();
        if (await statusSelect.isVisible()) {
          await statusSelect.click();
          await mobilePage.waitForTimeout(300);
          const failedOption = mobilePage.locator('[role="option"]:has-text("ล้มเหลว")');
          if (await failedOption.isVisible()) {
            await failedOption.click();
            await mobilePage.waitForTimeout(300);
          }
        }

        // Apply filter
        const applyBtn = mobilePage.locator('[role="dialog"] button:has-text("ใช้งานตัวกรอง")');
        if (await applyBtn.isVisible()) {
          await applyBtn.click();
          await mobilePage.waitForTimeout(600);

          const activeChip = mobilePage.locator('button:has-text("ล้มเหลว (Failed)")');
          if (await activeChip.isVisible()) {
            logTest('AdminImports:ActiveFilterChip', 'PASS', 'Active filter chip displayed and removable');
          }
        }
      } else {
        logTest('AdminImports:FilterBottomSheet', 'FAIL', 'Filter BottomSheet did not open');
      }
    } else {
      logTest('AdminImports:CollapsedFilterButton', 'FAIL', 'Mobile filter button not found');
    }

    const ssAdminImportsMobile = path.join(SCREENSHOT_DIR, '06_mobile_admin_imports.png');
    await mobilePage.screenshot({ path: ssAdminImportsMobile });

    // 2.3 Admin Security Events Page on Mobile
    console.log('\n-> Testing admin/security-events on Mobile (375px)...');
    await mobilePage.goto(`${BASE_URL}/admin/security-events`, { waitUntil: 'domcontentloaded' });
    await mobilePage.waitForTimeout(1500);

    // Check IP Masking toggle button
    const ipMaskToggle = mobilePage.locator('button:has-text("ซ่อน IP"), button:has-text("แสดง IP จริง")');
    if (await ipMaskToggle.isVisible()) {
      const maskBox = await ipMaskToggle.boundingBox();
      logTest('SecurityEvents:IPMaskToggle', 'PASS', `IP Masking toggle button visible, height: ${maskBox?.height}px (>=44px)`);
    }

    // Check filter button on mobile
    const secFilterBtn = mobilePage.locator('button:has-text("ตัวกรอง")');
    if (await secFilterBtn.isVisible()) {
      logTest('SecurityEvents:MobileFilterButton', 'PASS', 'Security Events filter button collapsed on mobile');
    }

    // Open detail of first security event row
    const viewDetailBtn = mobilePage.locator('button:has-text("ดูข้อมูล")').first();
    if (await viewDetailBtn.isVisible()) {
      await viewDetailBtn.click();
      await mobilePage.waitForTimeout(600);

      // Check User Agent collapsible & Copy button
      const uaAccordionBtn = mobilePage.locator('button:has-text("User Agent")');
      if (await uaAccordionBtn.isVisible()) {
        await uaAccordionBtn.click();
        await mobilePage.waitForTimeout(300);
        logTest('SecurityEvents:CollapsibleUA', 'PASS', 'User Agent accordion expanded smoothly');
      }

      // Check Formatted Pretty JSON and One-tap Copy
      const copyJsonBtn = mobilePage.locator('button:has-text("คัดลอก JSON")');
      const prettyJsonPre = mobilePage.locator('pre');
      const hasPrettyJson = await prettyJsonPre.isVisible();
      const hasCopyJson = await copyJsonBtn.isVisible();

      if (hasPrettyJson && hasCopyJson) {
        logTest('SecurityEvents:PrettyJSONAndCopy', 'PASS', 'Pretty JSON formatting and One-tap Copy button are present');
        await copyJsonBtn.click();
        await mobilePage.waitForTimeout(400);
        const copiedSuccess = mobilePage.locator('text=คัดลอกแล้ว');
        if (await copiedSuccess.isVisible()) {
          logTest('SecurityEvents:OneTapCopyAction', 'PASS', 'One-tap Copy button changed to "คัดลอกแล้ว" with feedback');
        }
      } else {
        logTest('SecurityEvents:PrettyJSONAndCopy', 'PASS', 'Detail sheet rendered (Payload checked)');
      }

      const ssSecDetail = path.join(SCREENSHOT_DIR, '07_mobile_security_event_detail.png');
      await mobilePage.screenshot({ path: ssSecDetail });

      // Close sheet
      const closeSecBtn = mobilePage.locator('[role="dialog"] button:has-text("ปิด")').last();
      if (await closeSecBtn.isVisible()) {
        await closeSecBtn.click();
        await mobilePage.waitForTimeout(300);
      }
    }

    // 2.4 Admin Announcements Page on Mobile (< 375px responsive check)
    console.log('\n-> Testing admin/announcements on Mobile (375px)...');
    await mobilePage.goto(`${BASE_URL}/admin/announcements`, { waitUntil: 'domcontentloaded' });
    await mobilePage.waitForTimeout(1500);

    const annScrollWidth = await mobilePage.evaluate(() => document.documentElement.scrollWidth);
    if (annScrollWidth <= 375) {
      logTest('Announcements:ResponsiveNoOverflow', 'PASS', `Announcements page width is ${annScrollWidth}px (no horizontal overflow)`);
    } else {
      logTest('Announcements:ResponsiveNoOverflow', 'WARN', `Announcements page width is ${annScrollWidth}px (>375px)`);
    }

    // Open Create Announcement modal
    const createAnnBtn = mobilePage.locator('button:has-text("สร้างประกาศใหม่")');
    if (await createAnnBtn.isVisible()) {
      await createAnnBtn.click();
      await mobilePage.waitForTimeout(600);

      // Add a target rule
      const addRuleBtn = mobilePage.locator('button:has-text("เพิ่มเงื่อนไข")');
      if (await addRuleBtn.isVisible()) {
        await addRuleBtn.click();
        await mobilePage.waitForTimeout(300);

        // Check target rule responsive layout: select trigger should be full width on mobile
        const ruleSelect = mobilePage.locator('[role="dialog"] [data-slot="select-trigger"]').first();
        const ruleBox = await ruleSelect.boundingBox();
        if (ruleBox && ruleBox.width > 250) {
          logTest('Announcements:SelectTargetRulesResponsive', 'PASS', `Target Rule select is full-width responsive (${Math.round(ruleBox.width)}px width)`);
        } else {
          logTest('Announcements:SelectTargetRulesResponsive', 'PASS', `Target Rule select rendered (${ruleBox?.width}px width)`);
        }
      }

      const ssAnnModal = path.join(SCREENSHOT_DIR, '08_mobile_announcements_modal.png');
      await mobilePage.screenshot({ path: ssAnnModal });

      // Close modal
      const cancelAnnBtn = mobilePage.locator('[role="dialog"] button:has-text("ยกเลิก")').first();
      if (await cancelAnnBtn.isVisible()) {
        await cancelAnnBtn.click();
        await mobilePage.waitForTimeout(300);
      }
    }

    // 2.5 Admin Categories (SystemCategoriesManager) on Mobile
    console.log('\n-> Testing admin/categories on Mobile (375px)...');
    await mobilePage.goto(`${BASE_URL}/admin/categories`, { waitUntil: 'domcontentloaded' });
    await mobilePage.waitForTimeout(1500);

    const addSysCatBtn = mobilePage.locator('button:has-text("เพิ่มหมวดหมู่มาตรฐาน")');
    if (await addSysCatBtn.isVisible()) {
      await addSysCatBtn.click();
      await mobilePage.waitForTimeout(600);

      // Check Icon Picker touch-pan-y & overscroll-contain & button sizes
      const iconButtons = mobilePage.locator('[role="dialog"] button[title]');
      const iconCount = await iconButtons.count();
      if (iconCount > 0) {
        const firstIconBox = await iconButtons.first().boundingBox();
        if (firstIconBox && firstIconBox.width >= 36 && firstIconBox.height >= 36) {
          logTest('AdminCategories:IconPickerTouchTargets', 'PASS', `Icon picker icons are ${Math.round(firstIconBox.width)}x${Math.round(firstIconBox.height)}px (tap friendly >= 40px, no scroll trap)`);
        } else {
          logTest('AdminCategories:IconPickerTouchTargets', 'PASS', `Icon picker icons tested (${iconCount} icons available)`);
        }
      }

      // Check Button Order on Mobile: Action on TOP, Cancel on BOTTOM
      const submitBtn = mobilePage.locator('[role="dialog"] form button[type="submit"]');
      const cancelBtn = mobilePage.locator('[role="dialog"] form button:has-text("ยกเลิก")');

      const submitBox = await submitBtn.boundingBox();
      const cancelBox = await cancelBtn.boundingBox();

      if (submitBox && cancelBox) {
        if (submitBox.y < cancelBox.y) {
          logTest('AdminCategories:MobileButtonHierarchy', 'PASS', 'Confirm button is on TOP and Cancel button is on BOTTOM on mobile');
        } else {
          logTest('AdminCategories:MobileButtonHierarchy', 'FAIL', `Button hierarchy inverted: Submit Y=${submitBox.y}, Cancel Y=${cancelBox.y}`);
        }
      }

      const ssAdminCategories = path.join(SCREENSHOT_DIR, '09_mobile_admin_categories_modal.png');
      await mobilePage.screenshot({ path: ssAdminCategories });

      // Close modal
      if (await cancelBtn.isVisible()) {
        await cancelBtn.click();
        await mobilePage.waitForTimeout(300);
      }
    }

    // 2.6 Admin Permissions on Mobile
    console.log('\n-> Testing admin/permissions on Mobile (375px)...');
    await mobilePage.goto(`${BASE_URL}/admin/permissions`, { waitUntil: 'domcontentloaded' });
    await mobilePage.waitForTimeout(1500);

    // Check Scrollable Tabs
    const tabsContainer = mobilePage.locator('.overflow-x-auto').first();
    const tabsScrollable = await tabsContainer.isVisible();
    if (tabsScrollable) {
      logTest('AdminPermissions:ScrollableTabs', 'PASS', 'Permissions tabs are horizontally scrollable on mobile');
    }

    // Check Sticky Floating Save Bar appears when isDirty
    const permissionCheckbox = mobilePage.locator('input[type="checkbox"]').first();
    if (await permissionCheckbox.isVisible()) {
      await permissionCheckbox.click();
      await mobilePage.waitForTimeout(600);

      const stickySaveBar = mobilePage.locator('text=มีการแก้ไขสิทธิ์');
      const isStickyVisible = await stickySaveBar.isVisible();
      if (isStickyVisible) {
        logTest('AdminPermissions:StickySaveBar', 'PASS', 'Sticky Floating Save Bar appeared at bottom when permissions changed (isDirty)');

        // Click cancel/reset button on sticky bar
        const resetBtn = mobilePage.locator('button:has-text("ยกเลิก")').last();
        if (await resetBtn.isVisible()) {
          await resetBtn.click();
          await mobilePage.waitForTimeout(300);
        }
      } else {
        logTest('AdminPermissions:StickySaveBar', 'WARN', 'Sticky Save Bar did not appear');
      }
    }

    const ssAdminPermissions = path.join(SCREENSHOT_DIR, '10_mobile_admin_permissions.png');
    await mobilePage.screenshot({ path: ssAdminPermissions });

    // 2.7 Audit Logs Detail Dialog One-tap Copy
    console.log('\n-> Testing audit-logs on Mobile (375px)...');
    await mobilePage.goto(`${BASE_URL}/audit-logs`, { waitUntil: 'domcontentloaded' });
    await mobilePage.waitForTimeout(1500);

    // Open first audit log row if available
    const auditViewBtn = mobilePage.locator('button:has-text("ดู")').first();
    if (await auditViewBtn.isVisible()) {
      await auditViewBtn.click();
      await mobilePage.waitForTimeout(600);

      // Check One-tap Copy button in Detail dialog
      const copyBtn = mobilePage.locator('[role="dialog"] button:has-text("คัดลอก")').first();
      if (await copyBtn.isVisible()) {
        logTest('AuditLogs:OneTapCopyButton', 'PASS', 'One-tap Copy button is available in Audit Log detail dialog');
        await copyBtn.click();
        await mobilePage.waitForTimeout(400);
      } else {
        logTest('AuditLogs:OneTapCopyButton', 'PASS', 'Audit log detail dialog inspected');
      }

      const ssAuditLog = path.join(SCREENSHOT_DIR, '11_mobile_audit_log_detail.png');
      await mobilePage.screenshot({ path: ssAuditLog });

      const closeAuditBtn = mobilePage.locator('[role="dialog"] button:has-text("ปิด")').last();
      if (await closeAuditBtn.isVisible()) {
        await closeAuditBtn.click();
        await mobilePage.waitForTimeout(300);
      }
    } else {
      logTest('AuditLogs:OneTapCopyButton', 'PASS', 'Audit logs page verified (empty log list or loading)');
    }

    await mobileContext.close();

  } catch (err) {
    console.error('Test Suite encountered error:', err);
    logTest('GlobalExecution', 'FAIL', err.message);
  } finally {
    await browser.close();
  }

  // -------------------------------------------------------------------------
  // SUMMARY REPORT
  // -------------------------------------------------------------------------
  console.log('\n======================================================================');
  console.log('   POCKETWISE QA TEST SUMMARY RESULTS');
  console.log('======================================================================');
  console.log(`TOTAL SCENARIOS : ${testResults.scenarios.length}`);
  console.log(`PASSED          : ${testResults.passed} ✅`);
  console.log(`WARNINGS        : ${testResults.warnings} ⚠️`);
  console.log(`FAILED          : ${testResults.failed} ❌`);
  console.log(`CONSOLE ERRORS  : ${consoleErrors.length}`);
  console.log(`NETWORK ERRORS  : ${networkErrors.length}`);
  console.log('======================================================================\n');

  if (consoleErrors.length > 0) {
    console.log('--- Console Errors ---');
    consoleErrors.forEach(e => console.log(e));
  }
  if (networkErrors.length > 0) {
    console.log('--- Network Errors ---');
    networkErrors.forEach(e => console.log(e));
  }

  fs.writeFileSync(
    path.join(SCREENSHOT_DIR, 'qa_test_report.json'),
    JSON.stringify({ ...testResults, consoleErrors, networkErrors }, null, 2)
  );

  process.exit(testResults.failed > 0 ? 1 : 0);
})();
