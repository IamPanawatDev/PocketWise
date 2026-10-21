"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type {
  BatchReadNotificationsResponse,
  NotificationResponse,
  NotificationUnreadCountResponse,
} from "@/types/notification.types";
import type { PagedResult } from "@/types/api.types";

export const NOTIFICATIONS_KEY = ["notifications"] as const;
export const UNREAD_COUNT_KEY = ["notifications", "unread-count"] as const;

export function useNotifications(page = 1, pageSize = 20, unreadOnly = false) {
  return useQuery({
    queryKey: [...NOTIFICATIONS_KEY, { page, pageSize, unreadOnly }],
    queryFn: () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        unreadOnly: unreadOnly ? "true" : "false",
      });
      return apiClient.get<PagedResult<NotificationResponse>>(
        `/api/v1/notifications?${params.toString()}`,
      );
    },
    staleTime: 15_000,
  });
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: UNREAD_COUNT_KEY,
    queryFn: () =>
      apiClient.get<NotificationUnreadCountResponse>("/api/v1/notifications/unread-count"),
    staleTime: 15_000,
    refetchInterval: 60_000,
  });
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: number) =>
      apiClient.put<NotificationResponse>(`/api/v1/notifications/${notificationId}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
      queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_KEY });
    },
  });
}

export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiClient.put<BatchReadNotificationsResponse>("/api/v1/notifications/read-all"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
      queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_KEY });
    },
  });
}
