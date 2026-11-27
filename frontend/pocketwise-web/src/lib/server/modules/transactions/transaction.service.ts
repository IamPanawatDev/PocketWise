import { and, asc, desc, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";
import { db } from "@/lib/server/db";
import {
  bankAccounts,
  categories,
  creditCards,
  tags,
  transactions,
  transactionTags,
} from "@/lib/server/db/schema";
import {
  NotFoundError,
  ValidationErrorAppError,
} from "@/lib/server/api-error";
import { logAudit } from "@/lib/server/audit";
import { CategoryService } from "../categories/category.service";

export type TransactionType = "income" | "expense" | "transfer";
export type SourceType = "manual" | "slip" | "cardStatement" | "recurring";
export type TransactionStatus = "draft" | "confirmed" | "void";

export interface TagRef {
  tagId: number;
  tagName: string;
}

export interface TransactionResponse {
  transactionId: number;
  transactionType: TransactionType;
  amount: number;
  currencyCode: string;
  transactionDate: string;
  description: string | null;
  categoryId: number | null;
  categoryName: string | null;
  bankAccountId: number | null;
  bankAccountName?: string | null;
  creditCardId: number | null;
  creditCardName?: string | null;
  sourceType: SourceType;
  transferGroupId: number | null;
  recurringTransactionId: number | null;
  status: TransactionStatus;
  tags: TagRef[];
  createdAt: string;
  updatedAt: string | null;
}

export interface CreateTransactionRequest {
  transactionType: TransactionType | string;
  amount: number;
  currencyCode?: string;
  transactionDate: string | Date;
  description?: string | null;
  categoryId?: number | null;
  bankAccountId?: number | null;
  creditCardId?: number | null;
  tagIds?: number[];
}

export type UpdateTransactionRequest = CreateTransactionRequest;

export interface TransactionFilter {
  categoryId?: number;
  tagId?: number;
  bankAccountId?: number;
  creditCardId?: number;
  sourceType?: string;
  type?: string;
  fromDate?: string | Date;
  toDate?: string | Date;
  q?: string;
}

export interface TransactionPagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
}

function normalizeDbTransactionType(type: string): string {
  const lower = (type || "").toLowerCase().trim();
  if (lower === "income") return "Income";
  if (lower === "transfer") return "Transfer";
  return "Expense";
}

function normalizeResponseTransactionType(type: string): TransactionType {
  const lower = (type || "").toLowerCase().trim();
  if (lower === "income") return "income";
  if (lower === "transfer") return "transfer";
  return "expense";
}

function normalizeResponseSourceType(type: string): SourceType {
  const lower = (type || "").toLowerCase().trim();
  if (lower === "slip") return "slip";
  if (lower === "cardstatement") return "cardStatement";
  if (lower === "recurring") return "recurring";
  return "manual";
}

function normalizeResponseStatus(status: string): TransactionStatus {
  const lower = (status || "").toLowerCase().trim();
  if (lower === "draft") return "draft";
  if (lower === "void") return "void";
  return "confirmed";
}

export class TransactionService {
  /**
   * Fetch a single transaction by ID and user ID
   */
  static async getById(id: number, userId: number): Promise<TransactionResponse | null> {
    const [row] = await db
      .select({
        tx: transactions,
        categoryName: categories.categoryName,
        bankAccountName: bankAccounts.accountName,
        creditCardName: creditCards.cardName,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.categoryId))
      .leftJoin(bankAccounts, eq(transactions.bankAccountId, bankAccounts.bankAccountId))
      .leftJoin(creditCards, eq(transactions.creditCardId, creditCards.creditCardId))
      .where(
        and(
          eq(transactions.transactionId, id),
          eq(transactions.userId, userId),
          eq(transactions.isDeleted, false)
        )
      )
      .limit(1);

    if (!row) return null;

    // Fetch tags
    const txTags = await db
      .select({
        tagId: tags.tagId,
        tagName: tags.tagName,
      })
      .from(transactionTags)
      .innerJoin(tags, eq(transactionTags.tagId, tags.tagId))
      .where(eq(transactionTags.transactionId, id));

    return {
      transactionId: row.tx.transactionId,
      transactionType: normalizeResponseTransactionType(row.tx.transactionType),
      amount: Number(row.tx.amount) || 0,
      currencyCode: row.tx.currencyCode,
      transactionDate: row.tx.transactionDate.toISOString(),
      description: row.tx.description,
      categoryId: row.tx.categoryId,
      categoryName: row.categoryName,
      bankAccountId: row.tx.bankAccountId,
      bankAccountName: row.bankAccountName,
      creditCardId: row.tx.creditCardId,
      creditCardName: row.creditCardName,
      sourceType: normalizeResponseSourceType(row.tx.sourceType),
      transferGroupId: row.tx.transferGroupId,
      recurringTransactionId: row.tx.recurringTransactionId,
      status: normalizeResponseStatus(row.tx.status),
      tags: txTags,
      createdAt: row.tx.createdAt.toISOString(),
      updatedAt: row.tx.updatedAt ? row.tx.updatedAt.toISOString() : null,
    };
  }

