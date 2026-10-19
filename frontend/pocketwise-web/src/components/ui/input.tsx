import { cn } from "@/lib/utils";

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-[var(--pw-rounded-sm)] border border-[var(--pw-input-border)] bg-[var(--pw-input-surface)] px-4 py-3 text-base text-[var(--pw-ink)] placeholder:text-[var(--pw-ink)]/55 outline-none transition-colors focus:border-[var(--pw-primary)] focus:ring-2 focus:ring-[var(--pw-primary)]/30",
        className,
      )}
      {...props}
    />
  );
}
