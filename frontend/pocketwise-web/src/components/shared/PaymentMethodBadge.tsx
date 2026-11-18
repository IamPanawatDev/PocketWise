import * as React from "react";
import { Landmark, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PaymentMethodBadgeProps {
  bankAccountId?: number | null;
  bankAccountName?: string | null;
  creditCardId?: number | null;
  creditCardName?: string | null;
  className?: string;
}

export function PaymentMethodBadge({
  bankAccountId,
  bankAccountName,
  creditCardId,
  creditCardName,
  className,
}: PaymentMethodBadgeProps) {
  if (creditCardId || creditCardName) {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-md bg-[var(--pw-surface-indigo)] px-2 py-0.5 text-xs border border-[var(--pw-hairline)] text-[var(--pw-ink)]/80 font-medium",
          className
        )}
      >
        <CreditCard className="mr-1.5 size-3.5 text-[var(--pw-accent)] shrink-0" />
        <span className="truncate">{creditCardName || "บัตรเครดิต"}</span>
      </span>
    );
  }

  if (bankAccountId || bankAccountName) {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-md bg-[var(--pw-surface-indigo)] px-2 py-0.5 text-xs border border-[var(--pw-hairline)] text-[var(--pw-ink)]/80 font-medium",
          className
        )}
      >
        <Landmark className="mr-1.5 size-3.5 text-[var(--pw-link)] shrink-0" />
        <span className="truncate">{bankAccountName || "บัญชีธนาคาร"}</span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md bg-[var(--pw-surface-indigo)] px-2 py-0.5 text-xs border border-[var(--pw-hairline)] text-[var(--pw-ink)]/80 font-medium",
        className
      )}
    >
      <span>💵 เงินสด</span>
    </span>
  );
}
