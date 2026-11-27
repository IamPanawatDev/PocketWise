import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { eq, and, sql, desc } from "drizzle-orm";
import { db } from "../../db";
import {
  slipImportFiles,
  importJobs,
  creditCardStatements,
  bankAccounts,
  categories,
  categoryRules,
  merchants,
  transactions,
  transactionTags,
  tags,
  userSettings,
} from "../../db/schema";
import {
  AppError,
  NotFoundError,
  ConflictError,
  ValidationErrorAppError,
} from "../../api-error";
import { geminiOcrService, type SlipExtractedData } from "./gemini-ocr.service";
import { ThaiBankHelper } from "../../thai-bank-helper";
import { logAudit } from "../../audit";
import { CategoryService } from "../categories/category.service";
import type {
  SlipImportResponse,
  ConfirmSlipRequest,
  ImportJobResponse,
} from "@/types/import.types";
import type { TransactionResponse, TagRef } from "@/types/transaction.types";
import type { PagedResult } from "@/types/api.types";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

export class ImportService {
  private baseStoragePath: string;

  constructor() {
    const isServerless = Boolean(
      process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME,
    );
    this.baseStoragePath = isServerless
      ? path.join(os.tmpdir(), "pocketwise-uploads")
      : path.resolve(process.cwd(), "uploads");

    try {
      if (!fs.existsSync(this.baseStoragePath)) {
        fs.mkdirSync(this.baseStoragePath, { recursive: true });
      }
    } catch (e) {
      console.warn("[ImportService] Failed to initialize storage dir:", e);
    }
  }

