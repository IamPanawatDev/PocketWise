"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
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
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { AnimatedList, AnimatedListItem } from "@/components/ui/animated-list";
import { NotificationSkeleton } from "@/components/shared/Skeletons";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/date-utils";
import {
  useMarkAllNotificationsAsRead,
  useMarkNotificationAsRead,
  useNotifications,
  useUnreadNotificationCount,
} from "../hooks/useNotifications";
import type { NotificationResponse } from "@/types/notification.types";

export function NotificationBell({ className }: { className?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 639px)");
    const onChange = () => setIsMobile(mql.matches);
    setIsMobile(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

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

    setOpen(false);
    if (item.relatedEntityType === "Budget") {
      router.push("/budgets");
    } else if (item.relatedEntityType === "Transaction") {
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

  // Bell Button Trigger
  const triggerButton = (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={
        unreadCount > 0
          ? `การแจ้งเตือน มี ${unreadCount} รายการที่ยังไม่ได้อ่าน`
          : "การแจ้งเตือน"
      }
      onClick={isMobile ? () => setOpen(true) : undefined}
      className={cn("relative transition-transform active:scale-90 cursor-pointer", className)}
    >
      <motion.div
        whileHover={{ rotate: [-10, 10, -6, 6, 0] }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        <Bell className="size-5" />
      </motion.div>
      <AnimatePresence>
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [1, 1.15, 1], opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{
              scale: { repeat: Infinity, repeatDelay: 3.5, duration: 1.2, ease: "easeInOut" },
              opacity: { duration: 0.2 },
            }}
            className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white shadow-md shadow-red-500/40"
          >
            <span className="absolute -inset-0.5 rounded-full bg-red-500/50 animate-ping pointer-events-none" />
            <span className="relative z-10">{unreadCount > 99 ? "99+" : unreadCount}</span>
          </motion.span>
        )}
      </AnimatePresence>
    </Button>
  );

  // Reusable Notifications List & Filter Content
  const notificationBody = (
    <div className="flex flex-col">
      {/* Filter Tabs Bar & Mark all as read */}
      <div className="flex items-center justify-between border-b border-[var(--pw-hairline)] bg-[var(--pw-surface-indigo)]/20 px-3.5 py-2 text-xs">
        <div className="flex items-center gap-1">
          <button
            type="button"
            className={cn(
              "relative px-3 py-1 font-medium rounded-md transition-colors cursor-pointer",
              !unreadOnly
                ? "text-white font-semibold"
                : "text-[var(--pw-ink)]/70 hover:text-[var(--pw-ink)]",
            )}
            onClick={() => setUnreadOnly(false)}
          >
            {!unreadOnly && (
              <motion.div
                layoutId="notifTabIndicator"
                className="absolute inset-0 rounded-md bg-[var(--pw-primary)] shadow-xs"
                transition={{ type: "spring", stiffness: 450, damping: 32 }}
              />
            )}
            <span className="relative z-10">ทั้งหมด</span>
          </button>
          <button
            type="button"
            className={cn(
              "relative px-3 py-1 font-medium rounded-md transition-colors cursor-pointer",
              unreadOnly
                ? "text-white font-semibold"
                : "text-[var(--pw-ink)]/70 hover:text-[var(--pw-ink)]",
            )}
            onClick={() => setUnreadOnly(true)}
          >
            {unreadOnly && (
              <motion.div
                layoutId="notifTabIndicator"
                className="absolute inset-0 rounded-md bg-[var(--pw-primary)] shadow-xs"
                transition={{ type: "spring", stiffness: 450, damping: 32 }}
              />
            )}
            <span className="relative z-10">ยังไม่อ่าน</span>
          </button>
        </div>

        {unreadCount > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-xs text-[var(--pw-link)] hover:text-[var(--pw-ink)] hover:bg-[var(--pw-link)]/10"
            onClick={() => markAllAsRead.mutate()}
            disabled={markAllAsRead.isPending}
          >
            {markAllAsRead.isPending ? (
              <LoaderCircle className="size-3 animate-spin" />
            ) : (
              <CheckCheck className="size-3" />
            )}
            อ่านทั้งหมด
          </Button>
        )}
      </div>

      {/* Notifications Scrollable List */}
      <div className="overflow-y-auto max-h-[60vh] sm:max-h-96 divide-y divide-[var(--pw-hairline)]">
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
                      "w-full text-left p-3.5 transition-all flex items-start gap-3 hover:bg-[var(--pw-surface-indigo)]/40 active:scale-[0.99] cursor-pointer",
                      isUnread && "bg-[var(--pw-surface-indigo)]/25",
                    )}
                  >
                    <div className="mt-0.5">{getNotificationIcon(item)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p
                          className={cn(
                            "truncate text-xs sm:text-sm font-medium",
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
                      <p className="mt-1.5 text-[10px] text-[var(--pw-ink)]/40">
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
    </div>
  );

  // If Mobile (< sm): Render BottomSheet for native thumb accessibility
  if (isMobile) {
    return (
      <>
        {triggerButton}
        <BottomSheet
          open={open}
          onOpenChange={setOpen}
          title={
            <div className="flex items-center gap-2">
              <Bell className="size-5 text-[var(--pw-primary)]" />
              <span>การแจ้งเตือน</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-semibold text-red-300">
                  {unreadCount}
                </span>
              )}
            </div>
          }
          description="รายการแจ้งเตือนงบประมาณและข้อมูลสำคัญของคุณ"
        >
          <div className="-mx-5 -mb-4 pt-1 sm:-mx-6">
            {notificationBody}
          </div>
        </BottomSheet>
      </>
    );
  }

  // If Desktop (sm+): Render Dropdown Popover
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {triggerButton}
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="flex w-96 max-h-[85vh] flex-col p-0 bg-[var(--pw-surface)] border-[var(--pw-hairline)] shadow-xl overflow-hidden"
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
        </div>

        {notificationBody}
      </PopoverContent>
    </Popover>
  );
}
