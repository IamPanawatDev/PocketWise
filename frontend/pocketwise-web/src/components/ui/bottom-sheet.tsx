"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

export interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  title?: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
}

export function BottomSheet({
  open,
  onOpenChange,
  children,
  title,
  description,
  className,
}: BottomSheetProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        {/* Glassmorphism Backdrop Overlay */}
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md pw-dialog-overlay" />
        
        {/* Glassmorphism Responsive Content: Bottom Sheet on Mobile, Centered Modal on Desktop */}
        <DialogPrimitive.Content
          className={cn(
            // Mobile (default): Bottom Sheet pinned to bottom, rounded top corners, high-contrast crisp surface
            "fixed inset-x-0 bottom-0 z-50 flex max-h-[92vh] flex-col rounded-t-[28px] border-t border-[var(--pw-hairline)] bg-[var(--pw-surface)]/98 sm:bg-[var(--pw-surface)]/95 backdrop-blur-2xl text-[var(--pw-ink)] shadow-[0_-10px_40px_rgba(0,0,0,0.35)] outline-none pw-bottom-sheet-content",
            // Desktop (sm+): Centered Modal Dialog with Glassmorphism
            "sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[85vh] sm:w-full sm:max-w-2xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[var(--pw-rounded-lg)] sm:border sm:border-[var(--pw-hairline)] sm:shadow-2xl",
            className,
          )}
        >
          {/* Mobile Drag Handle Bar */}
          <div className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-[var(--pw-ink)]/20 sm:hidden" />

          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--pw-hairline)] px-5 py-3.5 sm:px-6">
            <div className="min-w-0 pr-4">
              {title && (
                <DialogPrimitive.Title className="text-lg font-bold text-[var(--pw-ink)] truncate">
                  {title}
                </DialogPrimitive.Title>
              )}
              {description && (
                <DialogPrimitive.Description className="mt-0.5 text-xs sm:text-sm text-[var(--pw-ink)]/85 dark:text-[var(--pw-ink)]/75">
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--pw-surface-onyx)] text-[var(--pw-ink)]/85 transition-colors hover:bg-[var(--pw-hairline)] hover:text-[var(--pw-ink)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pw-primary)]"
              aria-label="ปิด"
            >
              <X className="size-4" />
            </DialogPrimitive.Close>
          </div>

          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6">
            {children}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/**
 * Standard BottomSheet & Modal Footer
 * Rule: On mobile, Confirm/Action is on TOP, Cancel/Close is at BOTTOM.
 */
export function BottomSheetFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "mt-6 flex flex-col gap-2.5 pt-4 border-t border-[var(--pw-hairline)] w-full",
        // Mobile button order: Confirm button (first child) is TOP (order 1), Cancel button (last child) is BOTTOM (order 2)
        "[&>*:first-child]:order-1 [&>*:last-child]:order-2",
        // Desktop button order: Side-by-side right-aligned (Cancel first, Confirm second)
        "sm:flex-row-reverse sm:justify-end sm:gap-3 sm:[&>*:first-child]:order-none sm:[&>*:last-child]:order-none [&>*]:w-full sm:[&>*]:w-auto",
        className,
      )}
      {...props}
    />
  );
}
