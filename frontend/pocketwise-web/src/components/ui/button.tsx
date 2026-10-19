import { cn } from "@/lib/utils";

type Variant = "primary" | "ghost" | "danger";

const styles: Record<Variant, string> = {
  primary:
    "bg-[var(--pw-primary)] text-[var(--pw-on-primary)] hover:opacity-90",
  ghost:
    "bg-[var(--pw-surface-indigo)] text-[var(--pw-ink)] hover:opacity-90",
  danger:
    "bg-[var(--pw-magenta)] text-[var(--pw-ink)] hover:opacity-90",
};

export function Button({
  className,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-[var(--pw-rounded-sm)] px-6 py-3 text-base font-medium transition disabled:opacity-50 disabled:cursor-not-allowed",
        styles[variant],
        className,
      )}
      {...props}
    />
  );
}