  /**
   * Upload and process a bank transfer slip with Gemini OCR
   */
  public async uploadSlip(
    userId: number,
    fileBuffer: Buffer,
    fileName: string,
    contentType: string,
    fileSize: number,
    bankCode?: string | null,
    batchImageCount = 1,
    mockExtracted?: Partial<SlipExtractedData>,
  ): Promise<SlipImportResponse> {
    const startTime = Date.now();
    const effectiveBatchCount = Math.max(1, batchImageCount);

    try {
      if (fileSize <= 0 || fileBuffer.length === 0) {
        throw new ValidationErrorAppError("ขนาดไฟล์ต้องมากกว่า 0 ไบต์");
      }

    if (fileSize > MAX_FILE_SIZE) {
      throw new ValidationErrorAppError("ขนาดไฟล์ต้องไม่เกิน 10 MB");
    }

    const cleanContentType = contentType.split(";")[0].trim().toLowerCase();
    if (!ALLOWED_MIME_TYPES.has(cleanContentType)) {
      throw new ValidationErrorAppError(
        "รองรับเฉพาะไฟล์รูปภาพ (JPEG, PNG, WEBP) หรือ PDF เท่านั้น",
      );
    }

    // 1. Calculate SHA-256 Hash
    const fileHash = crypto
      .createHash("sha256")
      .update(fileBuffer)
      .digest("hex")
      .toLowerCase();

    // 2. Check duplicate slip for this user
    const [existingSlip] = await db
      .select({ id: slipImportFiles.slipImportFileId })
      .from(slipImportFiles)
      .where(
        and(
          eq(slipImportFiles.userId, userId),
          eq(slipImportFiles.fileHash, fileHash),
        ),
      )
      .limit(1);

    const isDuplicate = Boolean(existingSlip);

    // 3. Save file to disk storage
    const yyyyMM = new Date().toISOString().slice(0, 7).replace("-", "");
    const ext = path.extname(fileName) || ".jpg";
    const uniqueFileName = `${crypto.randomUUID().replace(/-/g, "")}${ext}`;
    const relativeStorageKey = path
      .join("slips", String(userId), yyyyMM, uniqueFileName)
      .replace(/\\/g, "/");
    const absoluteStoragePath = path.resolve(
      this.baseStoragePath,
      relativeStorageKey,
    );

    try {
      const targetDir = path.dirname(absoluteStoragePath);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      fs.writeFileSync(absoluteStoragePath, fileBuffer);
    } catch (fsErr) {
      console.warn("[ImportService] Ephemeral storage write skipped:", fsErr);
    }

    // 4. Run OCR extraction via Gemini (or mock if provided for testing)
    let extracted: SlipExtractedData;
    if (mockExtracted) {
      extracted = {
        bankCode: mockExtracted.bankCode ?? bankCode ?? "KBANK",
        payerName: mockExtracted.payerName ?? null,
        payeeName: mockExtracted.payeeName ?? "ผู้รับเงินทดสอบ",
        detectedAmount: mockExtracted.detectedAmount ?? 500,
        detectedAt: mockExtracted.detectedAt ?? new Date(),
        transactionReference: mockExtracted.transactionReference ?? "REF123456",
        rawText: mockExtracted.rawText ?? "ข้อความสลิป",
        ocrProvider: "AI",
        ocrEngine: "Gemini",
        processingDurationSeconds: 1.0,
      };
    } else {
      extracted = await geminiOcrService.extractData(
        fileBuffer,
        fileName,
        cleanContentType,
      );
    }

    const durationSeconds = Number(
      ((Date.now() - startTime) / 1000).toFixed(2),
    );
    extracted.processingDurationSeconds = durationSeconds;

    if (bankCode && !extracted.bankCode) {
      extracted.bankCode = bankCode;
    }

    // 5. Match or Auto-create Bank Account
    const { bankAccountId, accountName, isAutoCreated } =
      await this.resolveOrCreateBankAccount(userId, extracted.bankCode);

    // 6. Suggest Category based on Payee / Payer
    const { categoryId: suggestedCatId, categoryName: suggestedCatName } =
      await this.suggestCategory(
        userId,
        extracted.payeeName ?? extracted.payerName ?? fileName,
      );

    // 7. Create ImportJob
    const [job] = await db
      .insert(importJobs)
      .values({
        userId,
        importType: "Slip",
        fileName,
        status: "NeedsReview",
        totalRecords: 1,
        importedRecords: 0,
        duplicateRecords: isDuplicate ? 1 : 0,
        startedAt: new Date(),
        completedAt: new Date(),
      })
      .returning();

    // 8. Create SlipImportFile
    const [slip] = await db
      .insert(slipImportFiles)
      .values({
        userId,
        importJobId: job.importJobId,
        storageKey: relativeStorageKey,
        originalFileName: fileName,
        mimeType: cleanContentType,
        fileSizeBytes: fileSize,
        bankCode: extracted.bankCode,
        payerName: extracted.payerName,
        payeeName: extracted.payeeName,
        detectedAmount: extracted.detectedAmount
          ? String(extracted.detectedAmount)
          : null,
        detectedAt: extracted.detectedAt,
        transactionReference: extracted.transactionReference,
        fileHash,
        reviewStatus: isDuplicate ? "duplicate" : "pending",
      })
      .returning();

    // 9. Audit Log
    await logAudit(userId, "Import", "SlipImportFiles", String(slip.slipImportFileId), {
      originalFileName: fileName,
      fileSizeBytes: fileSize,
      ocrProvider: extracted.ocrProvider,
      ocrEngine: extracted.ocrEngine,
      durationSeconds,
      isDuplicate,
      detectedAmount: extracted.detectedAmount,
      bankCode: extracted.bankCode,
      payeeName: extracted.payeeName,
    });

    return {
      slipImportFileId: slip.slipImportFileId,
      importJobId: job.importJobId,
      originalFileName: slip.originalFileName,
      fileSizeBytes: slip.fileSizeBytes,
      fileHash: slip.fileHash,
      bankCode: slip.bankCode,
      payerName: slip.payerName,
      payeeName: slip.payeeName,
      detectedAmount: extracted.detectedAmount,
      detectedAt: slip.detectedAt ? slip.detectedAt.toISOString() : null,
      transactionReference: slip.transactionReference,
      reviewStatus: slip.reviewStatus.toLowerCase(),
      isDuplicate,
      suggestedBankAccountId: bankAccountId,
      suggestedBankAccountName: accountName,
      isAutoCreatedBankAccount: isAutoCreated,
      suggestedCategoryId: suggestedCatId,
      suggestedCategoryName: suggestedCatName,
      ocrProvider: extracted.ocrProvider,
      ocrEngine: extracted.ocrEngine,
      processingDurationSeconds: durationSeconds,
      batchImageCount: effectiveBatchCount,
      createdAt: slip.createdAt.toISOString(),
    };
    } catch (err: unknown) {
      const durationSeconds = Number(
        ((Date.now() - startTime) / 1000).toFixed(2),
      );
      const errorMessage =
        err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการประมวลผลสลิป";
      const errorCode =
        err instanceof AppError ? err.code : "INTERNAL_ERROR";

      console.error(
        `[SlipUpload Error] UserId=${userId}, File=${fileName}, Size=${fileSize}, Duration=${durationSeconds}s, Code=${errorCode}, Error=${errorMessage}`,
      );

      // 1. Record Failed ImportJob in DB so history and admin reports capture the failed attempt
      try {
        await db.insert(importJobs).values({
          userId,
          importType: "Slip",
          fileName,
          status: "Failed",
          totalRecords: 1,
          importedRecords: 0,
          duplicateRecords: 0,
          errorMessage: errorMessage.slice(0, 500),
          startedAt: new Date(startTime),
          completedAt: new Date(),
        });
      } catch (jobErr) {
        console.error(
          "[SlipUpload Error] Failed to record failed importJob:",
          jobErr,
        );
      }

      // 2. Record AuditLog in DB
      try {
        await logAudit(
          userId,
          "Import",
          "SlipImportFiles",
          null,
          {
            originalFileName: fileName,
            fileSizeBytes: fileSize,
            durationSeconds,
            batchImageCount: effectiveBatchCount,
            status: "Failed",
            errorCode,
            errorMessage,
          },
        );
      } catch (auditErr) {
        console.error(
          "[SlipUpload Error] Failed to record audit log for failed slip:",
          auditErr,
        );
      }

      throw err;
    }
  }

