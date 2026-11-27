import { and, desc, eq, inArray, isNull, lte, sql } from "drizzle-orm";
import { db } from "@/lib/server/db";
import {
  categories,
  recurringTransactions,
  recurringTransactionTags,
  tags,
  transactions,
  transactionTags,
  userSettings,
} from "@/lib/server/db/schema";
import {
  NotFoundError,
  ValidationErrorAppError,
} from "@/lib/server/api-error";
import { logAudit } from "@/lib/server/audit";
import { NotificationService } from "../notifications/notification.service";

export type RecurringFrequency =
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "yearly"
  | "custom";

export interface TagResponse {
  tagId: number;
  tagName: string;
  color: string | null;
  sortOrder: number;
}

export interface RecurringTransactionResponse {
  recurringTransactionId: number;
  transactionType: "income" | "expense";
  amount: number;
  description: string | null;
  categoryId: number | null;
  categoryName: string | null;
  frequency: RecurringFrequency;
  intervalValue: number;
  daysOfWeek?: number[];
  tags?: TagResponse[];
  startDate: string;
  endDate: string | null;
  nextRunAt: string;
  isActive: boolean;
  createdAt: string;
}

export interface RecurringTransactionRequest {
  transactionType: "income" | "expense" | string;
  amount: number;
  description?: string | null;
  categoryId?: number | null;
  frequency: RecurringFrequency | string;
  intervalValue?: number;
  daysOfWeek?: number[];
  tagIds?: number[];
  startDate: string;
  endDate?: string | null;
}

export interface UpdateRecurringTransactionRequest extends RecurringTransactionRequest {
  isActive?: boolean;
}

function normalizeTransactionType(val: string): "income" | "expense" {
  const lower = (val || "").toLowerCase().trim();
  return lower === "income" ? "income" : "expense";
}

function normalizeFrequency(val: string): RecurringFrequency {
  const lower = (val || "").toLowerCase().trim();
  if (lower === "daily") return "daily";
  if (lower === "weekly") return "weekly";
  if (lower === "quarterly") return "quarterly";
  if (lower === "yearly") return "yearly";
  if (lower === "custom") return "custom";
  return "monthly";
}

function toDbFrequency(val: string): string {
  const f = normalizeFrequency(val);
  if (f === "daily") return "Daily";
  if (f === "weekly") return "Weekly";
  if (f === "quarterly") return "Quarterly";
  if (f === "yearly") return "Yearly";
  if (f === "custom") return "Custom";
  return "Monthly";
}

function parseDaysOfWeek(str: string | null): number[] {
  if (!str || !str.trim()) return [];
  return str
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => !Number.isNaN(n) && n >= 0 && n <= 6);
}

function getBangkokToday(): { todayDateStr: string; todayDayOfWeek: number } {
  const now = new Date();
  const bkk = new Date(now.getTime() + 7 * 3600 * 1000);
  return {
    todayDateStr: bkk.toISOString().slice(0, 10),
    todayDayOfWeek: bkk.getUTCDay(),
  };
}

function advanceNextRun(
  current: Date,
  frequency: RecurringFrequency,
  intervalValue: number,
  targetDays?: number[]
): Date {
  const value = Math.max(1, intervalValue);
  const next = new Date(current);

  if (frequency === "custom" && targetDays && targetDays.length > 0) {
    for (let i = 1; i <= 7; i++) {
      const candidate = new Date(next.getTime() + i * 24 * 3600 * 1000);
      if (targetDays.includes(candidate.getUTCDay())) {
        return candidate;
      }
    }
  }

  if (frequency === "daily") {
    next.setUTCDate(next.getUTCDate() + value);
  } else if (frequency === "weekly") {
    next.setUTCDate(next.getUTCDate() + 7 * value);
  } else if (frequency === "monthly") {
    next.setUTCMonth(next.getUTCMonth() + value);
  } else if (frequency === "quarterly") {
    next.setUTCMonth(next.getUTCMonth() + 3 * value);
  } else if (frequency === "yearly") {
    next.setUTCFullYear(next.getUTCFullYear() + value);
  }

  return next;
}

