"use client";

import * as React from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { cn } from "@/lib/utils";

const AlertDialog = AlertDialogPrimitive.Root;
const AlertDialogTrigger = AlertDialogPrimitive.Trigger;
const AlertDialogPortal = AlertDialogPrimitive.Portal;

function AlertDialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Overlay>) {
  return (
    <AlertDialogPrimitive.Overlay
      className={cn(
        "fixed inset-0 z-50 bg-black/60 backdrop-blur-md pw-dialog-overlay",
        className,
      )}
      {...props}
    />
  );
}

function AlertDialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Content>) {
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const touchStartY = React.useRef<number | null>(null);
  const currentDragY = React.useRef<number>(0);

  const handleTouchStart = React.useCallback((e: React.TouchEvent) => {
    if (typeof window !== "undefined" && window.innerWidth >= 640) return;
    touchStartY.current = e.touches[0].clientY;
    currentDragY.current = 0;
  }, []);

  const handleTouchMove = React.useCallback((e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const deltaY = e.touches[0].clientY - touchStartY.current;
    if (deltaY > 0) {
      currentDragY.current = deltaY;
      const content = contentRef.current;
      if (content) {
        content.style.transform = `translateY(${deltaY}px)`;
        content.style.transition = "none";
      }
    }
  }, []);

  const handleTouchEnd = React.useCallback(() => {
    if (touchStartY.current === null) return;
    touchStartY.current = null;
    const content = contentRef.current;
    if (content) {
      if (currentDragY.current > 70) {
        // Trigger cancel button to safely close via Radix lifecycle
        const cancelBtn = content.querySelector<HTMLButtonElement>('[data-slot="alert-dialog-cancel"]');
        if (cancelBtn) {
          cancelBtn.click();
        } else {
          content.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
        }
      } else {
        content.style.transition = "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)";
        content.style.transform = "translateY(0)";
      }
    }
    currentDragY.current = 0;
  }, []);

  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        ref={contentRef}
        className={cn(
          // Mobile: Glassmorphism Bottom Sheet pinned to bottom with safe-area bottom padding
          "fixed inset-x-0 bottom-0 z-50 flex max-h-[90dvh] flex-col rounded-t-[28px] border-t border-[var(--pw-hairline)] bg-[var(--pw-surface)]/98 sm:bg-[var(--pw-surface)]/95 backdrop-blur-2xl p-6 pb-[max(1.5rem,calc(1rem+env(safe-area-inset-bottom)))] text-[var(--pw-ink)] shadow-[0_-10px_40px_rgba(0,0,0,0.35)] outline-none pw-bottom-sheet-content overscroll-contain touch-pan-y",
          // Desktop: Centered Dialog with Glassmorphism
          "sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[85vh] sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[var(--pw-rounded-lg)] sm:border sm:border-[var(--pw-hairline)] sm:shadow-2xl sm:p-6 sm:pb-6",
          className,
        )}
        {...props}
      >
        {/* Mobile Drag Handle Bar with Touch Event Listener for Swipe-Down-To-Dismiss */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="w-full pt-1 pb-3 cursor-grab active:cursor-grabbing touch-none select-none sm:hidden flex items-center justify-center -mt-2"
          title="ลากลงเพื่อยกเลิก"
        >
          <div className="h-1.5 w-12 shrink-0 rounded-full bg-[var(--pw-ink)]/25 hover:bg-[var(--pw-ink)]/40 transition-colors" />
        </div>
        {children}
      </AlertDialogPrimitive.Content>
    </AlertDialogPortal>
  );
}

function AlertDialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-4", className)} {...props} />;
}

function AlertDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return (
    <AlertDialogPrimitive.Title
      className={cn("text-lg font-bold text-[var(--pw-ink)]", className)}
      {...props}
    />
  );
}

function AlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return (
    <AlertDialogPrimitive.Description
      className={cn("mt-1.5 text-sm text-[var(--pw-ink)]/85 dark:text-[var(--pw-ink)]/75", className)}
      {...props}
    />
  );
}

function AlertDialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "mt-6 flex flex-col gap-2.5 w-full pt-3 border-t border-[var(--pw-hairline)]",
        // Mobile button order: Action/Confirm button (ลบ/ยืนยัน) MUST be on TOP (order-1), Cancel (ยกเลิก) MUST be on BOTTOM (order-2)
        "[&>[data-slot='alert-dialog-action']]:order-1 [&>[data-slot='alert-dialog-cancel']]:order-2",
        // Desktop: Cancel on left (order-1), Action/Confirm on right (order-2)
        "sm:flex-row sm:justify-end sm:gap-3 sm:[&>[data-slot='alert-dialog-action']]:order-2 sm:[&>[data-slot='alert-dialog-cancel']]:order-1 [&>*]:w-full sm:[&>*]:w-auto",
        className,
      )}
      {...props}
    />
  );
}

function AlertDialogAction({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Action>) {
  return (
    <AlertDialogPrimitive.Action
      data-slot="alert-dialog-action"
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-2 rounded-[var(--pw-rounded-sm)] bg-[var(--pw-magenta)] px-6 py-2.5 text-sm font-medium text-white transition hover:brightness-110 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 w-full sm:w-auto [&_svg]:size-4",
        className,
      )}
      {...props}
    />
  );
}

function AlertDialogCancel({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Cancel>) {
  return (
    <AlertDialogPrimitive.Cancel
      data-slot="alert-dialog-cancel"
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-2 rounded-[var(--pw-rounded-sm)] border border-[var(--pw-hairline)] bg-[var(--pw-surface-onyx)] px-6 py-2.5 text-sm font-medium text-[var(--pw-ink)] transition hover:bg-[var(--pw-hairline)]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pw-primary)]/50 w-full sm:w-auto [&_svg]:size-4",
        className,
      )}
      {...props}
    />
  );
}

export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
};
