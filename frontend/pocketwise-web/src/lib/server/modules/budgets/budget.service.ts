import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/server/db";
import {
  budgets,
  categories,
  tags,
  transactions,
  transactionTags,
} from "@/lib/server/db/schema";
import {
  NotFoundError,
  ValidationErrorAppError,
} from "@/lib/server/api-error";
import { logAudit } from "@/lib/server/audit";

export type BudgetScopeType = "total" | "category" | "tag";
export type BudgetPeriodType = "weekly" | "monthly" | "quarterly" | "yearly" | "custom";

export interface BudgetResponse {
  budgetId: number;
  budgetName: string;
  currencyCode: string;
  scopeType: BudgetScopeType;
  categoryId: number | null;
  categoryName: string | null;
  tagId: number | null;
  tagName: string | null;
  amountLimit: number;
  periodType: BudgetPeriodType;
  startDate: string;
  endDate: string | null;
  alertThresholdPercent: number;
  isActive: boolean;
  createdAt: string;
}

export interface BudgetTrackingResponse extends BudgetResponse {
  spentAmount: number;
  remainingAmount: number;
  percentageUsed: number;
  isOverLimit: boolean;
}

export interface CreateBudgetRequest {
  budgetName: string;
  scopeType: BudgetScopeType | string;
  categoryId?: number | null;
  tagId?: number | null;
  amountLimit: number;
  periodType: BudgetPeriodType | string;
  startDate: string;
  endDate?: string | null;
  alertThresholdPercent?: number;
}

export interface UpdateBudgetRequest extends CreateBudgetRequest {
  isActive?: boolean;
}

function normalizeScopeType(val: string): BudgetScopeType {
  const lower = (val || "").toLowerCase().trim();
  if (lower === "category") return "category";
  if (lower === "tag") return "tag";
  return "total";
}

function normalizePeriodType(val: string): BudgetPeriodType {
  const lower = (val || "").toLowerCase().trim();
  if (lower === "weekly") return "weekly";
  if (lower === "quarterly") return "quarterly";
  if (lower === "yearly") return "yearly";
  if (lower === "custom") return "custom";
  return "monthly";
}

function toDbScopeType(val: string): string {
  const s = normalizeScopeType(val);
  if (s === "category") return "Category";
  if (s === "tag") return "Tag";
  return "Total";
}

function toDbPeriodType(val: string): string {
  const p = normalizePeriodType(val);
  if (p === "weekly") return "Weekly";
  if (p === "quarterly") return "Quarterly";
  if (p === "yearly") return "Yearly";
  if (p === "custom") return "Custom";
  return "Monthly";
}

// Helpers for period calculation (Bangkok UTC+7)
function addPeriod(date: Date, type: BudgetPeriodType): Date {
  const d = new Date(date);
  if (type === "weekly") {
    d.setUTCDate(d.getUTCDate() + 7);
  } else if (type === "monthly") {
    d.setUTCMonth(d.getUTCMonth() + 1);
  } else if (type === "quarterly") {
    d.setUTCMonth(d.getUTCMonth() + 3);
  } else if (type === "yearly") {
    d.setUTCFullYear(d.getUTCFullYear() + 1);
  }
  return d;
}

function getBangkokTodayDateString(): string {
  const now = new Date();
  // UTC+7
  const bkk = new Date(now.getTime() + 7 * 3600 * 1000);
  return bkk.toISOString().slice(0, 10);
}

function calculateCurrentPeriod(
  periodType: BudgetPeriodType,
  startDateStr: string,
  endDateStr: string | null,
  todayStr: string
): { fromUtc: Date; toUtcExclusive: Date } | null {
  const startDate = new Date(`${startDateStr}T00:00:00.000Z`);
  const today = new Date(`${todayStr}T00:00:00.000Z`);

  if (today < startDate) return null;

  if (periodType === "custom") {
    if (endDateStr) {
      const endCustom = new Date(`${endDateStr}T00:00:00.000Z`);
      if (today > endCustom) return null;
    }
    const fromUtc = new Date(startDate.getTime() - 7 * 3600 * 1000);
    const toDate = endDateStr ? new Date(`${endDateStr}T00:00:00.000Z`) : today;
    const toUtcExclusive = new Date(toDate.getTime() + 24 * 3600 * 1000 - 7 * 3600 * 1000);
    return { fromUtc, toUtcExclusive };
  }

  let cycleStart = startDate;
  let cycleEnd = new Date(addPeriod(cycleStart, periodType).getTime() - 24 * 3600 * 1000);

  let iterations = 0;
  while (cycleEnd < today && iterations < 500) {
    cycleStart = addPeriod(cycleStart, periodType);
    cycleEnd = new Date(addPeriod(cycleStart, periodType).getTime() - 24 * 3600 * 1000);
    iterations++;
  }

  if (endDateStr) {
    const endBound = new Date(`${endDateStr}T00:00:00.000Z`);
    if (today > endBound) return null;
    if (cycleEnd > endBound) cycleEnd = endBound;
  }

  // Convert Bangkok local midnight to UTC
  const fromUtc = new Date(cycleStart.getTime() - 7 * 3600 * 1000);
  const toUtcExclusive = new Date(cycleEnd.getTime() + 24 * 3600 * 1000 - 7 * 3600 * 1000);

  return { fromUtc, toUtcExclusive };
}

