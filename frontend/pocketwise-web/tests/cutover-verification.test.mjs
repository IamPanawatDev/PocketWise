import assert from "node:assert/strict";
import { gatewayRegistry } from "../src/lib/server/gateway-registry.ts";
import { initializeGatewayRoutes } from "../src/lib/server/modules/index.ts";

async function verifyAllRoutes() {
  console.log("Starting Phase 7 Cutover & Route Completeness Verification...");

  initializeGatewayRoutes();

  // Test endpoints from every single phase:
  const testEndpoints = [
    // Phase 1: Auth & User
    { method: "GET", path: ["auth", "me"], desc: "Current user profile" },
    { method: "POST", path: ["auth", "login"], desc: "User login" },
    { method: "POST", path: ["auth", "register"], desc: "User registration" },
    { method: "POST", path: ["auth", "refresh"], desc: "Token refresh" },
    { method: "POST", path: ["auth", "logout"], desc: "User logout" },
    { method: "GET", path: ["user", "settings"], desc: "User settings" },
    { method: "PUT", path: ["user", "settings"], desc: "Update user settings" },
    { method: "POST", path: ["users", "me", "data-reset"], desc: "User data reset" },

    // Phase 2: Master Data & Accounts
    { method: "GET", path: ["categories"], desc: "List categories" },
    { method: "POST", path: ["categories"], desc: "Create category" },
    { method: "GET", path: ["categories", "123"], desc: "Get category by ID" },
    { method: "PUT", path: ["categories", "123"], desc: "Update category" },
    { method: "DELETE", path: ["categories", "123"], desc: "Delete category" },
    { method: "PUT", path: ["categories", "reorder"], desc: "Reorder categories" },

    { method: "GET", path: ["tags"], desc: "List tags" },
    { method: "POST", path: ["tags"], desc: "Create tag" },
    { method: "PUT", path: ["tags", "123"], desc: "Update tag" },
    { method: "DELETE", path: ["tags", "123"], desc: "Delete tag" },

    { method: "GET", path: ["merchants"], desc: "List merchants" },
    { method: "POST", path: ["merchants"], desc: "Create merchant" },
    { method: "PUT", path: ["merchants", "123"], desc: "Update merchant" },
    { method: "DELETE", path: ["merchants", "123"], desc: "Delete merchant" },

    { method: "GET", path: ["bank-accounts"], desc: "List bank accounts" },
    { method: "POST", path: ["bank-accounts"], desc: "Create bank account" },
    { method: "GET", path: ["bank-accounts", "123"], desc: "Get bank account" },
    { method: "PUT", path: ["bank-accounts", "123"], desc: "Update bank account" },
    { method: "DELETE", path: ["bank-accounts", "123"], desc: "Delete bank account" },

    { method: "GET", path: ["credit-cards"], desc: "List credit cards" },
    { method: "POST", path: ["credit-cards"], desc: "Create credit card" },
    { method: "GET", path: ["credit-cards", "123"], desc: "Get credit card" },
    { method: "PUT", path: ["credit-cards", "123"], desc: "Update credit card" },
    { method: "DELETE", path: ["credit-cards", "123"], desc: "Delete credit card" },
    { method: "GET", path: ["credit-cards", "123", "statements"], desc: "Credit card statements" },
    { method: "POST", path: ["credit-cards", "123", "statements"], desc: "Upload statement" },

    // Phase 3: Core Transactions & Budgets
    { method: "GET", path: ["transactions"], desc: "List transactions" },
    { method: "POST", path: ["transactions"], desc: "Create transaction" },
    { method: "GET", path: ["transactions", "123"], desc: "Get transaction" },
    { method: "PUT", path: ["transactions", "123"], desc: "Update transaction" },
    { method: "DELETE", path: ["transactions", "123"], desc: "Delete transaction" },
    { method: "POST", path: ["transactions", "bulk-delete"], desc: "Bulk delete transactions" },

    // Category Rules & Suggestions
    { method: "GET", path: ["category-rules"], desc: "List category rules" },
    { method: "POST", path: ["category-rules"], desc: "Create category rule" },
    { method: "GET", path: ["category-rules", "123"], desc: "Get category rule by ID" },
    { method: "PUT", path: ["category-rules", "123"], desc: "Update category rule" },
    { method: "DELETE", path: ["category-rules", "123"], desc: "Delete category rule" },
    { method: "GET", path: ["category-rules", "suggest"], desc: "Suggest category" },

    { method: "GET", path: ["transfers"], desc: "List transfers" },
    { method: "GET", path: ["transfers", "123"], desc: "Get transfer by ID" },
    { method: "POST", path: ["transfers"], desc: "Create transfer" },

    { method: "GET", path: ["budgets"], desc: "List budgets" },
    { method: "POST", path: ["budgets"], desc: "Create budget" },
    { method: "GET", path: ["budgets", "123"], desc: "Get budget" },
    { method: "PUT", path: ["budgets", "123"], desc: "Update budget" },
    { method: "DELETE", path: ["budgets", "123"], desc: "Delete budget" },

    { method: "GET", path: ["recurring-transactions"], desc: "List recurring transactions" },
    { method: "POST", path: ["recurring-transactions"], desc: "Create recurring transaction" },
    { method: "GET", path: ["recurring-transactions", "123"], desc: "Get recurring transaction" },
    { method: "PUT", path: ["recurring-transactions", "123"], desc: "Update recurring transaction" },
    { method: "DELETE", path: ["recurring-transactions", "123"], desc: "Delete recurring transaction" },

    // Phase 4: Reports & Analytics, Imports & OCR
    { method: "GET", path: ["reports", "summary"], desc: "Monthly summary report" },
    { method: "GET", path: ["reports", "trends"], desc: "Spending trends report" },
    { method: "GET", path: ["reports", "export"], desc: "Export report" },

    { method: "POST", path: ["imports", "slips"], desc: "Upload slip" },
    { method: "POST", path: ["imports", "ocr"], desc: "OCR slip endpoint" },
    { method: "GET", path: ["imports", "slips", "123"], desc: "Get slip details" },
    { method: "GET", path: ["imports", "slips", "123", "image"], desc: "Get slip image" },
    { method: "POST", path: ["imports", "slips", "123", "confirm"], desc: "Confirm slip" },
    { method: "POST", path: ["imports", "slips", "123", "reject"], desc: "Reject slip" },
    { method: "GET", path: ["imports", "jobs"], desc: "Import jobs" },
    { method: "GET", path: ["imports", "jobs", "123"], desc: "Import job details" },

    // Phase 5: Notifications & Realtime
    { method: "GET", path: ["notifications"], desc: "List notifications" },
    { method: "GET", path: ["notifications", "unread-count"], desc: "Unread notifications count" },
    { method: "PUT", path: ["notifications", "123", "read"], desc: "Mark notification as read" },
    { method: "PUT", path: ["notifications", "read-all"], desc: "Mark all notifications read" },

    // Phase 6: Admin Security, Audit Logs & Users
    { method: "GET", path: ["admin", "users"], desc: "Admin users list" },
    { method: "GET", path: ["admin", "users", "123"], desc: "Admin user detail" },
    { method: "POST", path: ["admin", "users", "123", "suspend"], desc: "Admin suspend user" },
    { method: "POST", path: ["admin", "users", "123", "unsuspend"], desc: "Admin unsuspend user" },
    { method: "POST", path: ["admin", "users", "123", "verify-email"], desc: "Admin verify email" },
    { method: "POST", path: ["admin", "users", "123", "resend-verification"], desc: "Admin resend verification" },
    { method: "POST", path: ["admin", "users", "123", "reset-password"], desc: "Admin reset password" },
    { method: "GET", path: ["admin", "users", "123", "sessions"], desc: "Admin user sessions" },
    { method: "POST", path: ["admin", "users", "123", "sessions", "456", "revoke"], desc: "Admin revoke session" },
    { method: "POST", path: ["admin", "users", "123", "sessions", "revoke-all"], desc: "Admin revoke all sessions" },
    { method: "PUT", path: ["admin", "users", "123", "roles"], desc: "Admin assign user roles" },

    { method: "GET", path: ["admin", "security-events"], desc: "Admin security events" },

    { method: "GET", path: ["audit-logs"], desc: "Audit logs list" },
    { method: "GET", path: ["audit-logs", "123"], desc: "Get audit log" },
    { method: "GET", path: ["audit-logs", "entity-types"], desc: "Audit log entity types" },
    { method: "GET", path: ["audit-logs", "settings"], desc: "Audit log settings" },
    { method: "PUT", path: ["audit-logs", "settings"], desc: "Update audit log settings" },
    { method: "POST", path: ["audit-logs", "purge"], desc: "Purge audit logs" },

    { method: "GET", path: ["admin", "overview"], desc: "Admin overview" },
    { method: "GET", path: ["admin", "settings"], desc: "Admin system settings" },
    { method: "PUT", path: ["admin", "settings", "SomeKey"], desc: "Update system setting" },
    { method: "GET", path: ["admin", "maintenance"], desc: "Admin maintenance status" },
    { method: "PUT", path: ["admin", "maintenance"], desc: "Update maintenance status" },

    { method: "GET", path: ["admin", "announcements"], desc: "Admin announcements list" },
    { method: "GET", path: ["admin", "announcements", "123"], desc: "Get announcement" },
    { method: "POST", path: ["admin", "announcements"], desc: "Create announcement" },
    { method: "PUT", path: ["admin", "announcements", "123"], desc: "Update announcement" },
    { method: "DELETE", path: ["admin", "announcements", "123"], desc: "Delete announcement" },
    { method: "GET", path: ["announcements", "active"], desc: "Active announcements" },

    { method: "GET", path: ["admin", "roles"], desc: "Admin roles list" },
    { method: "GET", path: ["admin", "roles", "123"], desc: "Admin get role" },
    { method: "POST", path: ["admin", "roles"], desc: "Admin create role" },
    { method: "PUT", path: ["admin", "roles", "123"], desc: "Admin update role" },
    { method: "DELETE", path: ["admin", "roles", "123"], desc: "Admin delete role" },
    { method: "PUT", path: ["admin", "roles", "123", "permissions"], desc: "Admin update role permissions" },
    { method: "GET", path: ["admin", "permissions"], desc: "Admin permissions list" },
    { method: "GET", path: ["admin", "user-roles"], desc: "Admin user-roles list" },

    { method: "GET", path: ["admin", "categories"], desc: "Admin system categories" },
    { method: "GET", path: ["admin", "categories", "123"], desc: "Get admin category" },
    { method: "POST", path: ["admin", "categories"], desc: "Create admin category" },
    { method: "PUT", path: ["admin", "categories", "reorder"], desc: "Reorder admin categories" },
    { method: "POST", path: ["admin", "categories", "seed-defaults"], desc: "Seed default categories" },
    { method: "PUT", path: ["admin", "categories", "123"], desc: "Update admin category" },
    { method: "DELETE", path: ["admin", "categories", "123"], desc: "Delete admin category" },

    { method: "GET", path: ["admin", "imports"], desc: "Admin imports list" },
    { method: "POST", path: ["admin", "imports", "123", "retry"], desc: "Admin retry import" },
    { method: "POST", path: ["admin", "imports", "123", "cancel"], desc: "Admin cancel import" },
  ];

  let matchedCount = 0;
  for (const ep of testEndpoints) {
    const match = gatewayRegistry.match(ep.method, ep.path);
    assert.ok(
      match !== null,
      `Endpoint ${ep.method} /api/v1/${ep.path.join("/")} (${ep.desc}) must be registered locally!`
    );
    matchedCount++;
  }

  console.log(`✅ All ${matchedCount} verified API endpoints matched 100% locally on Smart Gateway! Zero missing!`);
  process.exit(0);
}

verifyAllRoutes().catch((err) => {
  console.error("❌ Verification Failed:", err);
  process.exit(1);
});