function calculateInitialNextRunAt(
  startDateStr: string,
  frequency: RecurringFrequency,
  intervalValue: number,
  targetDays?: number[]
): Date {
  const start = new Date(`${startDateStr}T00:00:00.000Z`);
  if (frequency === "custom" && targetDays && targetDays.length > 0) {
    if (targetDays.includes(start.getUTCDay())) {
      return start;
    }
    for (let i = 1; i <= 7; i++) {
      const candidate = new Date(start.getTime() + i * 24 * 3600 * 1000);
      if (targetDays.includes(candidate.getUTCDay())) {
        return candidate;
      }
    }
  }

  return start;
}

export class RecurringTransactionService {
  /**
   * Get all recurring transactions for user
   */
  static async getAll(userId: number): Promise<RecurringTransactionResponse[]> {
    const list = await db
      .select({
        item: recurringTransactions,
        categoryName: categories.categoryName,
      })
      .from(recurringTransactions)
      .leftJoin(categories, eq(recurringTransactions.categoryId, categories.categoryId))
      .where(
        and(
          eq(recurringTransactions.userId, userId),
          eq(recurringTransactions.isDeleted, false)
        )
      )
      .orderBy(desc(recurringTransactions.createdAt));

    const itemIds = list.map((r) => r.item.recurringTransactionId);
    const tagMap = new Map<number, TagResponse[]>();

    if (itemIds.length > 0) {
      const allTags = await db
        .select({
          recurringTransactionId: recurringTransactionTags.recurringTransactionId,
          tagId: tags.tagId,
          tagName: tags.tagName,
          color: tags.color,
          sortOrder: tags.sortOrder,
        })
        .from(recurringTransactionTags)
        .innerJoin(tags, eq(recurringTransactionTags.tagId, tags.tagId))
        .where(inArray(recurringTransactionTags.recurringTransactionId, itemIds));

      for (const t of allTags) {
        if (!tagMap.has(t.recurringTransactionId)) {
          tagMap.set(t.recurringTransactionId, []);
        }
        tagMap.get(t.recurringTransactionId)!.push({
          tagId: t.tagId,
          tagName: t.tagName,
          color: t.color,
          sortOrder: t.sortOrder,
        });
      }
    }

    return list.map((r) => {
      const daysOfWeek = parseDaysOfWeek(r.item.daysOfWeek);
      return {
        recurringTransactionId: r.item.recurringTransactionId,
        transactionType: normalizeTransactionType(r.item.transactionType),
        amount: Number(r.item.amount) || 0,
        description: r.item.description,
        categoryId: r.item.categoryId,
        categoryName: r.categoryName,
        frequency: normalizeFrequency(r.item.frequency),
        intervalValue: r.item.intervalValue,
        daysOfWeek: daysOfWeek.length > 0 ? daysOfWeek : undefined,
        tags: tagMap.get(r.item.recurringTransactionId) ?? [],
        startDate: r.item.startDate,
        endDate: r.item.endDate,
        nextRunAt: r.item.nextRunAt.toISOString(),
        isActive: r.item.isActive,
        createdAt: r.item.createdAt.toISOString(),
      };
    });
  }

  /**
   * Get recurring transaction by ID
   */
  static async getById(id: number, userId: number): Promise<RecurringTransactionResponse | null> {
    const [r] = await db
      .select({
        item: recurringTransactions,
        categoryName: categories.categoryName,
      })
      .from(recurringTransactions)
      .leftJoin(categories, eq(recurringTransactions.categoryId, categories.categoryId))
      .where(
        and(
          eq(recurringTransactions.recurringTransactionId, id),
          eq(recurringTransactions.userId, userId),
          eq(recurringTransactions.isDeleted, false)
        )
      )
      .limit(1);

    if (!r) return null;

    const allTags = await db
      .select({
        tagId: tags.tagId,
        tagName: tags.tagName,
        color: tags.color,
        sortOrder: tags.sortOrder,
      })
      .from(recurringTransactionTags)
      .innerJoin(tags, eq(recurringTransactionTags.tagId, tags.tagId))
      .where(eq(recurringTransactionTags.recurringTransactionId, id));

    const daysOfWeek = parseDaysOfWeek(r.item.daysOfWeek);

    return {
      recurringTransactionId: r.item.recurringTransactionId,
      transactionType: normalizeTransactionType(r.item.transactionType),
      amount: Number(r.item.amount) || 0,
      description: r.item.description,
      categoryId: r.item.categoryId,
      categoryName: r.categoryName,
      frequency: normalizeFrequency(r.item.frequency),
      intervalValue: r.item.intervalValue,
      daysOfWeek: daysOfWeek.length > 0 ? daysOfWeek : undefined,
      tags: allTags,
      startDate: r.item.startDate,
      endDate: r.item.endDate,
      nextRunAt: r.item.nextRunAt.toISOString(),
      isActive: r.item.isActive,
      createdAt: r.item.createdAt.toISOString(),
    };
  }

