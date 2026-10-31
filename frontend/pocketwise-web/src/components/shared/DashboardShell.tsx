"use client";

import { Fragment, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { useLogout } from "@/features/auth/hooks/useAuthMutations";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { useUserSettings } from "@/features/settings/hooks/useSettings";
import { NotificationBell } from "@/features/notifications/components/NotificationBell";
import { useSignalRNotifications } from "@/features/notifications/hooks/useSignalRNotifications";
import { ActiveAnnouncementsBanner } from "@/features/admin-operations/components/ActiveAnnouncementsBanner";
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
  ArrowRightLeft,
  ChevronDown,
  ChevronLeft,
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
  LayoutDashboard,
  Users,
  FileStack,
  ShieldAlert,
  Megaphone,
  Sliders,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tooltip?: string;
  permission?: string;
}

const mainNav: NavItem[] = [
  { href: "/transactions", label: "รายการ", icon: ReceiptText },
  { href: "/imports", label: "นำเข้าข้อมูล", icon: FileUp },
  { href: "/budgets", label: "งบประมาณ", icon: Wallet },
  { href: "/credit-cards", label: "บัตรเครดิต", icon: CreditCard },
  { href: "/recurring-transactions", label: "รายการประจำ", icon: Repeat },
  { href: "/categorization", label: "จัดหมวดอัตโนมัติ", icon: Sparkles, permission: "CATEGORIZATION_VIEW" },
  { href: "/reports", label: "รายงาน", icon: PieChart },
  { href: "/categories", label: "หมวดหมู่", icon: FolderTree },
  { href: "/tags", label: "แท็ก", icon: Tags },
  { href: "/bank-accounts", label: "บัญชี", icon: Landmark },
  { href: "/transfers", label: "โอนเงิน", icon: ArrowRightLeft },
  { href: "/settings", label: "ตั้งค่าและโปรไฟล์", icon: UserRoundCog },
];

