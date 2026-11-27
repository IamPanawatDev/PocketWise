import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/server/db";
import {
  creditCards,
  creditCardStatements,
  creditCardStatementItems,
  importJobs,
  transactions,
  userSettings,
} from "@/lib/server/db/schema";
import {
  ConflictError,
  NotFoundError,
  ValidationErrorAppError,
} from "@/lib/server/api-error";
import { logAudit } from "@/lib/server/audit";
import { CategoryService } from "../categories/category.service";
import { StatementParserService } from "../imports/statement-parser.service";

export interface CreditCardResponse {
  creditCardId: number;
  bankName: string;
  cardName: string;
  cardNumberMasked: string | null;
  billingDay: number | null;
  paymentDueDay: number | null;
  creditLimit: number | null;
  isActive: boolean;
  createdAt: string;
  currentBalance: number;
  availableCredit: number | null;
}

export interface CreateCreditCardRequest {
  bankName: string;
  cardName: string;
  cardNumberMasked?: string | null;
  billingDay?: number | null;
  paymentDueDay?: number | null;
  creditLimit?: number | null;
}

export interface UpdateCreditCardRequest extends CreateCreditCardRequest {
  isActive: boolean;
}

export interface StatementItemResponse {
  statementItemId: number;
  transactionDate: string;
  description: string;
  itemType: string;
  amount: number;
  externalReference: string | null;
  isDuplicate: boolean;
  isLinked: boolean;
  transactionId: number | null;
  suggestedCategoryId: number | null;
  suggestedCategoryName: string | null;
}

export interface CreditCardStatementImportResponse {
  statementId: number;
  importJobId: number | null;
  creditCardId: number;
  cardName: string | null;
  statementDate: string;
  statementPeriodStart: string | null;
  statementPeriodEnd: string | null;
  paymentDueDate: string | null;
  previousBalance: number | null;
  purchaseAmount: number | null;
  installmentAmount: number | null;
  interestAmount: number | null;
  cashbackAmount: number | null;
  paymentAmount: number | null;
  totalDue: number | null;
  status: string;
  totalItems: number;
  duplicateItems: number;
  items: StatementItemResponse[];
}

export interface ConfirmStatementItemDto {
  statementItemId: number;
  categoryId?: number | null;
  description?: string | null;
}

export interface ConfirmStatementItemsRequest {
  items: ConfirmStatementItemDto[];
}

export interface BatchConfirmStatementItemsResponse {
  statementId: number;
  confirmedCount: number;
  createdTransactionIds: number[];
}

