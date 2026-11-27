import assert from "node:assert";
import { RecurringTransactionService } from "../src/lib/server/modules/recurring/recurring.service.ts";
import { authService } from "../src/lib/server/modules/auth/auth.service.ts";
import { purgeAuditLogs, logAudit } from "../src/lib/server/audit.ts";
import { db } from "../src/lib/server/db/index.ts";
import {
  recurringTransactions,
  transactions,
  userRefreshTokens,
  auditLogs,
} from "../src/lib/server/db/schema.ts";
import { eq, and, sql } from "drizzle-orm";

async function runTests() {
  console.log("Starting Task 5.2 Vercel Cron Jobs Integration Tests...");

  const userId = 1;

  // 1. Test Recurring Cron Processing
  console.log("1. Testing RecurringTransactionService.processDue...");
  const pastDate = new Date(Date.now() - 24 * 3600 * 1000); // 1 day ago
  const uniqueDesc = `Monthly Internet Bill ${Date.now()}`;

  const [testRecurring] = await db
    .insert(recurringTransactions)
    .values({
      userId,
      transactionType: "Expense",
      amount: "799.00",
      description: uniqueDesc,
      frequency: "Monthly",
      intervalValue: 1,
      startDate: pastDate.toISOString().slice(0, 10),
      nextRunAt: pastDate,
      isActive: true,
      isDeleted: false,
      createdAt: pastDate,
    })
    .returning();

  assert.ok(testRecurring.recurringTransactionId, "Recurring item must be created");

  // Execute processDue
  const cronRes = await RecurringTransactionService.processDue(new Date());
  assert.ok(cronRes.processedCount >= 1, "Should process at least 1 due recurring transaction");
  assert.ok(cronRes.createdTransactionsCount >= 1, "Should create at least 1 transaction");

  // Verify created transaction in DB
  const [createdTx] = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.recurringTransactionId, testRecurring.recurringTransactionId),
        eq(transactions.userId, userId)
      )
    )
    .limit(1);

  assert.ok(createdTx, "Generated transaction must exist in DB");
  assert.strictEqual(Number(createdTx.amount), 799);
  assert.strictEqual(createdTx.sourceType, "Recurring");
  assert.strictEqual(createdTx.status, "Confirmed");
  assert.strictEqual(createdTx.description, uniqueDesc);

  // Verify nextRunAt was advanced to future
  const [updatedRecurring] = await db
    .select()
    .from(recurringTransactions)
    .where(eq(recurringTransactions.recurringTransactionId, testRecurring.recurringTransactionId))
    .limit(1);

  assert.ok(
    updatedRecurring.nextRunAt.getTime() > pastDate.getTime(),
    "nextRunAt must be advanced forward"
  );
  console.log("  Recurring transaction processDue passed! Created Tx ID:", createdTx.transactionId);

  // 2. Test Expired Refresh Tokens Cleanup
  console.log("2. Testing authService.purgeExpiredRefreshTokens...");
  const expiredDate = new Date(Date.now() - 2 * 3600 * 1000); // 2 hours ago
  const fakeTokenHash = `test_expired_hash_${Date.now()}`;

  const [insertedToken] = await db
    .insert(userRefreshTokens)
    .values({
      userId,
      tokenHash: fakeTokenHash,
      expiresAt: expiredDate,
      createdAt: expiredDate,
    })
    .returning();

  assert.ok(insertedToken.refreshTokenId);

  // Run cleanup
  const purgedTokensCount = await authService.purgeExpiredRefreshTokens(new Date());
  assert.ok(purgedTokensCount >= 1, "Should purge at least 1 expired token");

  // Verify deleted from DB
  const [checkToken] = await db
    .select()
    .from(userRefreshTokens)
    .where(eq(userRefreshTokens.refreshTokenId, insertedToken.refreshTokenId))
    .limit(1);

  assert.strictEqual(checkToken, undefined, "Expired token should be deleted from DB");
  console.log("  Purge expired refresh tokens passed! Count:", purgedTokensCount);

  // 3. Test Old Audit Logs Cleanup
  console.log("3. Testing purgeAuditLogs...");
  const oldDate = new Date(Date.now() - 100 * 24 * 3600 * 1000); // 100 days ago

  const [insertedLog] = await db
    .insert(auditLogs)
    .values({
      userId,
      action: "DataReset",
      entityType: "TestAudit",
      entityId: "9999",
      detailsJson: JSON.stringify({ note: "old test audit log" }),
      occurredAt: oldDate,
    })
    .returning();

  assert.ok(insertedLog.auditLogId);

  // Run audit log cleanup (retention 90 days)
  const purgedLogsCount = await purgeAuditLogs(90);
  assert.ok(purgedLogsCount >= 1, "Should purge at least 1 old audit log");

  const [checkLog] = await db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.auditLogId, insertedLog.auditLogId))
    .limit(1);

  assert.strictEqual(checkLog, undefined, "Old audit log should be deleted from DB");
  console.log("  Purge old audit logs passed! Count:", purgedLogsCount);

  console.log("\nALL TESTS FOR TASK 5.2 PASSED SUCCESSFULLY! 🎉\n");
  process.exit(0);
}

runTests().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
