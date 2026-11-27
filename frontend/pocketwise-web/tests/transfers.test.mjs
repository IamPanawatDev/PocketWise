import assert from "node:assert/strict";
import { gatewayRegistry } from "../src/lib/server/gateway-registry";
import { registerTransferRoutes } from "../src/lib/server/modules/transfers/transfer.router";
import { TransferService } from "../src/lib/server/modules/transfers/transfer.service";
import { BankAccountService } from "../src/lib/server/modules/bank-accounts/bank-account.service";
import { db } from "../src/lib/server/db";
import {
  transactions,
  transferGroups,
  bankAccounts,
} from "../src/lib/server/db/schema";
import { and, eq } from "drizzle-orm";

async function testTransfers() {
  console.log("Verifying Transfers Module (Task 3.2)...");

  // 1. Gateway Route Registration Verification
  registerTransferRoutes();

  assert.ok(gatewayRegistry.match("GET", ["transfers"]), "GET transfers should match");
  assert.ok(gatewayRegistry.match("GET", ["transfers", "123"]), "GET transfers/:id should match");
  assert.ok(gatewayRegistry.match("POST", ["transfers"]), "POST transfers should match");
  console.log("Gateway Route Registration verified successfully!");

  const testUserId = 1; // existing test user (famreplay@gmail.com)

  // 2. Setup prerequisites: 2 bank accounts
  const fromAcc = await BankAccountService.create(testUserId, {
    accountName: `Transfer_From_${Date.now()}`,
    accountType: "bank",
    bankName: "KBANK",
  });

  const toAcc = await BankAccountService.create(testUserId, {
    accountName: `Transfer_To_${Date.now()}`,
    accountType: "bank",
    bankName: "SCB",
  });

  console.log(`Created Source Account ID: ${fromAcc.bankAccountId}, Target Account ID: ${toAcc.bankAccountId}`);

  // 3. Validation Checks
  // 3.1 Amount <= 0
  await assert.rejects(
    async () => {
      await TransferService.create(testUserId, {
        fromBankAccountId: fromAcc.bankAccountId,
        toBankAccountId: toAcc.bankAccountId,
        amount: 0,
        transferDate: new Date(),
      });
    },
    { code: "VALIDATION_ERROR" },
    "Amount <= 0 should throw VALIDATION_ERROR"
  );

  // 3.2 Same Source and Target Account
  await assert.rejects(
    async () => {
      await TransferService.create(testUserId, {
        fromBankAccountId: fromAcc.bankAccountId,
        toBankAccountId: fromAcc.bankAccountId,
        amount: 500,
        transferDate: new Date(),
      });
    },
    { code: "VALIDATION_ERROR" },
    "Same source and target account should throw VALIDATION_ERROR"
  );

  // 3.3 Non-existent Source Account
  await assert.rejects(
    async () => {
      await TransferService.create(testUserId, {
        fromBankAccountId: 99999999,
        toBankAccountId: toAcc.bankAccountId,
        amount: 500,
        transferDate: new Date(),
      });
    },
    { code: "NOT_FOUND" },
    "Non-existent fromBankAccountId should throw NOT_FOUND"
  );

  // 4. Create Transfer (Atomic Execution)
  const transferAmount = 2500;
  const transfer = await TransferService.create(testUserId, {
    fromBankAccountId: fromAcc.bankAccountId,
    toBankAccountId: toAcc.bankAccountId,
    amount: transferAmount,
    transferDate: new Date().toISOString(),
    reference: "โอนเงินเข้าบัญชีเก็บออม",
  });

  assert.ok(transfer.transferGroupId > 0);
  assert.equal(transfer.fromBankAccountId, fromAcc.bankAccountId);
  assert.equal(transfer.toBankAccountId, toAcc.bankAccountId);
  assert.equal(transfer.amount, transferAmount);
  assert.equal(transfer.reference, "โอนเงินเข้าบัญชีเก็บออม");
  assert.equal(transfer.status, "confirmed");
  console.log("Created Transfer ID:", transfer.transferGroupId);

  // 5. Verify Linked Transactions
  const linkedTx = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.transferGroupId, transfer.transferGroupId),
        eq(transactions.isDeleted, false)
      )
    );

  assert.equal(linkedTx.length, 2, "Should create exactly 2 linked transactions");
  const outTx = linkedTx.find((t) => t.bankAccountId === fromAcc.bankAccountId);
  const inTx = linkedTx.find((t) => t.bankAccountId === toAcc.bankAccountId);

  assert.ok(outTx, "Outgoing transaction must exist");
  assert.equal(Number(outTx.amount), transferAmount);
  assert.equal(outTx.transactionType, "Transfer");
  assert.ok(outTx.description?.includes(toAcc.accountName));

  assert.ok(inTx, "Incoming transaction must exist");
  assert.equal(Number(inTx.amount), transferAmount);
  assert.equal(inTx.transactionType, "Transfer");
  assert.ok(inTx.description?.includes(fromAcc.accountName));

  // 6. Verify Account Balance Impact
  const sourceAfter = await BankAccountService.getById(fromAcc.bankAccountId, testUserId);
  const targetAfter = await BankAccountService.getById(toAcc.bankAccountId, testUserId);

  assert.equal(sourceAfter?.currentBalance, -transferAmount, "Source account balance should decrease");
  assert.equal(targetAfter?.currentBalance, transferAmount, "Target account balance should increase");

  // 7. Get Transfer by ID
  const fetchedTransfer = await TransferService.getById(transfer.transferGroupId, testUserId);
  assert.ok(fetchedTransfer);
  assert.equal(fetchedTransfer.transferGroupId, transfer.transferGroupId);
  assert.equal(fetchedTransfer.amount, transferAmount);

  // 8. GetAll Transfers
  const allTransfers = await TransferService.getAll(testUserId);
  const found = allTransfers.find((t) => t.transferGroupId === transfer.transferGroupId);
  assert.ok(found, "Created transfer should be in getAll list");

  // Clean up transactions, transferGroup, and accounts
  await db.delete(transactions).where(eq(transactions.transferGroupId, transfer.transferGroupId));
  await db.delete(transferGroups).where(eq(transferGroups.transferGroupId, transfer.transferGroupId));
  await BankAccountService.delete(fromAcc.bankAccountId, testUserId);
  await BankAccountService.delete(toAcc.bankAccountId, testUserId);

  console.log("\nALL TESTS FOR TASK 3.2 PASSED SUCCESSFULLY! 🎉");
  process.exit(0);
}

testTransfers().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
