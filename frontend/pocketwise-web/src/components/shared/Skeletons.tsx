import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Skeleton for lists rendered as vertical rows (e.g., Bank Accounts, Tags, Categories, Categorization Rules)
 */
export function ListRowsSkeleton({
  count = 5,
  hasAvatar = false,
  className,
}: {
  count?: number;
  hasAvatar?: boolean;
  className?: string;
}) {
  return (
    <Card className={cn("p-0 overflow-hidden divide-y divide-[var(--pw-hairline)]", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {hasAvatar && <Skeleton className="size-9 rounded-lg shrink-0" />}
            <div className="space-y-1.5 flex-1 max-w-sm">
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="h-3 w-2/5" />
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Skeleton className="h-9 w-16 rounded-[var(--pw-rounded-sm)]" />
            <Skeleton className="h-9 w-14 rounded-[var(--pw-rounded-sm)]" />
          </div>
        </div>
      ))}
    </Card>
  );
}

/**
 * Skeleton for Card Grid views (e.g., Budgets, Credit Cards, Recurring Transactions, Transfers)
 */
export function CardGridSkeleton({
  count = 4,
  columns = "grid-cols-1 lg:grid-cols-2",
  type = "default",
}: {
  count?: number;
  columns?: string;
  type?: "default" | "budget" | "creditCard";
}) {
  return (
    <div className={cn("grid gap-4", columns)}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="space-y-4 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-5 w-2/4" />
              <Skeleton className="h-3.5 w-1/3" />
            </div>
            <div className="flex gap-2 shrink-0">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-12" />
            </div>
          </div>

          {type === "budget" && (
            <div className="space-y-2 pt-1">
              <div className="flex justify-between">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3.5 w-28" />
              </div>
              <Skeleton className="h-3 w-full rounded-full" />
              <div className="flex justify-between pt-1">
                <Skeleton className="h-3.5 w-20" />
                <Skeleton className="h-3.5 w-24" />
              </div>
            </div>
          )}

          {type === "creditCard" && (
            <div className="pt-2">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
              <div className="mt-3 flex gap-3">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3.5 w-28" />
              </div>
            </div>
          )}

          {type === "default" && (
            <div className="flex items-center justify-between pt-2">
              <Skeleton className="h-6 w-28" />
              <Skeleton className="h-4 w-20" />
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

/**
 * Skeleton for Transaction Cards Grid
 */
export function TransactionCardsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-6 w-24" />
          </div>
          <div className="flex gap-2 py-1">
            <Skeleton className="h-5 w-20 rounded-md" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--pw-hairline)]">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-12" />
          </div>
        </Card>
      ))}
    </div>
  );
}

/**
 * Skeleton for Transactions page (Search & Filter bar + transaction cards)
 */
export function TransactionPageSkeleton() {
  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="size-6 rounded-md" />
          <Skeleton className="h-7 w-48" />
        </div>
        <Skeleton className="h-10 w-32 rounded-[var(--pw-rounded-sm)]" />
      </div>

      {/* Filter Card */}
      <Card className="grid grid-cols-1 items-end gap-3 p-4 sm:grid-cols-2 sm:p-6 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-10 w-full rounded-[var(--pw-rounded-sm)]" />
          </div>
        ))}
      </Card>

      {/* Transaction Cards Grid */}
      <TransactionCardsSkeleton count={6} />
    </div>
  );
}

/**
 * Skeleton for Reports page (Top 5 KPI cards + 2 Charts)
 */
export function ReportPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-28 rounded-[var(--pw-rounded-sm)]" />
      </div>

      {/* Filter Bar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-9 w-full rounded-[var(--pw-rounded-sm)]" />
            </div>
          ))}
        </div>
      </Card>

      {/* KPI Cards (5 Cards) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="p-4 space-y-2">
            <div className="flex justify-between items-center">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="size-4 rounded-full" />
            </div>
            <Skeleton className="h-7 w-32" />
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-5 space-y-4">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </Card>
        <Card className="p-5 space-y-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </Card>
      </div>
    </div>
  );
}

/**
 * Skeleton for Table views (e.g. Audit Logs, Import Jobs)
 */
export function TableSkeleton({
  rows = 6,
  columns = 5,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <Card className="p-0 overflow-hidden">
      <div className="p-3 border-b border-[var(--pw-hairline)] bg-[var(--pw-surface-indigo)]/30">
        <div className="flex gap-4">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
      </div>
      <div className="divide-y divide-[var(--pw-hairline)]">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="p-3.5 flex gap-4 items-center">
            {Array.from({ length: columns }).map((_, c) => (
              <Skeleton key={c} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </Card>
  );
}

/**
 * Skeleton for Notification popover items
 */
export function NotificationSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="divide-y divide-[var(--pw-hairline)]">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-3 p-3.5">
          <Skeleton className="size-8 rounded-full shrink-0" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-2.5 w-1/4 pt-0.5" />
          </div>
        </div>
      ))}
    </div>
  );
}
