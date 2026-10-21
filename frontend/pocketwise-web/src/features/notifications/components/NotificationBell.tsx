"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  AlertTriangle,
  AlertCircle,
  Info,
  LoaderCircle,
  Inbox,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { AnimatedList, AnimatedListItem } from "@/components/ui/animated-list";
import { NotificationSkeleton } from "@/components/shared/Skeletons";
import { cn, formatDateTime } from "@/lib/utils";
import {
  useMarkAllNotificationsAsRead,
  useMarkNotificationAsRead,
  useNotifications,
  useUnreadNotificationCount,
} from "../hooks/useNotifications";
import type { NotificationResponse } from "@/types/notification.types";

function formatRelativeTime(dateStr: string): string {
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMin < 1) return "เมื่อสักครู่";
    if (diffMin < 60) return `${diffMin} นาทีที่แล้ว`;
    if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`;
    if (diffDays < 7) return `${diffDays} วันที่แล้ว`;
    return formatDateTime(dateStr);
  } catch {
    return formatDateTime(dateStr);
  }
}

export function NotificationBell({ className }: { className?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);

  const { data: countData } = useUnreadNotificationCount();
  const unreadCount = countData?.unreadCount ?? 0;

  const { data: listData, isLoading } = useNotifications(1, 20, unreadOnly);
  const markAsRead = useMarkNotificationAsRead();
  const markAllAsRead = useMarkAllNotificationsAsRead();

  const notifications = listData?.items ?? [];

  const handleNotificationClick = (item: NotificationResponse) => {
    if (item.status !== "read") {
      markAsRead.mutate(item.notificationId);
    }

    if (item.relatedEntityType === "Budget") {
      setOpen(false);
      router.push("/budgets");
    } else if (item.relatedEntityType === "Transaction") {
      setOpen(false);
      router.push("/transactions");
    }
  };

  const getNotificationIcon = (item: NotificationResponse) => {
    if (item.notificationType.includes("EXCEEDED")) {
      return <AlertCircle className="size-4 shrink-0 text-red-400" />;
    }
    if (item.notificationType.includes("WARNING")) {
      return <AlertTriangle className="size-4 shrink-0 text-amber-400" />;
    }
    return <Info className="size-4 shrink-0 text-[var(--pw-link)]" />;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={
            unreadCount > 0
              ? `การแจ้งเตือน มี ${unreadCount} รายการที่ยังไม่ได้อ่าน`
              : "การแจ้งเตือน"
          }
          className={cn("relative", className)}
        >
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white shadow">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="flex w-84 sm:w-96 max-h-[85vh] flex-col p-0 bg-[var(--pw-surface-black)] border-[var(--pw-hairline)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--pw-hairline)] px-4 py-3 bg-[var(--pw-surface-indigo)]/50">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-[var(--pw-ink)]">การแจ้งเตือน</span>
            {unreadCount > 0 && (
              <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-300">
                ใหม่ {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 px-2 text-xs text-[var(--pw-link)] hover:text-[var(--pw-link)]"
              onClick={() => markAllAsRead.mutate()}
              disabled={markAllAsRead.isPending}
            >
              {markAllAsRead.isPending ? (
                <LoaderCircle className="size-3.5 animate-spin" />
              ) : (
                <CheckCheck className="size-3.5" />
              )}
              อ่านทั้งหมด
            </Button>
          )}
        </div>

        {/* Filter Tab */}
        <div className="flex border-b border-[var(--pw-hairline)] bg-[var(--pw-surface-indigo)]/20 px-3 py-1.5 text-xs">
          <button
            type="button"
            className={cn(
              "px-3 py-1 font-medium rounded-md transition",
              !unreadOnly
                ? "bg-[var(--pw-primary)] text-white"
                : "text-[var(--pw-ink)]/70 hover:text-[var(--pw-ink)] hover:bg-[var(--pw-surface-onyx)]/50",
            )}
            onClick={() => setUnreadOnly(false)}
          >
            ทั้งหมด
          </button>
          <button
            type="button"
            className={cn(
              "ml-1 px-3 py-1 font-medium rounded-md transition",
              unreadOnly
                ? "bg-[var(--pw-primary)] text-white"
                : "text-[var(--pw-ink)]/70 hover:text-[var(--pw-ink)] hover:bg-[var(--pw-surface-onyx)]/50",
            )}
            onClick={() => setUnreadOnly(true)}
          >
            ยังไม่ได้อ่าน
          </button>
        </div>

        {/* Content list */}
        <div className="overflow-y-auto max-h-96">
          {isLoading ? (
            <NotificationSkeleton count={4} />
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-sm text-[var(--pw-ink)]/60">
              <Inbox className="size-10 text-[var(--pw-ink)]/30 mb-2" />
              <p>ไม่มีการแจ้งเตือน</p>
            </div>
          ) : (
            <AnimatedList>
              {notifications.map((item) => {
                const isUnread = item.status !== "read";
                return (
                  <AnimatedListItem key={item.notificationId}>
                    <button
                      type="button"
                      onClick={() => handleNotificationClick(item)}
                      className={cn(
                        "w-full text-left p-3.5 transition flex items-start gap-3 hover:bg-[var(--pw-surface-indigo)]/60 cursor-pointer border-b border-[var(--pw-hairline)] last:border-b-0",
                        isUnread && "bg-[var(--pw-surface-indigo)]/30",
                      )}
                    >
                      <div className="mt-0.5">{getNotificationIcon(item)}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p
                            className={cn(
                              "truncate text-sm font-medium",
                              isUnread ? "text-[var(--pw-ink)] font-semibold" : "text-[var(--pw-ink)]/80",
                            )}
                          >
                            {item.title}
                          </p>
                          {isUnread && (
                            <span className="size-2 shrink-0 rounded-full bg-[var(--pw-primary)]" />
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-[var(--pw-ink)]/70 line-clamp-2">
                          {item.message}
                        </p>
                        <p className="mt-1.5 text-[11px] text-[var(--pw-ink)]/40">
                          {formatRelativeTime(item.createdAt)}
                        </p>
                      </div>
                    </button>
                  </AnimatedListItem>
                );
              })}
            </AnimatedList>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
