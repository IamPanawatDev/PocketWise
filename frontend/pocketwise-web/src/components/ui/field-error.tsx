import { cn } from "@/lib/utils";

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className={cn("mt-1 text-sm text-[var(--pw-magenta)]")}>{message}</p>
  );
}
