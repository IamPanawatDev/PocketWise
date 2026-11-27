import assert from "node:assert/strict";
import { gatewayRegistry } from "../src/lib/server/gateway-registry";
import { registerBankAccountRoutes } from "../src/lib/server/modules/bank-accounts/bank-account.router";
import { registerCreditCardRoutes } from "../src/lib/server/modules/credit-cards/credit-card.router";
import { BankAccountService } from "../src/lib/server/modules/bank-accounts/bank-account.service";
import { CreditCardService } from "../src/lib/server/modules/credit-cards/credit-card.service";
import { db } from "../src/lib/server/db";
import {
  bankAccounts,
  creditCards,
  creditCardStatements,
  creditCardStatementItems,
} from "../src/lib/server/db/schema";
import { eq } from "drizzle-orm";

async function testAccountsAndCards() {
  console.log("Verifying Bank Accounts & Credit Cards Modules (Task 2.3)...");

  // 1. Gateway Route Registration Verification
  registerBankAccountRoutes();
  registerCreditCardRoutes();

  // Bank Accounts routes
  assert.ok(gatewayRegistry.match("GET", ["bank-accounts"]), "GET bank-accounts should match");
  assert.ok(gatewayRegistry.match("GET", ["bank-accounts", "123"]), "GET bank-accounts/:id should match");
  assert.ok(gatewayRegistry.match("POST", ["bank-accounts"]), "POST bank-accounts should match");
  assert.ok(gatewayRegistry.match("PUT", ["bank-accounts", "123"]), "PUT bank-accounts/:id should match");
  assert.ok(gatewayRegistry.match("DELETE", ["bank-accounts", "123"]), "DELETE bank-accounts/:id should match");

  // Credit Cards routes
  assert.ok(gatewayRegistry.match("GET", ["credit-cards"]), "GET credit-cards should match");
  assert.ok(gatewayRegistry.match("GET", ["credit-cards", "456"]), "GET credit-cards/:id should match");
  assert.ok(gatewayRegistry.match("POST", ["credit-cards"]), "POST credit-cards should match");
  assert.ok(gatewayRegistry.match("PUT", ["credit-cards", "456"]), "PUT credit-cards/:id should match");
  assert.ok(gatewayRegistry.match("DELETE", ["credit-cards", "456"]), "DELETE credit-cards/:id should match");
  assert.ok(
    gatewayRegistry.match("GET", ["credit-cards", "456", "statements"]),
    "GET credit-cards/:cardId/statements should match"
  );
  assert.ok(
    gatewayRegistry.match("GET", ["credit-cards", "statements", "789"]),
    "GET credit-cards/statements/:statementId should match"
  );
  assert.ok(
    gatewayRegistry.match("POST", ["credit-cards", "statements", "789", "confirm-items"]),
    "POST credit-cards/statements/:statementId/confirm-items should match"
  );

  console.log("Gateway Route Registration verified successfully!");

  const testUserId = 1; // existing test user (famreplay@gmail.com)

  // ==========================================
  // 2. Bank Account Service Tests
  // ==========================================
  console.log("Testing Bank Account Service...");
  const uniqueAccName = `TestAcc_${Date.now()}`;

  // 2.1 Create Bank Account
  const createdAcc = await BankAccountService.create(testUserId, {
    accountName: uniqueAccName,
    accountType: "bank",
    bankName: "กสิกรไทย", // Should resolve bankCode to KBANK
    accountNumberMasked: "123-4-56789-0",
  });

  assert.equal(createdAcc.accountName, uniqueAccName);
  assert.equal(createdAcc.accountType, "bank");
  assert.equal(createdAcc.bankCode, "KBANK");
  assert.equal(createdAcc.currentBalance, 0); // No transactions yet, so current = 0
  console.log("Created Bank Account ID:", createdAcc.bankAccountId);

  // 2.2 Get Bank Account by ID
  const fetchedAcc = await BankAccountService.getById(createdAcc.bankAccountId, testUserId);
  assert.ok(fetchedAcc, "Account should be found by ID");
  assert.equal(fetchedAcc.accountName, uniqueAccName);
  assert.equal(fetchedAcc.bankCode, "KBANK");

  // 2.3 GetAll Bank Accounts
  const allAccounts = await BankAccountService.getAll(testUserId);
  const foundAccInList = allAccounts.find((a) => a.bankAccountId === createdAcc.bankAccountId);
  assert.ok(foundAccInList, "Created account should be in getAll list");

  // 2.4 Update Bank Account
  const updatedAcc = await BankAccountService.update(createdAcc.bankAccountId, testUserId, {
    accountName: `${uniqueAccName}_Upd`,
    accountType: "wallet",
    bankName: "TrueMoney",
    accountNumberMasked: "081-xxx-9999",
    isActive: true,
  });
  assert.ok(updatedAcc);
  assert.equal(updatedAcc.accountName, `${uniqueAccName}_Upd`);
  assert.equal(updatedAcc.accountType, "wallet");
  assert.equal(updatedAcc.bankCode, "TRUEMONEY");

  // 2.5 Delete Bank Account (No transactions, should succeed)
  const deletedAccResult = await BankAccountService.delete(createdAcc.bankAccountId, testUserId);
  assert.equal(deletedAccResult, true, "Account delete should return true");

  const afterDeleteAcc = await BankAccountService.getById(createdAcc.bankAccountId, testUserId);
  assert.equal(afterDeleteAcc, null, "Deleted account should not be found");
  console.log("Bank Account Service verified successfully!");

  // ==========================================
  // 3. Credit Card Service Tests
  // ==========================================
  console.log("Testing Credit Card Service...");
  const uniqueCardName = `TestCard_${Date.now()}`;

  // 3.1 Create Credit Card
  const createdCard = await CreditCardService.create(testUserId, {
    cardName: uniqueCardName,
    bankName: "SCB",
    cardNumberMasked: "****-****-****-4321",
    billingDay: 15,
    paymentDueDay: 5,
    creditLimit: 50000,
  });

  assert.equal(createdCard.cardName, uniqueCardName);
  assert.equal(createdCard.bankName, "SCB");
  assert.equal(createdCard.cardNumberMasked, "****-****-****-4321");
  assert.equal(createdCard.billingDay, 15);
  assert.equal(createdCard.paymentDueDay, 5);
  assert.equal(createdCard.creditLimit, 50000);
  assert.equal(createdCard.currentBalance, 0);
  assert.equal(createdCard.availableCredit, 50000);
  console.log("Created Credit Card ID:", createdCard.creditCardId);

  // 3.2 Get Credit Card by ID
  const fetchedCard = await CreditCardService.getById(createdCard.creditCardId, testUserId);
  assert.ok(fetchedCard, "Credit card should be found by ID");
  assert.equal(fetchedCard.cardName, uniqueCardName);
  assert.equal(fetchedCard.creditLimit, 50000);

  // 3.3 GetAll Credit Cards
  const allCards = await CreditCardService.getAll(testUserId);
  const foundCardInList = allCards.find((c) => c.creditCardId === createdCard.creditCardId);
  assert.ok(foundCardInList, "Created card should be in getAll list");

  // 3.4 Update Credit Card
  const updatedCard = await CreditCardService.update(createdCard.creditCardId, testUserId, {
    cardName: `${uniqueCardName}_Upd`,
    bankName: "SCB Beyond",
    cardNumberMasked: "****-****-****-9999",
    billingDay: 20,
    paymentDueDay: 10,
    creditLimit: 80000,
    isActive: true,
  });
  assert.ok(updatedCard);
  assert.equal(updatedCard.cardName, `${uniqueCardName}_Upd`);
  assert.equal(updatedCard.bankName, "SCB Beyond");
  assert.equal(updatedCard.creditLimit, 80000);
  assert.equal(updatedCard.availableCredit, 80000);

  // ==========================================
  // 4. Statements & Confirm Items Tests
  // ==========================================
  console.log("Testing Credit Card Statement Service...");

  // 4.1 Insert mock statement & item
  const [testStatement] = await db
    .insert(creditCardStatements)
    .values({
      creditCardId: createdCard.creditCardId,
      statementDate: "2026-11-01",
      statementPeriodStart: "2026-10-01",
      statementPeriodEnd: "2026-10-31",
      paymentDueDate: "2026-11-25",
      totalDue: "5000.00",
      status: "Pending",
      isDeleted: false,
    })
    .returning();

  const [testItem] = await db
    .insert(creditCardStatementItems)
    .values({
      statementId: testStatement.statementId,
      transactionDate: "2026-10-15",
      description: "Starbucks Coffee Test",
      itemType: "Expense",
      amount: "175.00",
      isDuplicate: false,
      isDeleted: false,
    })
    .returning();

  // 4.2 Get Statements by Card ID
  const cardStatements = await CreditCardService.getStatementsByCardId(testUserId, createdCard.creditCardId);
  assert.ok(cardStatements.length > 0, "Should return at least 1 statement");
  assert.equal(cardStatements[0].statementId, testStatement.statementId);
  assert.equal(cardStatements[0].items.length, 1);
  assert.equal(cardStatements[0].items[0].description, "Starbucks Coffee Test");

  // 4.3 Get Statement by ID
  const statementById = await CreditCardService.getStatementById(testUserId, testStatement.statementId);
  assert.ok(statementById, "Should fetch statement by ID");
  assert.equal(statementById.statementId, testStatement.statementId);
  assert.equal(statementById.items[0].amount, 175);

  // 4.4 Confirm Statement Items
  const confirmResult = await CreditCardService.confirmStatementItems(testUserId, testStatement.statementId, {
    items: [
      {
        statementItemId: testItem.statementItemId,
        description: "Starbucks Coffee (Confirmed)",
      },
    ],
  });

  assert.equal(confirmResult.statementId, testStatement.statementId);
  assert.equal(confirmResult.confirmedCount, 1);
  assert.equal(confirmResult.createdTransactionIds.length, 1);
  console.log("Confirmed Statement Items. Created Transaction ID:", confirmResult.createdTransactionIds[0]);

  // Clean up statement items & statements
  await db.delete(creditCardStatementItems).where(eq(creditCardStatementItems.statementId, testStatement.statementId));
  await db.delete(creditCardStatements).where(eq(creditCardStatements.statementId, testStatement.statementId));

  // 3.5 Delete Credit Card
  const deletedCardResult = await CreditCardService.delete(createdCard.creditCardId, testUserId);
  assert.equal(deletedCardResult, true, "Credit card delete should return true");

  const afterDeleteCard = await CreditCardService.getById(createdCard.creditCardId, testUserId);
  assert.equal(afterDeleteCard, null, "Deleted card should not be found");
  console.log("Credit Card Service verified successfully!");

  console.log("\nALL TESTS FOR TASK 2.3 PASSED SUCCESSFULLY! 🎉");
  process.exit(0);
}

testAccountsAndCards().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
