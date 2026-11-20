"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "motion/react";
import {
  Sliders,
  ShieldAlert,
  Save,
  Power,
  X,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  Settings2,
  Loader2,
  Search,
  ChevronRight,
  Shield,
  FileText,
  Clock,
  Mail,
  RefreshCw,
  Layers,
} from "lucide-react";
import { triggerHaptic } from "@/lib/haptic";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAdminSettingsQuery,
  useMaintenanceStatusQuery,
  useUpdateSettingMutation,
  useUpdateMaintenanceMutation,
} from "@/features/admin-operations/hooks/useAdminOperations";
import { cn } from "@/lib/utils";
import {
  formatDisplayDateTime,
  toThailandDateTimeInputValue,
} from "@/lib/date-utils";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { DateTimeInput } from "@/components/ui/date-input";
import { FormField } from "@/components/ui/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/PageHeader";
import { TableSkeleton } from "@/components/shared/Skeletons";
import type { SystemSettingItem } from "@/types/admin-operations.types";

export interface CategoryDefinition {
  id: string;
  label: string;
  englishLabel: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: {
    bg: string;
    text: string;
    border: string;
    badge: string;
  };
  matcher: (key: string) => boolean;
}

export const SETTING_CATEGORIES: CategoryDefinition[] = [
  {
    id: "security",
    label: "ความปลอดภัย & โทเค็น",
    englishLabel: "Security & Tokens",
    description: "กำหนดอายุของ Access Token, Refresh Token สำหรับเซสชันล็อกอิน และการล้างโทเค็นหมดอายุ",
    icon: Shield,
    color: {
      bg: "bg-blue-500/10",
      text: "text-blue-500",
      border: "border-blue-500/20",
      badge: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    },
    matcher: (key) => key.startsWith("Jwt:") || key.startsWith("RefreshToken"),
  },
  {
    id: "audit",
    label: "ประวัติการใช้งาน & ตรวจสอบ",
    englishLabel: "Audit Logs & Retention",
    description: "การบันทึกประวัติ Audit Logs และการตั้งค่างานลบประวัติเก่าอัตโนมัติ (Data Retention)",
    icon: FileText,
    color: {
      bg: "bg-purple-500/10",
      text: "text-purple-500",
      border: "border-purple-500/20",
      badge: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    },
    matcher: (key) => key.startsWith("AuditLog"),
  },
  {
    id: "automation",
    label: "งานประมวลผลเบื้องหลัง",
    englishLabel: "Background Jobs & Automation",
    description: "ความถี่การประมวลผลธุรกรรมประจำ (Recurring Transactions) และงาน Background Workers",
    icon: Clock,
    color: {
      bg: "bg-emerald-500/10",
      text: "text-emerald-500",
      border: "border-emerald-500/20",
      badge: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    },
    matcher: (key) => key.startsWith("RecurringJob"),
  },
  {
    id: "email",
    label: "ระบบอีเมล & แจ้งเตือน",
    englishLabel: "Email & Notifications",
    description: "การเปิด/ปิดการส่งอีเมลของระบบ และชื่อผู้ส่งที่แสดงในหัวข้ออีเมลถึงผู้ใช้งาน",
    icon: Mail,
    color: {
      bg: "bg-cyan-500/10",
      text: "text-cyan-500",
      border: "border-cyan-500/20",
      badge: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
    },
    matcher: (key) => key.startsWith("Email"),
  },
  {
    id: "maintenance",
    label: "โหมดปรับปรุงระบบ",
    englishLabel: "Maintenance Mode",
    description: "การระงับการเข้าใช้งานของผู้ใช้ทั่วไปชั่วคราว, กำหนดเวลาปิดปรับปรุง และข้อยกเว้นการเข้าถึง",
    icon: Power,
    color: {
      bg: "bg-rose-500/10",
      text: "text-rose-500",
      border: "border-rose-500/20",
      badge: "bg-rose-500/10 text-rose-500 border-rose-500/20",
    },
    matcher: (key) => key.startsWith("Maintenance"),
  },
];

export const OTHER_CATEGORY: CategoryDefinition = {
  id: "other",
  label: "การตั้งค่าอื่นๆ",
  englishLabel: "Other Settings",
  description: "ตัวแปรคอนฟิกทั่วไปในระบบ",
  icon: Sliders,
  color: {
    bg: "bg-gray-500/10",
    text: "text-gray-400",
    border: "border-gray-500/20",
    badge: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  },
  matcher: () => true,
};