  /**
   * Create recurring transaction
   */
  static async create(
    userId: number,
    request: RecurringTransactionRequest
  ): Promise<RecurringTransactionResponse> {
    const amount = Number(request.amount);
    if (!amount || amount <= 0 || Number.isNaN(amount)) {
      throw new ValidationErrorAppError("จำนวนเงินต้องมากกว่า 0", [
        { field: "amount", message: "จำนวนเงินต้องมากกว่า 0" },
      ]);
    }

    if (!request.startDate) {
      throw new ValidationErrorAppError("ต้องระบุวันที่เริ่ม", [
        { field: "startDate", message: "ต้องระบุวันที่เริ่ม" },
      ]);
    }

    if (request.endDate && request.endDate < request.startDate) {
      throw new ValidationErrorAppError("วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่ม", [
        { field: "endDate", message: "วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่ม" },
      ]);
    }

    const frequency = normalizeFrequency(request.frequency);
    if (frequency === "custom") {
      if (!request.daysOfWeek || request.daysOfWeek.length === 0) {
        throw new ValidationErrorAppError("กรุณาเลือกอย่างน้อย 1 วันสำหรับความถี่แบบกำหนดเอง", [
          { field: "daysOfWeek", message: "กรุณาเลือกอย่างน้อย 1 วันสำหรับความถี่แบบกำหนดเอง" },
        ]);
      }
      if (request.daysOfWeek.some((d) => d < 0 || d > 6)) {
        throw new ValidationErrorAppError("วันที่เลือกต้องอยู่ในช่วงวันอาทิตย์ (0) ถึงวันเสาร์ (6)", [
          { field: "daysOfWeek", message: "วันที่เลือกต้องอยู่ในช่วงวันอาทิตย์ (0) ถึงวันเสาร์ (6)" },
        ]);
      }
    }

    const intervalValue = Math.max(1, request.intervalValue ?? 1);
    const { todayDateStr, todayDayOfWeek } = getBangkokToday();
    const daysOfWeekStr = request.daysOfWeek ? request.daysOfWeek.join(",") : null;

    let shouldRunToday = false;
    const isWithinEnd = !request.endDate || todayDateStr <= request.endDate;

    if (request.startDate <= todayDateStr && isWithinEnd) {
      if (frequency === "custom") {
        shouldRunToday = !!request.daysOfWeek?.includes(todayDayOfWeek);
      } else {
        shouldRunToday = request.startDate === todayDateStr;
      }
    }

    let nextRunAt: Date;
    if (shouldRunToday) {
      nextRunAt = advanceNextRun(new Date(), frequency, intervalValue, request.daysOfWeek);
    } else {
      nextRunAt = calculateInitialNextRunAt(
        request.startDate,
        frequency,
        intervalValue,
        request.daysOfWeek
      );
    }

    const dbTxType = request.transactionType === "income" ? "Income" : "Expense";
    const trimmedDesc = request.description?.trim() || null;

    const created = await db.transaction(async (tx) => {
      const [item] = await tx
        .insert(recurringTransactions)
        .values({
          userId,
          transactionType: dbTxType,
          amount: amount.toFixed(2),
          description: trimmedDesc,
          categoryId: request.categoryId ?? null,
          frequency: toDbFrequency(frequency),
          intervalValue,
          startDate: request.startDate,
          endDate: request.endDate ?? null,
          nextRunAt,
          isActive: true,
          isDeleted: false,
          createdAt: new Date(),
          daysOfWeek: daysOfWeekStr,
        })
        .returning();

      // Insert tags
      if (request.tagIds && request.tagIds.length > 0) {
        const distinctTagIds = Array.from(new Set(request.tagIds));
        await tx.insert(recurringTransactionTags).values(
          distinctTagIds.map((tagId) => ({
            recurringTransactionId: item.recurringTransactionId,
            tagId,
          }))
        );
      }

      // If should run today, create the initial transaction
      if (shouldRunToday) {
        const [initialTx] = await tx
          .insert(transactions)
          .values({
            userId,
            transactionType: dbTxType,
            amount: amount.toFixed(2),
            currencyCode: "THB",
            transactionDate: new Date(),
            description: trimmedDesc,
            categoryId: request.categoryId ?? null,
            sourceType: "Recurring",
            status: "Confirmed",
            recurringTransactionId: item.recurringTransactionId,
            isDeleted: false,
            createdAt: new Date(),
          })
          .returning();

        if (request.tagIds && request.tagIds.length > 0) {
          const distinctTagIds = Array.from(new Set(request.tagIds));
          await tx.insert(transactionTags).values(
            distinctTagIds.map((tagId) => ({
              transactionId: initialTx.transactionId,
              tagId,
            }))
          );
        }
      }

      return item;
    });

    await logAudit(
      userId,
      "Create",
      "RecurringTransactions",
      created.recurringTransactionId.toString(),
      {
        transactionType: dbTxType,
        amount: created.amount,
        frequency: created.frequency,
        intervalValue: created.intervalValue,
        startDate: created.startDate,
        endDate: created.endDate,
      }
    );

    const fresh = await this.getById(created.recurringTransactionId, userId);
    return fresh!;
  }

