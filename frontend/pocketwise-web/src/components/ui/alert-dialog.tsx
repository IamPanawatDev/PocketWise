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
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        className={cn(
          // Mobile: Glassmorphism Bottom Sheet pinned to bottom
          "fixed inset-x-0 bottom-0 z-50 flex max-h-[92vh] flex-col rounded-t-[28px] border-t border-[var(--pw-hairline)] bg-[var(--pw-surface)]/98 sm:bg-[var(--pw-surface)]/95 backdrop-blur-2xl p-6 text-[var(--pw-ink)] shadow-[0_-10px_40px_rgba(0,0,0,0.35)] outline-none pw-bottom-sheet-content",
          // Desktop: Centered Dialog with Glassmorphism
          "sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[85vh] sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[var(--pw-rounded-lg)] sm:border sm:border-[var(--pw-hairline)] sm:shadow-2xl sm:p-6",
          className,
        )}
        {...props}
      >
        {/* Mobile Drag Handle */}
        <div className="mx-auto mb-3 h-1.5 w-12 shrink-0 rounded-full bg-[var(--pw-ink)]/20 sm:hidden" />
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
