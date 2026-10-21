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
  ChevronDown,
  CreditCard,
  FileUp,
  FolderTree,
  History,
  Landmark,
  LoaderCircle,
  LogOut,
  Menu,
  PieChart,
  ReceiptText,
  Repeat,
  ShieldCheck,
  Sparkles,
  Tags,
  UserRoundCog,
  Wallet,
  X,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tooltip?: string;
}

const mainNav: NavItem[] = [
  { href: "/transactions", label: "รายการ", icon: ReceiptText },
  { href: "/imports", label: "นำเข้าข้อมูล", icon: FileUp },
  { href: "/budgets", label: "งบประมาณ", icon: Wallet },
  { href: "/credit-cards", label: "บัตรเครดิต", icon: CreditCard },
  { href: "/recurring-transactions", label: "รายการประจำ", icon: Repeat },
  { href: "/categorization", label: "จัดหมวดอัตโนมัติ", icon: Sparkles },
  { href: "/reports", label: "รายงาน", icon: PieChart },
  { href: "/categories", label: "หมวดหมู่", icon: FolderTree },
  { href: "/tags", label: "แท็ก", icon: Tags },
  { href: "/bank-accounts", label: "บัญชี", icon: Landmark },
  { href: "/transfers", label: "โอนเงิน", icon: ArrowRightLeft },
  { href: "/settings", label: "ตั้งค่าและโปรไฟล์", icon: UserRoundCog },
];

const adminNav: NavItem[] = [
  { href: "/admin/permissions", label: "สิทธิ์และบทบาท", tooltip: "สิทธิ์และบทบาท (Admin)", icon: ShieldCheck },
  { href: "/admin/categories", label: "หมวดหมู่มาตรฐาน", tooltip: "หมวดหมู่มาตรฐาน (Admin)", icon: FolderTree },
  { href: "/audit-logs", label: "ประวัติการใช้งาน", tooltip: "ประวัติการใช้งาน (Admin)", icon: History },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const logout = useLogout();
  const { data: user } = useCurrentUser();
  const { data: settings } = useUserSettings();
  useSignalRNotifications(Boolean(user));
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(true);

  const isAdmin = user?.roles?.includes("Admin") ?? false;

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

  const renderNavItem = (item: NavItem) => {
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
            ? "bg-[var(--pw-primary)] font-medium text-[var(--pw-on-primary)]"
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
        <TooltipContent side="right">{item.tooltip ?? item.label}</TooltipContent>
      </Tooltip>
    ) : (
      <Fragment key={item.href}>{link}</Fragment>
    );
  };

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
            <div className="flex min-w-0 items-center gap-2.5">
              <Image
                src="/brand-logo.png"
                alt="PocketWise brand"
                width={42}
                height={42}
                priority
                className="size-10.5 shrink-0 object-contain drop-shadow"
              />
              <span className="truncate text-base font-bold">PocketWise</span>
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
              src="/brand-logo.png"
              alt="PocketWise brand"
              width={48}
              height={48}
              priority
              className="size-12 shrink-0 object-contain drop-shadow"
            />
            <NotificationBell className="size-8 text-[var(--pw-ink)] hover:text-white" />
          </div>
        )}

        <TooltipProvider>
          <nav aria-label="เมนูหลัก" className="space-y-1 rounded-[var(--pw-rounded-sm)] bg-[var(--pw-canvas)] p-2">
            {/* เมนูทั่วไป */}
            {mainNav.map(renderNavItem)}

            {/* กลุ่มเมนู Admin */}
            {isAdmin && (
              <div className="pt-2">
                <div className="my-2 border-t border-[var(--pw-hairline)]" />

                {/* ส่วนหัวกลุ่ม Admin */}
                <div className={cn("px-1", iconOnly && "md:hidden")}>
                  <button
                    type="button"
                    onClick={() => setIsAdminOpen((open) => !open)}
                    className="flex w-full items-center justify-between rounded-[var(--pw-rounded-sm)] px-2.5 py-1.5 text-xs font-semibold text-[var(--pw-ink)]/70 hover:bg-[var(--pw-surface-indigo)] hover:text-[var(--pw-ink)] transition"
                    aria-expanded={isAdminOpen}
                    aria-label="ย่อ/ขยายเมนูผู้ดูแลระบบ"
                  >
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="size-4 text-[var(--pw-primary)]" />
                      <span className="uppercase tracking-wider">ผู้ดูแลระบบ (Admin)</span>
                    </div>
                    <ChevronDown
                      className={cn(
                        "size-3.5 transition-transform duration-200 text-[var(--pw-ink)]/50",
                        isAdminOpen ? "rotate-180" : "rotate-0"
                      )}
                    />
                  </button>
                </div>

                {/* รายการเมนู Admin */}
                <div className={cn("mt-1 space-y-1", !isAdminOpen && !iconOnly && "hidden md:hidden")}>
                  {adminNav.map(renderNavItem)}
                </div>
              </div>
            )}
          </nav>
        </TooltipProvider>

        <div className="mt-auto border-t border-[var(--pw-hairline)] pt-3">
          <div className="hidden md:block">
            <Button
              type="button"
              size={iconOnly ? "icon" : "default"}
              variant="outline"
              className={cn(
                "w-full border border-[var(--pw-input-border)] bg-[var(--pw-surface-indigo)] shadow-xs transition-colors hover:bg-[var(--pw-surface-onyx)]",
                iconOnly && "md:px-0"
              )}
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
          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="border-[var(--pw-input-border)]/60 bg-[var(--pw-surface-indigo)] shadow-xs"
              aria-label="เปิดเมนู"
              onClick={toggleNavigation}
            >
              <Menu />
            </Button>
            <div className="flex items-center gap-2">
              <Image
                src="/brand-logo.png"
                alt="PocketWise brand"
                width={36}
                height={36}
                priority
                className="size-9 shrink-0 object-contain drop-shadow"
              />
              <span className="truncate text-base font-bold text-[var(--pw-on-primary)]">PocketWise</span>
            </div>
          </div>
          <NotificationBell />
        </header>
        <div className="flex-1 p-3 pb-8 sm:p-6">{children}</div>
        <footer className="border-t border-[var(--pw-hairline)] px-3 py-4 text-xs text-[var(--pw-ink)]/55 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-2 text-center sm:flex-row sm:text-left">
            <span>© 2026 PocketWise. สงวนลิขสิทธิ์ทุกประการ</span>
            <div className="flex items-center gap-3">
              <Link
                href="/privacy-policy"
                className="transition-colors hover:text-[var(--pw-ink)] hover:underline"
              >
                นโยบายความเป็นส่วนตัว
              </Link>
              <span>•</span>
              <Link
                href="/terms"
                className="transition-colors hover:text-[var(--pw-ink)] hover:underline"
              >
                ข้อกำหนดการใช้งาน
              </Link>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