  /**
   * Get paged transactions with filtering, search, sorting and totals
   */
  static async getPaged(
    userId: number,
    filter: TransactionFilter,
    page = 1,
    pageSize = 20,
    sortBy = "transactionDate",
    sortDesc = true
  ): Promise<TransactionPagedResult<TransactionResponse>> {
    page = Math.max(1, page);
    pageSize = Math.min(100, Math.max(1, pageSize));

    const conditions = [
      eq(transactions.userId, userId),
      eq(transactions.isDeleted, false),
    ];

    if (filter.categoryId !== undefined && filter.categoryId !== null) {
      conditions.push(eq(transactions.categoryId, filter.categoryId));
    }

    if (filter.bankAccountId !== undefined && filter.bankAccountId !== null) {
      conditions.push(eq(transactions.bankAccountId, filter.bankAccountId));
    }

    if (filter.creditCardId !== undefined && filter.creditCardId !== null) {
      conditions.push(eq(transactions.creditCardId, filter.creditCardId));
    }

    if (filter.sourceType) {
      conditions.push(
        sql`LOWER(${transactions.sourceType}) = LOWER(${filter.sourceType})`
      );
    }

    if (filter.type) {
      conditions.push(
        sql`LOWER(${transactions.transactionType}) = LOWER(${filter.type})`
      );
    }

    if (filter.fromDate) {
      const fromDate = typeof filter.fromDate === "string" ? new Date(filter.fromDate) : filter.fromDate;
      conditions.push(gte(transactions.transactionDate, fromDate));
    }

    if (filter.toDate) {
      const toDate = typeof filter.toDate === "string" ? new Date(filter.toDate) : filter.toDate;
      conditions.push(lte(transactions.transactionDate, toDate));
    }

    if (filter.tagId !== undefined && filter.tagId !== null) {
      conditions.push(
        sql`EXISTS (
          SELECT 1 FROM "TransactionTags" tt
          WHERE tt."TransactionId" = ${transactions.transactionId} AND tt."TagId" = ${filter.tagId}
        )`
      );
    }

    if (filter.q && filter.q.trim()) {
      const search = `%${filter.q.trim()}%`;
      conditions.push(
        sql`(${transactions.description} ILIKE ${search} OR EXISTS (
          SELECT 1 FROM "Categories" c
          WHERE c."CategoryId" = ${transactions.categoryId} AND c."CategoryName" ILIKE ${search}
        ))`
      );
    }

    const whereClause = and(...conditions);

    // 1. Calculate count & income/expense totals
    const [aggregates] = await db
      .select({
        totalItems: sql<string>`COUNT(*)`,
        totalIncome: sql<string>`COALESCE(SUM(CASE WHEN LOWER(${transactions.transactionType}) = 'income' THEN ${transactions.amount} ELSE 0 END), 0)`,
        totalExpense: sql<string>`COALESCE(SUM(CASE WHEN LOWER(${transactions.transactionType}) = 'expense' THEN ${transactions.amount} ELSE 0 END), 0)`,
      })
      .from(transactions)
      .where(whereClause);

    const totalItems = Number(aggregates?.totalItems) || 0;
    const totalIncome = Number(aggregates?.totalIncome) || 0;
    const totalExpense = Number(aggregates?.totalExpense) || 0;
    const totalPages = Math.ceil(totalItems / pageSize) || 0;

    if (totalItems === 0) {
      return {
        items: [],
        page,
        pageSize,
        totalItems: 0,
        totalPages: 0,
        totalIncome: 0,
        totalExpense: 0,
        netBalance: 0,
      };
    }

    // 2. Query page items with joins
    let orderExpression;
    const sortField = (sortBy || "").toLowerCase().trim();
    if (sortField === "amount") {
      orderExpression = sortDesc
        ? [desc(transactions.amount), desc(transactions.transactionId)]
        : [asc(transactions.amount), asc(transactions.transactionId)];
    } else {
      orderExpression = sortDesc
        ? [desc(transactions.transactionDate), desc(transactions.transactionId)]
        : [asc(transactions.transactionDate), asc(transactions.transactionId)];
    }

    const rows = await db
      .select({
        tx: transactions,
        categoryName: categories.categoryName,
        bankAccountName: bankAccounts.accountName,
        creditCardName: creditCards.cardName,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.categoryId))
      .leftJoin(bankAccounts, eq(transactions.bankAccountId, bankAccounts.bankAccountId))
      .leftJoin(creditCards, eq(transactions.creditCardId, creditCards.creditCardId))
      .where(whereClause)
      .orderBy(...orderExpression)
      .offset((page - 1) * pageSize)
      .limit(pageSize);

    // 3. Batch fetch tags for retrieved items
    const txIds = rows.map((r) => r.tx.transactionId);
    const tagMap = new Map<number, TagRef[]>();

    if (txIds.length > 0) {
      const allTags = await db
        .select({
          transactionId: transactionTags.transactionId,
          tagId: tags.tagId,
          tagName: tags.tagName,
        })
        .from(transactionTags)
        .innerJoin(tags, eq(transactionTags.tagId, tags.tagId))
        .where(inArray(transactionTags.transactionId, txIds));

      for (const t of allTags) {
        if (!tagMap.has(t.transactionId)) {
          tagMap.set(t.transactionId, []);
        }
        tagMap.get(t.transactionId)!.push({ tagId: t.tagId, tagName: t.tagName });
      }
    }

    const items: TransactionResponse[] = rows.map((r) => ({
      transactionId: r.tx.transactionId,
      transactionType: normalizeResponseTransactionType(r.tx.transactionType),
      amount: Number(r.tx.amount) || 0,
      currencyCode: r.tx.currencyCode,
      transactionDate: r.tx.transactionDate.toISOString(),
      description: r.tx.description,
      categoryId: r.tx.categoryId,
      categoryName: r.categoryName,
      bankAccountId: r.tx.bankAccountId,
      bankAccountName: r.bankAccountName,
      creditCardId: r.tx.creditCardId,
      creditCardName: r.creditCardName,
      sourceType: normalizeResponseSourceType(r.tx.sourceType),
      transferGroupId: r.tx.transferGroupId,
      recurringTransactionId: r.tx.recurringTransactionId,
      status: normalizeResponseStatus(r.tx.status),
      tags: tagMap.get(r.tx.transactionId) ?? [],
      createdAt: r.tx.createdAt.toISOString(),
      updatedAt: r.tx.updatedAt ? r.tx.updatedAt.toISOString() : null,
    }));

    return {
      items,
      page,
      pageSize,
      totalItems,
      totalPages,
      totalIncome,
      totalExpense,
      netBalance: totalIncome - totalExpense,
    };
  }

