"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { startSignalRConnection } from "@/lib/signalr";
import { NOTIFICATIONS_KEY, UNREAD_COUNT_KEY } from "./useNotifications";
import type { NotificationResponse, RefreshHintPayload } from "@/types/notification.types";

export function useSignalRNotifications(enabled = true) {
  const queryClient = useQueryClient();
  const handlersAttachedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    let isMounted = true;

    async function initConnection() {
      const conn = await startSignalRConnection();
      if (!conn || !isMounted) return;

      if (!handlersAttachedRef.current) {
        conn.on("ReceiveNotification", (notification: NotificationResponse) => {
          // 1. Invalidate notification cache
          queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
          queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_KEY });

          // 2. Invalidate related entity queries
          if (notification.relatedEntityType === "Budget") {
            queryClient.invalidateQueries({ queryKey: ["budgets"] });
          }

          // 3. Show real-time toast
          const isWarning =
            notification.notificationType.includes("WARNING") ||
            notification.notificationType.includes("EXCEEDED");

          if (isWarning) {
            toast.warning(notification.title, {
              description: notification.message,
              duration: 6000,
            });
          } else {
            toast.info(notification.title, {
              description: notification.message,
              duration: 5000,
            });
          }
        });

        conn.on("ReceiveRefreshHint", (hint: RefreshHintPayload) => {
          if (hint.entityType === "budget") {
            queryClient.invalidateQueries({ queryKey: ["budgets"] });
          } else if (hint.entityType === "transaction") {
            queryClient.invalidateQueries({ queryKey: ["transactions"] });
          } else if (hint.entityType === "category") {
            queryClient.invalidateQueries({ queryKey: ["categories"] });
          } else {
            queryClient.invalidateQueries({ queryKey: ["budgets"] });
            queryClient.invalidateQueries({ queryKey: ["transactions"] });
          }
        });

        handlersAttachedRef.current = true;
      }
    }

    initConnection();

    return () => {
      isMounted = false;
    };
  }, [enabled, queryClient]);
}