  /**
   * Update recurring transaction
   */
  static async update(
    id: number,
    userId: number,
    request: UpdateRecurringTransactionRequest
  ): Promise<RecurringTransactionResponse | null> {
    const amount = Number(request.amount);
    if (!amount || amount <= 0 || Number.isNaN(amount)) {
      throw new ValidationErrorAppError("จำนวนเงินต้องมากกว่า 0", [
        { field: "amount", message: "จำนวนเงินต้องมากกว่า 0" },
      ]);
    }

    if (!request.startDate) {
      throw new ValidationErrorAppError("ต้องระบุวันที่เริ่ม", [
        { field: "startDate", message: "ต้องระบุวันที่เริ่ม" },
      ]);
    }

    if (request.endDate && request.endDate < request.startDate) {
      throw new ValidationErrorAppError("วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่ม", [
        { field: "endDate", message: "วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่ม" },
      ]);
    }

    const frequency = normalizeFrequency(request.frequency);
    if (frequency === "custom") {
      if (!request.daysOfWeek || request.daysOfWeek.length === 0) {
        throw new ValidationErrorAppError("กรุณาเลือกอย่างน้อย 1 วันสำหรับความถี่แบบกำหนดเอง", [
          { field: "daysOfWeek", message: "กรุณาเลือกอย่างน้อย 1 วันสำหรับความถี่แบบกำหนดเอง" },
        ]);
      }
      if (request.daysOfWeek.some((d) => d < 0 || d > 6)) {
        throw new ValidationErrorAppError("วันที่เลือกต้องอยู่ในช่วงวันอาทิตย์ (0) ถึงวันเสาร์ (6)", [
          { field: "daysOfWeek", message: "วันที่เลือกต้องอยู่ในช่วงวันอาทิตย์ (0) ถึงวันเสาร์ (6)" },
        ]);
      }
    }

    const [existing] = await db
      .select()
      .from(recurringTransactions)
      .where(
        and(
          eq(recurringTransactions.recurringTransactionId, id),
          eq(recurringTransactions.userId, userId),
          eq(recurringTransactions.isDeleted, false)
        )
      )
      .limit(1);

    if (!existing) return null;

    const intervalValue = Math.max(1, request.intervalValue ?? existing.intervalValue);
    const daysOfWeekStr = request.daysOfWeek ? request.daysOfWeek.join(",") : null;
    const dbTxType = request.transactionType === "income" ? "Income" : "Expense";
    const trimmedDesc = request.description?.trim() || null;

    const { todayDateStr, todayDayOfWeek } = getBangkokToday();
    const isWithinEnd = !request.endDate || todayDateStr <= request.endDate;

    let resolvedIsActive: boolean;
    if (request.isActive !== undefined) {
      resolvedIsActive = isWithinEnd ? request.isActive : false;
    } else {
      resolvedIsActive = isWithinEnd;
    }

    let shouldRunToday = false;
    if (resolvedIsActive && request.startDate <= todayDateStr && isWithinEnd) {
      if (frequency === "custom") {
        shouldRunToday = !!request.daysOfWeek?.includes(todayDayOfWeek);
      } else if (frequency === "daily") {
        shouldRunToday = true;
      } else if (frequency === "weekly") {
        const startDay = new Date(`${request.startDate}T00:00:00.000Z`).getUTCDay();
        shouldRunToday = startDay === todayDayOfWeek;
      } else if (frequency === "monthly") {
        const startDom = new Date(`${request.startDate}T00:00:00.000Z`).getUTCDate();
        const nowDom = new Date(`${todayDateStr}T00:00:00.000Z`).getUTCDate();
        shouldRunToday = startDom === nowDom;
      } else {
        shouldRunToday = request.startDate === todayDateStr;
      }
    }

    let alreadyRunToday = false;
    if (shouldRunToday) {
      const [existingTxToday] = await db
        .select({ id: transactions.transactionId })
        .from(transactions)
        .where(
          and(
            eq(transactions.recurringTransactionId, id),
            eq(transactions.userId, userId),
            eq(transactions.isDeleted, false),
            sql`DATE(${transactions.transactionDate} AT TIME ZONE 'Asia/Bangkok') = ${todayDateStr}`
          )
        )
        .limit(1);

      if (existingTxToday) {
        alreadyRunToday = true;
      }
    }

    let nextRunAt: Date;
    if (shouldRunToday) {
      nextRunAt = advanceNextRun(new Date(), frequency, intervalValue, request.daysOfWeek);
    } else {
      const initial = calculateInitialNextRunAt(
        request.startDate,
        frequency,
        intervalValue,
        request.daysOfWeek
      );
      const now = new Date();
      const todayMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      let candidate = initial;
      while (candidate < todayMidnight) {
        candidate = advanceNextRun(candidate, frequency, intervalValue, request.daysOfWeek);
      }
      nextRunAt = candidate;
    }

    const finalIsActive = resolvedIsActive && (!request.endDate || nextRunAt.toISOString().slice(0, 10) <= request.endDate || (shouldRunToday && !alreadyRunToday));

    await db.transaction(async (tx) => {
      await tx
        .update(recurringTransactions)
        .set({
          transactionType: dbTxType,
          amount: amount.toFixed(2),
          description: trimmedDesc,
          categoryId: request.categoryId ?? null,
          frequency: toDbFrequency(frequency),
          intervalValue,
          startDate: request.startDate,
          endDate: request.endDate ?? null,
          nextRunAt,
          isActive: finalIsActive,
          daysOfWeek: daysOfWeekStr,
        })
        .where(eq(recurringTransactions.recurringTransactionId, id));

      // Replace tags
      await tx
        .delete(recurringTransactionTags)
        .where(eq(recurringTransactionTags.recurringTransactionId, id));

      if (request.tagIds && request.tagIds.length > 0) {
        const distinctTagIds = Array.from(new Set(request.tagIds));
        await tx.insert(recurringTransactionTags).values(
          distinctTagIds.map((tagId) => ({
            recurringTransactionId: id,
            tagId,
          }))
        );
      }

      // If should run today and hasn't run yet, create today's transaction immediately!
      if (shouldRunToday && !alreadyRunToday) {
        const [settings] = await tx
          .select({ currencyCode: userSettings.currencyCode })
          .from(userSettings)
          .where(eq(userSettings.userId, userId))
          .limit(1);

        const currencyCode = settings?.currencyCode || "THB";

        const [createdTx] = await tx
          .insert(transactions)
          .values({
            userId,
            transactionType: dbTxType,
            amount: amount.toFixed(2),
            currencyCode,
            transactionDate: new Date(),
            description: trimmedDesc || "ธุรกรรมตามรอบบิลอัตโนมัติ",
            categoryId: request.categoryId ?? null,
            sourceType: "Recurring",
            status: "Confirmed",
            recurringTransactionId: id,
            isDeleted: false,
            createdAt: new Date(),
          })
          .returning();

        if (request.tagIds && request.tagIds.length > 0) {
          const distinctTagIds = Array.from(new Set(request.tagIds));
          await tx.insert(transactionTags).values(
            distinctTagIds.map((tagId) => ({
              transactionId: createdTx.transactionId,
              tagId,
            }))
          );
        }

        try {
          NotificationService.sendRefreshHint(userId, {
            entityType: "transaction",
            hint: "recurring-executed",
            timestamp: new Date().toISOString(),
          });
        } catch {}
      }
    });

    await logAudit(userId, "Update", "RecurringTransactions", id.toString(), {
      transactionType: dbTxType,
      amount: amount.toFixed(2),
      frequency,
      intervalValue,
      isActive: finalIsActive,
      executedToday: shouldRunToday && !alreadyRunToday,
    });

    const fresh = await this.getById(id, userId);
    return fresh;
  }

