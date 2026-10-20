"use client";

import * as React from "react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer inline-flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-[var(--pw-rounded-xs)] border border-[var(--pw-input-border)] bg-[var(--pw-input-surface)] text-[var(--pw-on-primary)] transition-colors outline-none hover:border-[var(--pw-primary)]/70 focus-visible:ring-2 focus-visible:ring-[var(--pw-primary)]/50 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-[var(--pw-primary)] data-[state=checked]:bg-[var(--pw-primary)]",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-current"
      >
        <Check className="size-3 stroke-[3]" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
