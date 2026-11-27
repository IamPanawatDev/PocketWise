import assert from "node:assert/strict";
import { gatewayRegistry } from "../src/lib/server/gateway-registry";
import { registerTransactionRoutes } from "../src/lib/server/modules/transactions/transaction.router";
import { TransactionService } from "../src/lib/server/modules/transactions/transaction.service";
import { BankAccountService } from "../src/lib/server/modules/bank-accounts/bank-account.service";
import { TagService } from "../src/lib/server/modules/tags/tag.service";
import { CategoryService } from "../src/lib/server/modules/categories/category.service";
import { db } from "../src/lib/server/db";
import { categoryRules } from "../src/lib/server/db/schema";
import { eq } from "drizzle-orm";

async function testTransactions() {
  console.log("Verifying Transactions Module (Task 3.1)...");

  // 1. Gateway Route Registration Verification
  registerTransactionRoutes();

  assert.ok(gatewayRegistry.match("GET", ["transactions"]), "GET transactions should match");
  assert.ok(gatewayRegistry.match("GET", ["transactions", "123"]), "GET transactions/:id should match");
  assert.ok(gatewayRegistry.match("POST", ["transactions"]), "POST transactions should match");
  assert.ok(gatewayRegistry.match("PUT", ["transactions", "123"]), "PUT transactions/:id should match");
  assert.ok(gatewayRegistry.match("DELETE", ["transactions", "123"]), "DELETE transactions/:id should match");
  assert.ok(
    gatewayRegistry.match("POST", ["transactions", "bulk-delete"]),
    "POST transactions/bulk-delete should match"
  );
  console.log("Gateway Route Registration verified successfully!");

  const testUserId = 1; // existing test user (famreplay@gmail.com)

  // Setup prerequisites: a bank account, a tag, and a category
  const tag = await TagService.create(testUserId, {
    tagName: `TxTag_${Date.now()}`,
    color: "#abcdef",
  });

  const account = await BankAccountService.create(testUserId, {
    accountName: `TxAcc_${Date.now()}`,
    accountType: "bank",
    bankName: "KBANK",
  });

  const category = await CategoryService.create(testUserId, {
    categoryName: `TxCat_${Date.now()}`,
    categoryType: "expense",
    color: "#ff5500",
    icon: "coffee",
  });

  console.log("Setup prerequisites complete.");

  // 2. Validation Checks
  await assert.rejects(
    async () => {
      await TransactionService.create(testUserId, {
        transactionType: "expense",
        amount: 0, // invalid <= 0
        transactionDate: new Date(),
      });
    },
    { code: "VALIDATION_ERROR" },
    "Amount <= 0 should throw VALIDATION_ERROR"
  );

  // 3. Create Transactions (Income & Expense)
  const incomeTx = await TransactionService.create(testUserId, {
    transactionType: "income",
    amount: 10000,
    currencyCode: "THB",
    transactionDate: new Date().toISOString(),
    description: "เงินเดือนประจำเดือน",
    bankAccountId: account.bankAccountId,
  });

  assert.equal(incomeTx.transactionType, "income");
  assert.equal(incomeTx.amount, 10000);
  assert.equal(incomeTx.bankAccountId, account.bankAccountId);
  assert.equal(incomeTx.bankAccountName, account.accountName);
  console.log("Created Income Transaction ID:", incomeTx.transactionId);

  const expenseTx = await TransactionService.create(testUserId, {
    transactionType: "expense",
    amount: 1500,
    currencyCode: "THB",
    transactionDate: new Date().toISOString(),
    description: "ซื้ออุปกรณ์สำนักงาน",
    categoryId: category.categoryId,
    bankAccountId: account.bankAccountId,
    tagIds: [tag.tagId],
  });

  assert.equal(expenseTx.transactionType, "expense");
  assert.equal(expenseTx.amount, 1500);
  assert.equal(expenseTx.categoryId, category.categoryId);
  assert.equal(expenseTx.categoryName, category.categoryName);
  assert.equal(expenseTx.tags.length, 1);
  assert.equal(expenseTx.tags[0].tagId, tag.tagId);
  console.log("Created Expense Transaction ID:", expenseTx.transactionId);

  // 4. Get by ID
  const fetchedTx = await TransactionService.getById(expenseTx.transactionId, testUserId);
  assert.ok(fetchedTx);
  assert.equal(fetchedTx.transactionId, expenseTx.transactionId);
  assert.equal(fetchedTx.description, "ซื้ออุปกรณ์สำนักงาน");
  assert.equal(fetchedTx.tags.length, 1);

  // 5. Get Paged with Filtering and Totals
  const pagedAll = await TransactionService.getPaged(testUserId, {}, 1, 20);
  assert.ok(pagedAll.totalItems >= 2);
  assert.ok(pagedAll.totalIncome >= 10000);
  assert.ok(pagedAll.totalExpense >= 1500);
  assert.equal(pagedAll.netBalance, pagedAll.totalIncome - pagedAll.totalExpense);

  // Filter by category
  const pagedCat = await TransactionService.getPaged(
    testUserId,
    { categoryId: category.categoryId },
    1,
    20
  );
  assert.equal(pagedCat.totalItems, 1);
  assert.equal(pagedCat.items[0].transactionId, expenseTx.transactionId);

  // Filter by tag
  const pagedTag = await TransactionService.getPaged(
    testUserId,
    { tagId: tag.tagId },
    1,
    20
  );
  assert.equal(pagedTag.totalItems, 1);
  assert.equal(pagedTag.items[0].transactionId, expenseTx.transactionId);

  // Search by query q
  const pagedSearch = await TransactionService.getPaged(
    testUserId,
    { q: "เงินเดือน" },
    1,
    20
  );
  assert.ok(pagedSearch.items.some((i) => i.transactionId === incomeTx.transactionId));

  // 6. Update Transaction
  const updatedExpense = await TransactionService.update(
    expenseTx.transactionId,
    testUserId,
    {
      transactionType: "expense",
      amount: 1750,
      transactionDate: new Date().toISOString(),
      description: "ซื้ออุปกรณ์สำนักงานและสมุดจด",
      categoryId: category.categoryId,
      bankAccountId: account.bankAccountId,
      tagIds: [], // remove tags
    }
  );

  assert.ok(updatedExpense);
  assert.equal(updatedExpense.amount, 1750);
  assert.equal(updatedExpense.description, "ซื้ออุปกรณ์สำนักงานและสมุดจด");
  assert.equal(updatedExpense.tags.length, 0);

  // 7. Delete Transaction
  const deletedSingle = await TransactionService.delete(incomeTx.transactionId, testUserId);
  assert.equal(deletedSingle, true);

  const afterDeleteSingle = await TransactionService.getById(incomeTx.transactionId, testUserId);
  assert.equal(afterDeleteSingle, null, "Deleted transaction should not be returned");

  // 8. Bulk Delete Transactions
  const extraTx = await TransactionService.create(testUserId, {
    transactionType: "expense",
    amount: 300,
    transactionDate: new Date().toISOString(),
    description: "ขนมเบรค",
  });

  const bulkDeletedCount = await TransactionService.bulkDelete(testUserId, [
    expenseTx.transactionId,
    extraTx.transactionId,
  ]);
  assert.equal(bulkDeletedCount, 2);

  const afterBulk1 = await TransactionService.getById(expenseTx.transactionId, testUserId);
  const afterBulk2 = await TransactionService.getById(extraTx.transactionId, testUserId);
  assert.equal(afterBulk1, null);
  assert.equal(afterBulk2, null);

  // Clean up tag, account, category rules and category
  await TagService.delete(tag.tagId, testUserId);
  await BankAccountService.delete(account.bankAccountId, testUserId);
  await db.delete(categoryRules).where(eq(categoryRules.categoryId, category.categoryId));
  await CategoryService.delete(category.categoryId, testUserId);

  console.log("\nALL TESTS FOR TASK 3.1 PASSED SUCCESSFULLY! 🎉");
  process.exit(0);
}

testTransactions().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
