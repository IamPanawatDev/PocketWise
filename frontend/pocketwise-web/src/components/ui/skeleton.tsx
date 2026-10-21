import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("pw-skeleton rounded-[var(--pw-rounded-sm)]", className)}
      aria-hidden="true"
      {...props}
    />
  );
}