export class BudgetService {
  /**
   * Get all budgets for user
   */
  static async getAll(userId: number): Promise<BudgetResponse[]> {
    const rows = await db
      .select({
        budget: budgets,
        categoryName: categories.categoryName,
        tagName: tags.tagName,
      })
      .from(budgets)
      .leftJoin(categories, eq(budgets.categoryId, categories.categoryId))
      .leftJoin(tags, eq(budgets.tagId, tags.tagId))
      .where(and(eq(budgets.userId, userId), eq(budgets.isDeleted, false)))
      .orderBy(desc(budgets.createdAt));

    return rows.map((r) => ({
      budgetId: r.budget.budgetId,
      budgetName: r.budget.budgetName,
      currencyCode: "THB",
      scopeType: normalizeScopeType(r.budget.scopeType),
      categoryId: r.budget.categoryId,
      categoryName: r.categoryName,
      tagId: r.budget.tagId,
      tagName: r.tagName,
      amountLimit: Number(r.budget.amountLimit) || 0,
      periodType: normalizePeriodType(r.budget.periodType),
      startDate: r.budget.startDate,
      endDate: r.budget.endDate,
      alertThresholdPercent: r.budget.alertThresholdPercent,
      isActive: r.budget.isActive,
      createdAt: r.budget.createdAt.toISOString(),
    }));
  }

  /**
   * Get tracking for all active budgets with spent amount calculation
   */
  static async getTracking(userId: number): Promise<BudgetTrackingResponse[]> {
    const rows = await db
      .select({
        budget: budgets,
        categoryName: categories.categoryName,
        tagName: tags.tagName,
      })
      .from(budgets)
      .leftJoin(categories, eq(budgets.categoryId, categories.categoryId))
      .leftJoin(tags, eq(budgets.tagId, tags.tagId))
      .where(
        and(
          eq(budgets.userId, userId),
          eq(budgets.isDeleted, false),
          eq(budgets.isActive, true)
        )
      )
      .orderBy(desc(budgets.createdAt));

    const todayStr = getBangkokTodayDateString();
    const result: BudgetTrackingResponse[] = [];

    for (const r of rows) {
      const scopeType = normalizeScopeType(r.budget.scopeType);
      const periodType = normalizePeriodType(r.budget.periodType);
      const amountLimit = Number(r.budget.amountLimit) || 0;

      const period = calculateCurrentPeriod(
        periodType,
        r.budget.startDate,
        r.budget.endDate,
        todayStr
      );

      let spentAmount = 0;

      if (period) {
        const conditions = [
          eq(transactions.userId, userId),
          eq(transactions.isDeleted, false),
          sql`LOWER(${transactions.transactionType}) = 'expense'`,
          sql`LOWER(${transactions.status}) = 'confirmed'`,
          sql`${transactions.transactionDate} >= ${period.fromUtc.toISOString()}::timestamptz`,
          sql`${transactions.transactionDate} < ${period.toUtcExclusive.toISOString()}::timestamptz`,
        ];

        if (scopeType === "category" && r.budget.categoryId) {
          conditions.push(eq(transactions.categoryId, r.budget.categoryId));
        } else if (scopeType === "tag" && r.budget.tagId) {
          conditions.push(
            sql`EXISTS (
              SELECT 1 FROM "TransactionTags" tt
              WHERE tt."TransactionId" = ${transactions.transactionId} AND tt."TagId" = ${r.budget.tagId}
            )`
          );
        }

        const [spentRow] = await db
          .select({
            total: sql<string>`COALESCE(SUM(${transactions.amount}), 0)`,
          })
          .from(transactions)
          .where(and(...conditions));

        spentAmount = Number(spentRow?.total) || 0;
      }

      const remainingAmount = Math.max(0, amountLimit - spentAmount);
      const percentageUsed = amountLimit > 0 ? (spentAmount / amountLimit) * 100 : 0;
      const isOverLimit = spentAmount > amountLimit;

      result.push({
        budgetId: r.budget.budgetId,
        budgetName: r.budget.budgetName,
        currencyCode: "THB",
        scopeType,
        categoryId: r.budget.categoryId,
        categoryName: r.categoryName,
        tagId: r.budget.tagId,
        tagName: r.tagName,
        amountLimit,
        periodType,
        startDate: r.budget.startDate,
        endDate: r.budget.endDate,
        alertThresholdPercent: r.budget.alertThresholdPercent,
        isActive: r.budget.isActive,
        createdAt: r.budget.createdAt.toISOString(),
        spentAmount,
        remainingAmount,
        percentageUsed: Number(percentageUsed.toFixed(2)),
        isOverLimit,
      });
    }

    return result;
  }

