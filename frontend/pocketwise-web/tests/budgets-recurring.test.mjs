import assert from "node:assert/strict";
import { gatewayRegistry } from "../src/lib/server/gateway-registry";
import { registerBudgetRoutes } from "../src/lib/server/modules/budgets/budget.router";
import { registerRecurringTransactionRoutes } from "../src/lib/server/modules/recurring/recurring.router";
import { BudgetService } from "../src/lib/server/modules/budgets/budget.service";
import { RecurringTransactionService } from "../src/lib/server/modules/recurring/recurring.service";
import { CategoryService } from "../src/lib/server/modules/categories/category.service";
import { TagService } from "../src/lib/server/modules/tags/tag.service";
import { TransactionService } from "../src/lib/server/modules/transactions/transaction.service";
import { db } from "../src/lib/server/db";
import {
  budgets,
  categories,
  categoryRules,
  recurringTransactions,
  recurringTransactionTags,
  tags,
  transactions,
  transactionTags,
} from "../src/lib/server/db/schema";
import { eq } from "drizzle-orm";

async function testBudgetsAndRecurring() {
  console.log("Verifying Budgets & Recurring Transactions Modules (Task 3.3)...");

  // 1. Gateway Route Registration Verification
  registerBudgetRoutes();
  registerRecurringTransactionRoutes();

  // Budgets
  assert.ok(gatewayRegistry.match("GET", ["budgets"]), "GET budgets should match");
  assert.ok(gatewayRegistry.match("GET", ["budgets", "tracking"]), "GET budgets/tracking should match");
  assert.ok(gatewayRegistry.match("GET", ["budgets", "123"]), "GET budgets/:id should match");
  assert.ok(gatewayRegistry.match("POST", ["budgets"]), "POST budgets should match");
  assert.ok(gatewayRegistry.match("PUT", ["budgets", "123"]), "PUT budgets/:id should match");
  assert.ok(gatewayRegistry.match("DELETE", ["budgets", "123"]), "DELETE budgets/:id should match");

  // Recurring Transactions
  assert.ok(gatewayRegistry.match("GET", ["recurring-transactions"]), "GET recurring-transactions should match");
  assert.ok(gatewayRegistry.match("GET", ["recurring-transactions", "123"]), "GET recurring-transactions/:id should match");
  assert.ok(gatewayRegistry.match("POST", ["recurring-transactions"]), "POST recurring-transactions should match");
  assert.ok(gatewayRegistry.match("PUT", ["recurring-transactions", "123"]), "PUT recurring-transactions/:id should match");
  assert.ok(gatewayRegistry.match("DELETE", ["recurring-transactions", "123"]), "DELETE recurring-transactions/:id should match");

  console.log("Gateway Route Registration verified successfully!");

  const testUserId = 1; // existing test user (famreplay@gmail.com)

  // Prerequisites: create a category and a tag
  const category = await CategoryService.create(testUserId, {
    categoryName: `BudgCat_${Date.now()}`,
    categoryType: "expense",
    color: "#ff3366",
    icon: "shopping-bag",
  });

  const tag = await TagService.create(testUserId, {
    tagName: `BudgTag_${Date.now()}`,
    color: "#33ccff",
  });

  console.log("Setup prerequisites complete.");

  // ==========================================
  // 2. Budget Service Tests
  // ==========================================
  console.log("Testing Budget Service...");

  // 2.1 Validation: amount <= 0
  await assert.rejects(
    async () => {
      await BudgetService.create(testUserId, {
        budgetName: "Test Budget",
        amountLimit: 0,
        scopeType: "total",
        periodType: "monthly",
        startDate: "2026-11-01",
      });
    },
    { code: "VALIDATION_ERROR" },
    "Amount <= 0 should throw VALIDATION_ERROR"
  );

  // 2.2 Validation: category scope without categoryId
  await assert.rejects(
    async () => {
      await BudgetService.create(testUserId, {
        budgetName: "Test Category Budget",
        amountLimit: 5000,
        scopeType: "category",
        periodType: "monthly",
        startDate: "2026-11-01",
      });
    },
    { code: "VALIDATION_ERROR" },
    "Category scope without categoryId should throw VALIDATION_ERROR"
  );

  // 2.3 Create Budget
  const budget = await BudgetService.create(testUserId, {
    budgetName: `งบค่าอาหาร_${Date.now()}`,
    amountLimit: 3000,
    scopeType: "category",
    categoryId: category.categoryId,
    periodType: "monthly",
    startDate: "2026-11-01",
    alertThresholdPercent: 80,
  });

  assert.ok(budget.budgetId > 0);
  assert.equal(budget.amountLimit, 3000);
  assert.equal(budget.scopeType, "category");
  assert.equal(budget.categoryId, category.categoryId);
  assert.equal(budget.categoryName, category.categoryName);
  console.log("Created Budget ID:", budget.budgetId);

  // 2.4 Create a test expense transaction to test tracking
  const expenseTx = await TransactionService.create(testUserId, {
    transactionType: "expense",
    amount: 1200,
    transactionDate: new Date().toISOString(),
    description: "มื้อเย็นร้านอาหาร",
    categoryId: category.categoryId,
  });

  // 2.5 Get Budget Tracking
  const trackingList = await BudgetService.getTracking(testUserId);
  const trackedBudget = trackingList.find((b) => b.budgetId === budget.budgetId);

  assert.ok(trackedBudget, "Budget must appear in tracking list");
  assert.equal(trackedBudget.spentAmount, 1200, "Spent amount should reflect transaction");
  assert.equal(trackedBudget.remainingAmount, 1800, "Remaining amount should be 3000 - 1200 = 1800");
  assert.equal(trackedBudget.percentageUsed, 40, "Percentage used should be 40%");
  assert.equal(trackedBudget.isOverLimit, false, "Should not be over limit");

  // 2.6 Update Budget
  const updatedBudget = await BudgetService.update(budget.budgetId, testUserId, {
    budgetName: `${budget.budgetName} (แก้ไข)`,
    amountLimit: 4000,
    scopeType: "category",
    categoryId: category.categoryId,
    periodType: "monthly",
    startDate: "2026-11-01",
    alertThresholdPercent: 90,
  });

  assert.ok(updatedBudget);
  assert.equal(updatedBudget.amountLimit, 4000);
  assert.equal(updatedBudget.alertThresholdPercent, 90);

  // 2.7 Delete Budget
  const budgetDeleted = await BudgetService.delete(budget.budgetId, testUserId);
  assert.equal(budgetDeleted, true);

  const afterDeleteBudget = await BudgetService.getById(budget.budgetId, testUserId);
  assert.equal(afterDeleteBudget, null, "Deleted budget should not be found");
  console.log("Budget Service verified successfully!");

  // ==========================================
  // 3. Recurring Transaction Service Tests
  // ==========================================
  console.log("Testing Recurring Transaction Service...");

  // 3.1 Validation: custom frequency without daysOfWeek
  await assert.rejects(
    async () => {
      await RecurringTransactionService.create(testUserId, {
        transactionType: "expense",
        amount: 500,
        frequency: "custom",
        startDate: "2026-11-01",
      });
    },
    { code: "VALIDATION_ERROR" },
    "Custom frequency without daysOfWeek should throw VALIDATION_ERROR"
  );

  // 3.2 Create Recurring Transaction
  const recurring = await RecurringTransactionService.create(testUserId, {
    transactionType: "expense",
    amount: 1500,
    description: "ค่าบริการ Streaming ประจำเดือน",
    categoryId: category.categoryId,
    frequency: "monthly",
    intervalValue: 1,
    tagIds: [tag.tagId],
    startDate: "2026-11-01",
  });

  assert.ok(recurring.recurringTransactionId > 0);
  assert.equal(recurring.amount, 1500);
  assert.equal(recurring.frequency, "monthly");
  assert.equal(recurring.categoryId, category.categoryId);
  assert.ok(recurring.tags && recurring.tags.length === 1);
  assert.equal(recurring.tags[0].tagId, tag.tagId);
  console.log("Created Recurring Transaction ID:", recurring.recurringTransactionId);

  // 3.3 Get by ID
  const fetchedRecurring = await RecurringTransactionService.getById(
    recurring.recurringTransactionId,
    testUserId
  );
  assert.ok(fetchedRecurring);
  assert.equal(fetchedRecurring.recurringTransactionId, recurring.recurringTransactionId);
  assert.equal(fetchedRecurring.description, "ค่าบริการ Streaming ประจำเดือน");

  // 3.4 GetAll Recurring Transactions
  const allRecurring = await RecurringTransactionService.getAll(testUserId);
  const foundRecurring = allRecurring.find(
    (r) => r.recurringTransactionId === recurring.recurringTransactionId
  );
  assert.ok(foundRecurring, "Created recurring transaction should be in getAll list");

  // 3.5 Update Recurring Transaction
  const updatedRecurring = await RecurringTransactionService.update(
    recurring.recurringTransactionId,
    testUserId,
    {
      transactionType: "expense",
      amount: 1800,
      description: "ค่าบริการ Streaming Family Plan",
      categoryId: category.categoryId,
      frequency: "monthly",
      intervalValue: 1,
      tagIds: [], // clear tags
      startDate: "2026-11-01",
      isActive: true,
    }
  );

  assert.ok(updatedRecurring);
  assert.equal(updatedRecurring.amount, 1800);
  assert.equal(updatedRecurring.description, "ค่าบริการ Streaming Family Plan");
  assert.equal(updatedRecurring.tags?.length, 0);

  // 3.6 Delete Recurring Transaction
  const deletedRecurring = await RecurringTransactionService.delete(
    recurring.recurringTransactionId,
    testUserId
  );
  assert.equal(deletedRecurring, true);

  const afterDeleteRecurring = await RecurringTransactionService.getById(
    recurring.recurringTransactionId,
    testUserId
  );
  assert.equal(afterDeleteRecurring, null, "Deleted recurring transaction should not be found");
  console.log("Recurring Transaction Service verified successfully!");

  // 3.7 Test Reactivating Expired Recurring Transaction & Auto Execution
  console.log("3.7 Testing Reactivating Expired Recurring Transaction & Auto Execution...");
  const now = new Date();
  const bkk = new Date(now.getTime() + 7 * 3600 * 1000);
  const todayStr = bkk.toISOString().slice(0, 10);
  const todayDow = bkk.getUTCDay();
  const future = new Date(bkk.getTime() + 5 * 24 * 3600 * 1000);
  const futureStr = future.toISOString().slice(0, 10);

  // Create an expired/inactive item (Mon-Fri past)
  const expiredItem = await RecurringTransactionService.create(testUserId, {
    transactionType: "expense",
    amount: 250,
    description: "ค่าเดินทาง จ-ศ (หมดอายุ)",
    categoryId: category.categoryId,
    frequency: "custom",
    daysOfWeek: [1, 2, 3, 4, 5],
    startDate: "2026-11-16",
    endDate: "2026-11-20",
  });

  // Manually simulate expiration in DB (isActive = false)
  await db
    .update(recurringTransactions)
    .set({ isActive: false })
    .where(eq(recurringTransactions.recurringTransactionId, expiredItem.recurringTransactionId));

  const checkExpired = await RecurringTransactionService.getById(
    expiredItem.recurringTransactionId,
    testUserId
  );
  assert.equal(checkExpired?.isActive, false, "Expired item should be inactive (offline)");

  // Now user updates dates to include today and future (e.g. today to futureStr)
  const reactivated = await RecurringTransactionService.update(
    expiredItem.recurringTransactionId,
    testUserId,
    {
      transactionType: "expense",
      amount: 250,
      description: "ค่าเดินทาง จ-ศ (รอบใหม่)",
      categoryId: category.categoryId,
      frequency: "custom",
      daysOfWeek: [todayDow], // includes today
      startDate: todayStr,
      endDate: futureStr,
    }
  );

  assert.ok(reactivated, "Reactivated item should exist");
  assert.equal(reactivated.isActive, true, "Item updated to future dates MUST become active (online)");
  console.log("  Reactivation status: ONLINE (isActive = true) ✅");

  // Verify that today's transaction was generated automatically
  const [autoTx] = await db
    .select()
    .from(transactions)
    .where(
      eq(transactions.recurringTransactionId, expiredItem.recurringTransactionId)
    );

  assert.ok(autoTx, "Today's scheduled transaction MUST be created automatically upon updating to active date");
  assert.equal(Number(autoTx.amount), 250);
  assert.equal(autoTx.description, "ค่าเดินทาง จ-ศ (รอบใหม่)");
  console.log("  Automatic transaction generation: Created Tx ID", autoTx.transactionId, "✅");

  // Test Toggle Active (Pause / Resume)
  const paused = await RecurringTransactionService.toggleActive(
    expiredItem.recurringTransactionId,
    testUserId
  );
  assert.equal(paused?.isActive, false, "Toggle active should pause (offline)");

  const resumed = await RecurringTransactionService.toggleActive(
    expiredItem.recurringTransactionId,
    testUserId
  );
  assert.equal(resumed?.isActive, true, "Toggle active should resume (online)");
  console.log("  Toggle Pause / Resume verified ✅");

  // Clean up 3.7 test records
  await db.delete(transactions).where(eq(transactions.transactionId, autoTx.transactionId));
  await db.delete(recurringTransactions).where(eq(recurringTransactions.recurringTransactionId, expiredItem.recurringTransactionId));

  // Cleanups
  await TransactionService.delete(expenseTx.transactionId, testUserId);
  await db.delete(transactions).where(eq(transactions.transactionId, expenseTx.transactionId));
  await db.delete(recurringTransactionTags).where(eq(recurringTransactionTags.recurringTransactionId, recurring.recurringTransactionId));
  await db.delete(recurringTransactions).where(eq(recurringTransactions.recurringTransactionId, recurring.recurringTransactionId));
  await db.delete(budgets).where(eq(budgets.budgetId, budget.budgetId));
  await TagService.delete(tag.tagId, testUserId);
  await db.delete(categoryRules).where(eq(categoryRules.categoryId, category.categoryId));
  await CategoryService.delete(category.categoryId, testUserId);

  console.log("\nALL TESTS FOR TASK 3.3 PASSED SUCCESSFULLY! 🎉");
  process.exit(0);
}

testBudgetsAndRecurring().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
