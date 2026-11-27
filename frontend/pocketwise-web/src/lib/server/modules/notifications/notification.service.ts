import { eq, and, sql, desc, isNull, ne } from "drizzle-orm";
import { db } from "../../db";
import { notifications } from "../../db/schema";
import { NotFoundError } from "../../api-error";
import { notificationStreamManager } from "./notification-stream";
import type {
  NotificationResponse,
  NotificationUnreadCountResponse,
  BatchReadNotificationsResponse,
  RefreshHintPayload,
} from "@/types/notification.types";
import type { PagedResult } from "@/types/api.types";

export interface CreateNotificationDto {
  title: string;
  message: string;
  notificationType: string;
  channel?: "inApp" | "email" | string;
  relatedEntityType?: string | null;
  relatedEntityId?: number | null;
}

export class NotificationService {
  /**
   * Get paged notifications for user
   */
  public static async getNotifications(
    userId: number,
    page = 1,
    pageSize = 20,
    unreadOnly = false,
  ): Promise<PagedResult<NotificationResponse>> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, pageSize));
    const offset = (safePage - 1) * safeLimit;

    const conditions = [eq(notifications.userId, userId)];
    if (unreadOnly) {
      conditions.push(isNull(notifications.readAt));
      conditions.push(ne(sql`LOWER(${notifications.status})`, "read"));
    }

    const whereClause = and(...conditions);

    const [countRes] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(whereClause);

    const totalItems = countRes?.count ?? 0;
    const totalPages = Math.ceil(totalItems / safeLimit);

    const rows = await db
      .select()
      .from(notifications)
      .where(whereClause)
      .orderBy(desc(notifications.createdAt))
      .limit(safeLimit)
      .offset(offset);

    const items = rows.map(this.mapToResponse);

    return {
      items,
      page: safePage,
      pageSize: safeLimit,
      totalItems,
      totalPages,
    };
  }

  /**
   * Get unread notification count
   */
  public static async getUnreadCount(
    userId: number,
  ): Promise<NotificationUnreadCountResponse> {
    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          isNull(notifications.readAt),
          ne(sql`LOWER(${notifications.status})`, "read"),
        ),
      );

    return { unreadCount: result?.count ?? 0 };
  }

  /**
   * Mark single notification as read
   */
  public static async markAsRead(
    userId: number,
    notificationId: number,
  ): Promise<NotificationResponse> {
    const [existing] = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.notificationId, notificationId),
          eq(notifications.userId, userId),
        ),
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundError("ไม่พบการแจ้งเตือนที่ระบุ");
    }

    const now = new Date();
    const [updated] = await db
      .update(notifications)
      .set({
        status: "read",
        readAt: now,
      })
      .where(eq(notifications.notificationId, notificationId))
      .returning();

    return this.mapToResponse(updated);
  }

  /**
   * Mark all unread notifications as read
   */
  public static async markAllAsRead(
    userId: number,
  ): Promise<BatchReadNotificationsResponse> {
    const now = new Date();
    const updatedRows = await db
      .update(notifications)
      .set({
        status: "read",
        readAt: now,
      })
      .where(
        and(
          eq(notifications.userId, userId),
          isNull(notifications.readAt),
          ne(sql`LOWER(${notifications.status})`, "read"),
        ),
      )
      .returning({ id: notifications.notificationId });

    return { count: updatedRows.length };
  }

  /**
   * Create notification and stream via SSE to user in real-time
   */
  public static async createAndSend(
    userId: number,
    dto: CreateNotificationDto,
  ): Promise<NotificationResponse> {
    const now = new Date();
    const [created] = await db
      .insert(notifications)
      .values({
        userId,
        notificationType: dto.notificationType,
        title: dto.title,
        message: dto.message,
        channel: dto.channel || "inApp",
        status: "sent",
        relatedEntityType: dto.relatedEntityType || null,
        relatedEntityId: dto.relatedEntityId || null,
        sentAt: now,
        createdAt: now,
      })
      .returning();

    const response = this.mapToResponse(created);

    // Broadcast in real-time via SSE
    notificationStreamManager.sendNotification(userId, response);

    return response;
  }

  /**
   * Send real-time refresh hint to client queries
   */
  public static sendRefreshHint(userId: number, hint: RefreshHintPayload): void {
    notificationStreamManager.sendRefreshHint(userId, hint);
  }

  /**
   * Map database row to standard API Response
   */
  public static mapToResponse(
    n: typeof notifications.$inferSelect,
  ): NotificationResponse {
    const channelLower = (n.channel || "").toLowerCase();
    const statusLower = (n.status || "").toLowerCase();

    return {
      notificationId: n.notificationId,
      notificationType: n.notificationType,
      title: n.title,
      message: n.message,
      channel: channelLower === "inapp" ? "inApp" : channelLower,
      status: statusLower,
      relatedEntityType: n.relatedEntityType ?? null,
      relatedEntityId: n.relatedEntityId ?? null,
      sentAt: n.sentAt ? n.sentAt.toISOString() : null,
      readAt: n.readAt ? n.readAt.toISOString() : null,
      createdAt: n.createdAt.toISOString(),
    };
  }
}
