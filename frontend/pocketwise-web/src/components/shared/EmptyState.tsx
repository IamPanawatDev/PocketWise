"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  actionLabel?: string;
  actionIcon?: React.ComponentType<{ className?: string }>;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionIcon: ActionIcon,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <Card
      className={cn(
        "flex flex-col items-center justify-center p-8 sm:p-12 text-center border-[var(--pw-hairline)] bg-[var(--pw-surface)]/70 backdrop-blur-md rounded-2xl shadow-xs",
        className
      )}
    >
      <div className="relative mb-3.5 flex size-14 sm:size-16 items-center justify-center rounded-2xl bg-[var(--pw-primary)]/10 text-[var(--pw-primary)] shadow-inner">
        <span className="absolute -inset-1 rounded-2xl bg-[var(--pw-primary)]/20 blur-sm -z-10 animate-pulse" />
        <Icon className="size-7 sm:size-8" />
      </div>
      <p className="font-bold text-base sm:text-lg text-[var(--pw-ink)]">{title}</p>
      <p className="mt-1 text-xs sm:text-sm text-[var(--pw-ink)]/65 max-w-sm leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button
          type="button"
          size="sm"
          onClick={onAction}
          className="mt-4 font-semibold hover:scale-102 active:scale-98 transition-all"
        >
          {ActionIcon && <ActionIcon className="size-4 mr-1.5" />}
          {actionLabel}
        </Button>
      )}
    </Card>
  );
}