  /**
   * Toggle active state (Pause / Resume)
   */
  static async toggleActive(
    id: number,
    userId: number
  ): Promise<RecurringTransactionResponse | null> {
    const existing = await this.getById(id, userId);
    if (!existing) return null;

    const { todayDateStr, todayDayOfWeek } = getBangkokToday();
    const willBeActive = !existing.isActive;

    if (willBeActive && existing.endDate && existing.endDate < todayDateStr) {
      throw new ValidationErrorAppError(
        "ไม่สามารถเปิดใช้งานได้เนื่องจากวันสิ้นสุดผ่านมาแล้ว กรุณาแก้ไขวันสิ้นสุดใหม่"
      );
    }

    const frequency = normalizeFrequency(existing.frequency);
    const intervalValue = existing.intervalValue;
    const daysOfWeek = existing.daysOfWeek;

    let shouldRunToday = false;
    const isWithinEnd = !existing.endDate || todayDateStr <= existing.endDate;

    if (willBeActive && existing.startDate <= todayDateStr && isWithinEnd) {
      if (frequency === "custom") {
        shouldRunToday = !!daysOfWeek?.includes(todayDayOfWeek);
      } else if (frequency === "daily") {
        shouldRunToday = true;
      } else if (frequency === "weekly") {
        const startDay = new Date(`${existing.startDate}T00:00:00.000Z`).getUTCDay();
        shouldRunToday = startDay === todayDayOfWeek;
      } else if (frequency === "monthly") {
        const startDom = new Date(`${existing.startDate}T00:00:00.000Z`).getUTCDate();
        const nowDom = new Date(`${todayDateStr}T00:00:00.000Z`).getUTCDate();
        shouldRunToday = startDom === nowDom;
      } else {
        shouldRunToday = existing.startDate === todayDateStr;
      }
    }

    let alreadyRunToday = false;
    if (shouldRunToday) {
      const [existingTxToday] = await db
        .select({ id: transactions.transactionId })
        .from(transactions)
        .where(
          and(
            eq(transactions.recurringTransactionId, id),
            eq(transactions.userId, userId),
            eq(transactions.isDeleted, false),
            sql`DATE(${transactions.transactionDate} AT TIME ZONE 'Asia/Bangkok') = ${todayDateStr}`
          )
        )
        .limit(1);

      if (existingTxToday) {
        alreadyRunToday = true;
      }
    }

    let nextRunAt = new Date(existing.nextRunAt);
    if (willBeActive) {
      if (shouldRunToday) {
        nextRunAt = advanceNextRun(new Date(), frequency, intervalValue, daysOfWeek);
      } else {
        const now = new Date();
        const todayMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        while (nextRunAt < todayMidnight) {
          nextRunAt = advanceNextRun(nextRunAt, frequency, intervalValue, daysOfWeek);
        }
      }
    }

    await db.transaction(async (tx) => {
      await tx
        .update(recurringTransactions)
        .set({
          isActive: willBeActive,
          nextRunAt,
        })
        .where(eq(recurringTransactions.recurringTransactionId, id));

      if (shouldRunToday && !alreadyRunToday) {
        const [settings] = await tx
          .select({ currencyCode: userSettings.currencyCode })
          .from(userSettings)
          .where(eq(userSettings.userId, userId))
          .limit(1);

        const currencyCode = settings?.currencyCode || "THB";
        const dbTxType = existing.transactionType === "income" ? "Income" : "Expense";

        const [createdTx] = await tx
          .insert(transactions)
          .values({
            userId,
            transactionType: dbTxType,
            amount: existing.amount.toFixed(2),
            currencyCode,
            transactionDate: new Date(),
            description: existing.description || "ธุรกรรมตามรอบบิลอัตโนมัติ",
            categoryId: existing.categoryId,
            sourceType: "Recurring",
            status: "Confirmed",
            recurringTransactionId: id,
            isDeleted: false,
            createdAt: new Date(),
          })
          .returning();

        if (existing.tags && existing.tags.length > 0) {
          await tx.insert(transactionTags).values(
            existing.tags.map((t) => ({
              transactionId: createdTx.transactionId,
              tagId: t.tagId,
            }))
          );
        }

        try {
          NotificationService.sendRefreshHint(userId, {
            entityType: "transaction",
            hint: "recurring-executed",
            timestamp: new Date().toISOString(),
          });
        } catch {}
      }
    });

    await logAudit(userId, "Update", "RecurringTransactions", id.toString(), {
      action: willBeActive ? "Resume" : "Pause",
      isActive: willBeActive,
    });

    return await this.getById(id, userId);
  }

