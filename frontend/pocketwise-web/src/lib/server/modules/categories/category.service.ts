import { and, asc, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "@/lib/server/db";
import {
  categories,
  categoryRules,
  merchants,
  transactions,
  userCategoryOrders,
} from "@/lib/server/db/schema";
import {
  AppError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationErrorAppError,
} from "@/lib/server/api-error";
import { logAudit } from "@/lib/server/audit";

export type CategoryType = "income" | "expense" | "both";
export type CategoryMatchType = "merchantName" | "description" | "bankReference";

export interface CategoryResponse {
  categoryId: number;
  categoryName: string;
  categoryType: CategoryType;
  icon: string | null;
  color: string | null;
  sortOrder: number;
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface CreateCategoryRequest {
  categoryName: string;
  categoryType: CategoryType;
  icon?: string | null;
  color?: string | null;
}

export interface UpdateCategoryRequest {
  categoryName: string;
  categoryType: CategoryType;
  icon?: string | null;
  color?: string | null;
  isActive: boolean;
}

export interface ReorderCategoriesRequest {
  items: { categoryId: number; sortOrder: number }[];
}

export interface CategoryRuleResponse {
  categoryRuleId: number;
  ruleName: string;
  matchType: CategoryMatchType;
  matchPattern: string;
  categoryId: number;
  categoryName: string | null;
  priority: number;
  isActive: boolean;
  isGlobal: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface CreateCategoryRuleRequest {
  ruleName: string;
  matchType: CategoryMatchType;
  matchPattern: string;
  categoryId: number;
  priority?: number;
}

export interface UpdateCategoryRuleRequest extends CreateCategoryRuleRequest {
  isActive: boolean;
}

export interface CategorySuggestionResponse {
  categoryId: number;
  categoryName: string | null;
  source: "category-rule" | "merchant";
}

function toDbCategoryType(type: string): string {
  const lower = (type || "").toLowerCase().trim();
  if (lower === "income") return "Income";
  if (lower === "both") return "Both";
  return "Expense";
}

function toResponseCategoryType(type: string): CategoryType {
  const lower = (type || "").toLowerCase().trim();
  if (lower === "income") return "income";
  if (lower === "both") return "both";
  return "expense";
}

function toDbMatchType(type: string): string {
  const lower = (type || "").toLowerCase().trim();
  if (lower === "merchantname" || lower === "merchant_name") return "MerchantName";
  if (lower === "bankreference" || lower === "bank_reference") return "BankReference";
  return "Description";
}

function toResponseMatchType(type: string): CategoryMatchType {
  const lower = (type || "").toLowerCase().trim();
  if (lower === "merchantname" || lower === "merchant_name") return "merchantName";
  if (lower === "bankreference" || lower === "bank_reference") return "bankReference";
  return "description";
}

export class CategoryService {
  // ==========================================
  // CATEGORIES
  // ==========================================

  static async getAll(userId: number): Promise<CategoryResponse[]> {
    const list = await db
      .select()
      .from(categories)
      .where(or(eq(categories.userId, userId), eq(categories.isSystem, true)));

    const orders = await db
      .select()
      .from(userCategoryOrders)
      .where(eq(userCategoryOrders.userId, userId));

    const orderMap = new Map<number, number>();
    for (const o of orders) {
      orderMap.set(o.categoryId, o.sortOrder);
    }

    if (orderMap.size > 0) {
      list.sort((a, b) => {
        const orderA = orderMap.has(a.categoryId)
          ? orderMap.get(a.categoryId)!
          : a.isSystem
          ? 1000 + a.sortOrder
          : 2000 + a.sortOrder;
        const orderB = orderMap.has(b.categoryId)
          ? orderMap.get(b.categoryId)!
          : b.isSystem
          ? 1000 + b.sortOrder
          : 2000 + b.sortOrder;

        if (orderA !== orderB) return orderA - orderB;
        return a.categoryName.localeCompare(b.categoryName);
      });
    } else {
      list.sort((a, b) => {
        const sysA = a.isSystem ? 0 : 1;
        const sysB = b.isSystem ? 0 : 1;
        if (sysA !== sysB) return sysA - sysB;
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        return a.categoryName.localeCompare(b.categoryName);
      });
    }

    return list.map((c) => ({
      categoryId: c.categoryId,
      categoryName: c.categoryName,
      categoryType: toResponseCategoryType(c.categoryType),
      icon: c.icon,
      color: c.color,
      sortOrder: c.sortOrder,
      isSystem: c.isSystem,
      isActive: c.isActive,
      createdAt: c.createdAt.toISOString(),
    }));
  }

  static async getById(id: number, userId: number): Promise<CategoryResponse | null> {
    const [cat] = await db
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.categoryId, id),
          or(eq(categories.userId, userId), eq(categories.isSystem, true))
        )
      )
      .limit(1);

    if (!cat) return null;

    return {
      categoryId: cat.categoryId,
      categoryName: cat.categoryName,
      categoryType: toResponseCategoryType(cat.categoryType),
      icon: cat.icon,
      color: cat.color,
      sortOrder: cat.sortOrder,
      isSystem: cat.isSystem,
      isActive: cat.isActive,
      createdAt: cat.createdAt.toISOString(),
    };
  }

  static async create(userId: number, request: CreateCategoryRequest): Promise<CategoryResponse> {
    const trimmedName = (request.categoryName || "").trim();
    if (!trimmedName) {
      throw new ValidationErrorAppError("ชื่อหมวดหมู่ต้องไม่ว่างเปล่า", [
        { field: "categoryName", message: "ชื่อหมวดหมู่ต้องไม่ว่างเปล่า" },
      ]);
    }

    // Check duplicate name
    const [existing] = await db
      .select({ id: categories.categoryId })
      .from(categories)
      .where(
        and(
          or(eq(categories.userId, userId), eq(categories.isSystem, true)),
          sql`LOWER(${categories.categoryName}) = LOWER(${trimmedName})`
        )
      )
      .limit(1);

    if (existing) {
      throw new ConflictError("มีหมวดหมู่ชื่อนี้อยู่แล้ว");
    }

    // Get max sortOrder of user's categories
    const userCats = await db
      .select({ sortOrder: categories.sortOrder })
      .from(categories)
      .where(and(eq(categories.userId, userId), eq(categories.isSystem, false)));

    const maxSort = userCats.reduce((max, c) => Math.max(max, c.sortOrder), 0);

    const [created] = await db
      .insert(categories)
      .values({
        userId,
        categoryName: trimmedName,
        categoryType: toDbCategoryType(request.categoryType),
        icon: request.icon ?? null,
        color: request.color ?? null,
        sortOrder: maxSort + 1,
        isSystem: false,
        isActive: true,
        createdAt: new Date(),
      })
      .returning();

    await logAudit(userId, "Create", "Categories", created.categoryId.toString(), {
      categoryName: created.categoryName,
      categoryType: created.categoryType,
      icon: created.icon,
      color: created.color,
    });

    return {
      categoryId: created.categoryId,
      categoryName: created.categoryName,
      categoryType: toResponseCategoryType(created.categoryType),
      icon: created.icon,
      color: created.color,
      sortOrder: created.sortOrder,
      isSystem: created.isSystem,
      isActive: created.isActive,
      createdAt: created.createdAt.toISOString(),
    };
  }

  static async update(
    id: number,
    userId: number,
    request: UpdateCategoryRequest
  ): Promise<CategoryResponse | null> {
    const trimmedName = (request.categoryName || "").trim();
    if (!trimmedName) {
      throw new ValidationErrorAppError("ชื่อหมวดหมู่ต้องไม่ว่างเปล่า", [
        { field: "categoryName", message: "ชื่อหมวดหมู่ต้องไม่ว่างเปล่า" },
      ]);
    }

    const [entity] = await db
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.categoryId, id),
          or(eq(categories.userId, userId), eq(categories.isSystem, true))
        )
      )
      .limit(1);

    if (!entity) return null;

    if (entity.isSystem) {
      throw new ForbiddenError("ไม่สามารถแก้ไขหมวดหมู่ระบบได้");
    }

    // Check duplicate name
    const [duplicate] = await db
      .select({ id: categories.categoryId })
      .from(categories)
      .where(
        and(
          or(eq(categories.userId, userId), eq(categories.isSystem, true)),
          sql`LOWER(${categories.categoryName}) = LOWER(${trimmedName})`,
          sql`${categories.categoryId} != ${id}`
        )
      )
      .limit(1);

    if (duplicate) {
      throw new ConflictError("มีหมวดหมู่ชื่อนี้อยู่แล้ว");
    }

    const beforeState = {
      categoryName: entity.categoryName,
      categoryType: entity.categoryType,
      icon: entity.icon,
      color: entity.color,
      isActive: entity.isActive,
    };

    const [updated] = await db
      .update(categories)
      .set({
        categoryName: trimmedName,
        categoryType: toDbCategoryType(request.categoryType),
        icon: request.icon ?? null,
        color: request.color ?? null,
        isActive: request.isActive ?? entity.isActive,
      })
      .where(eq(categories.categoryId, id))
      .returning();

    await logAudit(userId, "Update", "Categories", id.toString(), {
      before: beforeState,
      after: {
        categoryName: updated.categoryName,
        categoryType: updated.categoryType,
        icon: updated.icon,
        color: updated.color,
        isActive: updated.isActive,
      },
    });

    return {
      categoryId: updated.categoryId,
      categoryName: updated.categoryName,
      categoryType: toResponseCategoryType(updated.categoryType),
      icon: updated.icon,
      color: updated.color,
      sortOrder: updated.sortOrder,
      isSystem: updated.isSystem,
      isActive: updated.isActive,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  static async reorder(userId: number, request: ReorderCategoriesRequest): Promise<void> {
    if (!request?.items || !Array.isArray(request.items)) return;

    for (const item of request.items) {
      await db
        .insert(userCategoryOrders)
        .values({
          userId,
          categoryId: item.categoryId,
          sortOrder: item.sortOrder,
          createdAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [userCategoryOrders.userId, userCategoryOrders.categoryId],
          set: { sortOrder: item.sortOrder },
        });

      // Update sort order on user's custom category as well
      await db
        .update(categories)
        .set({ sortOrder: item.sortOrder })
        .where(
          and(
            eq(categories.categoryId, item.categoryId),
            eq(categories.userId, userId),
            eq(categories.isSystem, false)
          )
        );
    }

    await logAudit(userId, "Update", "Categories", "reorder", { count: request.items.length });
  }

  static async delete(id: number, userId: number): Promise<boolean> {
    const [entity] = await db
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.categoryId, id),
          or(eq(categories.userId, userId), eq(categories.isSystem, true))
        )
      )
      .limit(1);

    if (!entity) return false;

    if (entity.isSystem) {
      throw new ForbiddenError("ไม่สามารถลบหมวดหมู่ระบบได้");
    }

    // Check if category is used in active (non-deleted) transactions
    const [usedInTx] = await db
      .select({ id: transactions.transactionId })
      .from(transactions)
      .where(and(eq(transactions.categoryId, id), eq(transactions.isDeleted, false)))
      .limit(1);

    if (usedInTx) {
      throw new ConflictError("ไม่สามารถลบหมวดหมู่ที่มีรายการใช้งานอยู่ได้");
    }

    await db.delete(userCategoryOrders).where(eq(userCategoryOrders.categoryId, id));
    await db.delete(categories).where(eq(categories.categoryId, id));

    await logAudit(userId, "Delete", "Categories", id.toString(), {
      categoryName: entity.categoryName,
      categoryType: entity.categoryType,
    });

    return true;
  }

  // ==========================================
  // CATEGORY RULES
  // ==========================================

  static async getAllRules(userId: number): Promise<CategoryRuleResponse[]> {
    const rules = await db
      .select({
        rule: categoryRules,
        categoryName: categories.categoryName,
      })
      .from(categoryRules)
      .leftJoin(categories, eq(categoryRules.categoryId, categories.categoryId))
      .where(or(eq(categoryRules.userId, userId), isNull(categoryRules.userId)))
      .orderBy(asc(categoryRules.priority), asc(categoryRules.ruleName));

    return rules.map(({ rule, categoryName }) => ({
      categoryRuleId: rule.categoryRuleId,
      ruleName: rule.ruleName,
      matchType: toResponseMatchType(rule.matchType),
      matchPattern: rule.matchPattern,
      categoryId: rule.categoryId,
      categoryName: categoryName ?? null,
      priority: rule.priority,
      isActive: rule.isActive,
      isGlobal: rule.userId === null,
      createdAt: rule.createdAt.toISOString(),
      updatedAt: rule.updatedAt ? rule.updatedAt.toISOString() : null,
    }));
  }

  static async getRuleById(id: number, userId: number): Promise<CategoryRuleResponse | null> {
    const [item] = await db
      .select({
        rule: categoryRules,
        categoryName: categories.categoryName,
      })
      .from(categoryRules)
      .leftJoin(categories, eq(categoryRules.categoryId, categories.categoryId))
      .where(
        and(
          eq(categoryRules.categoryRuleId, id),
          or(eq(categoryRules.userId, userId), isNull(categoryRules.userId))
        )
      )
      .limit(1);

    if (!item) return null;

    const { rule, categoryName } = item;
    return {
      categoryRuleId: rule.categoryRuleId,
      ruleName: rule.ruleName,
      matchType: toResponseMatchType(rule.matchType),
      matchPattern: rule.matchPattern,
      categoryId: rule.categoryId,
      categoryName: categoryName ?? null,
      priority: rule.priority,
      isActive: rule.isActive,
      isGlobal: rule.userId === null,
      createdAt: rule.createdAt.toISOString(),
      updatedAt: rule.updatedAt ? rule.updatedAt.toISOString() : null,
    };
  }

  static async createRule(
    userId: number,
    request: CreateCategoryRuleRequest
  ): Promise<CategoryRuleResponse> {
    const trimmedName = (request.ruleName || "").trim();
    const trimmedPattern = (request.matchPattern || "").trim();

    if (!trimmedName || !trimmedPattern) {
      const errors = [];
      if (!trimmedName) errors.push({ field: "ruleName", message: "ชื่อกฎต้องไม่ว่างเปล่า" });
      if (!trimmedPattern) errors.push({ field: "matchPattern", message: "รูปแบบการค้นหาต้องไม่ว่างเปล่า" });
      throw new ValidationErrorAppError("กรุณากรอกข้อมูลกฎให้ครบถ้วน", errors);
    }

    // Check category exists
    const [cat] = await db
      .select({ id: categories.categoryId, name: categories.categoryName })
      .from(categories)
      .where(
        and(
          eq(categories.categoryId, request.categoryId),
          or(eq(categories.userId, userId), isNull(categories.userId), eq(categories.isSystem, true))
        )
      )
      .limit(1);

    if (!cat) {
      throw new NotFoundError("ไม่พบหมวดหมู่ที่ระบุ");
    }

    const [created] = await db
      .insert(categoryRules)
      .values({
        userId,
        ruleName: trimmedName,
        matchType: toDbMatchType(request.matchType),
        matchPattern: trimmedPattern,
        categoryId: request.categoryId,
        priority: request.priority ?? 100,
        isActive: true,
        createdAt: new Date(),
      })
      .returning();

    await logAudit(userId, "Create", "CategoryRules", created.categoryRuleId.toString(), {
      ruleName: created.ruleName,
      matchType: created.matchType,
      matchPattern: created.matchPattern,
      categoryId: created.categoryId,
      priority: created.priority,
    });

    return {
      categoryRuleId: created.categoryRuleId,
      ruleName: created.ruleName,
      matchType: toResponseMatchType(created.matchType),
      matchPattern: created.matchPattern,
      categoryId: created.categoryId,
      categoryName: cat.name,
      priority: created.priority,
      isActive: created.isActive,
      isGlobal: false,
      createdAt: created.createdAt.toISOString(),
      updatedAt: null,
    };
  }

  static async updateRule(
    id: number,
    userId: number,
    request: UpdateCategoryRuleRequest
  ): Promise<CategoryRuleResponse | null> {
    const [existing] = await db
      .select()
      .from(categoryRules)
      .where(and(eq(categoryRules.categoryRuleId, id), eq(categoryRules.userId, userId)))
      .limit(1);

    if (!existing) return null;

    const trimmedName = (request.ruleName || "").trim();
    const trimmedPattern = (request.matchPattern || "").trim();

    if (!trimmedName || !trimmedPattern) {
      const errors = [];
      if (!trimmedName) errors.push({ field: "ruleName", message: "ชื่อกฎต้องไม่ว่างเปล่า" });
      if (!trimmedPattern) errors.push({ field: "matchPattern", message: "รูปแบบการค้นหาต้องไม่ว่างเปล่า" });
      throw new ValidationErrorAppError("กรุณากรอกข้อมูลกฎให้ครบถ้วน", errors);
    }

    // Check category exists
    const [cat] = await db
      .select({ id: categories.categoryId, name: categories.categoryName })
      .from(categories)
      .where(
        and(
          eq(categories.categoryId, request.categoryId),
          or(eq(categories.userId, userId), isNull(categories.userId), eq(categories.isSystem, true))
        )
      )
      .limit(1);

    if (!cat) {
      throw new NotFoundError("ไม่พบหมวดหมู่ที่ระบุ");
    }

    const beforeState = {
      ruleName: existing.ruleName,
      matchType: existing.matchType,
      matchPattern: existing.matchPattern,
      categoryId: existing.categoryId,
      priority: existing.priority,
      isActive: existing.isActive,
    };

    const [updated] = await db
      .update(categoryRules)
      .set({
        ruleName: trimmedName,
        matchType: toDbMatchType(request.matchType),
        matchPattern: trimmedPattern,
        categoryId: request.categoryId,
        priority: request.priority ?? 100,
        isActive: request.isActive ?? existing.isActive,
        updatedAt: new Date(),
      })
      .where(eq(categoryRules.categoryRuleId, id))
      .returning();

    await logAudit(userId, "Update", "CategoryRules", id.toString(), {
      before: beforeState,
      after: {
        ruleName: updated.ruleName,
        matchType: updated.matchType,
        matchPattern: updated.matchPattern,
        categoryId: updated.categoryId,
        priority: updated.priority,
        isActive: updated.isActive,
      },
    });

    return {
      categoryRuleId: updated.categoryRuleId,
      ruleName: updated.ruleName,
      matchType: toResponseMatchType(updated.matchType),
      matchPattern: updated.matchPattern,
      categoryId: updated.categoryId,
      categoryName: cat.name,
      priority: updated.priority,
      isActive: updated.isActive,
      isGlobal: false,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt ? updated.updatedAt.toISOString() : null,
    };
  }

  static async deleteRule(id: number, userId: number): Promise<boolean> {
    const [existing] = await db
      .select()
      .from(categoryRules)
      .where(and(eq(categoryRules.categoryRuleId, id), eq(categoryRules.userId, userId)))
      .limit(1);

    if (!existing) return false;

    await db.delete(categoryRules).where(eq(categoryRules.categoryRuleId, id));

    await logAudit(userId, "Delete", "CategoryRules", id.toString(), {
      ruleName: existing.ruleName,
      matchPattern: existing.matchPattern,
    });

    return true;
  }

  static async suggestCategory(
    userId: number,
    description: string
  ): Promise<CategorySuggestionResponse | null> {
    const trimmed = (description || "").trim();
    if (!trimmed) return null;

    const normalized = trimmed.toLowerCase();

    // 1) CategoryRules (user + global)
    const rules = await db
      .select({
        rule: categoryRules,
        categoryName: categories.categoryName,
      })
      .from(categoryRules)
      .leftJoin(categories, eq(categoryRules.categoryId, categories.categoryId))
      .where(
        and(
          or(eq(categoryRules.userId, userId), isNull(categoryRules.userId)),
          eq(categoryRules.isActive, true)
        )
      );

    const matching = rules
      .filter((r) => {
        if (r.rule.matchType === "BankReference") return false;
        const pattern = (r.rule.matchPattern || "").trim().toLowerCase();
        return pattern.length > 0 && normalized.includes(pattern);
      })
      .sort((a, b) => {
        if (a.rule.priority !== b.rule.priority) return a.rule.priority - b.rule.priority;
        const aIsUser = a.rule.userId === userId ? 1 : 0;
        const bIsUser = b.rule.userId === userId ? 1 : 0;
        return bIsUser - aIsUser;
      });

    const firstRule = matching[0];
    if (firstRule) {
      return {
        categoryId: firstRule.rule.categoryId,
        categoryName: firstRule.categoryName ?? null,
        source: "category-rule",
      };
    }

    // 2) Merchants: match normalizedName in description -> defaultCategoryId
    const allMerchants = await db
      .select({
        merchant: merchants,
        categoryName: categories.categoryName,
      })
      .from(merchants)
      .leftJoin(categories, eq(merchants.defaultCategoryId, categories.categoryId));

    const sortedMerchants = allMerchants
      .filter((m) => m.merchant.defaultCategoryId !== null && m.merchant.normalizedName)
      .sort((a, b) => (b.merchant.normalizedName?.length ?? 0) - (a.merchant.normalizedName?.length ?? 0));

    for (const m of sortedMerchants) {
      const normMerchant = m.merchant.normalizedName.toLowerCase();
      if (normalized.includes(normMerchant)) {
        return {
          categoryId: m.merchant.defaultCategoryId!,
          categoryName: m.categoryName ?? null,
          source: "merchant",
        };
      }
    }

    return null;
  }

  static async learnFromManual(
    userId: number,
    description: string,
    categoryId: number
  ): Promise<void> {
    const trimmed = (description || "").trim();
    if (!trimmed) return;

    // Check existing rule for user with same pattern
    const [existing] = await db
      .select()
      .from(categoryRules)
      .where(
        and(
          eq(categoryRules.userId, userId),
          eq(categoryRules.matchType, "Description"),
          sql`LOWER(${categoryRules.matchPattern}) = LOWER(${trimmed})`
        )
      )
      .limit(1);

    if (existing) {
      if (existing.ruleName.startsWith("เรียนรู้: ") && existing.categoryId !== categoryId) {
        await db
          .update(categoryRules)
          .set({ categoryId, updatedAt: new Date() })
          .where(eq(categoryRules.categoryRuleId, existing.categoryRuleId));
      }
      return;
    }

    const ruleName = `เรียนรู้: ${trimmed}`.slice(0, 150);
    const pattern = trimmed.slice(0, 300);

    await db.insert(categoryRules).values({
      userId,
      ruleName,
      matchType: "Description",
      matchPattern: pattern,
      categoryId,
      priority: 100,
      isActive: true,
      createdAt: new Date(),
    });
  }
}
