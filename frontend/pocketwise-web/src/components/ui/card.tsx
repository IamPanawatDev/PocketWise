import { cn } from "@/lib/utils";

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[var(--pw-rounded-lg)] border border-[var(--pw-hairline)] bg-card/95 backdrop-blur-md p-6 shadow-xs transition-all",
        className,
      )}
      {...props}
    />
  );
}