  /**
   * Get single slip by ID
   */
  public async getSlipById(
    userId: number,
    slipId: number,
  ): Promise<SlipImportResponse | null> {
    const [slip] = await db
      .select()
      .from(slipImportFiles)
      .where(
        and(
          eq(slipImportFiles.slipImportFileId, slipId),
          eq(slipImportFiles.userId, userId),
        ),
      )
      .limit(1);

    if (!slip) return null;

    const { categoryId, categoryName } = await this.suggestCategory(
      userId,
      slip.payeeName ?? slip.payerName ?? slip.originalFileName,
    );

    const { bankAccountId, accountName } =
      await this.matchExistingBankAccount(userId, slip.bankCode);

    return {
      slipImportFileId: slip.slipImportFileId,
      importJobId: slip.importJobId,
      originalFileName: slip.originalFileName,
      fileSizeBytes: slip.fileSizeBytes,
      fileHash: slip.fileHash,
      bankCode: slip.bankCode,
      payerName: slip.payerName,
      payeeName: slip.payeeName,
      detectedAmount: slip.detectedAmount ? Number(slip.detectedAmount) : null,
      detectedAt: slip.detectedAt ? slip.detectedAt.toISOString() : null,
      transactionReference: slip.transactionReference,
      reviewStatus: slip.reviewStatus.toLowerCase(),
      isDuplicate: slip.reviewStatus.toLowerCase() === "duplicate",
      suggestedBankAccountId: bankAccountId,
      suggestedBankAccountName: accountName,
      isAutoCreatedBankAccount: false,
      suggestedCategoryId: categoryId,
      suggestedCategoryName: categoryName,
      createdAt: slip.createdAt.toISOString(),
    };
  }

  /**
   * Get slip image file stream/buffer
   */
  public async getSlipFile(
    userId: number,
    slipId: number,
  ): Promise<{ buffer: Buffer; contentType: string; fileName: string } | null> {
    const [slip] = await db
      .select()
      .from(slipImportFiles)
      .where(
        and(
          eq(slipImportFiles.slipImportFileId, slipId),
          eq(slipImportFiles.userId, userId),
        ),
      )
      .limit(1);

    if (!slip) return null;

    const fullPath = path.resolve(this.baseStoragePath, slip.storageKey);
    if (!fs.existsSync(fullPath)) return null;

    const buffer = fs.readFileSync(fullPath);
    return {
      buffer,
      contentType: slip.mimeType || "image/jpeg",
      fileName: slip.originalFileName,
    };
  }

