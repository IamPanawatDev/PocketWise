import { gatewayRegistry } from "../../gateway-registry";
import { getAuthenticatedUser } from "../../auth/current-user";
import { jsonSuccess } from "../../api-response";
import { ValidationErrorAppError } from "../../api-error";
import { NotificationService } from "./notification.service";

export function registerNotificationRoutes(): void {
  // 1. GET notifications
  gatewayRegistry.register("GET", "notifications", async (ctx) => {
    const { userId } = await getAuthenticatedUser(ctx);
    const page = parseInt(ctx.searchParams.get("page") || "1", 10) || 1;
    const pageSize = parseInt(ctx.searchParams.get("pageSize") || "20", 10) || 20;
    const unreadOnly = ctx.searchParams.get("unreadOnly") === "true";

    const result = await NotificationService.getNotifications(
      userId,
      page,
      pageSize,
      unreadOnly,
    );
    return jsonSuccess(result);
  });

  // 2. GET notifications/unread-count
  gatewayRegistry.register("GET", "notifications/unread-count", async (ctx) => {
    const { userId } = await getAuthenticatedUser(ctx);
    const result = await NotificationService.getUnreadCount(userId);
    return jsonSuccess(result);
  });

  // 3. PUT notifications/:id/read
  gatewayRegistry.register("PUT", "notifications/:id/read", async (ctx) => {
    const { userId } = await getAuthenticatedUser(ctx);
    const notificationId = Number(ctx.params.id);
    if (!notificationId || isNaN(notificationId)) {
      throw new ValidationErrorAppError("รหัสการแจ้งเตือนไม่ถูกต้อง");
    }

    const result = await NotificationService.markAsRead(userId, notificationId);
    return jsonSuccess(result);
  });

  // 4. PUT notifications/read-all
  gatewayRegistry.register("PUT", "notifications/read-all", async (ctx) => {
    const { userId } = await getAuthenticatedUser(ctx);
    const result = await NotificationService.markAllAsRead(userId);
    return jsonSuccess(result);
  });
}
