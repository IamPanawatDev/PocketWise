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
  onOpenAutoFocus?: (event: Event) => void;
  /** Optional sticky footer rendered outside the scrollable body container */
  footer?: React.ReactNode;
}

export function BottomSheet({
  open,
  onOpenChange,
  children,
  title,
  description,
  className,
  onOpenAutoFocus,
  footer,
}: BottomSheetProps) {
  const scrollContainerRef = React.useRef<HTMLDivElement | null>(null);
  const sheetContentRef = React.useRef<HTMLDivElement | null>(null);

  // Swipe / Drag-to-dismiss states
  const [dragY, setDragY] = React.useState(0);
  const [isDragging, setIsDragging] = React.useState(false);
  const touchStartY = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (open) {
      setDragY(0);
      setIsDragging(false);
      touchStartY.current = null;
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
    }
  }, [open]);

  const handleTouchStart = React.useCallback((e: React.TouchEvent) => {
    // Only drag from handle / header area
    touchStartY.current = e.touches[0].clientY;
    setIsDragging(true);
  }, []);

  const handleTouchMove = React.useCallback((e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - touchStartY.current;
    // Only allow dragging downwards (positive deltaY)
    if (deltaY > 0) {
      setDragY(deltaY);
    } else {
      setDragY(0);
    }
  }, []);

  const handleTouchEnd = React.useCallback(() => {
    if (dragY > 90) {
      // Dragged past threshold: dismiss sheet
      onOpenChange(false);
    }
    // Reset drag position
    setDragY(0);
    setIsDragging(false);
    touchStartY.current = null;
  }, [dragY, onOpenChange]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        {/* Glassmorphism Backdrop Overlay */}
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md pw-dialog-overlay" />

        {/* Glassmorphism Responsive Content: Bottom Sheet on Mobile, Centered Modal on Desktop */}
        <DialogPrimitive.Content
          ref={sheetContentRef}
          onOpenAutoFocus={(e) => {
            if (onOpenAutoFocus) {
              onOpenAutoFocus(e);
            } else {
              e.preventDefault();
            }
          }}
          style={
            dragY > 0
              ? {
                  transform: `translateY(${dragY}px)`,
                  transition: isDragging ? "none" : "transform 0.2s ease-out",
                }
              : undefined
          }
          className={cn(
            // Mobile (default): Bottom Sheet pinned to bottom, dynamic height (fit content up to 92vh), rounded top corners
            "fixed inset-x-0 bottom-0 z-50 flex h-auto max-h-[92vh] flex-col rounded-t-[28px] border-t border-[var(--pw-hairline)] bg-[var(--pw-surface)]/98 sm:bg-[var(--pw-surface)]/95 backdrop-blur-2xl text-[var(--pw-ink)] shadow-[0_-10px_40px_rgba(0,0,0,0.35)] outline-none pw-bottom-sheet-content",
            // Desktop (sm+): Centered Modal Dialog with Glassmorphism
            "sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[85vh] sm:w-full sm:max-w-2xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[var(--pw-rounded-lg)] sm:border sm:border-[var(--pw-hairline)] sm:shadow-2xl",
            className
          )}
        >
          {/* Mobile Drag Handle Bar with Touch Event Listener for Swipe-Down-To-Dismiss */}
          <div
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="w-full pt-3 pb-1 cursor-grab active:cursor-grabbing touch-none select-none sm:hidden flex items-center justify-center"
            title="ลากลงเพื่อปิด"
          >
            <div className="h-1.5 w-12 shrink-0 rounded-full bg-[var(--pw-ink)]/25 hover:bg-[var(--pw-ink)]/40 transition-colors" />
          </div>

          {/* Header */}
          <div
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="flex items-center justify-between border-b border-[var(--pw-hairline)] px-5 py-3 sm:px-6 select-none"
          >
            <div className="min-w-0 pr-4">
              {title && (
                <DialogPrimitive.Title className="text-base sm:text-lg font-bold text-[var(--pw-ink)] truncate">
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
              className="flex size-10 sm:size-9 shrink-0 items-center justify-center rounded-full bg-[var(--pw-surface-onyx)] text-[var(--pw-ink)]/85 transition-all hover:bg-[var(--pw-hairline)] hover:text-[var(--pw-ink)] active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pw-primary)] cursor-pointer"
              aria-label="ปิด"
            >
              <X className="size-4.5" />
            </DialogPrimitive.Close>
          </div>

          {/* Scrollable Form Body with Overscroll Containment */}
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto px-5 py-4 sm:px-6 overscroll-contain touch-pan-y"
          >
            {children}
          </div>

          {/* Optional Sticky Footer (Always pinned at bottom with iOS Home Bar Safe Area) */}
          {footer && (
            <div className="shrink-0 border-t border-[var(--pw-hairline)] bg-[var(--pw-surface)]/95 backdrop-blur-md px-5 py-3 sm:px-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {footer}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/**
 * Standard BottomSheet & Modal Footer
 * Rule: On mobile, Confirm/Action is on TOP, Cancel/Close is at BOTTOM.
 * Includes safe area padding for modern smartphone Home Bars.
 */
export function BottomSheetFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "mt-6 flex flex-col gap-2.5 pt-4 border-t border-[var(--pw-hairline)] w-full pb-[max(0.5rem,env(safe-area-inset-bottom))]",
        // Mobile button order: Confirm button (first child) is TOP (order 1), Cancel button (last child) is BOTTOM (order 2)
        "[&>*:first-child]:order-1 [&>*:last-child]:order-2",
        // Desktop button order: Side-by-side right-aligned (Cancel first, Confirm second)
        "sm:flex-row-reverse sm:justify-end sm:gap-3 sm:pb-0 sm:[&>*:first-child]:order-none sm:[&>*:last-child]:order-none [&>*]:w-full sm:[&>*]:w-auto",
        className
      )}
      {...props}
    />
  );
}
