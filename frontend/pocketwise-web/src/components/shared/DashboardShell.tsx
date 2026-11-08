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
import { useUnreadNotificationCount } from "@/features/notifications/hooks/useNotifications";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { OfflineBanner } from "@/components/shared/OfflineBanner";
import { CommandPalette } from "@/components/shared/CommandPalette";
import { ActiveAnnouncementsBanner } from "@/features/admin-operations/components/ActiveAnnouncementsBanner";
import { Button } from "@/components/ui/button";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { TransactionForm } from "@/features/transactions/components/TransactionForm";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { triggerHaptic } from "@/lib/haptic";
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
  Plus,
  ReceiptText,
  Repeat,
  Search,
  ShieldCheck,
  Sparkles,
  Tags,
  UserRoundCog,
  User,
  Wallet,
  X,
  LayoutDashboard,
  Users,
  FileStack,
  ShieldAlert,
  Megaphone,
  Sliders,
  Smartphone,
  Download,
  Share,
  PlusSquare,
  Keyboard,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tooltip?: string;
  permission?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: "ธุรกรรม & บัญชี",
    items: [
      { href: "/transactions", label: "รายการ", icon: ReceiptText },
      { href: "/transfers", label: "โอนเงิน", icon: ArrowRightLeft },
      { href: "/imports", label: "นำเข้าข้อมูล", icon: FileUp },
      { href: "/bank-accounts", label: "บัญชี", icon: Landmark },
      { href: "/credit-cards", label: "บัตรเครดิต", icon: CreditCard },
    ],
  },
  {
    title: "การวางแผน & วิเคราะห์",
    items: [
      { href: "/budgets", label: "งบประมาณ", icon: Wallet },
      { href: "/recurring-transactions", label: "รายการประจำ", icon: Repeat },
      { href: "/reports", label: "รายงาน", icon: PieChart },
    ],
  },
  {
    title: "การจัดการ & ตั้งค่า",
    items: [
      { href: "/categories", label: "หมวดหมู่", icon: FolderTree },
      { href: "/tags", label: "แท็ก", icon: Tags },
      { href: "/categorization", label: "จัดหมวด AI", icon: Sparkles, permission: "CATEGORIZATION_VIEW" },
      { href: "/settings", label: "ตั้งค่าบัญชี", icon: UserRoundCog },
    ],
  },
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


interface MobileMenuCardItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
  permission?: string;
}

interface MobileMenuGroup {
  title: string;
  items: MobileMenuCardItem[];
}

