"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLogout } from "@/features/auth/hooks/useAuthMutations";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/transactions", label: "รายการ" },
  { href: "/categories", label: "หมวดหมู่" },
  { href: "/tags", label: "แท็ก" },
  { href: "/bank-accounts", label: "บัญชี" },
  { href: "/transfers", label: "โอนเงิน" },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const logout = useLogout();
  const { data: user } = useCurrentUser();

  return (
    <div className="flex min-h-screen">
      <aside className="w-60 shrink-0 border-r border-[var(--pw-hairline)] bg-[var(--pw-surface-black)] p-4">
        <div className="mb-6 px-2 text-lg font-bold">PocketWise</div>
        <nav className="space-y-1">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "block rounded-[var(--pw-rounded-sm)] px-3 py-2 text-sm transition",
                pathname.startsWith(item.href)
                  ? "bg-[var(--pw-primary)] text-[var(--pw-on-primary)]"
                  : "text-[var(--pw-ink)]/80 hover:bg-[var(--pw-surface-indigo)]",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-8 border-t border-[var(--pw-hairline)] pt-4">
          <p className="mb-2 px-2 text-sm text-[var(--pw-ink)]/70">
            {user?.displayName ?? "..."}
          </p>
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
          >
            ออกจากระบบ
          </Button>
        </div>
      </aside>

      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