  /**
   * Create a new transaction
   */
  static async create(
    userId: number,
    request: CreateTransactionRequest
  ): Promise<TransactionResponse> {
    const amount = Number(request.amount);
    if (!amount || amount <= 0 || Number.isNaN(amount)) {
      throw new ValidationErrorAppError("จำนวนเงินต้องมากกว่า 0", [
        { field: "amount", message: "จำนวนเงินต้องมากกว่า 0" },
      ]);
    }

    if (!request.transactionDate) {
      throw new ValidationErrorAppError("ต้องระบุวันที่รายการ", [
        { field: "transactionDate", message: "ต้องระบุวันที่รายการ" },
      ]);
    }

    if (request.tagIds && request.tagIds.length > 20) {
      throw new ValidationErrorAppError("แท็กต้องไม่เกิน 20 รายการ", [
        { field: "tagIds", message: "แท็กต้องไม่เกิน 20 รายการ" },
      ]);
    }

    const trimmedDesc = request.description?.trim() || null;
    let categoryId = request.categoryId ?? null;

    // Auto-suggest category if user didn't specify one
    if (!categoryId && trimmedDesc) {
      try {
        const suggestion = await CategoryService.suggestCategory(userId, trimmedDesc);
        if (suggestion) {
          categoryId = suggestion.categoryId;
        }
      } catch {
        // Ignore suggestion failures
      }
    }

    const dbType = normalizeDbTransactionType(request.transactionType);
    const parsedDate =
      typeof request.transactionDate === "string"
        ? new Date(request.transactionDate)
        : request.transactionDate;

    const currencyCode = (request.currencyCode || "THB").trim().toUpperCase().slice(0, 3) || "THB";

    const [created] = await db
      .insert(transactions)
      .values({
        userId,
        transactionType: dbType,
        amount: amount.toFixed(2),
        currencyCode,
        transactionDate: parsedDate,
        description: trimmedDesc,
        categoryId,
        bankAccountId: request.bankAccountId ?? null,
        creditCardId: request.creditCardId ?? null,
        sourceType: "Manual",
        status: "Confirmed",
        isDeleted: false,
        createdAt: new Date(),
      })
      .returning();

    // Associate tags
    if (request.tagIds && request.tagIds.length > 0) {
      const distinctTagIds = Array.from(new Set(request.tagIds));
      await db.insert(transactionTags).values(
        distinctTagIds.map((tagId) => ({
          transactionId: created.transactionId,
          tagId,
        }))
      );
    }

    // Auto-learn category (best-effort)
    if (request.categoryId && trimmedDesc) {
      try {
        await CategoryService.learnFromManual(userId, trimmedDesc, request.categoryId);
      } catch {
        // Ignore auto-learn failures
      }
    }

    await logAudit(userId, "Create", "Transactions", created.transactionId.toString(), {
      transactionType: created.transactionType,
      amount: created.amount,
      currencyCode: created.currencyCode,
      transactionDate: created.transactionDate,
      description: created.description,
      categoryId: created.categoryId,
      bankAccountId: created.bankAccountId,
      creditCardId: created.creditCardId,
      sourceType: created.sourceType,
    });

    const fresh = await this.getById(created.transactionId, userId);
    return fresh!;
  }

