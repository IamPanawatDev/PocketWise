import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/server/db";
import {
  recurringTransactionTags,
  tags,
  transactionTags,
} from "@/lib/server/db/schema";
import {
  AppError,
  ConflictError,
  ValidationErrorAppError,
} from "@/lib/server/api-error";
import { logAudit } from "@/lib/server/audit";

export interface TagResponse {
  tagId: number;
  tagName: string;
  color: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface CreateTagRequest {
  tagName: string;
  color?: string | null;
}

export interface UpdateTagRequest {
  tagName: string;
  color?: string | null;
}

export interface ReorderTagsRequest {
  items: { tagId: number; sortOrder: number }[];
}

export class TagService {
  private static readonly MAX_TAGS_PER_USER = 20;

  static async getAll(userId: number): Promise<TagResponse[]> {
    const list = await db
      .select()
      .from(tags)
      .where(eq(tags.userId, userId))
      .orderBy(asc(tags.sortOrder), asc(tags.tagName));

    return list.map((t) => ({
      tagId: t.tagId,
      tagName: t.tagName,
      color: t.color,
      sortOrder: t.sortOrder,
      createdAt: t.createdAt.toISOString(),
    }));
  }

  static async getById(id: number, userId: number): Promise<TagResponse | null> {
    const [tag] = await db
      .select()
      .from(tags)
      .where(and(eq(tags.tagId, id), eq(tags.userId, userId)))
      .limit(1);

    if (!tag) return null;

    return {
      tagId: tag.tagId,
      tagName: tag.tagName,
      color: tag.color,
      sortOrder: tag.sortOrder,
      createdAt: tag.createdAt.toISOString(),
    };
  }

  static async create(userId: number, request: CreateTagRequest): Promise<TagResponse> {
    const trimmedName = (request.tagName || "").trim();
    if (!trimmedName) {
      throw new ValidationErrorAppError("ชื่อแท็กต้องไม่ว่างเปล่า", [
        { field: "tagName", message: "ชื่อแท็กต้องไม่ว่างเปล่า" },
      ]);
    }

    if (trimmedName.length > 50) {
      throw new ValidationErrorAppError("ชื่อแท็กต้องไม่เกิน 50 ตัวอักษร", [
        { field: "tagName", message: "ชื่อแท็กต้องไม่เกิน 50 ตัวอักษร" },
      ]);
    }

    // Check max tags per user limit
    const existingTags = await db
      .select({ tagId: tags.tagId })
      .from(tags)
      .where(eq(tags.userId, userId));

    if (existingTags.length >= TagService.MAX_TAGS_PER_USER) {
      throw new AppError(
        "TAG_LIMIT_REACHED",
        `สร้างแท็กได้สูงสุด ${TagService.MAX_TAGS_PER_USER} รายการ`,
        400
      );
    }

    // Check duplicate name
    const [duplicate] = await db
      .select({ tagId: tags.tagId })
      .from(tags)
      .where(
        and(
          eq(tags.userId, userId),
          sql`LOWER(${tags.tagName}) = LOWER(${trimmedName})`
        )
      )
      .limit(1);

    if (duplicate) {
      throw new ConflictError("มีแท็กชื่อนี้อยู่แล้ว");
    }

    const [created] = await db
      .insert(tags)
      .values({
        userId,
        tagName: trimmedName,
        color: request.color ?? null,
        sortOrder: 0,
        createdAt: new Date(),
      })
      .returning();

    await logAudit(userId, "Create", "Tags", created.tagId.toString(), {
      tagName: created.tagName,
      color: created.color,
    });

    return {
      tagId: created.tagId,
      tagName: created.tagName,
      color: created.color,
      sortOrder: created.sortOrder,
      createdAt: created.createdAt.toISOString(),
    };
  }

  static async update(
    id: number,
    userId: number,
    request: UpdateTagRequest
  ): Promise<TagResponse | null> {
    const trimmedName = (request.tagName || "").trim();
    if (!trimmedName) {
      throw new ValidationErrorAppError("ชื่อแท็กต้องไม่ว่างเปล่า", [
        { field: "tagName", message: "ชื่อแท็กต้องไม่ว่างเปล่า" },
      ]);
    }

    if (trimmedName.length > 50) {
      throw new ValidationErrorAppError("ชื่อแท็กต้องไม่เกิน 50 ตัวอักษร", [
        { field: "tagName", message: "ชื่อแท็กต้องไม่เกิน 50 ตัวอักษร" },
      ]);
    }

    const [existing] = await db
      .select()
      .from(tags)
      .where(and(eq(tags.tagId, id), eq(tags.userId, userId)))
      .limit(1);

    if (!existing) return null;

    // Check duplicate name
    const [duplicate] = await db
      .select({ tagId: tags.tagId })
      .from(tags)
      .where(
        and(
          eq(tags.userId, userId),
          sql`LOWER(${tags.tagName}) = LOWER(${trimmedName})`,
          sql`${tags.tagId} != ${id}`
        )
      )
      .limit(1);

    if (duplicate) {
      throw new ConflictError("มีแท็กชื่อนี้อยู่แล้ว");
    }

    const beforeState = {
      tagName: existing.tagName,
      color: existing.color,
    };

    const [updated] = await db
      .update(tags)
      .set({
        tagName: trimmedName,
        color: request.color ?? null,
      })
      .where(eq(tags.tagId, id))
      .returning();

    await logAudit(userId, "Update", "Tags", id.toString(), {
      before: beforeState,
      after: {
        tagName: updated.tagName,
        color: updated.color,
      },
    });

    return {
      tagId: updated.tagId,
      tagName: updated.tagName,
      color: updated.color,
      sortOrder: updated.sortOrder,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  static async reorder(userId: number, request: ReorderTagsRequest): Promise<void> {
    if (!request?.items || !Array.isArray(request.items)) return;

    for (const item of request.items) {
      await db
        .update(tags)
        .set({ sortOrder: item.sortOrder })
        .where(and(eq(tags.tagId, item.tagId), eq(tags.userId, userId)));
    }

    await logAudit(userId, "Update", "Tags", "reorder", { count: request.items.length });
  }

  static async delete(id: number, userId: number): Promise<boolean> {
    const [existing] = await db
      .select()
      .from(tags)
      .where(and(eq(tags.tagId, id), eq(tags.userId, userId)))
      .limit(1);

    if (!existing) return false;

    // Clean up relations
    await db.delete(transactionTags).where(eq(transactionTags.tagId, id));
    await db.delete(recurringTransactionTags).where(eq(recurringTransactionTags.tagId, id));
    await db.delete(tags).where(eq(tags.tagId, id));

    await logAudit(userId, "Delete", "Tags", id.toString(), {
      tagName: existing.tagName,
    });

    return true;
  }
}
