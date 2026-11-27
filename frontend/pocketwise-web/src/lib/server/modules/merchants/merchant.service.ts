import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/server/db";
import { categories, merchants } from "@/lib/server/db/schema";
import {
  ConflictError,
  NotFoundError,
  ValidationErrorAppError,
} from "@/lib/server/api-error";
import { logAudit } from "@/lib/server/audit";

export interface MerchantResponse {
  merchantId: number;
  merchantName: string;
  defaultCategoryId: number | null;
  defaultCategoryName: string | null;
  bankOrProvider: string | null;
  isVerified: boolean;
  createdAt: string;
}

export interface CreateMerchantRequest {
  merchantName: string;
  defaultCategoryId?: number | null;
  bankOrProvider?: string | null;
}

export interface UpdateMerchantRequest extends CreateMerchantRequest {
  isVerified: boolean;
}

export class MerchantService {
  private static normalize(name: string): string {
    return (name || "").trim().toLowerCase();
  }

  private static async validateCategory(categoryId?: number | null): Promise<string | null> {
    if (!categoryId) return null;

    const [cat] = await db
      .select({ name: categories.categoryName })
      .from(categories)
      .where(eq(categories.categoryId, categoryId))
      .limit(1);

    if (!cat) {
      throw new NotFoundError("ไม่พบหมวดหมู่ที่ระบุ");
    }

    return cat.name;
  }

  static async getAll(): Promise<MerchantResponse[]> {
    const list = await db
      .select({
        merchant: merchants,
        defaultCategoryName: categories.categoryName,
      })
      .from(merchants)
      .leftJoin(categories, eq(merchants.defaultCategoryId, categories.categoryId))
      .orderBy(asc(merchants.merchantName));

    return list.map(({ merchant, defaultCategoryName }) => ({
      merchantId: merchant.merchantId,
      merchantName: merchant.merchantName,
      defaultCategoryId: merchant.defaultCategoryId,
      defaultCategoryName: defaultCategoryName ?? null,
      bankOrProvider: merchant.bankOrProvider,
      isVerified: merchant.isVerified,
      createdAt: merchant.createdAt.toISOString(),
    }));
  }

  static async getById(id: number): Promise<MerchantResponse | null> {
    const [item] = await db
      .select({
        merchant: merchants,
        defaultCategoryName: categories.categoryName,
      })
      .from(merchants)
      .leftJoin(categories, eq(merchants.defaultCategoryId, categories.categoryId))
      .where(eq(merchants.merchantId, id))
      .limit(1);

    if (!item) return null;

    const { merchant, defaultCategoryName } = item;
    return {
      merchantId: merchant.merchantId,
      merchantName: merchant.merchantName,
      defaultCategoryId: merchant.defaultCategoryId,
      defaultCategoryName: defaultCategoryName ?? null,
      bankOrProvider: merchant.bankOrProvider,
      isVerified: merchant.isVerified,
      createdAt: merchant.createdAt.toISOString(),
    };
  }

