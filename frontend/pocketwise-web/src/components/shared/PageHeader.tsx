import * as React from "react";
import { cn } from "@/lib/utils";

export interface PageHeaderProps {
  title: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  icon: Icon,
  description,
  action,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="min-w-0">
        <h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl text-[var(--pw-ink)]">
          {Icon && <Icon className="size-6 text-[var(--pw-primary)] shrink-0" />}
          <span className="truncate">{title}</span>
        </h1>
        {description && (
          <p className="mt-1 text-xs text-[var(--pw-ink)]/65 sm:text-sm">
            {description}
          </p>
        )}
      </div>
      {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
    </div>
  );
}
