import { cn } from "@/lib/utils";

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("block text-sm font-semibold text-[var(--pw-ink)]/90 dark:text-[var(--pw-ink)]/85 mb-2", className)}
      {...props}
    />
  );
}