  /**
   * Get budget by ID
   */
  static async getById(id: number, userId: number): Promise<BudgetResponse | null> {
    const [r] = await db
      .select({
        budget: budgets,
        categoryName: categories.categoryName,
        tagName: tags.tagName,
      })
      .from(budgets)
      .leftJoin(categories, eq(budgets.categoryId, categories.categoryId))
      .leftJoin(tags, eq(budgets.tagId, tags.tagId))
      .where(
        and(
          eq(budgets.budgetId, id),
          eq(budgets.userId, userId),
          eq(budgets.isDeleted, false)
        )
      )
      .limit(1);

    if (!r) return null;

    return {
      budgetId: r.budget.budgetId,
      budgetName: r.budget.budgetName,
      currencyCode: "THB",
      scopeType: normalizeScopeType(r.budget.scopeType),
      categoryId: r.budget.categoryId,
      categoryName: r.categoryName,
      tagId: r.budget.tagId,
      tagName: r.tagName,
      amountLimit: Number(r.budget.amountLimit) || 0,
      periodType: normalizePeriodType(r.budget.periodType),
      startDate: r.budget.startDate,
      endDate: r.budget.endDate,
      alertThresholdPercent: r.budget.alertThresholdPercent,
      isActive: r.budget.isActive,
      createdAt: r.budget.createdAt.toISOString(),
    };
  }

  /**
   * Create a new budget
   */
  static async create(
    userId: number,
    request: CreateBudgetRequest
  ): Promise<BudgetResponse> {
    const trimmedName = (request.budgetName || "").trim();
    if (!trimmedName) {
      throw new ValidationErrorAppError("ต้องระบุชื่องบ", [
        { field: "budgetName", message: "ต้องระบุชื่องบ" },
      ]);
    }

    const amountLimit = Number(request.amountLimit);
    if (!amountLimit || amountLimit <= 0 || Number.isNaN(amountLimit)) {
      throw new ValidationErrorAppError("วงเงินงบต้องมากกว่า 0", [
        { field: "amountLimit", message: "วงเงินงบต้องมากกว่า 0" },
      ]);
    }

    if (!request.startDate) {
      throw new ValidationErrorAppError("ต้องระบุวันที่เริ่มรอบงบ", [
        { field: "startDate", message: "ต้องระบุวันที่เริ่มรอบงบ" },
      ]);
    }

    if (request.endDate && request.endDate < request.startDate) {
      throw new ValidationErrorAppError("วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่ม", [
        { field: "endDate", message: "วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่ม" },
      ]);
    }

    const scopeType = normalizeScopeType(request.scopeType);
    if (scopeType === "category" && !request.categoryId) {
      throw new ValidationErrorAppError("งบแบบหมวดหมู่ต้องระบุ categoryId", [
        { field: "categoryId", message: "งบแบบหมวดหมู่ต้องระบุ categoryId" },
      ]);
    }

    if (scopeType === "tag" && !request.tagId) {
      throw new ValidationErrorAppError("งบแบบแท็กต้องระบุ tagId", [
        { field: "tagId", message: "งบแบบแท็กต้องระบุ tagId" },
      ]);
    }

    const alertThreshold = Math.min(100, Math.max(1, request.alertThresholdPercent ?? 80));
    const periodType = normalizePeriodType(request.periodType);

    const [created] = await db
      .insert(budgets)
      .values({
        userId,
        budgetName: trimmedName,
        scopeType: toDbScopeType(scopeType),
        categoryId: scopeType === "category" ? request.categoryId ?? null : null,
        tagId: scopeType === "tag" ? request.tagId ?? null : null,
        amountLimit: amountLimit.toFixed(2),
        periodType: toDbPeriodType(periodType),
        startDate: request.startDate,
        endDate: request.endDate ?? null,
        alertThresholdPercent: alertThreshold,
        isActive: true,
        isDeleted: false,
        createdAt: new Date(),
      })
      .returning();

    await logAudit(userId, "Create", "Budgets", created.budgetId.toString(), {
      budgetName: created.budgetName,
      amountLimit: created.amountLimit,
      scopeType: created.scopeType,
      periodType: created.periodType,
    });

    const fresh = await this.getById(created.budgetId, userId);
    return fresh!;
  }

