import { cn } from "@/lib/utils";

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[var(--pw-rounded-lg)] bg-[var(--pw-surface-indigo)] p-6",
        className,
      )}
      {...props}
    />
  );
}
