import assert from "node:assert/strict";
import { gatewayRegistry } from "../src/lib/server/gateway-registry";
import { registerImportRoutes } from "../src/lib/server/modules/imports/import.router";
import { geminiOcrService } from "../src/lib/server/modules/imports/gemini-ocr.service";
import { importService } from "../src/lib/server/modules/imports/import.service";
import { CategoryService } from "../src/lib/server/modules/categories/category.service";
import { db } from "../src/lib/server/db";
import {
  slipImportFiles,
  importJobs,
  transactions,
  bankAccounts,
  categories,
  categoryRules,
  auditLogs,
} from "../src/lib/server/db/schema";
import { eq, inArray, and, desc } from "drizzle-orm";

async function testImports() {
  console.log("Verifying Slip Import & Gemini OCR Module (Task 4.2)...");

  // 1. Gateway Route Registration Verification
  registerImportRoutes();

  assert.ok(gatewayRegistry.match("POST", ["imports", "slips"]), "POST imports/slips should match");
  assert.ok(gatewayRegistry.match("POST", ["imports", "ocr"]), "POST imports/ocr should match");
  assert.ok(gatewayRegistry.match("GET", ["imports", "slips", "123"]), "GET imports/slips/:id should match");
  assert.ok(gatewayRegistry.match("GET", ["imports", "slips", "123", "image"]), "GET imports/slips/:id/image should match");
  assert.ok(gatewayRegistry.match("POST", ["imports", "slips", "123", "confirm"]), "POST imports/slips/:id/confirm should match");
  assert.ok(gatewayRegistry.match("POST", ["imports", "slips", "123", "reject"]), "POST imports/slips/:id/reject should match");
  assert.ok(gatewayRegistry.match("GET", ["imports", "jobs"]), "GET imports/jobs should match");
  assert.ok(gatewayRegistry.match("GET", ["imports", "jobs", "456"]), "GET imports/jobs/:id should match");
  console.log("Gateway Route Registration verified successfully!");

  // 2. Unit Testing Gemini OCR Parsing & Date Logic
  console.log("Testing Gemini OCR Parser...");

  const mockGeminiResponse = {
    candidates: [
      {
        content: {
          parts: [
            {
              text: JSON.stringify({
                bankCode: "004", // KBANK
                payerName: "นาย สมชาย สายเปย์",
                payeeName: "บริษัท ส้มตำ อินเตอร์ จำกัด",
                amount: 1550.75,
                transactionDate: "2026-11-20T14:30:00",
                transactionReference: "TXN987654321",
                rawText: "โอนเงินสำเร็จ จำนวน 1,550.75 บาท ไปยัง บจก. ส้มตำ อินเตอร์",
              }),
            },
          ],
        },
      },
    ],
  };

  const parsed = geminiOcrService.parseGeminiResponse(mockGeminiResponse);
  assert.ok(parsed, "Parsed result should not be null");
  assert.equal(parsed.bankCode, "KBANK", "Numeric 004 should normalize to KBANK");
  assert.equal(parsed.detectedAmount, 1550.75, "Amount should match 1550.75");
  assert.equal(parsed.payeeName, "บริษัท ส้มตำ อินเตอร์ จำกัด");
  assert.equal(parsed.transactionReference, "TXN987654321");
  assert.ok(parsed.detectedAt instanceof Date, "Date should be parsed to Date object");

  // Test Thai Date Regex & Buddhist year conversion (2569 -> 2026)
  const thaiDate = geminiOcrService.parseSlipDateToUtc("18 ต.ค. 2569 16:04:30");
  assert.ok(thaiDate instanceof Date, "Thai date string should parse to Date");
  assert.equal(thaiDate.getUTCFullYear(), 2026, "Buddhist year 2569 should convert to 2026");
  assert.equal(thaiDate.getUTCMonth(), 9, "ตุลาคม should convert to October (month 9 zero-indexed)");
  assert.equal(thaiDate.getUTCDate(), 18, "Day should be 18");
  console.log("Gemini OCR parsing & Thai date parsing verified successfully!");

  const testUserId = 1; // existing test user (famreplay@gmail.com)
  const createdSlipIds = [];
  const createdJobIds = [];
  const createdTxIds = [];
  let testCatId = null;

  try {
    // 3. Setup Prerequisite Category
    const category = await CategoryService.create(testUserId, {
      categoryName: `SlipCat_${Date.now()}`,
      categoryType: "expense",
      color: "#10b981",
      icon: "receipt",
    });
    testCatId = category.categoryId;

    // 4. Test Slip Upload with Mock Extracted Data
    console.log("Testing Slip Upload & Duplicate Detection...");
    const dummyImageBuffer = Buffer.from(`dummy-slip-image-bytes-${Date.now()}`);
    const fileName = "test_slip_01.jpg";

    const uploadRes1 = await importService.uploadSlip(
      testUserId,
      dummyImageBuffer,
      fileName,
      "image/jpeg",
      dummyImageBuffer.length,
      "KBANK",
      1,
      {
        bankCode: "KBANK",
        payerName: "นาย สมชาย",
        payeeName: "ร้านกาแฟ อเมซอน",
        detectedAmount: 120.0,
        detectedAt: new Date("2026-11-20T10:15:00Z"),
        transactionReference: "KBANK-REF-001",
        rawText: "โอนเงิน 120 บาท",
      },
    );

    assert.ok(uploadRes1.slipImportFileId > 0, "Slip ID should be generated");
    assert.equal(uploadRes1.isDuplicate, false, "First upload should not be duplicate");
    assert.equal(uploadRes1.reviewStatus, "pending");
    assert.equal(uploadRes1.detectedAmount, 120.0);
    assert.equal(uploadRes1.bankCode, "KBANK");
    assert.ok(uploadRes1.importJobId, "ImportJobId should be created");

    createdSlipIds.push(uploadRes1.slipImportFileId);
    if (uploadRes1.importJobId) createdJobIds.push(uploadRes1.importJobId);

    // Test Duplicate Upload (same buffer produces identical SHA-256)
    const uploadResDuplicate = await importService.uploadSlip(
      testUserId,
      dummyImageBuffer,
      "test_slip_01_copy.jpg",
      "image/jpeg",
      dummyImageBuffer.length,
      "KBANK",
      1,
      {
        bankCode: "KBANK",
        payerName: "นาย สมชาย",
        payeeName: "ร้านกาแฟ อเมซอน",
        detectedAmount: 120.0,
        detectedAt: new Date("2026-11-20T10:15:00Z"),
        transactionReference: "KBANK-REF-001",
      },
    );

    assert.equal(uploadResDuplicate.isDuplicate, true, "Duplicate file should have isDuplicate = true");
    assert.equal(uploadResDuplicate.reviewStatus, "duplicate", "Duplicate file should have reviewStatus = duplicate");
    createdSlipIds.push(uploadResDuplicate.slipImportFileId);
    if (uploadResDuplicate.importJobId) createdJobIds.push(uploadResDuplicate.importJobId);
    console.log("Slip Upload & Duplicate Detection verified successfully!");

    // 5. Test Get Slip By ID & Image File
    console.log("Testing Get Slip & Image Stream...");
    const fetchedSlip = await importService.getSlipById(testUserId, uploadRes1.slipImportFileId);
    assert.ok(fetchedSlip, "Should retrieve slip by ID");
    assert.equal(fetchedSlip.slipImportFileId, uploadRes1.slipImportFileId);
    assert.equal(fetchedSlip.detectedAmount, 120.0);

    const fetchedFile = await importService.getSlipFile(testUserId, uploadRes1.slipImportFileId);
    assert.ok(fetchedFile, "Should retrieve saved image file");
    assert.equal(fetchedFile.contentType, "image/jpeg");
    assert.equal(fetchedFile.buffer.toString(), dummyImageBuffer.toString());
    console.log("Get Slip & Image Stream verified successfully!");

    // 6. Test Confirm Slip -> Creates Real Expense Transaction
    console.log("Testing Confirm Slip...");
    const confirmRes = await importService.confirmSlip(testUserId, uploadRes1.slipImportFileId, {
      amount: 120.0,
      transactionDate: new Date("2026-11-20T10:15:00Z").toISOString(),
      description: "กาแฟสด อเมซอน",
      categoryId: testCatId,
      bankAccountId: uploadRes1.suggestedBankAccountId,
      payeeName: "ร้านกาแฟ อเมซอน",
      transactionReference: "KBANK-REF-001",
    });

    assert.ok(confirmRes.transactionId > 0, "Transaction should be created");
    assert.equal(confirmRes.amount, 120.0);
    assert.equal(confirmRes.transactionType, "expense");
    assert.equal(confirmRes.sourceType, "slip");
    assert.equal(confirmRes.status, "confirmed");
    createdTxIds.push(confirmRes.transactionId);

    // Verify slip review status changed to confirmed
    const slipAfterConfirm = await importService.getSlipById(testUserId, uploadRes1.slipImportFileId);
    assert.equal(slipAfterConfirm.reviewStatus, "confirmed", "Slip should now be confirmed");
    console.log("Confirm Slip verified successfully!");

    // 7. Test Reject Slip
    console.log("Testing Reject Slip...");
    const rejectSuccess = await importService.rejectSlip(testUserId, uploadResDuplicate.slipImportFileId);
    assert.equal(rejectSuccess, true, "Reject should return true");

    const slipAfterReject = await importService.getSlipById(testUserId, uploadResDuplicate.slipImportFileId);
    assert.equal(slipAfterReject.reviewStatus, "rejected", "Slip should now be rejected");
    console.log("Reject Slip verified successfully!");

    // 8. Test Get Jobs Paged & Get Job By ID
    console.log("Testing Import Jobs API...");
    const jobsPaged = await importService.getJobs(testUserId, 1, 10, "slip");
    assert.ok(jobsPaged.items.length > 0, "Import jobs list should not be empty");
    assert.ok(jobsPaged.totalItems > 0, "Total items should be positive");

    const jobDetail = await importService.getJobById(testUserId, uploadRes1.importJobId);
    assert.ok(jobDetail, "Should fetch job by ID");
    assert.equal(jobDetail.importJobId, uploadRes1.importJobId);
    assert.equal(jobDetail.status, "completed", "Confirmed slip job should be completed");
    console.log("Import Jobs API verified successfully!");

    // 9. Test Slip Upload Error Logging (Failed Job and AuditLog recording)
    console.log("Testing Slip Upload Error Logging...");
    const invalidFileName = `invalid_slip_${Date.now()}.txt`;
    const invalidBuffer = Buffer.from("not an image file");
    let caughtError = null;

    try {
      await importService.uploadSlip(
        testUserId,
        invalidBuffer,
        invalidFileName,
        "text/plain",
        invalidBuffer.length,
      );
    } catch (err) {
      caughtError = err;
    }

    assert.ok(caughtError, "Upload with invalid mime should throw error");

    // Verify Failed ImportJob recorded
    const [failedJob] = await db
      .select()
      .from(importJobs)
      .where(
        and(
          eq(importJobs.userId, testUserId),
          eq(importJobs.fileName, invalidFileName),
        ),
      )
      .limit(1);

    assert.ok(failedJob, "Failed import job must be recorded in DB");
    assert.equal(failedJob.status, "Failed", "Failed job status must be 'Failed'");
    assert.ok(failedJob.errorMessage, "Failed job must have errorMessage");
    createdJobIds.push(failedJob.importJobId);

    // Verify AuditLog recorded
    const [failedAudit] = await db
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.userId, testUserId),
          eq(auditLogs.entityType, "SlipImportFiles"),
        ),
      )
      .orderBy(desc(auditLogs.occurredAt))
      .limit(1);

    assert.ok(failedAudit, "Audit log must be recorded for failed slip upload");
    assert.ok(failedAudit.detailsJson?.includes(invalidFileName), "Audit log details must mention invalid file name");
    assert.ok(failedAudit.detailsJson?.includes('"status":"Failed"'), "Audit log must mark status as Failed");
    console.log("Slip Upload Error Logging (Failed Job & AuditLog) verified successfully!");

    console.log("\nALL TESTS FOR TASK 4.2 PASSED SUCCESSFULLY! 🎉");
  } finally {
    // 9. Teardown test artifacts
    if (createdTxIds.length > 0) {
      await db.delete(transactions).where(inArray(transactions.transactionId, createdTxIds));
    }
    if (createdSlipIds.length > 0) {
      await db.delete(slipImportFiles).where(inArray(slipImportFiles.slipImportFileId, createdSlipIds));
    }
    if (createdJobIds.length > 0) {
      await db.delete(importJobs).where(inArray(importJobs.importJobId, createdJobIds));
    }
    if (testCatId) {
      await db.delete(categoryRules).where(eq(categoryRules.categoryId, testCatId));
      await db.delete(categories).where(eq(categories.categoryId, testCatId));
    }
  }
}

testImports().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