export class CreditCardService {
  /**
   * Calculates current balances for credit cards from expense transactions.
   */
  private static async getCurrentBalances(userId: number): Promise<Map<number, number>> {
    const expenses = await db
      .select({
        creditCardId: transactions.creditCardId,
        total: sql<string>`COALESCE(SUM(${transactions.amount}), 0)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.isDeleted, false),
          sql`${transactions.creditCardId} IS NOT NULL`,
          sql`LOWER(${transactions.transactionType}) = 'expense'`
        )
      )
      .groupBy(transactions.creditCardId);

    const map = new Map<number, number>();
    for (const e of expenses) {
      if (e.creditCardId) {
        map.set(e.creditCardId, Number(e.total) || 0);
      }
    }
    return map;
  }

  static async getAll(userId: number): Promise<CreditCardResponse[]> {
    const list = await db
      .select()
      .from(creditCards)
      .where(and(eq(creditCards.userId, userId), eq(creditCards.isDeleted, false)))
      .orderBy(asc(creditCards.cardName));

    const balances = await this.getCurrentBalances(userId);

    return list.map((c) => {
      const currentBalance = balances.get(c.creditCardId) ?? 0;
      const creditLimit = c.creditLimit !== null ? Number(c.creditLimit) : null;
      const availableCredit =
        creditLimit !== null ? Math.max(0, creditLimit - currentBalance) : null;

      return {
        creditCardId: c.creditCardId,
        bankName: c.bankName,
        cardName: c.cardName,
        cardNumberMasked: c.cardNumberMasked,
        billingDay: c.billingDay,
        paymentDueDay: c.paymentDueDay,
        creditLimit,
        currentBalance,
        availableCredit,
        isActive: c.isActive,
        createdAt: c.createdAt.toISOString(),
      };
    });
  }

  static async getById(id: number, userId: number): Promise<CreditCardResponse | null> {
    const [card] = await db
      .select()
      .from(creditCards)
      .where(
        and(
          eq(creditCards.creditCardId, id),
          eq(creditCards.userId, userId),
          eq(creditCards.isDeleted, false)
        )
      )
      .limit(1);

    if (!card) return null;

    const balances = await this.getCurrentBalances(userId);
    const currentBalance = balances.get(card.creditCardId) ?? 0;
    const creditLimit = card.creditLimit !== null ? Number(card.creditLimit) : null;
    const availableCredit =
      creditLimit !== null ? Math.max(0, creditLimit - currentBalance) : null;

    return {
      creditCardId: card.creditCardId,
      bankName: card.bankName,
      cardName: card.cardName,
      cardNumberMasked: card.cardNumberMasked,
      billingDay: card.billingDay,
      paymentDueDay: card.paymentDueDay,
      creditLimit,
      currentBalance,
      availableCredit,
      isActive: card.isActive,
      createdAt: card.createdAt.toISOString(),
    };
  }

  static async create(
    userId: number,
    request: CreateCreditCardRequest
  ): Promise<CreditCardResponse> {
    const trimmedCardName = (request.cardName || "").trim();
    const trimmedBankName = (request.bankName || "").trim();

    if (!trimmedCardName || !trimmedBankName) {
      throw new ValidationErrorAppError("กรุณากรอกข้อมูลบัตรเครดิตให้ครบถ้วน", [
        ...(!trimmedCardName
          ? [{ field: "cardName", message: "ชื่อบัตรต้องไม่ว่างเปล่า" }]
          : []),
        ...(!trimmedBankName
          ? [{ field: "bankName", message: "ชื่อธนาคารต้องไม่ว่างเปล่า" }]
          : []),
      ]);
    }

    const billingDay = request.billingDay ?? 1;
    const paymentDueDay = request.paymentDueDay ?? 25;

    const [created] = await db
      .insert(creditCards)
      .values({
        userId,
        bankName: trimmedBankName,
        cardName: trimmedCardName,
        cardNumberMasked: request.cardNumberMasked?.trim() ?? null,
        billingDay,
        paymentDueDay,
        creditLimit: request.creditLimit !== undefined && request.creditLimit !== null ? request.creditLimit.toString() : null,
        isActive: true,
        isDeleted: false,
        createdAt: new Date(),
      })
      .returning();

    await logAudit(userId, "Create", "CreditCards", created.creditCardId.toString(), {
      bankName: created.bankName,
      cardName: created.cardName,
      cardNumberMasked: created.cardNumberMasked,
      billingDay: created.billingDay,
      paymentDueDay: created.paymentDueDay,
      creditLimit: created.creditLimit,
    });

    const creditLimit = created.creditLimit !== null ? Number(created.creditLimit) : null;

    return {
      creditCardId: created.creditCardId,
      bankName: created.bankName,
      cardName: created.cardName,
      cardNumberMasked: created.cardNumberMasked,
      billingDay: created.billingDay,
      paymentDueDay: created.paymentDueDay,
      creditLimit,
      currentBalance: 0,
      availableCredit: creditLimit,
      isActive: created.isActive,
      createdAt: created.createdAt.toISOString(),
    };
  }

  static async update(
    id: number,
    userId: number,
    request: UpdateCreditCardRequest
  ): Promise<CreditCardResponse | null> {
    const trimmedCardName = (request.cardName || "").trim();
    const trimmedBankName = (request.bankName || "").trim();

    if (!trimmedCardName || !trimmedBankName) {
      throw new ValidationErrorAppError("กรุณากรอกข้อมูลบัตรเครดิตให้ครบถ้วน", [
        ...(!trimmedCardName
          ? [{ field: "cardName", message: "ชื่อบัตรต้องไม่ว่างเปล่า" }]
          : []),
        ...(!trimmedBankName
          ? [{ field: "bankName", message: "ชื่อธนาคารต้องไม่ว่างเปล่า" }]
          : []),
      ]);
    }

    const [existing] = await db
      .select()
      .from(creditCards)
      .where(
        and(
          eq(creditCards.creditCardId, id),
          eq(creditCards.userId, userId),
          eq(creditCards.isDeleted, false)
        )
      )
      .limit(1);

    if (!existing) return null;

    const beforeState = {
      bankName: existing.bankName,
      cardName: existing.cardName,
      cardNumberMasked: existing.cardNumberMasked,
      billingDay: existing.billingDay,
      paymentDueDay: existing.paymentDueDay,
      creditLimit: existing.creditLimit,
      isActive: existing.isActive,
    };

    const billingDay = request.billingDay ?? existing.billingDay;
    const paymentDueDay = request.paymentDueDay ?? existing.paymentDueDay;

    const [updated] = await db
      .update(creditCards)
      .set({
        bankName: trimmedBankName,
        cardName: trimmedCardName,
        cardNumberMasked: request.cardNumberMasked?.trim() ?? null,
        billingDay,
        paymentDueDay,
        creditLimit: request.creditLimit !== undefined && request.creditLimit !== null ? request.creditLimit.toString() : null,
        isActive: request.isActive ?? existing.isActive,
      })
      .where(eq(creditCards.creditCardId, id))
      .returning();

    await logAudit(userId, "Update", "CreditCards", id.toString(), {
      before: beforeState,
      after: {
        bankName: updated.bankName,
        cardName: updated.cardName,
        cardNumberMasked: updated.cardNumberMasked,
        billingDay: updated.billingDay,
        paymentDueDay: updated.paymentDueDay,
        creditLimit: updated.creditLimit,
        isActive: updated.isActive,
      },
    });

    const balances = await this.getCurrentBalances(userId);
    const currentBalance = balances.get(updated.creditCardId) ?? 0;
    const creditLimit = updated.creditLimit !== null ? Number(updated.creditLimit) : null;
    const availableCredit =
      creditLimit !== null ? Math.max(0, creditLimit - currentBalance) : null;

    return {
      creditCardId: updated.creditCardId,
      bankName: updated.bankName,
      cardName: updated.cardName,
      cardNumberMasked: updated.cardNumberMasked,
      billingDay: updated.billingDay,
      paymentDueDay: updated.paymentDueDay,
      creditLimit,
      currentBalance,
      availableCredit,
      isActive: updated.isActive,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  static async delete(id: number, userId: number): Promise<boolean> {
    const [existing] = await db
      .select()
      .from(creditCards)
      .where(
        and(
          eq(creditCards.creditCardId, id),
          eq(creditCards.userId, userId),
          eq(creditCards.isDeleted, false)
        )
      )
      .limit(1);

    if (!existing) return false;

    await db
      .update(creditCards)
      .set({ isDeleted: true })
      .where(eq(creditCards.creditCardId, id));

    await logAudit(userId, "Delete", "CreditCards", id.toString(), {
      cardName: existing.cardName,
      bankName: existing.bankName,
      isDeleted: true,
    });

    return true;
  }

  // ==========================================
  // CREDIT CARD STATEMENTS
  // ==========================================

  static async importStatement(
    userId: number,
    creditCardId: number,
    fileBuffer: Buffer | ArrayBuffer,
    fileName: string,
    format?: string | null
  ): Promise<CreditCardStatementImportResponse> {
    const [card] = await db
      .select({
        creditCardId: creditCards.creditCardId,
        cardName: creditCards.cardName,
      })
      .from(creditCards)
      .where(
        and(
          eq(creditCards.creditCardId, creditCardId),
          eq(creditCards.userId, userId),
          eq(creditCards.isDeleted, false)
        )
      )
      .limit(1);

    if (!card) {
      throw new NotFoundError("ไม่พบบัตรเครดิตที่ระบุ");
    }

    const parsed = await StatementParserService.parseStatement(
      fileBuffer,
      fileName,
      format
    );

    if (!parsed.items || parsed.items.length === 0) {
      throw new ValidationErrorAppError("ไม่พบรายการธุรกรรมในไฟล์ใบแจ้งยอด");
    }

    // Query existing items for this card to detect duplicates
    const existingItems = await db
      .select({
        statementItemId: creditCardStatementItems.statementItemId,
        transactionDate: creditCardStatementItems.transactionDate,
        amount: creditCardStatementItems.amount,
        externalReference: creditCardStatementItems.externalReference,
      })
      .from(creditCardStatementItems)
      .innerJoin(
        creditCardStatements,
        eq(creditCardStatementItems.statementId, creditCardStatements.statementId)
      )
      .where(
        and(
          eq(creditCardStatements.creditCardId, creditCardId),
          eq(creditCardStatementItems.isDeleted, false)
        )
      );

    let duplicateCount = 0;
    const itemsWithDup = parsed.items.map((item) => {
      const isDup = existingItems.some((e) => {
        if (e.transactionDate !== item.transactionDate) return false;
        if (Math.abs(Number(e.amount) - item.amount) > 0.001) return false;
        if (item.externalReference && e.externalReference) {
          return item.externalReference === e.externalReference;
        }
        return true;
      });
      if (isDup) duplicateCount++;
      return { ...item, isDuplicate: isDup };
    });

    // Create ImportJob
    const [importJob] = await db
      .insert(importJobs)
      .values({
        userId,
        importType: "CardStatement",
        fileName,
        status: "NeedsReview",
        totalRecords: parsed.items.length,
        importedRecords: 0,
        duplicateRecords: duplicateCount,
        startedAt: new Date(),
        createdAt: new Date(),
      })
      .returning();

    // Create CreditCardStatement
    const [statement] = await db
      .insert(creditCardStatements)
      .values({
        creditCardId,
        importJobId: importJob.importJobId,
        statementDate: parsed.statementDate,
        statementPeriodStart: parsed.statementPeriodStart,
        statementPeriodEnd: parsed.statementPeriodEnd,
        paymentDueDate: parsed.paymentDueDate,
        previousBalance: String(parsed.previousBalance),
        purchaseAmount: String(parsed.purchaseAmount),
        installmentAmount: String(parsed.installmentAmount),
        interestAmount: String(parsed.interestAmount),
        cashbackAmount: String(parsed.cashbackAmount),
        paymentAmount: String(parsed.paymentAmount),
        totalDue: String(parsed.totalDue),
        status: "Imported",
        createdAt: new Date(),
      })
      .returning();

    // Insert statement items
    const responseItems: StatementItemResponse[] = [];
    for (const item of itemsWithDup) {
      const [insertedItem] = await db
        .insert(creditCardStatementItems)
        .values({
          statementId: statement.statementId,
          transactionDate: item.transactionDate,
          description: item.description,
          itemType: item.itemType,
          amount: String(item.amount),
          externalReference: item.externalReference,
          isDuplicate: item.isDuplicate,
          createdAt: new Date(),
        })
        .returning();

      const suggestion = await CategoryService.suggestCategory(
        userId,
        item.description
      );

      responseItems.push({
        statementItemId: insertedItem.statementItemId,
        transactionDate: insertedItem.transactionDate,
        description: insertedItem.description,
        itemType: insertedItem.itemType.toLowerCase(),
        amount: Number(insertedItem.amount),
        externalReference: insertedItem.externalReference,
        isDuplicate: insertedItem.isDuplicate,
        isLinked: false,
        transactionId: null,
        suggestedCategoryId: suggestion?.categoryId ?? null,
        suggestedCategoryName: suggestion?.categoryName ?? null,
      });
    }

    await logAudit(
      userId,
      "Import",
      "CreditCardStatements",
      statement.statementId.toString(),
      {
        creditCardId,
        statementDate: statement.statementDate,
        totalDue: parsed.totalDue,
        totalItems: parsed.items.length,
        duplicateItems: duplicateCount,
      }
    );

    return {
      statementId: statement.statementId,
      importJobId: importJob.importJobId,
      creditCardId,
      cardName: card.cardName,
      statementDate: statement.statementDate,
      statementPeriodStart: statement.statementPeriodStart,
      statementPeriodEnd: statement.statementPeriodEnd,
      paymentDueDate: statement.paymentDueDate,
      previousBalance: parsed.previousBalance,
      purchaseAmount: parsed.purchaseAmount,
      installmentAmount: parsed.installmentAmount,
      interestAmount: parsed.interestAmount,
      cashbackAmount: parsed.cashbackAmount,
      paymentAmount: parsed.paymentAmount,
      totalDue: parsed.totalDue,
      status: "imported",
      totalItems: parsed.items.length,
      duplicateItems: duplicateCount,
      items: responseItems,
    };
  }

  static async getStatementsByCardId(
    userId: number,
    cardId: number
  ): Promise<CreditCardStatementImportResponse[]> {
    const [card] = await db
      .select({ cardName: creditCards.cardName })
      .from(creditCards)
      .where(
        and(
          eq(creditCards.creditCardId, cardId),
          eq(creditCards.userId, userId),
          eq(creditCards.isDeleted, false)
        )
      )
      .limit(1);

    if (!card) return [];

    const statements = await db
      .select()
      .from(creditCardStatements)
      .where(
        and(
          eq(creditCardStatements.creditCardId, cardId),
          eq(creditCardStatements.isDeleted, false)
        )
      )
      .orderBy(asc(creditCardStatements.statementDate));

    const result: CreditCardStatementImportResponse[] = [];

    for (const s of statements) {
      const items = await db
        .select()
        .from(creditCardStatementItems)
        .where(
          and(
            eq(creditCardStatementItems.statementId, s.statementId),
            eq(creditCardStatementItems.isDeleted, false)
          )
        );

      const mappedItems: StatementItemResponse[] = [];
      for (const item of items) {
        const suggestion = await CategoryService.suggestCategory(userId, item.description);
        mappedItems.push({
          statementItemId: item.statementItemId,
          transactionDate: item.transactionDate,
          description: item.description,
          itemType: item.itemType.toLowerCase(),
          amount: Number(item.amount) || 0,
          externalReference: item.externalReference,
          isDuplicate: item.isDuplicate,
          isLinked: item.transactionId !== null,
          transactionId: item.transactionId,
          suggestedCategoryId: suggestion?.categoryId ?? null,
          suggestedCategoryName: suggestion?.categoryName ?? null,
        });
      }

      result.push({
        statementId: s.statementId,
        importJobId: s.importJobId,
        creditCardId: s.creditCardId,
        cardName: card.cardName,
        statementDate: s.statementDate,
        statementPeriodStart: s.statementPeriodStart,
        statementPeriodEnd: s.statementPeriodEnd,
        paymentDueDate: s.paymentDueDate,
        previousBalance: s.previousBalance !== null ? Number(s.previousBalance) : null,
        purchaseAmount: s.purchaseAmount !== null ? Number(s.purchaseAmount) : null,
        installmentAmount: s.installmentAmount !== null ? Number(s.installmentAmount) : null,
        interestAmount: s.interestAmount !== null ? Number(s.interestAmount) : null,
        cashbackAmount: s.cashbackAmount !== null ? Number(s.cashbackAmount) : null,
        paymentAmount: s.paymentAmount !== null ? Number(s.paymentAmount) : null,
        totalDue: s.totalDue !== null ? Number(s.totalDue) : null,
        status: s.status.toLowerCase(),
        totalItems: mappedItems.length,
        duplicateItems: mappedItems.filter((i) => i.isDuplicate).length,
        items: mappedItems,
      });
    }

    return result;
  }

  static async getStatementById(
    userId: number,
    statementId: number
  ): Promise<CreditCardStatementImportResponse | null> {
    const [row] = await db
      .select({
        statement: creditCardStatements,
        cardName: creditCards.cardName,
      })
      .from(creditCardStatements)
      .innerJoin(creditCards, eq(creditCardStatements.creditCardId, creditCards.creditCardId))
      .where(
        and(
          eq(creditCardStatements.statementId, statementId),
          eq(creditCards.userId, userId),
          eq(creditCardStatements.isDeleted, false),
          eq(creditCards.isDeleted, false)
        )
      )
      .limit(1);

    if (!row) return null;

    const { statement: s, cardName } = row;

    const items = await db
      .select()
      .from(creditCardStatementItems)
      .where(
        and(
          eq(creditCardStatementItems.statementId, s.statementId),
          eq(creditCardStatementItems.isDeleted, false)
        )
      );

    const mappedItems: StatementItemResponse[] = [];
    for (const item of items) {
      const suggestion = await CategoryService.suggestCategory(userId, item.description);
      mappedItems.push({
        statementItemId: item.statementItemId,
        transactionDate: item.transactionDate,
        description: item.description,
        itemType: item.itemType.toLowerCase(),
        amount: Number(item.amount) || 0,
        externalReference: item.externalReference,
        isDuplicate: item.isDuplicate,
        isLinked: item.transactionId !== null,
        transactionId: item.transactionId,
        suggestedCategoryId: suggestion?.categoryId ?? null,
        suggestedCategoryName: suggestion?.categoryName ?? null,
      });
    }

    return {
      statementId: s.statementId,
      importJobId: s.importJobId,
      creditCardId: s.creditCardId,
      cardName,
      statementDate: s.statementDate,
      statementPeriodStart: s.statementPeriodStart,
      statementPeriodEnd: s.statementPeriodEnd,
      paymentDueDate: s.paymentDueDate,
      previousBalance: s.previousBalance !== null ? Number(s.previousBalance) : null,
      purchaseAmount: s.purchaseAmount !== null ? Number(s.purchaseAmount) : null,
      installmentAmount: s.installmentAmount !== null ? Number(s.installmentAmount) : null,
      interestAmount: s.interestAmount !== null ? Number(s.interestAmount) : null,
      cashbackAmount: s.cashbackAmount !== null ? Number(s.cashbackAmount) : null,
      paymentAmount: s.paymentAmount !== null ? Number(s.paymentAmount) : null,
      totalDue: s.totalDue !== null ? Number(s.totalDue) : null,
      status: s.status.toLowerCase(),
      totalItems: mappedItems.length,
      duplicateItems: mappedItems.filter((i) => i.isDuplicate).length,
      items: mappedItems,
    };
  }

  static async confirmStatementItems(
    userId: number,
    statementId: number,
    request: ConfirmStatementItemsRequest
  ): Promise<BatchConfirmStatementItemsResponse> {
    const [row] = await db
      .select({
        statement: creditCardStatements,
      })
      .from(creditCardStatements)
      .innerJoin(creditCards, eq(creditCardStatements.creditCardId, creditCards.creditCardId))
      .where(
        and(
          eq(creditCardStatements.statementId, statementId),
          eq(creditCards.userId, userId),
          eq(creditCardStatements.isDeleted, false)
        )
      )
      .limit(1);

    if (!row) {
      throw new NotFoundError("ไม่พบใบแจ้งยอดที่ระบุ");
    }

    if (!request?.items || request.items.length === 0) {
      throw new ValidationErrorAppError("กรุณาเลือกรายการที่ต้องการยืนยันอย่างน้อย 1 รายการ", [
        { field: "items", message: "กรุณาเลือกรายการที่ต้องการยืนยันอย่างน้อย 1 รายการ" },
      ]);
    }

    const { statement: s } = row;
    const requestedMap = new Map<number, ConfirmStatementItemDto>();
    for (const i of request.items) {
      requestedMap.set(i.statementItemId, i);
    }

    const itemIds = Array.from(requestedMap.keys());
    const dbItems = await db
      .select()
      .from(creditCardStatementItems)
      .where(
        and(
          eq(creditCardStatementItems.statementId, statementId),
          inArray(creditCardStatementItems.statementItemId, itemIds),
          eq(creditCardStatementItems.isDeleted, false)
        )
      );

    // Get user's preferred currency code
    const [settings] = await db
      .select({ currencyCode: userSettings.currencyCode })
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .limit(1);
    const currencyCode = settings?.currencyCode || "THB";

    const createdTxnIds: number[] = [];

    for (const item of dbItems) {
      if (item.transactionId !== null) continue; // Already confirmed/linked

      const reqItem = requestedMap.get(item.statementItemId);
      let categoryId = reqItem?.categoryId ?? null;

      if (!categoryId) {
        const suggestion = await CategoryService.suggestCategory(
          userId,
          reqItem?.description || item.description
        );
        categoryId = suggestion?.categoryId ?? null;
      }

      const itemTypeLower = (item.itemType || "").toLowerCase();
      const isIncome = itemTypeLower === "payment" || itemTypeLower === "cashback";
      const transactionType = isIncome ? "Income" : "Expense";
      const txnDate = new Date(item.transactionDate);

      const [txn] = await db
        .insert(transactions)
        .values({
          userId,
          amount: item.amount,
          currencyCode,
          transactionType,
          transactionDate: txnDate,
          description: reqItem?.description || item.description,
          categoryId,
          creditCardId: s.creditCardId,
          sourceType: "CardStatement",
          status: "Confirmed",
          statementItemId: item.statementItemId,
          importJobId: s.importJobId,
          createdAt: new Date(),
          isDeleted: false,
        })
        .returning();

      await db
        .update(creditCardStatementItems)
        .set({ transactionId: txn.transactionId })
        .where(eq(creditCardStatementItems.statementItemId, item.statementItemId));

      createdTxnIds.push(txn.transactionId);
    }

    // Update statement status
    await db
      .update(creditCardStatements)
      .set({ status: "Reviewed" })
      .where(eq(creditCardStatements.statementId, statementId));

    if (s.importJobId) {
      await db
        .update(importJobs)
        .set({
          status: "Completed",
          completedAt: new Date(),
          importedRecords: sql`${importJobs.importedRecords} + ${createdTxnIds.length}`,
        })
        .where(eq(importJobs.importJobId, s.importJobId));
    }

    await logAudit(userId, "Import", "CreditCardStatements", statementId.toString(), {
      statementId,
      creditCardId: s.creditCardId,
      confirmedCount: createdTxnIds.length,
      transactionIds: createdTxnIds,
    });

    return {
      statementId,
      confirmedCount: createdTxnIds.length,
      createdTransactionIds: createdTxnIds,
    };
  }
}
