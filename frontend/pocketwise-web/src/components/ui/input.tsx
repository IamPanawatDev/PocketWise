import { cn } from "@/lib/utils";

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-[var(--pw-rounded-sm)] border border-[var(--pw-hairline)] bg-[var(--pw-surface-indigo)] px-4 py-3 text-base text-[var(--pw-ink)] placeholder:text-[var(--pw-ink)]/40 outline-none focus:border-[var(--pw-primary)]",
        className,
      )}
      {...props}
    />
  );
}