  /**
   * Update an existing transaction
   */
  static async update(
    id: number,
    userId: number,
    request: UpdateTransactionRequest
  ): Promise<TransactionResponse | null> {
    const amount = Number(request.amount);
    if (!amount || amount <= 0 || Number.isNaN(amount)) {
      throw new ValidationErrorAppError("จำนวนเงินต้องมากกว่า 0", [
        { field: "amount", message: "จำนวนเงินต้องมากกว่า 0" },
      ]);
    }

    if (!request.transactionDate) {
      throw new ValidationErrorAppError("ต้องระบุวันที่รายการ", [
        { field: "transactionDate", message: "ต้องระบุวันที่รายการ" },
      ]);
    }

    if (request.tagIds && request.tagIds.length > 20) {
      throw new ValidationErrorAppError("แท็กต้องไม่เกิน 20 รายการ", [
        { field: "tagIds", message: "แท็กต้องไม่เกิน 20 รายการ" },
      ]);
    }

    const [existing] = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.transactionId, id),
          eq(transactions.userId, userId),
          eq(transactions.isDeleted, false)
        )
      )
      .limit(1);

    if (!existing) return null;

    const beforeState = {
      transactionType: existing.transactionType,
      amount: existing.amount,
      currencyCode: existing.currencyCode,
      transactionDate: existing.transactionDate,
      description: existing.description,
      categoryId: existing.categoryId,
      bankAccountId: existing.bankAccountId,
      creditCardId: existing.creditCardId,
    };

    const trimmedDesc = request.description?.trim() || null;
    const dbType = normalizeDbTransactionType(request.transactionType);
    const parsedDate =
      typeof request.transactionDate === "string"
        ? new Date(request.transactionDate)
        : request.transactionDate;
    const currencyCode = (request.currencyCode || "THB").trim().toUpperCase().slice(0, 3) || "THB";

    await db
      .update(transactions)
      .set({
        transactionType: dbType,
        amount: amount.toFixed(2),
        currencyCode,
        transactionDate: parsedDate,
        description: trimmedDesc,
        categoryId: request.categoryId ?? null,
        bankAccountId: request.bankAccountId ?? null,
        creditCardId: request.creditCardId ?? null,
        updatedAt: new Date(),
      })
      .where(eq(transactions.transactionId, id));

    // Replace tags: delete existing and insert new
    await db.delete(transactionTags).where(eq(transactionTags.transactionId, id));
    if (request.tagIds && request.tagIds.length > 0) {
      const distinctTagIds = Array.from(new Set(request.tagIds));
      await db.insert(transactionTags).values(
        distinctTagIds.map((tagId) => ({
          transactionId: id,
          tagId,
        }))
      );
    }

    // Auto-learn category (best-effort)
    if (request.categoryId && trimmedDesc) {
      try {
        await CategoryService.learnFromManual(userId, trimmedDesc, request.categoryId);
      } catch {
        // Ignore
      }
    }

    await logAudit(userId, "Update", "Transactions", id.toString(), {
      before: beforeState,
      after: {
        transactionType: dbType,
        amount: amount.toFixed(2),
        currencyCode,
        transactionDate: parsedDate,
        description: trimmedDesc,
        categoryId: request.categoryId ?? null,
        bankAccountId: request.bankAccountId ?? null,
        creditCardId: request.creditCardId ?? null,
      },
    });

    const fresh = await this.getById(id, userId);
    return fresh;
  }

  /**
   * Delete a transaction (soft delete)
   */
  static async delete(id: number, userId: number): Promise<boolean> {
    const [existing] = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.transactionId, id),
          eq(transactions.userId, userId),
          eq(transactions.isDeleted, false)
        )
      )
      .limit(1);

    if (!existing) return false;

    await db
      .update(transactions)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(transactions.transactionId, id));

    await logAudit(userId, "Delete", "Transactions", id.toString(), {
      transactionType: existing.transactionType,
      amount: existing.amount,
      currencyCode: existing.currencyCode,
      transactionDate: existing.transactionDate,
      description: existing.description,
      isDeleted: true,
    });

    return true;
  }

  /**
   * Bulk delete transactions (soft delete)
   */
  static async bulkDelete(userId: number, ids: number[]): Promise<number> {
    if (!ids || ids.length === 0) return 0;

    const distinctIds = Array.from(new Set(ids));
    const list = await db
      .select()
      .from(transactions)
      .where(
        and(
          inArray(transactions.transactionId, distinctIds),
          eq(transactions.userId, userId),
          eq(transactions.isDeleted, false)
        )
      );

    if (list.length !== distinctIds.length) {
      throw new NotFoundError("ไม่พบรายการธุรกรรมบางรายการ หรือคุณไม่มีสิทธิ์ในการลบ");
    }

    const now = new Date();
    await db
      .update(transactions)
      .set({ isDeleted: true, updatedAt: now })
      .where(
        and(
          inArray(transactions.transactionId, distinctIds),
          eq(transactions.userId, userId)
        )
      );

    for (const item of list) {
      await logAudit(userId, "Delete", "Transactions", item.transactionId.toString(), {
        transactionType: item.transactionType,
        amount: item.amount,
        currencyCode: item.currencyCode,
        transactionDate: item.transactionDate,
        description: item.description,
        isDeleted: true,
        bulk: true,
      });
    }

    return list.length;
  }
}