  static async create(
    actorUserId: number,
    request: CreateMerchantRequest
  ): Promise<MerchantResponse> {
    const trimmedName = (request.merchantName || "").trim();
    if (!trimmedName) {
      throw new ValidationErrorAppError("ชื่อร้านค้าต้องไม่ว่างเปล่า", [
        { field: "merchantName", message: "ชื่อร้านค้าต้องไม่ว่างเปล่า" },
      ]);
    }

    const defaultCategoryName = await this.validateCategory(request.defaultCategoryId);
    const normalized = this.normalize(trimmedName);

    const [existing] = await db
      .select({ id: merchants.merchantId })
      .from(merchants)
      .where(sql`LOWER(${merchants.normalizedName}) = LOWER(${normalized})`)
      .limit(1);

    if (existing) {
      throw new ConflictError("มีร้านค้าชื่อนี้อยู่แล้ว");
    }

    const [created] = await db
      .insert(merchants)
      .values({
        merchantName: trimmedName,
        normalizedName: normalized,
        defaultCategoryId: request.defaultCategoryId ?? null,
        bankOrProvider: request.bankOrProvider ?? null,
        isVerified: false,
        createdAt: new Date(),
      })
      .returning();

    await logAudit(
      actorUserId > 0 ? actorUserId : null,
      "Create",
      "Merchants",
      created.merchantId.toString(),
      {
        merchantName: created.merchantName,
        normalizedName: created.normalizedName,
        defaultCategoryId: created.defaultCategoryId,
        bankOrProvider: created.bankOrProvider,
      }
    );

    return {
      merchantId: created.merchantId,
      merchantName: created.merchantName,
      defaultCategoryId: created.defaultCategoryId,
      defaultCategoryName,
      bankOrProvider: created.bankOrProvider,
      isVerified: created.isVerified,
      createdAt: created.createdAt.toISOString(),
    };
  }

  static async update(
    id: number,
    actorUserId: number,
    request: UpdateMerchantRequest
  ): Promise<MerchantResponse | null> {
    const trimmedName = (request.merchantName || "").trim();
    if (!trimmedName) {
      throw new ValidationErrorAppError("ชื่อร้านค้าต้องไม่ว่างเปล่า", [
        { field: "merchantName", message: "ชื่อร้านค้าต้องไม่ว่างเปล่า" },
      ]);
    }

    const [existing] = await db
      .select()
      .from(merchants)
      .where(eq(merchants.merchantId, id))
      .limit(1);

    if (!existing) return null;

    const defaultCategoryName = await this.validateCategory(request.defaultCategoryId);
    const normalized = this.normalize(trimmedName);

    const [duplicate] = await db
      .select({ id: merchants.merchantId })
      .from(merchants)
      .where(
        and(
          sql`LOWER(${merchants.normalizedName}) = LOWER(${normalized})`,
          sql`${merchants.merchantId} != ${id}`
        )
      )
      .limit(1);

    if (duplicate) {
      throw new ConflictError("มีร้านค้าชื่อนี้อยู่แล้ว");
    }

    const beforeState = {
      merchantName: existing.merchantName,
      normalizedName: existing.normalizedName,
      defaultCategoryId: existing.defaultCategoryId,
      bankOrProvider: existing.bankOrProvider,
      isVerified: existing.isVerified,
    };

    const [updated] = await db
      .update(merchants)
      .set({
        merchantName: trimmedName,
        normalizedName: normalized,
        defaultCategoryId: request.defaultCategoryId ?? null,
        bankOrProvider: request.bankOrProvider ?? null,
        isVerified: request.isVerified ?? existing.isVerified,
      })
      .where(eq(merchants.merchantId, id))
      .returning();

    await logAudit(
      actorUserId > 0 ? actorUserId : null,
      "Update",
      "Merchants",
      id.toString(),
      {
        before: beforeState,
        after: {
          merchantName: updated.merchantName,
          defaultCategoryId: updated.defaultCategoryId,
          bankOrProvider: updated.bankOrProvider,
          isVerified: updated.isVerified,
        },
      }
    );

    return {
      merchantId: updated.merchantId,
      merchantName: updated.merchantName,
      defaultCategoryId: updated.defaultCategoryId,
      defaultCategoryName,
      bankOrProvider: updated.bankOrProvider,
      isVerified: updated.isVerified,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  static async delete(id: number, actorUserId: number): Promise<boolean> {
    const [existing] = await db
      .select()
      .from(merchants)
      .where(eq(merchants.merchantId, id))
      .limit(1);

    if (!existing) return false;

    await db.delete(merchants).where(eq(merchants.merchantId, id));

    await logAudit(
      actorUserId > 0 ? actorUserId : null,
      "Delete",
      "Merchants",
      id.toString(),
      {
        merchantName: existing.merchantName,
      }
    );

    return true;
  }
}
