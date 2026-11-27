import { registerAuthRoutes } from "./auth/auth.router";
import { registerUserSettingsRoutes } from "./user/user-settings.router";
import { registerCategoryRoutes } from "./categories/category.router";
import { registerTagRoutes } from "./tags/tag.router";
import { registerMerchantRoutes } from "./merchants/merchant.router";
import { registerBankAccountRoutes } from "./bank-accounts/bank-account.router";
import { registerCreditCardRoutes } from "./credit-cards/credit-card.router";
import { registerTransactionRoutes } from "./transactions/transaction.router";
import { registerTransferRoutes } from "./transfers/transfer.router";
import { registerBudgetRoutes } from "./budgets/budget.router";
import { registerRecurringTransactionRoutes } from "./recurring/recurring.router";
import { registerReportRoutes } from "./reports/report.router";
import { registerImportRoutes } from "./imports/import.router";
import { registerNotificationRoutes } from "./notifications/notification.router";
import { registerAdminRoutes } from "./admin/admin.router";

let isInitialized = false;

export function initializeGatewayRoutes(): void {
  if (isInitialized) return;
  isInitialized = true;

  // Register Phase 1: Auth & User Settings routes
  registerAuthRoutes();
  registerUserSettingsRoutes();

  // Register Phase 2: Master Data & Accounts
  registerCategoryRoutes();
  registerTagRoutes();
  registerMerchantRoutes();
  registerBankAccountRoutes();
  registerCreditCardRoutes();

  // Register Phase 3: Core Transactions & Budgets
  registerTransactionRoutes();
  registerTransferRoutes();
  registerBudgetRoutes();
  registerRecurringTransactionRoutes();

  // Register Phase 4: Reports & Analytics, Imports & OCR
  registerReportRoutes();
  registerImportRoutes();

  // Register Phase 5: Notifications & Realtime
  registerNotificationRoutes();

  // Register Phase 6: Admin Security, Audit Logs & Users
  registerAdminRoutes();
}