const adminNav: NavItem[] = [
  { href: "/admin/overview", label: "ภาพรวมระบบ", tooltip: "ภาพรวมระบบ (Admin)", icon: LayoutDashboard },
  { href: "/admin/users", label: "จัดการผู้ใช้งาน", tooltip: "จัดการผู้ใช้งาน (Admin)", icon: Users },
  { href: "/admin/imports", label: "งานนำเข้าทั้งระบบ", tooltip: "งานนำเข้าทั้งระบบ (Admin)", icon: FileStack },
  { href: "/admin/security-events", label: "เหตุการณ์ความปลอดภัย", tooltip: "เหตุการณ์ความปลอดภัย (Admin)", icon: ShieldAlert },
  { href: "/admin/announcements", label: "ประกาศระบบ", tooltip: "ประกาศระบบ (Admin)", icon: Megaphone },
  { href: "/admin/permissions", label: "สิทธิ์และบทบาท", tooltip: "สิทธิ์และบทบาท (Admin)", icon: ShieldCheck },
  { href: "/admin/categories", label: "หมวดหมู่มาตรฐาน", tooltip: "หมวดหมู่มาตรฐาน (Admin)", icon: FolderTree },
  { href: "/admin/settings", label: "การตั้งค่าระบบ", tooltip: "การตั้งค่าระบบ & Maintenance (Admin)", icon: Sliders },
  { href: "/audit-logs", label: "ประวัติการใช้งาน", tooltip: "ประวัติการใช้งาน (Admin)", icon: History },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useLogout();
  const { data: user, isError } = useCurrentUser();
  const { data: settings } = useUserSettings();
  useSignalRNotifications(Boolean(user));
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(true);

  const isAdmin = user?.roles?.includes("Admin") ?? false;

  useEffect(() => {
    if (isError) {
      window.location.href = `/login?from=${encodeURIComponent(pathname)}`;
    }
  }, [isError, pathname]);

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
    try {
      localStorage.setItem("pocketwise-theme", settings.theme);
    } catch {}
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
          "group relative flex min-h-11 items-center gap-3 rounded-[var(--pw-rounded-sm)] px-3 py-2 text-sm transition-all duration-150 active:scale-[0.98]",
          iconOnly && "md:justify-center md:px-0",
          active
            ? "font-medium text-[var(--pw-on-primary)]"
            : "text-[var(--pw-ink)]/75 hover:bg-[var(--pw-surface-indigo)]/70 hover:text-[var(--pw-ink)] md:hover:translate-x-0.5",
        )}
        onClick={closeNavigation}
      >
        {active && (
          <motion.div
            layoutId="activeNavIndicator"
            className="absolute inset-0 rounded-[var(--pw-rounded-sm)] bg-[var(--pw-primary)] shadow-md shadow-[var(--pw-primary)]/20"
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
          />
        )}
        <span className={cn("relative z-10 flex items-center gap-3", iconOnly ? "md:justify-center" : "w-full")}>
          <Icon className="size-5 shrink-0 transition-transform duration-200 group-hover:scale-110" />
          <span className={cn("truncate", iconOnly && "md:hidden")}>{item.label}</span>
        </span>
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
      {/* Mobile Drawer Backdrop with blur and smooth fade */}
      <div
        role="presentation"
        aria-hidden={!isMobileOpen}
        className={cn(
          "fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] md:hidden",
          isMobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={closeNavigation}
      />

      {/* Main Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-dvh w-72 flex-col overflow-hidden border-r border-[var(--pw-hairline)] bg-[var(--pw-surface-black)]/95 backdrop-blur-xl p-3 shadow-2xl transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] md:p-4 md:shadow-none",
          isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          isCollapsed ? "md:w-20" : "md:w-72",
        )}
      >
        {/* Pinned Top Brand & Greeting (Locked, never scrolls) */}
        <div className="shrink-0 mb-2">
          <div className={cn("w-full", iconOnly && "md:hidden")}>
            <div className="flex w-full items-center justify-between rounded-[var(--pw-rounded-sm)] bg-[var(--pw-primary)] px-3 py-2 text-base font-bold text-[var(--pw-on-primary)] shadow-sm">
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
                className="size-7 shrink-0 !bg-transparent border-transparent text-white hover:!bg-white/20 active:scale-90 transition-transform md:hidden"
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
              <NotificationBell className="size-8 shrink-0 text-[var(--pw-ink)] hover:text-[var(--pw-primary)]" />
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
              <NotificationBell className="size-8 text-[var(--pw-ink)] hover:text-[var(--pw-primary)]" />
            </div>
          )}
        </div>

        {/* Scrollable Navigation Area */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1">
          <TooltipProvider>
            <nav aria-label="เมนูหลัก" className="space-y-1 rounded-[var(--pw-rounded-sm)] bg-[var(--pw-canvas)] p-2">
              {/* เมนูทั่วไป */}
              {mainNav
                .filter((item) => !item.permission || isAdmin || user?.permissions?.includes(item.permission))
                .map(renderNavItem)}

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
                  <AnimatePresence initial={false}>
                    {(isAdminOpen || iconOnly) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="mt-1 space-y-1">
                          {adminNav.map(renderNavItem)}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </nav>
          </TooltipProvider>
        </div>

        {/* Pinned Bottom Actions (Locked, never scrolls) */}
        <div className="shrink-0 mt-auto border-t border-[var(--pw-hairline)] pt-3">
          <div className="hidden md:block">
            <Button
              type="button"
              size={iconOnly ? "icon" : "default"}
              variant="outline"
              className={cn(
                "w-full border border-[var(--pw-input-border)] bg-[var(--pw-surface-indigo)] shadow-xs transition-colors hover:bg-[var(--pw-surface-onyx)] active:scale-[0.98]",
                iconOnly && "md:px-0"
              )}
              aria-label={iconOnly ? "ขยายเมนู" : "ย่อเมนู"}
              title={iconOnly ? "ขยายเมนู" : "ย่อเมนู"}
              onClick={toggleNavigation}
            >
              <motion.div
                animate={{ rotate: isCollapsed ? 180 : 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="flex items-center justify-center shrink-0"
              >
                <ArrowLeftFromLine className="size-4" />
              </motion.div>
              <span className={cn("ml-2", iconOnly && "md:hidden")}>ย่อเมนู</span>
            </Button>
          </div>
          <Button
            variant="destructive"
            className={cn("mt-2 w-full active:scale-[0.98] transition-all", iconOnly && "md:px-0")}
            size={iconOnly ? "icon" : "default"}
            aria-label="ออกจากระบบ"
            title={iconOnly ? "ออกจากระบบ" : undefined}
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
          >
            {logout.isPending
              ? <LoaderCircle className="animate-spin" />
              : <LogOut className="size-4 shrink-0" />}
            <span className={cn("ml-1.5", iconOnly && "md:hidden")}>
              {logout.isPending ? "กำลังออกจากระบบ..." : "ออกจากระบบ"}
            </span>
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={cn("flex min-h-dvh min-w-0 flex-col transition-[margin] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]", isCollapsed ? "md:ml-20" : "md:ml-72")}>
        {/* Mobile Top Header with Back Navigation */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[var(--pw-hairline)] bg-[var(--pw-canvas)]/85 px-4 backdrop-blur-md md:hidden">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => router.back()}
              className="mr-1 -ml-1 p-2 rounded-lg text-[var(--pw-ink)]/75 hover:text-[var(--pw-ink)] hover:bg-[var(--pw-surface-onyx)] active:scale-90 transition-all flex items-center justify-center"
              aria-label="ย้อนกลับ"
              title="ย้อนกลับ"
            >
              <ChevronLeft className="size-5" />
            </button>
            <Image
              src="/brand-logo.png"
              alt="PocketWise brand"
              width={32}
              height={32}
              priority
              className="size-8 shrink-0 object-contain drop-shadow"
            />
            <span className="truncate text-base font-bold text-[var(--pw-ink)]">PocketWise</span>
          </div>
          <NotificationBell />
        </header>

        {/* Page Container with Stagger/Slide Entrance */}
        <div className="flex-1 p-3 pb-24 sm:p-6 sm:pb-8">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            <ActiveAnnouncementsBanner />
            {children}
          </motion.div>
        </div>

        {/* Footer */}
        <footer className="border-t border-[var(--pw-hairline)] bg-[var(--pw-canvas)]/40 backdrop-blur-xs px-3 py-4 mb-16 md:mb-0 text-xs text-[var(--pw-ink)]/55 sm:px-6">
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

      {/* Mobile Floating Bottom Bar */}
      <nav
        aria-label="เมนูด่วนบนมือถือ"
        className="fixed bottom-0 inset-x-0 z-30 flex h-16 items-center justify-around border-t border-[var(--pw-hairline)] bg-[var(--pw-surface-black)]/90 backdrop-blur-xl px-2 pb-[env(safe-area-inset-bottom)] md:hidden shadow-lg shadow-black/30"
      >
        <Link
          href="/transactions"
          className={cn(
            "relative flex flex-col items-center justify-center flex-1 h-full py-1 transition-transform active:scale-90",
            pathname.startsWith("/transactions")
              ? "text-[var(--pw-primary)] font-semibold"
              : "text-[var(--pw-ink)]/65 hover:text-[var(--pw-ink)]"
          )}
        >
          {pathname.startsWith("/transactions") && (
            <motion.div
              layoutId="mobileBottomIndicator"
              className="absolute top-1 w-8 h-0.75 rounded-full bg-[var(--pw-primary)] shadow-[0_0_8px_var(--pw-primary)]"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          <ReceiptText className="size-5 mt-1" />
          <span className="text-[10px] mt-0.5">รายการ</span>
        </Link>

        <Link
          href="/budgets"
          className={cn(
            "relative flex flex-col items-center justify-center flex-1 h-full py-1 transition-transform active:scale-90",
            pathname.startsWith("/budgets")
              ? "text-[var(--pw-primary)] font-semibold"
              : "text-[var(--pw-ink)]/65 hover:text-[var(--pw-ink)]"
          )}
        >
          {pathname.startsWith("/budgets") && (
            <motion.div
              layoutId="mobileBottomIndicator"
              className="absolute top-1 w-8 h-0.75 rounded-full bg-[var(--pw-primary)] shadow-[0_0_8px_var(--pw-primary)]"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          <Wallet className="size-5 mt-1" />
          <span className="text-[10px] mt-0.5">งบประมาณ</span>
        </Link>

        {/* Center Prominent AI Slip Scanner Button */}
        <Link
          href="/imports"
          className="relative flex flex-col items-center justify-center flex-1 -top-3 active:scale-95 transition-transform"
          aria-label="สแกนสลิป AI"
        >
          <div
            className={cn(
              "flex size-12 items-center justify-center rounded-full shadow-lg transition-all",
              pathname.startsWith("/imports")
                ? "bg-[var(--pw-primary)] text-[var(--pw-on-primary)] ring-3 ring-[var(--pw-primary)]/40 ring-offset-2 ring-offset-[var(--pw-surface-black)] shadow-[var(--pw-primary)]/50 scale-105"
                : "bg-linear-to-tr from-[var(--pw-primary)] to-blue-500 text-white shadow-blue-500/30 hover:brightness-110"
            )}
          >
            <Sparkles className="size-6 animate-pulse" />
          </div>
          <span
            className={cn(
              "text-[10px] mt-0.5 font-medium",
              pathname.startsWith("/imports")
                ? "text-[var(--pw-primary)] font-bold"
                : "text-[var(--pw-ink)]/75"
            )}
          >
            สแกนสลิป
          </span>
        </Link>

        <Link
          href="/reports"
          className={cn(
            "relative flex flex-col items-center justify-center flex-1 h-full py-1 transition-transform active:scale-90",
            pathname.startsWith("/reports")
              ? "text-[var(--pw-primary)] font-semibold"
              : "text-[var(--pw-ink)]/65 hover:text-[var(--pw-ink)]"
          )}
        >
          {pathname.startsWith("/reports") && (
            <motion.div
              layoutId="mobileBottomIndicator"
              className="absolute top-1 w-8 h-0.75 rounded-full bg-[var(--pw-primary)] shadow-[0_0_8px_var(--pw-primary)]"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          <PieChart className="size-5 mt-1" />
          <span className="text-[10px] mt-0.5">รายงาน</span>
        </Link>

        {/* More Menu Drawer Trigger */}
        <button
          type="button"
          onClick={toggleNavigation}
          className={cn(
            "relative flex flex-col items-center justify-center flex-1 h-full py-1 transition-transform active:scale-90",
            isMobileOpen || (!["/transactions", "/budgets", "/imports", "/reports"].some(p => pathname.startsWith(p)))
              ? "text-[var(--pw-primary)] font-semibold"
              : "text-[var(--pw-ink)]/65 hover:text-[var(--pw-ink)]"
          )}
          aria-label="เมนูทั้งหมด"
        >
          <div className="relative flex items-center justify-center">
            <Menu className="size-5 mt-1" />
          </div>
          <span className="text-[10px] mt-0.5">เมนู</span>
        </button>
      </nav>
    </div>
  );
}
