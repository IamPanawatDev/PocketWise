import assert from "node:assert";
import { StatementParserService } from "../src/lib/server/modules/imports/statement-parser.service.ts";
import { CreditCardService } from "../src/lib/server/modules/credit-cards/credit-card.service.ts";
import { importService } from "../src/lib/server/modules/imports/import.service.ts";
import { db } from "../src/lib/server/db/index.ts";
import { creditCards, creditCardStatements, creditCardStatementItems, importJobs, transactions } from "../src/lib/server/db/schema.ts";
import { eq, and } from "drizzle-orm";

async function runTests() {
  console.log("Starting Task 4.3 Statement Import Integration Tests...");

  const userId = 1;

  // 1. Verify StatementParserService (CSV & JSON)
  console.log("1. Testing StatementParserService...");
  const sampleCsv = `# statement_date: 2026-10-15
# due_date: 2026-10-31
# period_start: 2026-09-16
# period_end: 2026-10-15
Date,Description,Amount,Type,Ref
2026-09-20,Lotus Supermarket,1250.50,Purchase,REF001
2026-09-25,Netflix Subscription,419.00,Purchase,REF002
2026-10-01,Shopee Pay,850.00,Purchase,REF003
2026-10-05,Credit Card Payment,2500.00,Payment,PAY001
2026-10-10,Cashback Reward,100.00,Cashback,CB001
`;

  const parsedCsv = await StatementParserService.parseStatement(
    Buffer.from(sampleCsv),
    "sample.csv"
  );

  assert.strictEqual(parsedCsv.statementDate, "2026-10-15");
  assert.strictEqual(parsedCsv.paymentDueDate, "2026-10-31");
  assert.strictEqual(parsedCsv.statementPeriodStart, "2026-09-16");
  assert.strictEqual(parsedCsv.statementPeriodEnd, "2026-10-15");
  assert.strictEqual(parsedCsv.items.length, 5);
  assert.strictEqual(parsedCsv.purchaseAmount, 2519.5); // 1250.50 + 419 + 850
  assert.strictEqual(parsedCsv.paymentAmount, 2500);
  assert.strictEqual(parsedCsv.cashbackAmount, 100);
  console.log("  StatementParserService (CSV) passed!");

  const sampleJson = JSON.stringify({
    statementDate: "2026-11-01",
    previousBalance: 1000,
    items: [
      {
        transactionDate: "2026-10-20",
        description: "Grab Food",
        amount: 320,
        itemType: "Purchase",
        externalReference: "GRB99",
      },
      {
        transactionDate: "2026-10-25",
        description: "Apple Store",
        amount: 99,
        itemType: "Purchase",
        externalReference: "APL01",
      },
    ],
  });

  const parsedJson = await StatementParserService.parseStatement(
    Buffer.from(sampleJson),
    "statement.json"
  );
  assert.strictEqual(parsedJson.statementDate, "2026-11-01");
  assert.strictEqual(parsedJson.items.length, 2);
  assert.strictEqual(parsedJson.purchaseAmount, 419);
  assert.strictEqual(parsedJson.totalDue, 1419); // 1000 prev + 419 purchases
  console.log("  StatementParserService (JSON) passed!");

  // 2. Prepare Test Credit Card
  console.log("2. Preparing Test Credit Card...");
  let [testCard] = await db
    .select()
    .from(creditCards)
    .where(and(eq(creditCards.userId, userId), eq(creditCards.isDeleted, false)))
    .limit(1);

  if (!testCard) {
    [testCard] = await db
      .insert(creditCards)
      .values({
        userId,
        bankName: "KBANK",
        cardName: "KBank OneSiam Signature",
        cardNumberMasked: "XXXX-XXXX-XXXX-9999",
        billingDay: 15,
        paymentDueDay: 30,
        creditLimit: "100000",
        isActive: true,
      })
      .returning();
  }
  assert.ok(testCard.creditCardId, "Test card should exist");
  console.log("  Using Credit Card:", testCard.cardName, "ID:", testCard.creditCardId);

  // 3. Test Import Statement (First Upload)
  console.log("3. Testing CreditCardService.importStatement...");
  const uniqueRef1 = `TEST-REF-${Date.now()}-1`;
  const uniqueRef2 = `TEST-REF-${Date.now()}-2`;
  const uploadCsv = `Date,Description,Amount,Type,Ref
2026-11-10,Starbucks Coffee,185.00,Purchase,${uniqueRef1}
2026-11-12,BTS SkyTrain,120.00,Purchase,${uniqueRef2}
`;

  const importRes = await CreditCardService.importStatement(
    userId,
    testCard.creditCardId,
    Buffer.from(uploadCsv),
    "test-statement.csv"
  );

  assert.ok(importRes.statementId, "Statement should have an ID");
  assert.ok(importRes.importJobId, "Import job should be created");
  assert.strictEqual(importRes.totalItems, 2);
  assert.strictEqual(importRes.duplicateItems, 0);
  assert.strictEqual(importRes.status, "imported");
  assert.strictEqual(importRes.items.length, 2);
  console.log("  Statement imported successfully with ID:", importRes.statementId);

  // 4. Test Duplicate Detection (Second Upload with same items)
  console.log("4. Testing Duplicate Detection...");
  const dupImportRes = await CreditCardService.importStatement(
    userId,
    testCard.creditCardId,
    Buffer.from(uploadCsv),
    "test-statement-duplicate.csv"
  );
  assert.strictEqual(dupImportRes.duplicateItems, 2, "Both items should be detected as duplicates");
  assert.strictEqual(dupImportRes.items[0].isDuplicate, true);
  assert.strictEqual(dupImportRes.items[1].isDuplicate, true);
  console.log("  Duplicate detection verified successfully!");

  // 5. Test Get Statement by Card ID & by Statement ID
  console.log("5. Testing Get Statement endpoints...");
  const cardStatements = await CreditCardService.getStatementsByCardId(userId, testCard.creditCardId);
  assert.ok(cardStatements.length > 0, "Card statements should return records");

  const singleStatement = await CreditCardService.getStatementById(userId, importRes.statementId);
  assert.ok(singleStatement, "Single statement query should succeed");
  assert.strictEqual(singleStatement.statementId, importRes.statementId);
  assert.strictEqual(singleStatement.items.length, 2);
  console.log("  Get Statement queries passed!");

  // 6. Test Confirm Statement Items (Batch Confirm)
  console.log("6. Testing CreditCardService.confirmStatementItems...");
  const itemToConfirm = singleStatement.items[0];
  const confirmReq = {
    items: [
      {
        statementItemId: itemToConfirm.statementItemId,
        description: "Starbucks Paragon (Confirmed)",
      },
    ],
  };

  const confirmRes = await CreditCardService.confirmStatementItems(
    userId,
    singleStatement.statementId,
    confirmReq
  );

  assert.strictEqual(confirmRes.confirmedCount, 1);
  assert.strictEqual(confirmRes.createdTransactionIds.length, 1);
  const createdTxnId = confirmRes.createdTransactionIds[0];

  // Verify created transaction in DB
  const [createdTxn] = await db
    .select()
    .from(transactions)
    .where(eq(transactions.transactionId, createdTxnId));

  assert.ok(createdTxn, "Transaction must be created in DB");
  assert.strictEqual(createdTxn.creditCardId, testCard.creditCardId);
  assert.strictEqual(createdTxn.sourceType, "CardStatement");
  assert.strictEqual(createdTxn.status, "Confirmed");
  assert.strictEqual(createdTxn.statementItemId, itemToConfirm.statementItemId);
  assert.strictEqual(createdTxn.description, "Starbucks Paragon (Confirmed)");

  // Verify item is linked
  const updatedStatement = await CreditCardService.getStatementById(userId, singleStatement.statementId);
  const updatedItem = updatedStatement.items.find((i) => i.statementItemId === itemToConfirm.statementItemId);
  assert.strictEqual(updatedItem.isLinked, true);
  assert.strictEqual(updatedItem.transactionId, createdTxnId);
  assert.strictEqual(updatedStatement.status, "reviewed");
  console.log("  Confirm statement item verified! Created Txn ID:", createdTxnId);

  // 7. Test Import Jobs API with Statement Details
  console.log("7. Testing Import Jobs integration for Statement...");
  const jobsRes = await importService.getJobs(userId, 1, 10, "cardStatement");
  assert.ok(jobsRes.items.length > 0, "Jobs should contain statement jobs");
  const jobItem = jobsRes.items.find((j) => j.importJobId === importRes.importJobId);
  assert.ok(jobItem, "Import job item should be found");
  assert.strictEqual(jobItem.importType, "cardStatement");
  assert.strictEqual(jobItem.statementId, importRes.statementId);
  assert.strictEqual(jobItem.creditCardId, testCard.creditCardId);

  const singleJob = await importService.getJobById(userId, importRes.importJobId);
  assert.ok(singleJob, "Single job should be retrieved");
  assert.strictEqual(singleJob.statementId, importRes.statementId);
  assert.strictEqual(singleJob.creditCardId, testCard.creditCardId);
  console.log("  Import jobs integration with Statement passed!");

  console.log("\nALL TESTS FOR TASK 4.3 PASSED SUCCESSFULLY! 🎉\n");
  process.exit(0);
}

runTests().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
