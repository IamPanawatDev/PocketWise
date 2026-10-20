export interface NotificationResponse {
  notificationId: number;
  notificationType: string;
  title: string;
  message: string;
  channel: "inApp" | "email" | string;
  status: "pending" | "sent" | "failed" | "read" | string;
  relatedEntityType: string | null;
  relatedEntityId: number | null;
  sentAt: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationUnreadCountResponse {
  unreadCount: number;
}

export interface BatchReadNotificationsResponse {
  count: number;
}

export interface RefreshHintPayload {
  entityType: "budget" | "transaction" | "category" | "all" | string;
  hint: string;
  timestamp: string;
}
