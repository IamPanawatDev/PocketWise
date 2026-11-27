import assert from "node:assert/strict";
import { gatewayRegistry } from "../src/lib/server/gateway-registry";
import { registerReportRoutes } from "../src/lib/server/modules/reports/report.router";
import { ReportService } from "../src/lib/server/modules/reports/report.service";
import { CategoryService } from "../src/lib/server/modules/categories/category.service";
import { BankAccountService } from "../src/lib/server/modules/bank-accounts/bank-account.service";
import { TransactionService } from "../src/lib/server/modules/transactions/transaction.service";
import { db } from "../src/lib/server/db";
import {
  categoryRules,
  transactions,
  bankAccounts,
  categories,
} from "../src/lib/server/db/schema";
import { eq } from "drizzle-orm";

async function testReports() {
  console.log("Verifying Reports Module (Task 4.1)...");

  // 1. Gateway Route Registration Verification
  registerReportRoutes();

  assert.ok(gatewayRegistry.match("GET", ["reports", "summary"]), "GET reports/summary should match");
  assert.ok(gatewayRegistry.match("GET", ["reports", "trends"]), "GET reports/trends should match");
  assert.ok(gatewayRegistry.match("GET", ["reports", "export"]), "GET reports/export should match");
  console.log("Gateway Route Registration verified successfully!");

  const testUserId = 1; // existing test user (famreplay@gmail.com)

  // 2. Setup Prerequisites: Category, Bank Account, Transactions
  const category = await CategoryService.create(testUserId, {
    categoryName: `RepCat_${Date.now()}`,
    categoryType: "expense",
    color: "#e11d48",
    icon: "pie-chart",
  });

  const account = await BankAccountService.create(testUserId, {
    accountName: `RepAcc_${Date.now()}`,
    accountType: "bank",
    bankName: "KBANK",
  });

  const incomeTx = await TransactionService.create(testUserId, {
    transactionType: "income",
    amount: 25000,
    currencyCode: "THB",
    transactionDate: new Date().toISOString(),
    description: "เงินเดือนประจำเดือน",
    bankAccountId: account.bankAccountId,
  });

  const expenseTx = await TransactionService.create(testUserId, {
    transactionType: "expense",
    amount: 5000,
    currencyCode: "THB",
    transactionDate: new Date().toISOString(),
    description: "ค่าใช้จ่ายทั่วไป",
    categoryId: category.categoryId,
    bankAccountId: account.bankAccountId,
  });

  console.log("Setup prerequisites complete.");

  const fromDate = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  const toDate = new Date(Date.now() + 24 * 3600 * 1000).toISOString();

  // 3. Test Report Summary
  const summary = await ReportService.getSummary(testUserId, {
    fromDate,
    toDate,
  });

  assert.ok(summary.currencies.length > 0, "Should have at least 1 currency summary");
  const thbSummary = summary.currencies.find((c) => c.currencyCode === "THB");
  assert.ok(thbSummary, "THB currency summary must exist");
  assert.ok(thbSummary.totalIncome >= 25000, "Total income should include 25000");
  assert.ok(thbSummary.totalExpense >= 5000, "Total expense should include 5000");
  assert.equal(thbSummary.netAmount, thbSummary.totalIncome - thbSummary.totalExpense);

  const catInBreakdown = thbSummary.categoryBreakdown.find((c) => c.categoryId === category.categoryId);
  assert.ok(catInBreakdown, "Category must appear in categoryBreakdown");
  assert.equal(catInBreakdown.amount, 5000);

  const accInBreakdown = thbSummary.bankAccountBreakdown.find((a) => a.bankAccountId === account.bankAccountId);
  assert.ok(accInBreakdown, "Bank account must appear in bankAccountBreakdown");
  assert.equal(accInBreakdown.amount, 5000);
  console.log("Report Summary verified successfully!");

  // 4. Test Report Trends
  const trends = await ReportService.getTrends(testUserId, {
    fromDate,
    toDate,
    period: "monthly",
  });

  assert.equal(trends.period, "monthly");
  assert.ok(trends.series.length > 0, "Trends series must contain data points");
  const thbSeries = trends.series.filter((s) => s.currencyCode === "THB");
  assert.ok(thbSeries.length > 0);
  console.log("Report Trends verified successfully!");

  // 5. Test Report Export
  // 5.1 CSV Export
  const csvExport = await ReportService.exportReport(testUserId, {
    fromDate,
    toDate,
    format: "csv",
  });

  assert.equal(csvExport.contentType, "text/csv; charset=utf-8");
  assert.ok(csvExport.fileName.endsWith(".csv"));
  // Check BOM (0xEF, 0xBB, 0xBF)
  assert.equal(csvExport.content[0], 0xef);
  assert.equal(csvExport.content[1], 0xbb);
  assert.equal(csvExport.content[2], 0xbf);
  const csvText = Buffer.from(csvExport.content).toString("utf-8");
  assert.ok(csvText.includes("PocketWise Financial Report"));
  assert.ok(csvText.includes("ค่าใช้จ่ายทั่วไป"));

  // 5.2 JSON Export
  const jsonExport = await ReportService.exportReport(testUserId, {
    fromDate,
    toDate,
    format: "json",
  });

  assert.equal(jsonExport.contentType, "application/json; charset=utf-8");
  assert.ok(jsonExport.fileName.endsWith(".json"));
  const parsedJson = JSON.parse(Buffer.from(jsonExport.content).toString("utf-8"));
  assert.ok(parsedJson.currencies);
  assert.ok(parsedJson.transactions);
  console.log("Report Export (CSV & JSON) verified successfully!");

  // 6. Cleanups
  await TransactionService.delete(incomeTx.transactionId, testUserId);
  await TransactionService.delete(expenseTx.transactionId, testUserId);
  await db.delete(transactions).where(eq(transactions.transactionId, incomeTx.transactionId));
  await db.delete(transactions).where(eq(transactions.transactionId, expenseTx.transactionId));
  await BankAccountService.delete(account.bankAccountId, testUserId);
  await db.delete(categoryRules).where(eq(categoryRules.categoryId, category.categoryId));
  await CategoryService.delete(category.categoryId, testUserId);

  console.log("\nALL TESTS FOR TASK 4.1 PASSED SUCCESSFULLY! 🎉");
  process.exit(0);
}

testReports().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