  /**
   * Update budget
   */
  static async update(
    id: number,
    userId: number,
    request: UpdateBudgetRequest
  ): Promise<BudgetResponse | null> {
    const trimmedName = (request.budgetName || "").trim();
    if (!trimmedName) {
      throw new ValidationErrorAppError("ต้องระบุชื่องบ", [
        { field: "budgetName", message: "ต้องระบุชื่องบ" },
      ]);
    }

    const amountLimit = Number(request.amountLimit);
    if (!amountLimit || amountLimit <= 0 || Number.isNaN(amountLimit)) {
      throw new ValidationErrorAppError("วงเงินงบต้องมากกว่า 0", [
        { field: "amountLimit", message: "วงเงินงบต้องมากกว่า 0" },
      ]);
    }

    if (!request.startDate) {
      throw new ValidationErrorAppError("ต้องระบุวันที่เริ่มรอบงบ", [
        { field: "startDate", message: "ต้องระบุวันที่เริ่มรอบงบ" },
      ]);
    }

    if (request.endDate && request.endDate < request.startDate) {
      throw new ValidationErrorAppError("วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่ม", [
        { field: "endDate", message: "วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่ม" },
      ]);
    }

    const scopeType = normalizeScopeType(request.scopeType);
    if (scopeType === "category" && !request.categoryId) {
      throw new ValidationErrorAppError("งบแบบหมวดหมู่ต้องระบุ categoryId", [
        { field: "categoryId", message: "งบแบบหมวดหมู่ต้องระบุ categoryId" },
      ]);
    }

    if (scopeType === "tag" && !request.tagId) {
      throw new ValidationErrorAppError("งบแบบแท็กต้องระบุ tagId", [
        { field: "tagId", message: "งบแบบแท็กต้องระบุ tagId" },
      ]);
    }

    const [existing] = await db
      .select()
      .from(budgets)
      .where(
        and(
          eq(budgets.budgetId, id),
          eq(budgets.userId, userId),
          eq(budgets.isDeleted, false)
        )
      )
      .limit(1);

    if (!existing) return null;

    const alertThreshold = Math.min(100, Math.max(1, request.alertThresholdPercent ?? existing.alertThresholdPercent));
    const periodType = normalizePeriodType(request.periodType);

    await db
      .update(budgets)
      .set({
        budgetName: trimmedName,
        scopeType: toDbScopeType(scopeType),
        categoryId: scopeType === "category" ? request.categoryId ?? null : null,
        tagId: scopeType === "tag" ? request.tagId ?? null : null,
        amountLimit: amountLimit.toFixed(2),
        periodType: toDbPeriodType(periodType),
        startDate: request.startDate,
        endDate: request.endDate ?? null,
        alertThresholdPercent: alertThreshold,
        isActive: request.isActive ?? existing.isActive,
      })
      .where(eq(budgets.budgetId, id));

    await logAudit(userId, "Update", "Budgets", id.toString(), {
      budgetName: trimmedName,
      amountLimit: amountLimit.toFixed(2),
      scopeType,
      periodType,
    });

    const fresh = await this.getById(id, userId);
    return fresh;
  }

  /**
   * Delete budget (soft delete)
   */
  static async delete(id: number, userId: number): Promise<boolean> {
    const [existing] = await db
      .select()
      .from(budgets)
      .where(
        and(
          eq(budgets.budgetId, id),
          eq(budgets.userId, userId),
          eq(budgets.isDeleted, false)
        )
      )
      .limit(1);

    if (!existing) return false;

    await db
      .update(budgets)
      .set({ isDeleted: true })
      .where(eq(budgets.budgetId, id));

    await logAudit(userId, "Delete", "Budgets", id.toString(), {
      budgetName: existing.budgetName,
      isDeleted: true,
    });

    return true;
  }
}
