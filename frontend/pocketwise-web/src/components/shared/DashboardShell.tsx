"use client";

import { Fragment, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLogout } from "@/features/auth/hooks/useAuthMutations";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { useUserSettings } from "@/features/settings/hooks/useSettings";
import { NotificationBell } from "@/features/notifications/components/NotificationBell";
import { useSignalRNotifications } from "@/features/notifications/hooks/useSignalRNotifications";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  ArrowLeftFromLine,
  ArrowRightFromLine,
  ArrowRightLeft,
  CreditCard,
  FileUp,
  History,
  ChartNoAxesCombined,
  LoaderCircle,
  LogOut,
  Menu,
  PieChart,
  Repeat,
  Settings2,
  ShieldCheck,
  UserRoundCog,
  Wallet,
  Tags,
  WalletCards,
  X,
} from "lucide-react";

const nav = [
  { href: "/transactions", label: "รายการ", icon: ChartNoAxesCombined },
  { href: "/imports", label: "นำเข้าข้อมูล", icon: FileUp },
  { href: "/budgets", label: "งบประมาณ", icon: Wallet },
  { href: "/credit-cards", label: "บัตรเครดิต", icon: CreditCard },
  { href: "/recurring-transactions", label: "รายการประจำ", icon: Repeat },
  { href: "/categorization", label: "จัดหมวดอัตโนมัติ", icon: Settings2 },
  { href: "/reports", label: "รายงาน", icon: PieChart },
  { href: "/categories", label: "หมวดหมู่", icon: Tags },
  { href: "/tags", label: "แท็ก", icon: Tags },
  { href: "/bank-accounts", label: "บัญชี", icon: WalletCards },
  { href: "/transfers", label: "โอนเงิน", icon: ArrowRightLeft },
  { href: "/audit-logs", label: "ประวัติการใช้งาน", icon: History },
  { href: "/settings", label: "ตั้งค่าและโปรไฟล์", icon: UserRoundCog },
  { href: "/admin/permissions", label: "สิทธิ์และบทบาท (Admin)", icon: ShieldCheck },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const logout = useLogout();
  const { data: user } = useCurrentUser();
  const { data: settings } = useUserSettings();
  useSignalRNotifications(Boolean(user));
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    if (!isMobileOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMobileOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [isMobileOpen]);

  useEffect(() => {
    if (!settings) return;
    document.documentElement.dataset.theme = settings.theme;
    document.documentElement.lang = settings.locale;
  }, [settings]);

  const toggleNavigation = () => {
    if (window.matchMedia("(min-width: 768px)").matches) {
      setIsCollapsed((collapsed) => !collapsed);
      return;
    }
    setIsMobileOpen((open) => !open);
  };

  const closeNavigation = () => setIsMobileOpen(false);
  const iconOnly = isCollapsed;
  const visibleNav = nav.filter((item) => item.href !== "/admin/permissions" || !user?.roles || user.roles.includes("Admin"));

  return (
    <div className="min-h-dvh">
      <div
        role="presentation"
        aria-hidden={!isMobileOpen}
        className={cn(
          "fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity duration-300 ease-in-out md:hidden",
          isMobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={closeNavigation}
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-dvh w-72 flex-col overflow-y-auto border-r border-[var(--pw-hairline)] bg-[var(--pw-surface-black)] p-3 shadow-2xl transition-all duration-300 ease-in-out md:p-4 md:shadow-none",
          isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          isCollapsed ? "md:w-20" : "md:w-72",
        )}
      >
        <div className={cn("mb-5 w-full", iconOnly && "md:hidden")}>
          <div className="flex w-full items-center justify-between rounded-[var(--pw-rounded-sm)] bg-[var(--pw-primary)] px-3 py-2 text-base font-bold text-[var(--pw-on-primary)]">
            <div className="flex min-w-0 items-center gap-2">
              <Image
                src="/app-icon.png"
                alt="PocketWise icon"
                width={32}
                height={32}
                priority
                className="size-8 shrink-0 object-contain drop-shadow"
              />
              <span className="truncate">PocketWise</span>
            </div>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="size-7 shrink-0 text-white hover:bg-white/20 md:hidden"
              aria-label="ปิดเมนู"
              onClick={closeNavigation}
            >
              <X className="size-4" />
            </Button>
          </div>
          <div className="mt-2 flex w-full items-center justify-between gap-1.5 rounded-[var(--pw-rounded-sm)] border border-[var(--pw-hairline)] bg-[var(--pw-surface-indigo)] p-1.5">
            <p className="min-w-0 flex-1 truncate px-1 text-sm text-[var(--pw-link)]">
              {user?.displayName
                ? /[\u0E00-\u0E7F]/u.test(user.displayName)
                  ? `สวัสดี คุณ ${user.displayName}`
                  : `Welcome, ${user.displayName}`
                : "..."}
            </p>
            <NotificationBell className="size-8 shrink-0 text-[var(--pw-ink)] hover:text-white" />
          </div>
        </div>

        {iconOnly && (
          <div className="mb-5 hidden flex-col items-center gap-2 md:flex">
            <Image
              src="/app-icon.png"
              alt="PocketWise icon"
              width={40}
              height={40}
              priority
              className="size-10 shrink-0 object-contain drop-shadow"
            />
            <NotificationBell className="size-8 text-[var(--pw-ink)] hover:text-white" />
          </div>
        )}

        <TooltipProvider>
          <nav aria-label="เมนูหลัก" className="space-y-1 rounded-[var(--pw-rounded-sm)] bg-[var(--pw-canvas)] p-2">
            {visibleNav.map((item) => {
              const Icon = item.icon;
              const active = pathname.startsWith(item.href);
              const link = (
                <Link
                  href={item.href}
                  aria-label={item.label}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center gap-3 rounded-[var(--pw-rounded-sm)] px-3 py-2 text-sm transition",
                    iconOnly && "md:justify-center md:px-0",
                    active
                      ? "bg-[var(--pw-primary)] text-[var(--pw-on-primary)]"
                      : "text-[var(--pw-ink)]/75 hover:bg-[var(--pw-surface-indigo)] hover:text-[var(--pw-ink)]",
                  )}
                  onClick={closeNavigation}
                >
                  <Icon className="size-5 shrink-0" />
                  <span className={cn("truncate", iconOnly && "md:hidden")}>{item.label}</span>
                </Link>
              );

              return iconOnly ? (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              ) : (
                <Fragment key={item.href}>{link}</Fragment>
              );
            })}
          </nav>
        </TooltipProvider>

        <div className="mt-auto border-t border-[var(--pw-hairline)] pt-3">
          <div className="hidden md:block">
            <Button
              type="button"
              size={iconOnly ? "icon" : "default"}
              variant="ghost"
              className="w-full"
              aria-label="ย่อ/ขยายเมนู"
              title={iconOnly ? "ขยายเมนู" : "ย่อเมนู"}
              onClick={toggleNavigation}
            >
              {iconOnly
                ? <ArrowRightFromLine />
                : <ArrowLeftFromLine />}
              <span className={cn(iconOnly && "md:hidden")}>ย่อเมนู</span>
            </Button>
          </div>
          <Button
            variant="destructive"
            className={cn("mt-2 w-full", iconOnly && "md:px-0")}
            size={iconOnly ? "icon" : "default"}
            aria-label="ออกจากระบบ"
            title={iconOnly ? "ออกจากระบบ" : undefined}
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
          >
            {logout.isPending
              ? <LoaderCircle className="animate-spin" />
              : <LogOut />}
            <span className={cn(iconOnly && "md:hidden")}>
              {logout.isPending ? "กำลังออกจากระบบ..." : "ออกจากระบบ"}
            </span>
          </Button>
        </div>
      </aside>

      <main className={cn("flex min-h-dvh min-w-0 flex-col transition-[margin] duration-300", isCollapsed ? "md:ml-20" : "md:ml-72")}>
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[var(--pw-hairline)] bg-[var(--pw-canvas)]/95 px-3 backdrop-blur md:hidden">
          <div className="flex items-center gap-3">
            <Button type="button" size="icon" variant="ghost" aria-label="เปิดเมนู" onClick={toggleNavigation}>
              <Menu />
            </Button>
            <span className="truncate text-base font-bold text-[var(--pw-on-primary)]">PocketWise</span>
          </div>
          <NotificationBell />
        </header>
        <div className="flex-1 p-3 pb-8 sm:p-6">{children}</div>
        <footer className="border-t border-[var(--pw-hairline)] px-3 py-4 text-center text-xs text-[var(--pw-ink)]/55 sm:px-6">
          © 2026 PocketWise. All rights reserved.
        </footer>
      </main>
    </div>
  );
}