const mobileMenuGroups: MobileMenuGroup[] = [
  {
    title: "ธุรกรรม & การเงิน",
    items: [
      { href: "/transactions", label: "รายการ", icon: ReceiptText, color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/20" },
      { href: "/transfers", label: "โอนเงิน", icon: ArrowRightLeft, color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/20" },
      { href: "/imports", label: "นำเข้าสลิป", icon: FileUp, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
      { href: "/bank-accounts", label: "บัญชีธนาคาร", icon: Landmark, color: "text-teal-400", bg: "bg-teal-500/10 border-teal-500/20" },
      { href: "/credit-cards", label: "บัตรเครดิต", icon: CreditCard, color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/20" },
    ],
  },
  {
    title: "วางแผน & วิเคราะห์",
    items: [
      { href: "/budgets", label: "งบประมาณ", icon: Wallet, color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/20" },
      { href: "/recurring-transactions", label: "รายการประจำ", icon: Repeat, color: "text-sky-400", bg: "bg-sky-500/10 border-sky-500/20" },
      { href: "/reports", label: "รายงานการเงิน", icon: PieChart, color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/20" },
    ],
  },
  {
    title: "จัดการ & ตั้งค่า",
    items: [
      { href: "/categories", label: "หมวดหมู่", icon: FolderTree, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
      { href: "/tags", label: "แท็กรายการ", icon: Tags, color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
      { href: "/categorization", label: "จัดหมวด AI", icon: Sparkles, color: "text-fuchsia-400", bg: "bg-fuchsia-500/10 border-fuchsia-500/20", permission: "CATEGORIZATION_VIEW" },
      { href: "/settings", label: "ตั้งค่าบัญชี", icon: UserRoundCog, color: "text-slate-400", bg: "bg-slate-500/10 border-slate-500/20" },
    ],
  },
];

const adminMobileShortcuts: MobileMenuCardItem[] = [
  { href: "/admin/overview", label: "ภาพรวมระบบ", icon: LayoutDashboard, color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/20" },
  { href: "/admin/users", label: "จัดการผู้ใช้งาน", icon: Users, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
  { href: "/admin/imports", label: "งานนำเข้าระบบ", icon: FileStack, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
  { href: "/admin/security-events", label: "ความปลอดภัย", icon: ShieldAlert, color: "text-rose-500", bg: "bg-rose-500/10 border-rose-500/20" },
  { href: "/admin/announcements", label: "ประกาศระบบ", icon: Megaphone, color: "text-sky-400", bg: "bg-sky-500/10 border-sky-500/20" },
  { href: "/admin/permissions", label: "สิทธิ์และบทบาท", icon: ShieldCheck, color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/20" },
  { href: "/admin/categories", label: "หมวดมาตรฐาน", icon: FolderTree, color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/20" },
  { href: "/admin/settings", label: "การตั้งค่าระบบ", icon: Sliders, color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/20" },
  { href: "/audit-logs", label: "ประวัติการใช้งาน", icon: History, color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
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
  const { data: unreadData } = useUnreadNotificationCount();
  const unreadCount = unreadData?.unreadCount ?? 0;
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<(Event & { prompt: () => void; userChoice: Promise<{ outcome: string }> }) | null>(null);

  const [maintenanceModeInfo, setMaintenanceModeInfo] = useState<{ message: string; endsAt?: string } | null>(null);

  useEffect(() => {
    const handleMaintenance = (e: Event) => {
      const customEvent = e as CustomEvent<{ message: string; data?: { endsAt?: string } }>;
      setMaintenanceModeInfo({
        message: customEvent.detail?.message || "ระบบกำลังอยู่ระหว่างปรับปรุงประสิทธิภาพ กรุณากลับมาใหม่อีกครั้งในภายหลัง",
        endsAt: customEvent.detail?.data?.endsAt,
      });
    };
    window.addEventListener("pocketwise:maintenance-active", handleMaintenance);
    // Render with Maintenance Mode Guard
    return (
) => window.removeEventListener("pocketwise:maintenance-active", handleMaintenance);
  }, []);

  const [showIosInstallGuide, setShowIosInstallGuide] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState({
    isIos: false,
    isIosChrome: false,
    isStandalone: false,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ua = window.navigator.userAgent || "";
    const isIosDevice = /iPad|iPhone|iPod/.test(ua) || (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);
    const isChrome = /CriOS/i.test(ua);
    const isStandaloneMode = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    const timer = setTimeout(() => {
      setDeviceInfo({
        isIos: isIosDevice,
        isIosChrome: isIosDevice && isChrome,
        isStandalone: Boolean(isStandaloneMode),
      });
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as Event & { prompt: () => void; userChoice: Promise<{ outcome: string }> });

    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setDeferredPrompt(null);

      }
    } else {
      setShowIosInstallGuide(true);
    }
  };

  useEffect(() => {
    const handleOpen = () => setIsQuickAddOpen(true);
    window.addEventListener("pocketwise:open-transaction-form", handleOpen);
    return () => window.removeEventListener("pocketwise:open-transaction-form", handleOpen);
  }, []);
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === "?" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setIsShortcutsModalOpen((prev) => !prev);
      } else if ((e.key === "n" || e.key === "N") && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setIsQuickAddOpen(true);
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);


  const isAdmin = (user?.roles?.includes("Admin") || user?.roles?.includes("SuperAdmin")) ?? false;

  useEffect(() => {
    if (isError) {
      router.push(`/login?from=${encodeURIComponent(pathname)}`);
    }
  }, [isError, pathname, router]);

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
      {/* Offline Detection Banner */}
      <OfflineBanner />
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
          "w-[84vw] max-w-[320px] sm:w-80",
          isCollapsed ? "md:w-20" : "md:w-72",
        )}
      >
        {/* Pinned Top Brand & User Card with Avatar + Bell */}
        <div className="shrink-0 mb-3">
          <div className={cn("w-full", iconOnly && "md:hidden")}>
            {/* Brand Header Card: Glassmorphic Aurora */}
            <div className="group relative flex w-full items-center justify-between overflow-hidden rounded-2xl border border-[var(--pw-hairline)] bg-gradient-to-r from-[var(--pw-primary)]/15 via-indigo-500/10 to-blue-500/10 px-3 py-2.5 shadow-xs backdrop-blur-xl transition-all duration-300 hover:border-[var(--pw-primary)]/30">
              {/* Subtle ambient glow / highlight inside */}
              <div className="pointer-events-none absolute -top-10 -left-10 size-24 rounded-full bg-[var(--pw-primary)]/15 blur-xl transition-opacity group-hover:opacity-100" />
              <div className="pointer-events-none absolute -bottom-10 -right-10 size-24 rounded-full bg-blue-500/10 blur-xl transition-opacity group-hover:opacity-100" />

              <div className="relative z-10 flex min-w-0 items-center gap-2.5">
                {/* Mascot wrapper */}
                <div className="relative flex size-10.5 shrink-0 items-center justify-center rounded-xl border border-white/20 dark:border-white/10 bg-white/20 dark:bg-white/5 shadow-xs backdrop-blur-xs transition-transform duration-200 group-hover:scale-105">
                  <Image
                    src="/brand-logo.png"
                    alt="PocketWise brand"
                    width={40}
                    height={40}
                    priority
                    className="size-9 object-contain drop-shadow"
                  />
                </div>
                {/* Brand Typography */}
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-base font-bold tracking-tight text-[var(--pw-ink)] transition-colors group-hover:text-[var(--pw-primary)]">
                    PocketWise
                  </span>
                </div>
              </div>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                className="relative z-10 size-7 shrink-0 rounded-lg border border-[var(--pw-hairline)] bg-[var(--pw-surface-onyx)]/60 text-[var(--pw-ink)]/70 hover:bg-[var(--pw-surface-onyx)] hover:text-[var(--pw-ink)] active:scale-90 transition-transform md:hidden"
                aria-label="ปิดเมนู"
                onClick={closeNavigation}
              >
                <X className="size-4" />
              </Button>
            </div>

            {/* User Profile Card with Avatar & Notification Bell (Replaces old สวัสดีคุณ box) */}
            <div className="mt-2.5 rounded-2xl border border-[var(--pw-hairline)] bg-gradient-to-br from-[var(--pw-surface-indigo)]/90 to-[var(--pw-surface-onyx)]/90 p-2.5 shadow-xs backdrop-blur-md">
              <div className="flex items-center gap-2.5">
                <div className="relative flex size-10 items-center justify-center rounded-xl bg-gradient-to-tr from-[var(--pw-primary)] to-blue-500 text-sm font-bold text-white shadow-md shadow-[var(--pw-primary)]/20 shrink-0">
                  <User className="size-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-xs sm:text-sm font-semibold text-[var(--pw-ink)]">
                      {user?.displayName || "ผู้ใช้งาน"}
                    </p>
                    {isAdmin && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/15 px-1.5 py-0.2 text-[9px] font-medium text-amber-500 border border-amber-500/25 shrink-0">
                        <ShieldCheck className="size-2.5" />
                        Admin
                      </span>
                    )}
                  </div>
                  <p className="truncate text-[11px] text-[var(--pw-ink)]/55">{user?.email || "กำลังเชื่อมต่อ..."}</p>
                </div>
                {/* Notification Bell right inside Avatar Card */}
                <NotificationBell className="size-8 shrink-0 text-[var(--pw-ink)]/75 hover:text-[var(--pw-primary)]" />
              </div>
            </div>
          </div>

          {iconOnly && (
            <div className="mb-5 hidden flex-col items-center gap-3 md:flex">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-[var(--pw-hairline)] bg-gradient-to-br from-[var(--pw-primary)]/15 to-indigo-500/10 shadow-xs backdrop-blur-xs">
                <Image
                  src="/brand-logo.png"
                  alt="PocketWise brand"
                  width={38}
                  height={38}
                  priority
                  className="size-8.5 shrink-0 object-contain drop-shadow"
                />
              </div>
              <div className="relative flex size-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[var(--pw-primary)] to-blue-500 text-xs font-bold text-white shadow-md">
                <User className="size-4.5 text-white" />
              </div>
              <NotificationBell className="size-8 text-[var(--pw-ink)] hover:text-[var(--pw-primary)]" />
            </div>
          )}
        </div>

        {/* Mobile Command Hub Drawer (Mobile Only) */}
        <div className="flex md:hidden flex-col flex-1 min-h-0 overflow-hidden">
          {/* Scrollable Grouped Menus (Card Grid Style like Shortcuts) */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1 space-y-4 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
            {mobileMenuGroups.map((group) => {
              const visibleItems = group.items.filter(
                (item) => !item.permission || isAdmin || user?.permissions?.includes(item.permission)
              );
              if (visibleItems.length === 0) return null;

              return (
                <div key={group.title} className="space-y-1.5">
                  <p className="px-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--pw-ink)]/50">
                    {group.title}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {visibleItems.map((item) => {
                      const Icon = item.icon;
                      const active = pathname.startsWith(item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => {
                            triggerHaptic("light");
                            closeNavigation();
                          }}
                          className={cn(
                            "group relative flex items-center gap-2.5 rounded-xl border p-2.5 transition-all duration-150 active:scale-95",
                            active
                              ? "border-[var(--pw-primary)] bg-[var(--pw-primary)]/15 shadow-xs"
                              : "border-[var(--pw-hairline)] bg-[var(--pw-canvas)]/60 hover:bg-[var(--pw-surface-indigo)]/70"
                          )}
                        >
                          <div className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg border", item.bg)}>
                            <Icon className={cn("size-4", item.color)} />
                          </div>
                          <span className={cn("text-xs font-medium truncate", active ? "text-[var(--pw-primary)] font-semibold" : "text-[var(--pw-ink)]/85")}>
                            {item.label}
                          </span>
                          {active && (
                            <span className="absolute right-2 top-2 size-1.5 rounded-full bg-[var(--pw-primary)]" />
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Admin Section on Mobile with matching 2-column Card Grid */}
            {isAdmin && (
              <div className="space-y-1.5 pb-1">
                <button
                  type="button"
                  onClick={() => setIsAdminOpen((open) => !open)}
                  className="flex w-full items-center justify-between rounded-xl border border-[var(--pw-hairline)] bg-[var(--pw-canvas)]/60 px-3 py-2 text-xs font-semibold text-[var(--pw-ink)]/70 hover:bg-[var(--pw-surface-indigo)] transition cursor-pointer"
                  aria-expanded={isAdminOpen}
                  aria-label="ย่อ/ขยายเมนูผู้ดูแลระบบบนมือถือ"
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-4 text-amber-500" />
                    <span className="uppercase tracking-wider">ผู้ดูแลระบบ (Admin)</span>
                  </div>
                  <ChevronDown
                    className={cn(
                      "size-3.5 transition-transform duration-200 text-[var(--pw-ink)]/50",
                      isAdminOpen ? "rotate-180" : "rotate-0"
                    )}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {isAdminOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        {adminMobileShortcuts.map((item) => {
                          const Icon = item.icon;
                          const active = pathname.startsWith(item.href);
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={closeNavigation}
                              className={cn(
                                "group relative flex items-center gap-2.5 rounded-xl border p-2.5 transition-all duration-150 active:scale-95",
                                active
                                  ? "border-[var(--pw-primary)] bg-[var(--pw-primary)]/15 shadow-xs"
                                  : "border-[var(--pw-hairline)] bg-[var(--pw-canvas)]/60 hover:bg-[var(--pw-surface-indigo)]/70"
                              )}
                            >
                              <div className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg border", item.bg)}>
                                <Icon className={cn("size-4", item.color)} />
                              </div>
                              <span className={cn("text-xs font-medium truncate", active ? "text-[var(--pw-primary)] font-semibold" : "text-[var(--pw-ink)]/85")}>
                                {item.label}
                              </span>
                              {active && (
                                <span className="absolute right-2 top-2 size-1.5 rounded-full bg-[var(--pw-primary)]" />
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* PWA Mobile App Install Card */}
            <div className="rounded-2xl border border-[var(--pw-hairline)] bg-gradient-to-br from-[var(--pw-primary)]/10 via-[var(--pw-surface-indigo)]/80 to-[var(--pw-surface-onyx)]/80 p-3.5 shadow-sm backdrop-blur-md">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--pw-primary)] text-white shadow-md shadow-[var(--pw-primary)]/25">
                  <Smartphone className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs font-bold text-[var(--pw-ink)]">ติดตั้งเป็นแอปมือถือ</h4>
                    <span className="rounded-full bg-[var(--pw-primary)]/20 px-1.5 py-0.2 text-[9px] font-semibold text-[var(--pw-primary)]">PWA</span>
                  </div>
                  <p className="mt-1 text-[11px] text-[var(--pw-ink)]/65 leading-relaxed">
                    ติดตั้ง PocketWise ลงบนหน้าจอโฮมเพื่อเปิดใช้งานแบบเต็มจอ ไร้แถบเบราว์เซอร์กวนใจ และเข้าถึงหน้าจอได้อย่างรวดเร็ว
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleInstallApp}
                    className="mt-2.5 w-full h-8 text-xs font-semibold gap-1.5 bg-[var(--pw-primary)] hover:bg-[var(--pw-primary)]/90 text-white shadow-xs"
                  >
                    <Download className="size-3.5" />
                    <span>ติดตั้งแอป</span>
                  </Button>
                </div>
              </div>
            </div>

          </div>
        </div>
        {/* Desktop Scrollable Navigation Area (Hidden on mobile) */}
        <div className="hidden md:flex flex-col flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1">
          <TooltipProvider>
            <nav aria-label="เมนูหลัก" className="space-y-1 rounded-[var(--pw-rounded-sm)] bg-[var(--pw-canvas)] p-2">
              {/* เมนูทั่วไปจัดตามกลุ่ม */}
              {navGroups.map((group, groupIndex) => {
                const visibleItems = group.items.filter(
                  (item) => !item.permission || isAdmin || user?.permissions?.includes(item.permission)
                );
                if (visibleItems.length === 0) return null;

                return (
                  <div key={group.title} className={cn("space-y-1", groupIndex > 0 && "pt-2")}>
                    {iconOnly ? (
                      groupIndex > 0 && <div className="my-1.5 border-t border-[var(--pw-hairline)]" />
                    ) : (
                      <div className="px-2.5 pt-1.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--pw-ink)]/50 select-none">
                        {group.title}
                      </div>
                    )}
                    {visibleItems.map(renderNavItem)}
                  </div>
                );
              })}

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
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("pocketwise:open-command-palette"))}
              className="p-2 rounded-lg text-[var(--pw-ink)]/75 hover:text-[var(--pw-ink)] hover:bg-[var(--pw-surface-onyx)] active:scale-90 transition-all flex items-center justify-center cursor-pointer"
              aria-label="ค้นหาด่วน"
              title="ค้นหาด่วน (Ctrl+K)"
            >
              <Search className="size-5" />
            </button>
            <ThemeToggle />
          </div>
        </header>

        {/* Mobile Admin Quick Subnav Bar (< md) */}
        {(pathname.startsWith("/admin") || pathname === "/audit-logs") && (
          <div className="sticky top-14 z-20 flex items-center gap-1.5 overflow-x-auto scrollbar-none border-b border-[var(--pw-hairline)] bg-[var(--pw-surface-black)]/90 px-3 py-2 backdrop-blur-md md:hidden overscroll-contain">
            {adminMobileShortcuts.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all active:scale-95 shadow-2xs",
                    isActive
                      ? "bg-[var(--pw-primary)] text-white font-semibold shadow-xs"
                      : "border border-[var(--pw-hairline)] bg-[var(--pw-surface)]/80 text-[var(--pw-ink)]/75 hover:bg-[var(--pw-surface-indigo)]/70 hover:text-[var(--pw-ink)]"
                  )}
                >
                  <Icon className="size-3.5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        )}

        {/* Desktop Top-Right Floating Theme Toggle */}
        <div className="fixed top-3 right-6 z-30 hidden md:flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("pocketwise:open-command-palette"))}
            className="flex items-center gap-2 rounded-xl border border-[var(--pw-hairline)] bg-[var(--pw-surface-raised)]/80 px-3 py-1.5 text-xs text-[var(--pw-ink)]/65 hover:text-[var(--pw-ink)] hover:bg-[var(--pw-surface-indigo)]/70 shadow-2xs backdrop-blur-md transition-all active:scale-95 cursor-pointer"
            aria-label="ค้นหาด่วน (Ctrl+K)"
            title="ค้นหาด่วน (Ctrl+K)"
          >
            <Search className="size-3.5" />
            <span>ค้นหา...</span>
            <kbd className="rounded border border-[var(--pw-hairline)] bg-[var(--pw-canvas)] px-1.5 py-0.2 text-[10px] font-mono">
              Ctrl K
            </kbd>
          </button>
          <ThemeToggle />
        </div>

        {/* Page Container with Stagger/Slide Entrance */}
        <div className="flex-1 p-3 pb-24 sm:p-6 sm:pb-8">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            {maintenanceModeInfo && (
              <div className="mb-4 rounded-xl border border-[var(--pw-expense)]/30 bg-[var(--pw-expense)]/10 p-3 sm:p-4 text-xs sm:text-sm text-[var(--pw-expense)] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="size-4 shrink-0" />
                  <span>{maintenanceModeInfo.message}</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setMaintenanceModeInfo(null)}
                  className="min-h-[36px] px-3 text-xs shrink-0"
                >
                  ปิด
                </Button>
              </div>
            )}
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
          onClick={() => triggerHaptic("light")}
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
          href="/imports"
          onClick={() => triggerHaptic("light")}
          className={cn(
            "relative flex flex-col items-center justify-center flex-1 h-full py-1 transition-transform active:scale-90",
            pathname.startsWith("/imports")
              ? "text-[var(--pw-primary)] font-semibold"
              : "text-[var(--pw-ink)]/65 hover:text-[var(--pw-ink)]"
          )}
          aria-label="สแกนสลิป"
        >
          {pathname.startsWith("/imports") && (
            <motion.div
              layoutId="mobileBottomIndicator"
              className="absolute top-1 w-8 h-0.75 rounded-full bg-[var(--pw-primary)] shadow-[0_0_8px_var(--pw-primary)]"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          <Sparkles className="size-5 mt-1 text-[var(--pw-primary)] animate-pulse" />
          <span className="text-[10px] mt-0.5">สแกนสลิป</span>
        </Link>

        {/* Center Prominent Quick Add Button */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic("medium");
            setIsQuickAddOpen(true);
          }}
          className="relative flex flex-col items-center justify-center flex-1 -top-3 active:scale-95 transition-transform cursor-pointer group"
          aria-label="จดรายการด่วน"
        >
          <div
            className={cn(
              "flex size-12 items-center justify-center rounded-full shadow-lg transition-all",
              "bg-linear-to-tr from-[var(--pw-primary)] to-blue-500 text-white shadow-blue-500/35 hover:brightness-110 active:scale-90 group-hover:scale-105"
            )}
          >
            <Plus className="size-6 stroke-[2.5]" />
          </div>
          <span className="text-[10px] mt-0.5 font-medium text-[var(--pw-ink)]/85">
            จดด่วน
          </span>
        </button>

        <Link
          href="/reports"
          onClick={() => triggerHaptic("light")}
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
          onClick={() => {
            triggerHaptic("light");
            toggleNavigation();
          }}
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
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex size-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--pw-primary)] opacity-75" />
                <span className="relative inline-flex size-2.5 rounded-full bg-[var(--pw-primary)]" />
              </span>
            )}
          </div>
          <span className="text-[10px] mt-0.5">เมนู</span>
        </button>
      </nav>

      {/* Global Quick Add Transaction BottomSheet */}
      <BottomSheet
        open={isQuickAddOpen}
        onOpenChange={setIsQuickAddOpen}
        title="บันทึกรายการด่วน"
        description="บันทึกรายรับหรือรายจ่ายทันที"
      >
        <TransactionForm
          key={isQuickAddOpen ? "quick-add-open" : "quick-add-closed"}
          onClose={() => setIsQuickAddOpen(false)}
        />
      </BottomSheet>
      {/* Global Keyboard Shortcuts Cheat Sheet Dialog */}
      <BottomSheet
        open={isShortcutsModalOpen}
        onOpenChange={setIsShortcutsModalOpen}
        title={
          <div className="flex items-center gap-2">
            <Keyboard className="size-5 text-[var(--pw-primary)]" />
            <span>คีย์ลัดสำหรับคีย์บอร์ด (Keyboard Shortcuts)</span>
          </div>
        }
        description="ทางลัดสำหรับเพิ่มความสะดวกรวดเร็วในการจัดการข้อมูลการเงิน"
      >
        <div className="space-y-3 py-1">
          <div className="grid gap-2">
            <div className="flex items-center justify-between p-2.5 rounded-xl border border-[var(--pw-hairline)] bg-[var(--pw-surface-black)]/60">
              <div className="flex items-center gap-2.5">
                <kbd className="min-w-7 text-center px-2 py-1 rounded-md border border-[var(--pw-hairline)] bg-[var(--pw-canvas)] text-xs font-mono font-bold text-[var(--pw-ink)] shadow-2xs">
                  N
                </kbd>
                <span className="text-xs text-[var(--pw-ink)] font-medium">บันทึกรายการด่วน (New Transaction)</span>
              </div>
              <span className="text-[11px] text-[var(--pw-ink)]/50">ทุกหน้าจอ</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl border border-[var(--pw-hairline)] bg-[var(--pw-surface-black)]/60">
              <div className="flex items-center gap-2.5">
                <kbd className="min-w-7 text-center px-2 py-1 rounded-md border border-[var(--pw-hairline)] bg-[var(--pw-canvas)] text-xs font-mono font-bold text-[var(--pw-ink)] shadow-2xs">
                  Ctrl + K
                </kbd>
                <span className="text-xs text-[var(--pw-ink)] font-medium">เปิด Command Palette / ค้นหาด่วน</span>
              </div>
              <span className="text-[11px] text-[var(--pw-ink)]/50">ทุกหน้าจอ</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl border border-[var(--pw-hairline)] bg-[var(--pw-surface-black)]/60">
              <div className="flex items-center gap-2.5">
                <kbd className="min-w-7 text-center px-2 py-1 rounded-md border border-[var(--pw-hairline)] bg-[var(--pw-canvas)] text-xs font-mono font-bold text-[var(--pw-ink)] shadow-2xs">
                  ?
                </kbd>
                <span className="text-xs text-[var(--pw-ink)] font-medium">แสดงคู่มือคีย์ลัด (Shortcuts Cheat Sheet)</span>
              </div>
              <span className="text-[11px] text-[var(--pw-ink)]/50">ทุกหน้าจอ</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl border border-[var(--pw-hairline)] bg-[var(--pw-surface-black)]/60">
              <div className="flex items-center gap-2.5">
                <kbd className="min-w-7 text-center px-2 py-1 rounded-md border border-[var(--pw-hairline)] bg-[var(--pw-canvas)] text-xs font-mono font-bold text-[var(--pw-ink)] shadow-2xs">
                  Esc
                </kbd>
                <span className="text-xs text-[var(--pw-ink)] font-medium">ปิดหน้าต่าง / ยกเลิก (Close Modal)</span>
              </div>
              <span className="text-[11px] text-[var(--pw-ink)]/50">ทุกหน้าต่าง</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl border border-[var(--pw-hairline)] bg-[var(--pw-surface-black)]/60">
              <div className="flex items-center gap-2.5">
                <kbd className="min-w-7 text-center px-2 py-1 rounded-md border border-[var(--pw-hairline)] bg-[var(--pw-canvas)] text-xs font-mono font-bold text-[var(--pw-ink)] shadow-2xs">
                  + - * / =
                </kbd>
                <span className="text-xs text-[var(--pw-ink)] font-medium">คำนวณเงินด่วน (Quick Math เช่น 85+15)</span>
              </div>
              <span className="text-[11px] text-[var(--pw-ink)]/50">ช่องใส่ยอดเงิน</span>
            </div>
          </div>
        </div>
      </BottomSheet>



      {/* iOS / Browser Install Guide BottomSheet */}
      <BottomSheet
        open={showIosInstallGuide}
        onOpenChange={setShowIosInstallGuide}
        title={
          <div className="flex items-center gap-2">
            <Smartphone className="size-5 text-[var(--pw-primary)]" />
            <span>ติดตั้ง PocketWise บนหน้าจอโฮม</span>
          </div>
        }
        description={
          deviceInfo.isIosChrome
            ? "ขั้นตอนการติดตั้งสำหรับ Google Chrome บน iPhone / iPad"
            : deviceInfo.isIos
              ? "ขั้นตอนการติดตั้งสำหรับ Safari บน iPhone / iPad"
              : "วิธีติดตั้ง PocketWise ลงบนอุปกรณ์ของคุณ"
        }
      >
        <div className="space-y-4 py-2 text-xs text-[var(--pw-ink)]">
          {deviceInfo.isIosChrome ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 flex items-start gap-2.5">
                <Share className="size-5 shrink-0 text-blue-400 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm text-[var(--pw-ink)]">
                    ขั้นตอนที่ 1: แตะปุ่ม &quot;แชร์&quot; หรือเมนู &quot;...&quot;
                  </p>
                  <p className="text-[11px] text-[var(--pw-ink)]/70 mt-0.5">
                    แตะที่ไอคอนแชร์ <Share className="size-3.5 inline mx-0.5 text-blue-400" /> ที่มุมบนขวาของ Chrome หรือแตะที่ไอคอนเมนูสามจุด (...) ที่มุมล่างขวา
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 flex items-start gap-2.5">
                <PlusSquare className="size-5 shrink-0 text-emerald-400 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm text-[var(--pw-ink)]">
                    ขั้นตอนที่ 2: เลือก &quot;เพิ่มไปยังหน้าจอโฮม&quot;
                  </p>
                  <p className="text-[11px] text-[var(--pw-ink)]/70 mt-0.5">
                    เลื่อนรายการเมนูลงมา แล้วเลือกคำสั่ง <span className="font-semibold text-emerald-400">&quot;เพิ่มไปยังหน้าจอโฮม&quot; (Add to Home Screen)</span>
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-[var(--pw-hairline)] bg-[var(--pw-surface-indigo)]/40 p-3 flex items-start gap-2.5">
                <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--pw-primary)] text-white font-bold text-[10px]">
                  3
                </div>
                <div>
                  <p className="font-semibold text-sm text-[var(--pw-ink)]">
                    ขั้นตอนที่ 3: แตะ &quot;เพิ่ม&quot; (Add)
                  </p>
                  <p className="text-[11px] text-[var(--pw-ink)]/70 mt-0.5">
                    ตรวจสอบชื่อแอปเป็น &quot;PocketWise&quot; แล้วแตะปุ่ม &quot;เพิ่ม&quot; ที่มุมบนขวา ไอคอนแอปจะไปปรากฏบนหน้าจอโฮมของคุณทันที
                  </p>
                </div>
              </div>
            </div>
          ) : deviceInfo.isIos ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 flex items-start gap-2.5">
                <Share className="size-5 shrink-0 text-blue-400 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm text-[var(--pw-ink)]">
                    ขั้นตอนที่ 1: แตะปุ่มแชร์ใน Safari
                  </p>
                  <p className="text-[11px] text-[var(--pw-ink)]/70 mt-0.5">
                    แตะที่ไอคอนแชร์ <Share className="size-3.5 inline mx-0.5 text-blue-400" /> ที่แถบเครื่องมือด้านล่างสุดของหน้าจอ Safari
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 flex items-start gap-2.5">
                <PlusSquare className="size-5 shrink-0 text-emerald-400 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm text-[var(--pw-ink)]">
                    ขั้นตอนที่ 2: เลือก &quot;เพิ่มไปยังหน้าจอโฮม&quot;
                  </p>
                  <p className="text-[11px] text-[var(--pw-ink)]/70 mt-0.5">
                    เลื่อนหน้าต่างขึ้นมา แล้วแตะที่ <span className="font-semibold text-emerald-400">&quot;เพิ่มไปยังหน้าจอโฮม&quot; (Add to Home Screen)</span>
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-[var(--pw-hairline)] bg-[var(--pw-surface-indigo)]/40 p-3 flex items-start gap-2.5">
                <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--pw-primary)] text-white font-bold text-[10px]">
                  3
                </div>
                <div>
                  <p className="font-semibold text-sm text-[var(--pw-ink)]">
                    ขั้นตอนที่ 3: แตะปุ่ม &quot;เพิ่ม&quot;
                  </p>
                  <p className="text-[11px] text-[var(--pw-ink)]/70 mt-0.5">
                    แตะปุ่ม &quot;เพิ่ม&quot; (Add) ที่มุมขวาบนเพื่อนำแอปไปไว้บนหน้าจอโฮมของคุณ
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-xl border border-[var(--pw-hairline)] bg-[var(--pw-surface-indigo)]/40 p-3 flex items-start gap-2.5">
                <Download className="size-5 shrink-0 text-[var(--pw-primary)] mt-0.5" />
                <div>
                  <p className="font-semibold text-sm text-[var(--pw-ink)]">
                    ติดตั้งผ่านแถบที่อยู่เบราว์เซอร์ (Address Bar)
                  </p>
                  <p className="text-[11px] text-[var(--pw-ink)]/70 mt-0.5">
                    คลิกที่ไอคอน &quot;ติดตั้ง PocketWise&quot; บริเวณขวาสุดของช่องใส่ URL ในเบราว์เซอร์ Chrome หรือ Edge หรือเลือกเมนู &quot;...&quot; &gt; &quot;ติดตั้งแอป&quot;
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="pt-2">
            <Button
              type="button"
              className="w-full"
              onClick={() => setShowIosInstallGuide(false)}
            >
              รับทราบ / ปิดหน้าต่าง
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* Global Command Palette */}
      <CommandPalette />
    </div>
  );
}