  /**
   * Confirm slip and create a real expense transaction
   */
  public async confirmSlip(
    userId: number,
    slipId: number,
    req: ConfirmSlipRequest,
  ): Promise<TransactionResponse> {
    const [slip] = await db
      .select()
      .from(slipImportFiles)
      .where(
        and(
          eq(slipImportFiles.slipImportFileId, slipId),
          eq(slipImportFiles.userId, userId),
        ),
      )
      .limit(1);

    if (!slip) {
      throw new NotFoundError("ไม่พบสลิปที่ระบุ");
    }

    if (slip.reviewStatus.toLowerCase() === "confirmed") {
      throw new ConflictError("สลิปนี้ได้รับการยืนยันและสร้างรายการไปแล้ว");
    }

    if (req.amount <= 0) {
      throw new ValidationErrorAppError("จำนวนเงินต้องมากกว่า 0");
    }

    const [settings] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .limit(1);
    const currencyCode = settings?.currencyCode || "THB";

    let categoryId = req.categoryId && req.categoryId > 0 ? req.categoryId : null;
    if (!categoryId) {
      const suggested = await this.suggestCategory(
        userId,
        req.description || slip.payeeName,
      );
      if (suggested.categoryId) {
        categoryId = suggested.categoryId;
      }
    }

    // Resolve or create merchant
    let merchantId: number | null = null;
    const payee = req.payeeName?.trim() || slip.payeeName?.trim();
    if (payee) {
      const normalized = payee.toLowerCase().replace(/\s+/g, "");
      const [existingMerchant] = await db
        .select()
        .from(merchants)
        .where(eq(merchants.normalizedName, normalized))
        .limit(1);

      if (existingMerchant) {
        merchantId = existingMerchant.merchantId;
        if (!existingMerchant.defaultCategoryId && categoryId) {
          await db
            .update(merchants)
            .set({ defaultCategoryId: categoryId })
            .where(eq(merchants.merchantId, existingMerchant.merchantId));
        }
      } else {
        const [newMerchant] = await db
          .insert(merchants)
          .values({
            merchantName: payee,
            normalizedName: normalized,
            defaultCategoryId: categoryId,
            bankOrProvider: slip.bankCode,
            isVerified: false,
          })
          .returning();
        merchantId = newMerchant?.merchantId ?? null;
      }
    }

    const txDate = req.transactionDate ? new Date(req.transactionDate) : new Date();

    // Create Transaction inside DB transaction
    return await db.transaction(async (tx) => {
      const [createdTx] = await tx
        .insert(transactions)
        .values({
          userId,
          amount: String(req.amount),
          currencyCode,
          transactionType: "expense",
          transactionDate: txDate,
          categoryId,
          bankAccountId:
            req.bankAccountId && req.bankAccountId > 0 ? req.bankAccountId : null,
          creditCardId:
            req.creditCardId && req.creditCardId > 0 ? req.creditCardId : null,
          merchantId,
          description: req.description || slip.payeeName || "โอนเงินจากสลิป",
          sourceType: "slip",
          status: "confirmed",
          slipImportFileId: slip.slipImportFileId,
          importJobId: slip.importJobId,
        })
        .returning();

      // Tag associations
      const createdTags: TagRef[] = [];
      if (req.tagIds && req.tagIds.length > 0) {
        const validTagIds = [...new Set(req.tagIds)].filter((id) => id > 0);
        for (const tagId of validTagIds) {
          await tx
            .insert(transactionTags)
            .values({ transactionId: createdTx.transactionId, tagId })
            .onConflictDoNothing();
        }

        const tagRows = await tx
          .select({ tagId: tags.tagId, tagName: tags.tagName })
          .from(tags)
          .where(sql`${tags.tagId} IN ${validTagIds}`);
        createdTags.push(...tagRows);
      }

      // Update slip and job
      await tx
        .update(slipImportFiles)
        .set({
          reviewStatus: "confirmed",
          detectedAmount: String(req.amount),
          payeeName: req.payeeName || slip.payeeName,
          payerName: req.payerName || slip.payerName,
          transactionReference:
            req.transactionReference || slip.transactionReference,
        })
        .where(eq(slipImportFiles.slipImportFileId, slip.slipImportFileId));

      if (slip.importJobId) {
        await tx
          .update(importJobs)
          .set({
            status: "Completed",
            importedRecords: 1,
            completedAt: new Date(),
          })
          .where(eq(importJobs.importJobId, slip.importJobId));
      }

      // Auto-learn rule
      if (categoryId) {
        const pattern = createdTx.description || payee;
        if (pattern) {
          try {
            await CategoryService.learnFromManual(userId, pattern, categoryId);
          } catch {}
        }
      }

      await logAudit(
        userId,
        "Import",
        "Transactions",
        String(createdTx.transactionId),
        {
          slipImportFileId: slip.slipImportFileId,
          originalFileName: slip.originalFileName,
          amount: req.amount,
          description: createdTx.description,
          source: "SlipImport",
        },
      );

      let categoryName: string | null = null;
      if (categoryId) {
        const [cat] = await tx
          .select({ name: categories.categoryName })
          .from(categories)
          .where(eq(categories.categoryId, categoryId))
          .limit(1);
        categoryName = cat?.name ?? null;
      }

      return {
        transactionId: createdTx.transactionId,
        amount: Number(createdTx.amount),
        currencyCode: createdTx.currencyCode,
        transactionType: "expense" as const,
        transactionDate: createdTx.transactionDate.toISOString(),
        categoryId: createdTx.categoryId,
        categoryName,
        bankAccountId: createdTx.bankAccountId,
        creditCardId: createdTx.creditCardId,
        transferGroupId: null,
        recurringTransactionId: null,
        description: createdTx.description,
        tags: createdTags,
        sourceType: "slip" as const,
        status: "confirmed" as const,
        createdAt: createdTx.createdAt.toISOString(),
        updatedAt: createdTx.createdAt.toISOString(),
      };
    });
  }

