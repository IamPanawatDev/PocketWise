import { cn } from "@/lib/utils";

export function Select({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "w-full rounded-[var(--pw-rounded-sm)] border border-[var(--pw-hairline)] bg-[var(--pw-surface-indigo)] px-4 py-3 text-base text-[var(--pw-ink)] outline-none focus:border-[var(--pw-primary)]",
        className,
      )}
      {...props}
    />
  );
}