export const getSettingDisplayInfo = (key: string, value: string) => {
  switch (key) {
    case "Jwt:AccessTokenExpirationMinutes":
      return {
        title: "อายุของ Access Token",
        formattedValue: `${value} นาที`,
        isBool: false,
      };
    case "Jwt:RefreshTokenExpirationDays":
      return {
        title: "อายุของ Refresh Token",
        formattedValue: `${value} วัน`,
        isBool: false,
      };
    case "AuditLog:Enabled":
      return {
        title: "การบันทึกประวัติ (Audit Logs)",
        formattedValue: value === "true" ? "เปิดใช้งาน" : "ปิดใช้งาน",
        isBool: true,
      };
    case "AuditLogCleanup:Enabled":
      return {
        title: "งานล้างประวัติ Audit Log อัตโนมัติ",
        formattedValue: value === "true" ? "เปิดใช้งาน" : "ปิดใช้งาน",
        isBool: true,
      };
    case "AuditLogCleanup:RetentionDays":
      return {
        title: "ระยะเวลาจัดเก็บประวัติ (Retention)",
        formattedValue: `${value} วัน`,
        isBool: false,
      };
    case "RefreshTokenCleanup:Enabled":
      return {
        title: "งานล้าง Token หมดอายุอัตโนมัติ",
        formattedValue: value === "true" ? "เปิดใช้งาน" : "ปิดใช้งาน",
        isBool: true,
      };
    case "Email:Enabled":
      return {
        title: "ระบบส่งอีเมลแจ้งเตือน",
        formattedValue: value === "true" ? "เปิดใช้งาน" : "ปิดใช้งาน",
        isBool: true,
      };
    case "Email:FromDisplayName":
      return {
        title: "ชื่อผู้ส่งในหัวข้ออีเมล",
        formattedValue: value || "-",
        isBool: false,
      };
    case "RecurringJob:IntervalMinutes":
      return {
        title: "รอบประมวลผลธุรกรรมประจำ",
        formattedValue: `ทุกๆ ${value} นาที`,
        isBool: false,
      };
    case "Maintenance:Enabled":
      return {
        title: "สถานะโหมดปรับปรุงระบบ",
        formattedValue: value === "true" ? "เปิดใช้งาน (ACTIVE)" : "ปิดใช้งาน (ONLINE)",
        isBool: true,
      };
    case "Maintenance:Message":
      return {
        title: "ข้อความแจ้งเตือนเมื่อปิดปรับปรุง",
        formattedValue: value || "-",
        isBool: false,
      };
    case "Maintenance:AllowedUserIds":
      return {
        title: "รหัสผู้ใช้ที่ได้รับอนุญาตเข้าใช้งาน",
        formattedValue: value ? `User IDs: ${value}` : "ไม่มี (เฉพาะ Admin)",
        isBool: false,
      };
    case "Maintenance:StartsAt":
      return {
        title: "เวลาเริ่มต้นการปรับปรุง",
        formattedValue: value ? formatDisplayDateTime(value) : "ไม่ได้ระบุ",
        isBool: false,
      };
    case "Maintenance:EndsAt":
      return {
        title: "เวลาสิ้นสุดการปรับปรุงโดยประมาณ",
        formattedValue: value ? formatDisplayDateTime(value) : "ไม่ได้ระบุ",
        isBool: false,
      };
    default:
      return {
        title: key,
        formattedValue: value || "-",
        isBool: value === "true" || value === "false",
      };
  }
};