  /**
   * Reject slip
   */
  public async rejectSlip(userId: number, slipId: number): Promise<boolean> {
    const [slip] = await db
      .select()
      .from(slipImportFiles)
      .where(
        and(
          eq(slipImportFiles.slipImportFileId, slipId),
          eq(slipImportFiles.userId, userId),
        ),
      )
      .limit(1);

    if (!slip) return false;

    await db
      .update(slipImportFiles)
      .set({ reviewStatus: "rejected" })
      .where(eq(slipImportFiles.slipImportFileId, slipId));

    if (slip.importJobId) {
      await db
        .update(importJobs)
        .set({ status: "Completed", completedAt: new Date() })
        .where(eq(importJobs.importJobId, slip.importJobId));
    }

    await logAudit(
      userId,
      "Update",
      "SlipImportFiles",
      String(slipId),
      { originalFileName: slip.originalFileName, reviewStatus: "rejected" },
    );

    return true;
  }

  /**
   * Get user import jobs paged
   */
  public async getJobs(
    userId: number,
    page = 1,
    pageSize = 20,
    type?: string | null,
  ): Promise<PagedResult<ImportJobResponse>> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, pageSize));
    const offset = (safePage - 1) * safeLimit;

    const conditions = [eq(importJobs.userId, userId)];
    if (type) {
      conditions.push(sql`LOWER(${importJobs.importType}) = ${type.toLowerCase()}`);
    }

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(importJobs)
      .where(and(...conditions));

    const totalItems = countResult?.count ?? 0;
    const totalPages = Math.ceil(totalItems / safeLimit);

    const jobs = await db
      .select()
      .from(importJobs)
      .where(and(...conditions))
      .orderBy(desc(importJobs.createdAt))
      .limit(safeLimit)
      .offset(offset);

    // Fetch related slips and statements to populate slipId and statementId
    const jobIds = jobs.map((j) => j.importJobId);
    const slipsByJob: Record<number, number> = {};
    const statementsByJob: Record<
      number,
      { statementId: number; creditCardId: number }
    > = {};

    if (jobIds.length > 0) {
      const relatedSlips = await db
        .select({
          slipId: slipImportFiles.slipImportFileId,
          importJobId: slipImportFiles.importJobId,
        })
        .from(slipImportFiles)
        .where(sql`${slipImportFiles.importJobId} IN ${jobIds}`);

      for (const s of relatedSlips) {
        if (s.importJobId) {
          slipsByJob[s.importJobId] = s.slipId;
        }
      }

      const relatedStatements = await db
        .select({
          statementId: creditCardStatements.statementId,
          creditCardId: creditCardStatements.creditCardId,
          importJobId: creditCardStatements.importJobId,
        })
        .from(creditCardStatements)
        .where(sql`${creditCardStatements.importJobId} IN ${jobIds}`);

      for (const st of relatedStatements) {
        if (st.importJobId) {
          statementsByJob[st.importJobId] = {
            statementId: st.statementId,
            creditCardId: st.creditCardId,
          };
        }
      }
    }

    const items: ImportJobResponse[] = jobs.map((j) => {
      const stmtInfo = statementsByJob[j.importJobId];
      return {
        importJobId: j.importJobId,
        importType:
          j.importType.toLowerCase() === "slip" ? "slip" : "cardStatement",
        fileName: j.fileName ?? "",
        status: this.mapJobStatus(j.status),
        totalRecords: j.totalRecords,
        importedRecords: j.importedRecords,
        duplicateRecords: j.duplicateRecords,
        errorMessage: j.errorMessage,
        startedAt: j.startedAt ? j.startedAt.toISOString() : null,
        completedAt: j.completedAt ? j.completedAt.toISOString() : null,
        createdAt: j.createdAt.toISOString(),
        slipId: slipsByJob[j.importJobId] ?? null,
        statementId: stmtInfo?.statementId ?? null,
        creditCardId: stmtInfo?.creditCardId ?? null,
      };
    });

    return {
      items,
      page: safePage,
      pageSize: safeLimit,
      totalItems,
      totalPages,
    };
  }

  /**
   * Get single import job by ID
   */
  public async getJobById(
    userId: number,
    jobId: number,
  ): Promise<ImportJobResponse | null> {
    const [job] = await db
      .select()
      .from(importJobs)
      .where(
        and(eq(importJobs.importJobId, jobId), eq(importJobs.userId, userId)),
      )
      .limit(1);

    if (!job) return null;

    const [slip] = await db
      .select({ id: slipImportFiles.slipImportFileId })
      .from(slipImportFiles)
      .where(eq(slipImportFiles.importJobId, jobId))
      .limit(1);

    const [statement] = await db
      .select({
        statementId: creditCardStatements.statementId,
        creditCardId: creditCardStatements.creditCardId,
      })
      .from(creditCardStatements)
      .where(eq(creditCardStatements.importJobId, jobId))
      .limit(1);

    return {
      importJobId: job.importJobId,
      importType:
        job.importType.toLowerCase() === "slip" ? "slip" : "cardStatement",
      fileName: job.fileName ?? "",
      status: this.mapJobStatus(job.status),
      totalRecords: job.totalRecords,
      importedRecords: job.importedRecords,
      duplicateRecords: job.duplicateRecords,
      errorMessage: job.errorMessage,
      startedAt: job.startedAt ? job.startedAt.toISOString() : null,
      completedAt: job.completedAt ? job.completedAt.toISOString() : null,
      createdAt: job.createdAt.toISOString(),
      slipId: slip?.id ?? null,
      statementId: statement?.statementId ?? null,
      creditCardId: statement?.creditCardId ?? null,
    };
  }

  // --- Helper Methods ---

  private mapJobStatus(status: string): string {
    const s = status.toLowerCase();
    if (s === "needsreview") return "needsReview";
    if (s === "completed") return "completed";
    if (s === "failed") return "failed";
    if (s === "processing") return "processing";
    return "pending";
  }

  private async resolveOrCreateBankAccount(
    userId: number,
    rawBankCode: string | null,
  ): Promise<{
    bankAccountId: number | null;
    accountName: string | null;
    isAutoCreated: boolean;
  }> {
    if (!rawBankCode) {
      return { bankAccountId: null, accountName: null, isAutoCreated: false };
    }

    const canonical =
      ThaiBankHelper.normalizeBankCode(rawBankCode) ??
      rawBankCode.trim().toUpperCase();
    const bankDef = ThaiBankHelper.getBank(canonical);
    const bankName = bankDef?.officialName ?? `ธนาคาร ${canonical}`;
    const defaultAccountName =
      bankDef?.defaultAccountName ?? `บัญชีธนาคาร ${canonical}`;

    const accounts = await db
      .select()
      .from(bankAccounts)
      .where(
        and(
          eq(bankAccounts.userId, userId),
          eq(bankAccounts.isActive, true),
          eq(bankAccounts.isDeleted, false),
        ),
      );

    const matched = ThaiBankHelper.findMatchingAccount(
      accounts.map((a) => ({
        bankAccountId: a.bankAccountId,
        accountName: a.accountName,
        bankCode: a.bankCode,
        bankName: a.bankName,
      })),
      rawBankCode,
    );

    if (matched) {
      return {
        bankAccountId: matched.bankAccountId,
        accountName: matched.accountName,
        isAutoCreated: false,
      };
    }

    // Auto-create bank account
    const [newAcc] = await db
      .insert(bankAccounts)
      .values({
        userId,
        accountName: defaultAccountName,
        bankName,
        bankCode: canonical,
        accountType: "bank",
        isActive: true,
        isDeleted: false,
      })
      .returning();

    return {
      bankAccountId: newAcc.bankAccountId,
      accountName: newAcc.accountName,
      isAutoCreated: true,
    };
  }

  private async matchExistingBankAccount(
    userId: number,
    rawBankCode: string | null,
  ): Promise<{ bankAccountId: number | null; accountName: string | null }> {
    if (!rawBankCode) return { bankAccountId: null, accountName: null };

    const accounts = await db
      .select()
      .from(bankAccounts)
      .where(
        and(
          eq(bankAccounts.userId, userId),
          eq(bankAccounts.isActive, true),
          eq(bankAccounts.isDeleted, false),
        ),
      );

    const matched = ThaiBankHelper.findMatchingAccount(
      accounts.map((a) => ({
        bankAccountId: a.bankAccountId,
        accountName: a.accountName,
        bankCode: a.bankCode,
        bankName: a.bankName,
      })),
      rawBankCode,
    );

    return {
      bankAccountId: matched?.bankAccountId ?? null,
      accountName: matched?.accountName ?? null,
    };
  }

  private async suggestCategory(
    userId: number,
    text?: string | null,
  ): Promise<{ categoryId: number | null; categoryName: string | null }> {
    if (!text || !text.trim()) {
      return { categoryId: null, categoryName: null };
    }

    const clean = text.trim().toLowerCase();

    // Look up category rules for this user or system rules
    const rules = await db
      .select({
        categoryId: categoryRules.categoryId,
        categoryName: categories.categoryName,
        matchPattern: categoryRules.matchPattern,
        priority: categoryRules.priority,
      })
      .from(categoryRules)
      .innerJoin(categories, eq(categoryRules.categoryId, categories.categoryId))
      .where(
        and(
          sql`(${categoryRules.userId} = ${userId} OR ${categoryRules.userId} IS NULL)`,
          eq(categoryRules.isActive, true),
        ),
      )
      .orderBy(desc(categoryRules.priority));

    for (const rule of rules) {
      if (rule.matchPattern && clean.includes(rule.matchPattern.toLowerCase())) {
        return {
          categoryId: rule.categoryId,
          categoryName: rule.categoryName,
        };
      }
    }

    return { categoryId: null, categoryName: null };
  }
}

export const importService = new ImportService();
