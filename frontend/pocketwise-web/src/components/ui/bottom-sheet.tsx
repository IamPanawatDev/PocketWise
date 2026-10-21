"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

export interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  title?: string;
  description?: string;
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
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs pw-dialog-overlay" />
        <DialogPrimitive.Content
          className={cn(
            // Mobile: Bottom Sheet pinned to bottom, rounded top corners
            "fixed inset-x-0 bottom-0 z-50 flex max-h-[90vh] flex-col rounded-t-[28px] border-t border-[var(--pw-hairline)] bg-[var(--pw-surface-indigo)] text-[var(--pw-ink)] shadow-2xl outline-none pw-bottom-sheet-content",
            // Desktop (sm+): Centered Modal Dialog
            "sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[85vh] sm:w-full sm:max-w-2xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[var(--pw-rounded-lg)] sm:border sm:border-[var(--pw-hairline)]",
            className,
          )}
        >
          {/* Mobile Drag Handle Bar */}
          <div className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-white/20 sm:hidden" />

          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--pw-hairline)] px-5 py-3.5 sm:px-6">
            <div>
              {title && (
                <DialogPrimitive.Title className="text-lg font-bold text-[var(--pw-ink)]">
                  {title}
                </DialogPrimitive.Title>
              )}
              {description && (
                <DialogPrimitive.Description className="mt-0.5 text-xs text-[var(--pw-ink)]/65">
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close
              className="flex size-8 items-center justify-center rounded-full bg-white/5 text-[var(--pw-ink)]/70 transition-colors hover:bg-white/15 hover:text-[var(--pw-ink)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pw-primary)]"
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