export default function AdminSettingsPage() {
  const { data: user, isLoading: isUserLoading } = useCurrentUser();
  const { data: settings = [], isLoading, refetch } = useAdminSettingsQuery();
  const { data: maintenance } = useMaintenanceStatusQuery();

  const updateSettingMutation = useUpdateSettingMutation();
  const updateMaintenanceMutation = useUpdateMaintenanceMutation();

  // Maintenance form state
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [allowedUserIdsStr, setAllowedUserIdsStr] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [showMaintenanceConfirm, setShowMaintenanceConfirm] = useState(false);
  const [pendingMaintenanceToggle, setPendingMaintenanceToggle] = useState<boolean | null>(null);

  // Edit setting modal
  const [editingSetting, setEditingSetting] = useState<SystemSettingItem | null>(null);
  const [editingValue, setEditingValue] = useState("");

  // Search & Category Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: settings.length,
    };
    SETTING_CATEGORIES.forEach((cat) => {
      counts[cat.id] = settings.filter((s) => cat.matcher(s.settingKey)).length;
    });
    return counts;
  }, [settings]);

  const categorizedSections = useMemo(() => {
    const searchFiltered = settings.filter((item) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const info = getSettingDisplayInfo(item.settingKey, item.settingValue);
      return (
        item.settingKey.toLowerCase().includes(q) ||
        (item.settingValue || "").toLowerCase().includes(q) ||
        (item.description || "").toLowerCase().includes(q) ||
        info.title.toLowerCase().includes(q)
      );
    });

    const sections: {
      category: CategoryDefinition;
      items: SystemSettingItem[];
    }[] = SETTING_CATEGORIES.map((cat) => ({
      category: cat,
      items: searchFiltered.filter((item) => cat.matcher(item.settingKey)),
    }));

    const otherItems = searchFiltered.filter(
      (item) => !SETTING_CATEGORIES.some((cat) => cat.matcher(item.settingKey))
    );
    if (otherItems.length > 0) {
      sections.push({
        category: OTHER_CATEGORY,
        items: otherItems,
      });
    }

    if (selectedCategory !== "all") {
      return sections.filter((s) => s.category.id === selectedCategory);
    }

    return sections.filter((s) => s.items.length > 0);
  }, [settings, searchQuery, selectedCategory]);


  useEffect(() => {
    if (maintenance) {
      setMaintenanceEnabled(maintenance.isEnabled);
      setMaintenanceMessage(maintenance.message || "");
      setAllowedUserIdsStr(
        maintenance.allowedUserIds?.length ? maintenance.allowedUserIds.join(", ") : ""
      );
      setStartsAt(
        maintenance.startsAt ? toThailandDateTimeInputValue(maintenance.startsAt) : ""
      );
      setEndsAt(
        maintenance.endsAt ? toThailandDateTimeInputValue(maintenance.endsAt) : ""
      );
    }
  }, [maintenance]);

  const isAdmin = (user?.roles?.includes("Admin") || user?.roles?.includes("SuperAdmin")) ?? true;

  if (!isUserLoading && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ShieldAlert className="size-16 text-[var(--pw-expense)] mb-4" />
        <h1 className="text-xl font-bold text-[var(--pw-ink)]">
          ปฏิเสธการเข้าถึง
        </h1>
        <p className="text-sm text-[var(--pw-ink)]/70 mt-2 max-w-md">
          คุณต้องมีบทบาทระดับ Admin จึงจะสามารถจัดการการตั้งค่าระบบได้
        </p>
      </div>
    );
  }

  const handleQuickToggleMaintenance = (nextState: boolean) => {
    setPendingMaintenanceToggle(nextState);
    setShowMaintenanceConfirm(true);
  };

  const handleConfirmQuickToggle = async () => {
    if (pendingMaintenanceToggle === null) return;
    const nextState = pendingMaintenanceToggle;
    setShowMaintenanceConfirm(false);
    try {
      await updateMaintenanceMutation.mutateAsync({
        isEnabled: nextState,
        message: maintenanceMessage.trim() || undefined,
        allowedUserIds: allowedUserIdsStr
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean)
          .map(Number)
          .filter((n) => !isNaN(n)),
        startsAt: startsAt ? new Date(startsAt).toISOString() : undefined,
        endsAt: endsAt ? new Date(endsAt).toISOString() : undefined,
      });
      setMaintenanceEnabled(nextState);
      toast.success(
        nextState
          ? "เปิดโหมดปรับปรุงระบบเรียบร้อยแล้ว"
          : "ปิดโหมดปรับปรุงระบบเรียบร้อยแล้ว"
      );
    } catch (err: any) {
      toast.error(err?.message || "เกิดข้อผิดพลาดในการเปลี่ยนสถานะโหมดปรับปรุงระบบ");
    } finally {
      setPendingMaintenanceToggle(null);
    }
  };

  const handleSaveMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();

    const allowedUserIds = allowedUserIdsStr
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
      .map(Number)
      .filter((n) => !isNaN(n));

    try {
      await updateMaintenanceMutation.mutateAsync({
        isEnabled: maintenanceEnabled,
        message: maintenanceMessage.trim() || undefined,
        allowedUserIds: allowedUserIds.length > 0 ? allowedUserIds : undefined,
        startsAt: startsAt ? new Date(startsAt).toISOString() : undefined,
        endsAt: endsAt ? new Date(endsAt).toISOString() : undefined,
      });
      setShowMaintenanceModal(false);
      toast.success("บันทึกการตั้งค่า Maintenance Mode เรียบร้อยแล้ว");
    } catch (err: any) {
      toast.error(err?.message || "เกิดข้อผิดพลาดในการบันทึกโหมดปรับปรุงระบบ");
    }
  };

  const applyDurationPreset = (minutes: number | null) => {
    triggerHaptic("light");
    const now = new Date();
    setStartsAt(now.toISOString());
    if (minutes === null) {
      setEndsAt("");
    } else {
      const end = new Date(now.getTime() + minutes * 60 * 1000);
      setEndsAt(end.toISOString());
    }
  };

  const handleAddCurrentUserId = () => {
    if (!user?.id) return;
    triggerHaptic("light");
    const currentList = allowedUserIdsStr
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!currentList.includes(String(user.id))) {
      currentList.push(String(user.id));
      setAllowedUserIdsStr(currentList.join(", "));
    }
  };

  const handleOpenEditSetting = (item: SystemSettingItem) => {
    setEditingSetting(item);
    setEditingValue(item.settingValue);
  };

  const handleSaveSetting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSetting) return;

    try {
      await updateSettingMutation.mutateAsync({
        key: editingSetting.settingKey,
        value: editingValue,
      });
      setEditingSetting(null);
      toast.success(`อัปเดตการตั้งค่า ${editingSetting.settingKey} เรียบร้อยแล้ว`);
    } catch (err: any) {
      toast.error(err?.message || "เกิดข้อผิดพลาดในการบันทึกการตั้งค่า");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >

      {/* Page Header */}
      <PageHeader
        title="การตั้งค่าระบบ & โหมดปรับปรุง"
        icon={Sliders}
        description="จัดการเปิด/ปิดการบำรุงรักษาระบบ และกำหนดค่าคอนฟิกกลาง"
      />

      {/* Section 1: Compact Maintenance Mode Widget & Quick Control */}
      <div
        className={cn(
          "p-4 sm:p-5 rounded-2xl border shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4",
          maintenanceEnabled
            ? "bg-[var(--pw-expense)]/10 border-[var(--pw-expense)]/35 text-[var(--pw-ink)]"
            : "bg-[var(--pw-surface)] border-[var(--pw-hairline)] text-[var(--pw-ink)]"
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={cn(
              "size-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs",
              maintenanceEnabled
                ? "bg-[var(--pw-expense)]/20 text-[var(--pw-expense)] border border-[var(--pw-expense)]/30"
                : "bg-emerald-500/15 text-emerald-500 border border-emerald-500/20"
            )}
          >
            {maintenanceEnabled ? (
              <AlertTriangle className="size-5 animate-pulse" />
            ) : (
              <CheckCircle2 className="size-5" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm sm:text-base text-[var(--pw-ink)] truncate">
                โหมดปรับปรุงระบบ (Maintenance)
              </h2>
              <span
                className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0",
                  maintenanceEnabled
                    ? "bg-[var(--pw-expense)] text-white shadow-xs"
                    : "bg-emerald-600 text-white shadow-xs"
                )}
              >
                {maintenanceEnabled ? "ACTIVE" : "ONLINE"}
              </span>
            </div>
            <p className="text-xs text-[var(--pw-ink)]/65 truncate mt-0.5">
              {maintenanceEnabled
                ? maintenanceMessage || "ระบบกำลังอยู่ระหว่างปรับปรุงประสิทธิภาพ"
                : "ระบบทำงานปกติ ผู้ใช้งานสามารถเข้าถึงบริการได้ทั้งหมด"}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--pw-hairline)]/40 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowMaintenanceModal(true)}
            className="text-xs min-h-[40px] sm:min-h-0 px-3.5 gap-1.5"
          >
            <Settings2 className="size-3.5" />
            <span>ตั้งค่ากำหนดเวลา & ข้อความ</span>
          </Button>

          <div className="flex items-center gap-2">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={maintenanceEnabled}
                onChange={(e) => handleQuickToggleMaintenance(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[var(--pw-hairline)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--pw-expense)]"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Maintenance Mode Configuration BottomSheet */}
      <BottomSheet
        open={showMaintenanceModal}
        onOpenChange={setShowMaintenanceModal}
        title={
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[var(--pw-primary)]/15 text-[var(--pw-primary)]">
              <Power className="size-5" />
            </div>
            <span>ตั้งค่าโหมดปรับปรุงระบบ (Maintenance Mode)</span>
          </div>
        }
        description="กำหนดข้อความแจ้งเตือน รายชื่อผู้ใช้ที่ยกเว้น และช่วงเวลากำหนดปิดปรับปรุง"
        className="sm:max-w-xl"
        footer={
          <div className="flex flex-col gap-2.5 w-full">
            <Button
              type="submit"
              form="maintenance-form"
              disabled={updateMaintenanceMutation.isPending}
              className="w-full min-h-[44px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md disabled:bg-emerald-600 disabled:opacity-85 disabled:text-white active:scale-[0.98] transition-all cursor-pointer"
            >
              {updateMaintenanceMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin text-white mr-1.5" />
                  <span>กำลังบันทึกการตั้งค่า...</span>
                </>
              ) : (
                <>
                  <Save className="size-4 text-white mr-1.5" />
                  <span>บันทึกการตั้งค่า Maintenance</span>
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowMaintenanceModal(false)}
              className="w-full min-h-[44px] border-[var(--pw-hairline)] bg-[var(--pw-surface-indigo)]/70 hover:bg-[var(--pw-surface-onyx)] text-[var(--pw-ink)] order-2 shadow-2xs active:scale-[0.98] transition-all cursor-pointer"
            >
              ยกเลิก
            </Button>
          </div>
        }
      >
        <form id="maintenance-form" onSubmit={handleSaveMaintenance} className="space-y-4 py-2">
          {/* Status Toggle row inside sheet */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-[var(--pw-hairline)] bg-[var(--pw-surface)]/60">
            <div>
              <p className="text-xs font-semibold text-[var(--pw-ink)]">สถานะโหมดปรับปรุงระบบ</p>
              <p className="text-[11px] text-[var(--pw-ink)]/60">บล็อกผู้ใช้ทั่วไปด้วยรหัส HTTP 503</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={maintenanceEnabled}
                onChange={(e) => setMaintenanceEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[var(--pw-hairline)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--pw-expense)]"></div>
            </label>
          </div>

          <div>
            <label className="block font-semibold text-xs text-[var(--pw-ink)] mb-1">
              ข้อความแจ้งเตือนผู้ใช้งานเมื่ออยู่ในโหมดปรับปรุง
            </label>
            <textarea
              rows={2}
              value={maintenanceMessage}
              onChange={(e) => setMaintenanceMessage(e.target.value)}
              placeholder="เช่น ระบบกำลังอยู่ระหว่างปรับปรุงประสิทธิภาพ กรุณากลับมาใหม่อีกครั้งในภายหลัง"
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-[var(--pw-hairline)] bg-transparent text-[var(--pw-ink)] focus:outline-none focus:border-[var(--pw-primary)]"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-xs text-[var(--pw-ink)]">
                รหัสผู้ใช้ที่ได้รับอนุญาตให้เข้าใช้งานได้ (Allowed User IDs)
              </label>
              {user?.id && (
                <button
                  type="button"
                  onClick={handleAddCurrentUserId}
                  className="text-[11px] font-semibold text-[var(--pw-primary)] hover:underline flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
                >
                  <Shield className="size-3" />
                  <span>+ เพิ่ม ID ของฉัน (#{user.id})</span>
                </button>
              )}
            </div>
            <Input
              type="text"
              value={allowedUserIdsStr}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAllowedUserIdsStr(e.target.value)}
              placeholder="เช่น 1, 2, 5 (คั่นด้วยเครื่องหมายจุลภาค)"
              className="w-full h-9 text-xs sm:text-sm bg-transparent"
            />
            <p className="text-[11px] text-[var(--pw-ink)]/50 mt-1">
              ผู้ใช้ที่มีบทบาท Admin จะได้รับอนุญาตให้เข้าใช้งานเสมอโดยอัตโนมัติ
            </p>
          </div>

          {/* Quick Duration Preset Chips */}
          <div className="p-2.5 rounded-xl border border-[var(--pw-hairline)] bg-[var(--pw-surface-indigo)]/15 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[var(--pw-ink)]">
                ช่วงเวลาปรับปรุงด่วน (Duration Presets)
              </span>
              <span className="text-[10px] text-[var(--pw-ink)]/50">กดเพื่อคำนวณวันเวลาอัตโนมัติ</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: "+30 นาที", minutes: 30 },
                { label: "+1 ชั่วโมง", minutes: 60 },
                { label: "+2 ชั่วโมง", minutes: 120 },
                { label: "+4 ชั่วโมง", minutes: 240 },
                { label: "จนกว่าจะปิดเอง", minutes: null },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    applyDurationPreset(preset.minutes);
                  }}
                  className="px-2.5 py-1 text-xs rounded-lg border border-[var(--pw-hairline)] bg-[var(--pw-surface-onyx)] hover:bg-[var(--pw-hairline)]/30 text-[var(--pw-ink)] font-medium active:scale-95 transition-all cursor-pointer"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Unified DateTimeInputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="เวลาเริ่มต้น (ไม่บังคับ)" htmlFor="maintenance-starts-at">
              <DateTimeInput
                id="maintenance-starts-at"
                value={startsAt}
                onChange={setStartsAt}
              />
            </FormField>

            <FormField label="เวลาสิ้นสุดโดยประมาณ (ไม่บังคับ)" htmlFor="maintenance-ends-at">
              <DateTimeInput
                id="maintenance-ends-at"
                value={endsAt}
                onChange={setEndsAt}
              />
            </FormField>
          </div>
        </form>
      </BottomSheet>

      {/* Quick Toggle Maintenance Confirmation Dialog */}
      <AlertDialog open={showMaintenanceConfirm} onOpenChange={setShowMaintenanceConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingMaintenanceToggle ? "ยืนยันการเปิดโหมดปรับปรุงระบบ" : "ยืนยันการปิดโหมดปรับปรุงระบบ"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingMaintenanceToggle
                ? "เมื่อเปิดใช้งาน ผู้ใช้ทั่วไปทั้งหมดจะไม่สามารถเข้าสู่ระบบหรือทำธุรกรรมได้ชั่วคราว (จะได้รับ HTTP 503 Maintenance Mode)"
                : "ระบบจะกลับสู่สถานะออนไลน์ปกติ และอนุญาตให้ผู้ใช้ทั่วไปเข้าใช้งานได้ทันที"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={handleConfirmQuickToggle}
              className={cn(
                "w-full min-h-[44px] font-bold text-white",
                pendingMaintenanceToggle ? "bg-rose-600 hover:bg-rose-700" : "bg-emerald-600 hover:bg-emerald-700"
              )}
            >
              {pendingMaintenanceToggle ? "เปิดโหมดปรับปรุงทันที" : "เปิดระบบออนไลน์ทันที"}
            </AlertDialogAction>
            <AlertDialogCancel
              onClick={() => {
                setShowMaintenanceConfirm(false);
                setPendingMaintenanceToggle(null);
              }}
              className="w-full min-h-[44px]"
            >
              ยกเลิก
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Section 2: Categorized System Settings */}
      <div className="space-y-6">
        {/* Search & Category Filter Bar */}
        <div className="p-4 sm:p-5 rounded-2xl border border-[var(--pw-hairline)] bg-[var(--pw-surface)] shadow-xs space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-base text-[var(--pw-ink)] flex items-center gap-2">
                <Sliders className="size-4 text-[var(--pw-primary)]" />
                <span>การตั้งค่าคอนฟิกส่วนกลาง (System Configurations)</span>
              </h2>
              <p className="text-xs text-[var(--pw-ink)]/60 mt-0.5">
                เลือกดูตามหมวดหมู่ หรือค้นหาตัวแปรระบบที่ต้องการปรับแต่ง
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                triggerHaptic("light");
                refetch();
              }}
              className="text-xs self-start sm:self-auto gap-1.5 min-h-[38px] sm:min-h-0"
            >
              <RefreshCw className="size-3.5" />
              <span>รีเฟรชข้อมูล</span>
            </Button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[var(--pw-ink)]/40 pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อการตั้งค่า, คีย์ระบบ, หรือคำอธิบาย..."
              className="pl-10 h-10 bg-[var(--pw-surface-indigo)]/50 border-[var(--pw-hairline)] text-xs sm:text-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--pw-ink)]/40 hover:text-[var(--pw-ink)] cursor-pointer"
                aria-label="ล้างคำค้นหา"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 text-xs">
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setSelectedCategory("all");
              }}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 font-medium transition-all active:scale-95 cursor-pointer",
                selectedCategory === "all"
                  ? "bg-[var(--pw-primary)] text-white font-semibold shadow-xs"
                  : "border border-[var(--pw-hairline)] bg-[var(--pw-surface-indigo)]/40 text-[var(--pw-ink)]/75 hover:bg-[var(--pw-surface-indigo)]"
              )}
            >
              <Layers className="size-3.5" />
              <span>ทั้งหมด</span>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.2 text-[10px] font-mono",
                  selectedCategory === "all"
                    ? "bg-white/20 text-white"
                    : "bg-[var(--pw-hairline)]/40 text-[var(--pw-ink)]/60"
                )}
              >
                {categoryCounts.all ?? 0}
              </span>
            </button>

            {SETTING_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const count = categoryCounts[cat.id] ?? 0;
              const isSelected = selectedCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setSelectedCategory(cat.id);
                  }}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 font-medium transition-all active:scale-95 cursor-pointer",
                    isSelected
                      ? "bg-[var(--pw-primary)] text-white font-semibold shadow-xs"
                      : "border border-[var(--pw-hairline)] bg-[var(--pw-surface-indigo)]/40 text-[var(--pw-ink)]/75 hover:bg-[var(--pw-surface-indigo)]"
                  )}
                >
                  <Icon className="size-3.5" />
                  <span>{cat.label}</span>
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.2 text-[10px] font-mono",
                      isSelected
                        ? "bg-white/20 text-white"
                        : "bg-[var(--pw-hairline)]/40 text-[var(--pw-ink)]/60"
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Loading Skeletons */}
        {isLoading ? (
          <div className="space-y-4">
            <TableSkeleton rows={6} columns={5} />
          </div>
        ) : categorizedSections.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border border-[var(--pw-hairline)] bg-[var(--pw-surface)]/60 text-[var(--pw-ink)]/60 space-y-3">
            <Search className="size-10 mx-auto text-[var(--pw-ink)]/30" />
            <div className="text-sm font-semibold text-[var(--pw-ink)]">
              ไม่พบการตั้งค่าที่ตรงกับคำค้นหา
            </div>
            <p className="text-xs max-w-sm mx-auto">
              ลองเปลี่ยนคำค้นหา หรือกดปุ่มด้านล่างเพื่อแสดงการตั้งค่าทั้งหมด
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
              }}
              className="text-xs"
            >
              แสดงการตั้งค่าทั้งหมด
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {categorizedSections.map(({ category, items }) => {
              const CatIcon = category.icon;
              return (
                <div
                  key={category.id}
                  className="rounded-2xl border border-[var(--pw-hairline)] bg-[var(--pw-surface)] shadow-xs overflow-hidden"
                >
                  {/* Category Section Header */}
                  <div className="p-4 sm:p-5 border-b border-[var(--pw-hairline)] bg-[var(--pw-hairline)]/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "size-10 rounded-xl flex items-center justify-center shrink-0 border shadow-xs",
                          category.color.bg,
                          category.color.text,
                          category.color.border
                        )}
                      >
                        <CatIcon className="size-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm sm:text-base text-[var(--pw-ink)]">
                            {category.label}
                          </h3>
                          <span className="text-[10px] text-[var(--pw-ink)]/50 hidden sm:inline">
                            ({category.englishLabel})
                          </span>
                          <span
                            className={cn(
                              "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                              category.color.badge
                            )}
                          >
                            {items.length} รายการ
                          </span>
                        </div>
                        <p className="text-xs text-[var(--pw-ink)]/65 mt-0.5">
                          {category.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs sm:text-sm">
                      <thead>
                        <tr className="border-b border-[var(--pw-hairline)] bg-[var(--pw-hairline)]/5 text-[var(--pw-ink)]/70 font-semibold text-xs">
                          <th className="py-2.5 px-4 w-[28%]">รายการการตั้งค่า</th>
                          <th className="py-2.5 px-4 w-[22%]">ค่าปัจจุบัน</th>
                          <th className="py-2.5 px-4 w-[32%]">คำอธิบายการทำงาน</th>
                          <th className="py-2.5 px-4 w-[12%]">อัปเดตล่าสุด</th>
                          <th className="py-2.5 px-4 w-[6%] text-right">แก้ไข</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--pw-hairline)]">
                        {items.map((item) => {
                          const info = getSettingDisplayInfo(item.settingKey, item.settingValue);
                          const isBool =
                            item.settingKey.toLowerCase().endsWith(":enabled") ||
                            item.settingValue === "true" ||
                            item.settingValue === "false";
                          const isTrue = item.settingValue === "true";

                          return (
                            <tr
                              key={item.settingKey}
                              className="hover:bg-[var(--pw-hairline)]/10 transition-colors"
                            >
                              <td className="py-3 px-4">
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-semibold text-xs text-[var(--pw-ink)]">
                                    {info.title}
                                  </span>
                                  <span className="font-mono text-[11px] text-[var(--pw-ink)]/60">
                                    {item.settingKey}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                {isBool ? (
                                  <span
                                    className={cn(
                                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border",
                                      isTrue
                                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                        : "bg-gray-500/10 text-gray-500 dark:text-gray-400 border-gray-500/20"
                                    )}
                                  >
                                    <span
                                      className={cn(
                                        "size-1.5 rounded-full",
                                        isTrue ? "bg-emerald-500" : "bg-gray-400"
                                      )}
                                    />
                                    {info.formattedValue}
                                  </span>
                                ) : (
                                  <div className="flex flex-col gap-0.5">
                                    <span className="font-mono text-xs font-bold text-[var(--pw-primary)] truncate max-w-xs">
                                      {info.formattedValue}
                                    </span>
                                    {info.formattedValue !== item.settingValue && item.settingValue && (
                                      <span className="font-mono text-[10px] text-[var(--pw-ink)]/50 truncate max-w-xs">
                                        raw: {item.settingValue}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </td>
                              <td className="py-3 px-4 text-xs text-[var(--pw-ink)]/70">
                                {item.description || "-"}
                              </td>
                              <td className="py-3 px-4 text-xs text-[var(--pw-ink)]/60">
                                {formatDisplayDateTime(item.updatedAt)}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  onClick={() => {
                                    triggerHaptic("light");
                                    handleOpenEditSetting(item);
                                  }}
                                  className="size-8 cursor-pointer hover:border-[var(--pw-primary)]/50"
                                  title="แก้ไขค่านี้"
                                >
                                  <Edit2 className="size-3.5" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile View (< md) - Clean iOS/Android Settings Style Group */}
                  <div className="md:hidden divide-y divide-[var(--pw-hairline)]/70 p-2 sm:p-3">
                    {items.map((item) => {
                      const info = getSettingDisplayInfo(item.settingKey, item.settingValue);
                      const isBool =
                        item.settingKey.toLowerCase().endsWith(":enabled") ||
                        item.settingValue === "true" ||
                        item.settingValue === "false";
                      const isTrue = item.settingValue === "true";

                      return (
                        <div
                          key={item.settingKey}
                          onClick={() => {
                            triggerHaptic("light");
                            handleOpenEditSetting(item);
                          }}
                          className="py-3 px-2 rounded-xl hover:bg-[var(--pw-surface-indigo)]/50 active:scale-[0.98] transition-all cursor-pointer select-none space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-semibold text-xs text-[var(--pw-ink)] truncate">
                                {info.title}
                              </p>
                              <p className="font-mono text-[10px] text-[var(--pw-ink)]/55 truncate">
                                {item.settingKey}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {isBool ? (
                                <span
                                  className={cn(
                                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border",
                                    isTrue
                                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                      : "bg-gray-500/10 text-gray-500 border-gray-500/20"
                                  )}
                                >
                                  <span
                                    className={cn(
                                      "size-1.5 rounded-full",
                                      isTrue ? "bg-emerald-500" : "bg-gray-400"
                                    )}
                                  />
                                  {isTrue ? "เปิด" : "ปิด"}
                                </span>
                              ) : (
                                <span className="font-mono text-xs font-bold text-[var(--pw-primary)] bg-[var(--pw-canvas)]/60 border border-[var(--pw-hairline)]/50 px-2 py-0.5 rounded-md max-w-[120px] truncate">
                                  {info.formattedValue}
                                </span>
                              )}
                              <ChevronRight className="size-4 text-[var(--pw-ink)]/40" />
                            </div>
                          </div>
                          {item.description && (
                            <p className="text-[11px] text-[var(--pw-ink)]/60 line-clamp-1">
                              {item.description}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* EDIT SETTING BOTTOM SHEET                                        */}
      {/* ---------------------------------------------------------------- */}
      <BottomSheet
        open={Boolean(editingSetting)}
        onOpenChange={(open) => !open && setEditingSetting(null)}
        title="แก้ไขค่าคอนฟิกระบบ"
        description={editingSetting?.description || editingSetting?.settingKey}
        className="sm:max-w-md"
        footer={
          editingSetting ? (
            <div className="flex flex-col sm:flex-row-reverse gap-2.5 sm:gap-3 w-full">
              <Button
                type="submit"
                form="edit-setting-form"
                disabled={updateSettingMutation.isPending}
                className="w-full sm:w-auto min-h-[44px] bg-[var(--pw-primary)] hover:bg-[var(--pw-primary-hover)] text-white font-bold shadow-md disabled:opacity-85 disabled:text-white order-1 sm:order-none active:scale-98 cursor-pointer rounded-xl"
              >
                {updateSettingMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin text-white mr-1.5" />
                    <span>กำลังบันทึก...</span>
                  </>
                ) : (
                  <>
                    <Save className="size-4 text-white mr-1.5" />
                    <span>บันทึกการเปลี่ยนแปลง</span>
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto min-h-[44px] border-[var(--pw-hairline)] bg-[var(--pw-surface-onyx)] hover:bg-[var(--pw-hairline)]/30 text-[var(--pw-ink)] order-2 sm:order-none active:scale-98 cursor-pointer rounded-xl"
                onClick={() => setEditingSetting(null)}
              >
                ยกเลิก
              </Button>
            </div>
          ) : undefined
        }
      >
        {editingSetting && (
          <form id="edit-setting-form" onSubmit={handleSaveSetting} className="space-y-4 py-2">
            <div>
              <label className="block text-xs font-semibold text-[var(--pw-ink)] mb-1">
                คีย์การตั้งค่า (Key)
              </label>
              <input
                type="text"
                disabled
                value={editingSetting.settingKey}
                className="w-full px-3 py-2 rounded-lg border border-[var(--pw-hairline)] bg-[var(--pw-hairline)]/15 text-[var(--pw-ink)]/70 font-mono text-xs"
              />
            </div>

            {(() => {
              const lKey = editingSetting.settingKey.toLowerCase();
              const isBool = lKey.endsWith(":enabled") || editingValue === "true" || editingValue === "false";
              // Only treat as date if the key actually ends with 'at' or 'date' (e.g. startsAt, endsAt, createdAt)
              // NOTE: do NOT use lKey.includes("at") because "expiration" contains "at" which causes Jwt expiration minutes/days to become a date!
              const isDate =
                lKey.endsWith("at") ||
                lKey.endsWith(":date") ||
                lKey.endsWith("date") ||
                lKey.endsWith(":starts_at") ||
                lKey.endsWith(":ends_at");
              const isNumber =
                lKey.includes("minutes") ||
                lKey.includes("hours") ||
                lKey.includes("days") ||
                lKey.includes("count") ||
                lKey.includes("limit") ||
                lKey.includes("timeout") ||
                lKey.includes("retention") ||
                lKey.includes("interval") ||
                (/^\d+$/.test(editingValue.trim()) && !isBool && !isDate);

              const unitLabel = lKey.includes("minutes")
                ? "นาที"
                : lKey.includes("hours")
                ? "ชั่วโมง"
                : lKey.includes("days")
                ? "วัน"
                : lKey.includes("seconds")
                ? "วินาที"
                : null;

              if (isBool) {
                return (
                  <div>
                    <label className="block text-xs font-semibold text-[var(--pw-ink)] mb-1">
                      ค่าที่กำหนด (สถานะการเปิดใช้งาน) <span className="text-[var(--pw-expense)]">*</span>
                    </label>
                    <Select
                      value={editingValue === "true" ? "true" : "false"}
                      onValueChange={(val) => setEditingValue(val)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">เปิดใช้งาน (true)</SelectItem>
                        <SelectItem value="false">ปิดใช้งาน (false)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                );
              }

              if (isDate) {
                return (
                  <div>
                    <label className="block text-xs font-semibold text-[var(--pw-ink)] mb-1">
                      ค่าที่กำหนด (วันและเวลา) <span className="text-[var(--pw-expense)]">*</span>
                    </label>
                    <DateTimeInput
                      value={editingValue ? toThailandDateTimeInputValue(editingValue) : ""}
                      onChange={(val) => {
                        if (!val) {
                          setEditingValue("");
                          return;
                        }
                        try {
                          setEditingValue(new Date(val).toISOString());
                        } catch {
                          setEditingValue(val);
                        }
                      }}
                      className="w-full"
                    />
                    <p className="mt-1 text-[11px] text-[var(--pw-ink)]/50">
                      ระบบจะจัดเก็บในรูปแบบมาตรฐานสากล (ISO 8601 UTC) อัตโนมัติ
                    </p>
                  </div>
                );
              }

              if (isNumber) {
                return (
                  <div>
                    <label className="block text-xs font-semibold text-[var(--pw-ink)] mb-1">
                      ค่าที่กำหนด (ตัวเลข{unitLabel ? ` / ${unitLabel}` : ""}) <span className="text-[var(--pw-expense)]">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        inputMode="numeric"
                        required
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        className={cn(
                          "w-full min-h-[44px] px-3 py-2 text-xs sm:text-sm font-mono rounded-lg border border-[var(--pw-hairline)] bg-[var(--pw-surface)] text-[var(--pw-ink)] focus:outline-none focus:border-[var(--pw-primary)]",
                          unitLabel && "pr-14"
                        )}
                      />
                      {unitLabel && (
                        <span className="absolute right-3 text-xs font-medium text-[var(--pw-ink)]/50 pointer-events-none">
                          {unitLabel}
                        </span>
                      )}
                    </div>
                    {unitLabel && (
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <span className="text-[10px] text-[var(--pw-ink)]/50">ค่าแนะนำ:</span>
                        {(unitLabel === "นาที"
                          ? ["15", "30", "60", "120"]
                          : unitLabel === "วัน"
                          ? ["7", "14", "30", "90"]
                          : ["1", "5", "10"]
                        ).map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => {
                              triggerHaptic("light");
                              setEditingValue(val);
                            }}
                            className="px-2 py-0.5 text-[11px] rounded-md border border-[var(--pw-hairline)] bg-[var(--pw-surface-onyx)] hover:bg-[var(--pw-hairline)]/30 text-[var(--pw-ink)] active:scale-95 transition-all cursor-pointer font-mono"
                          >
                            {val} {unitLabel}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <div>
                  <label className="block text-xs font-semibold text-[var(--pw-ink)] mb-1">
                    ค่าที่กำหนด (ข้อความ / คอนฟิก) <span className="text-[var(--pw-expense)]">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm font-mono rounded-lg border border-[var(--pw-hairline)] bg-transparent text-[var(--pw-ink)] focus:outline-none focus:border-[var(--pw-primary)]"
                  />
                </div>
              );
            })()}
          </form>
        )}
      </BottomSheet>
    </motion.div>
  );
}