  /**
   * Delete recurring transaction (soft delete)
   */
  static async delete(id: number, userId: number): Promise<boolean> {
    const [existing] = await db
      .select()
      .from(recurringTransactions)
      .where(
        and(
          eq(recurringTransactions.recurringTransactionId, id),
          eq(recurringTransactions.userId, userId),
          eq(recurringTransactions.isDeleted, false)
        )
      )
      .limit(1);

    if (!existing) return false;

    await db
      .update(recurringTransactions)
      .set({ isDeleted: true })
      .where(eq(recurringTransactions.recurringTransactionId, id));

    await logAudit(userId, "Delete", "RecurringTransactions", id.toString(), {
      description: existing.description,
      amount: existing.amount,
      isDeleted: true,
    });

    return true;
  }

  /**
   * Process all due recurring transactions (called by Vercel Cron or background runner)
   */
  static async processDue(nowUtc?: Date): Promise<{
    processedCount: number;
    createdTransactionsCount: number;
    timestamp: string;
  }> {
    const now = nowUtc || new Date();

    const dueItems = await db
      .select()
      .from(recurringTransactions)
      .where(
        and(
          eq(recurringTransactions.isActive, true),
          eq(recurringTransactions.isDeleted, false),
          lte(recurringTransactions.nextRunAt, now)
        )
      );

    let createdCount = 0;

    for (const item of dueItems) {
      // Check if end date has passed
      if (item.endDate && item.nextRunAt.toISOString().slice(0, 10) > item.endDate) {
        await db
          .update(recurringTransactions)
          .set({ isActive: false })
          .where(
            eq(
              recurringTransactions.recurringTransactionId,
              item.recurringTransactionId
            )
          );
        continue;
      }

      // Query user currency
      const [settings] = await db
        .select({ currencyCode: userSettings.currencyCode })
        .from(userSettings)
        .where(eq(userSettings.userId, item.userId))
        .limit(1);

      const currencyCode = settings?.currencyCode || "THB";
      const txType = normalizeTransactionType(item.transactionType);
      const dbTxType = txType === "income" ? "Income" : "Expense";

      const [createdTx] = await db
        .insert(transactions)
        .values({
          userId: item.userId,
          amount: item.amount,
          currencyCode,
          transactionType: dbTxType,
          transactionDate: item.nextRunAt,
          description: item.description || "ธุรกรรมตามรอบบิลอัตโนมัติ",
          categoryId: item.categoryId,
          sourceType: "Recurring",
          status: "Confirmed",
          recurringTransactionId: item.recurringTransactionId,
          createdAt: now,
          isDeleted: false,
        })
        .returning();

      createdCount++;

      // Copy tags
      const rTags = await db
        .select({ tagId: recurringTransactionTags.tagId })
        .from(recurringTransactionTags)
        .where(
          eq(
            recurringTransactionTags.recurringTransactionId,
            item.recurringTransactionId
          )
        );

      for (const rt of rTags) {
        await db
          .insert(transactionTags)
          .values({
            transactionId: createdTx.transactionId,
            tagId: rt.tagId,
          })
          .onConflictDoNothing();
      }

      // Advance nextRunAt
      const freq = normalizeFrequency(item.frequency);
      const daysOfWeek = parseDaysOfWeek(item.daysOfWeek);
      const nextRun = advanceNextRun(item.nextRunAt, freq, item.intervalValue, daysOfWeek);
      const isStillActive =
        !item.endDate || nextRun.toISOString().slice(0, 10) <= item.endDate;

      await db
        .update(recurringTransactions)
        .set({
          nextRunAt: nextRun,
          isActive: isStillActive,
        })
        .where(
          eq(
            recurringTransactions.recurringTransactionId,
            item.recurringTransactionId
          )
        );

      // Send real-time refresh hint to client
      try {
        NotificationService.sendRefreshHint(item.userId, {
          entityType: "transaction",
          hint: "recurring-executed",
          timestamp: now.toISOString(),
        });
      } catch {}
    }

    return {
      processedCount: dueItems.length,
      createdTransactionsCount: createdCount,
      timestamp: now.toISOString(),
    };
  }
}
