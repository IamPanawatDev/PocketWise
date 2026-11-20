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
import { BottomSheet, BottomSheetFooter } from "@/components/ui/bottom-sheet";
import { DateTimeInput } from "@/components/ui/date-input";
import { FormField } from "@/components/ui/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/PageHeader";
import { TableSkeleton, ListRowsSkeleton } from "@/components/shared/Skeletons";
import { AnimatedList, AnimatedListItem } from "@/components/ui/animated-list";
import type { SystemSettingItem } from "@/types/admin-operations.types";

const getCategoryBadge = (key: string) => {
  if (key.startsWith("Jwt:")) return { label: "ความปลอดภัย & JWT", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" };
  if (key.startsWith("AuditLog")) return { label: "ประวัติการใช้งาน", color: "bg-purple-500/10 text-purple-500 border-purple-500/20" };
  if (key.startsWith("RefreshToken")) return { label: "การทำความสะอาดโทเคน", color: "bg-amber-500/10 text-amber-500 border-amber-500/20" };
  if (key.startsWith("RecurringJob")) return { label: "ธุรกรรมประจำ", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" };
  if (key.startsWith("Email")) return { label: "อีเมลแจ้งเตือน", color: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20" };
  if (key.startsWith("Maintenance")) return { label: "โหมดบำรุงรักษา", color: "bg-rose-500/10 text-rose-500 border-rose-500/20" };
  return { label: "ทั่วไป", color: "bg-gray-500/10 text-gray-500 border-gray-500/20" };
};

const CATEGORY_TABS = [
  { id: "all", label: "ทั้งหมด" },
  { id: "jwt", label: "ความปลอดภัย & JWT" },
  { id: "audit", label: "ประวัติการใช้งาน" },
  { id: "token", label: "โทเคน" },
  { id: "recurring", label: "ธุรกรรมประจำ" },
  { id: "maintenance", label: "โหมดบำรุงรักษา" },
];

export default function AdminSettingsPage() {
  const { data: user, isLoading: isUserLoading } = useCurrentUser();
  const { data: settings = [], isLoading, refetch } = useAdminSettingsQuery();
  const { data: maintenance, isLoading: isMaintenanceLoading } =
    useMaintenanceStatusQuery();

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

  const filteredSettings = useMemo(() => {
    return settings.filter((item) => {
      if (selectedCategory !== "all") {
        if (selectedCategory === "jwt" && !item.settingKey.startsWith("Jwt:")) return false;
        if (selectedCategory === "audit" && !item.settingKey.startsWith("AuditLog")) return false;
        if (selectedCategory === "token" && !item.settingKey.startsWith("RefreshToken")) return false;
        if (selectedCategory === "recurring" && !item.settingKey.startsWith("RecurringJob")) return false;
        if (selectedCategory === "maintenance" && !item.settingKey.startsWith("Maintenance")) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchKey = item.settingKey.toLowerCase().includes(q);
        const matchVal = (item.settingValue || "").toLowerCase().includes(q);
        const matchDesc = (item.description || "").toLowerCase().includes(q);
        return matchKey || matchVal || matchDesc;
      }
      return true;
    });
  }, [settings, selectedCategory, searchQuery]);


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
      >
        <form onSubmit={handleSaveMaintenance} className="space-y-4 py-2">
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
              <button
                type="button"
                onClick={() => applyDurationPreset(30)}
                className="px-2.5 py-1 text-xs rounded-lg border border-[var(--pw-hairline)] bg-[var(--pw-surface-onyx)] hover:bg-[var(--pw-hairline)]/30 text-[var(--pw-ink)] font-medium active:scale-95 transition-all cursor-pointer"
              >
                +30 นาที
              </button>
              <button
                type="button"
                onClick={() => applyDurationPreset(60)}
                className="px-2.5 py-1 text-xs rounded-lg border border-[var(--pw-hairline)] bg-[var(--pw-surface-onyx)] hover:bg-[var(--pw-hairline)]/30 text-[var(--pw-ink)] font-medium active:scale-95 transition-all cursor-pointer"
              >
                +1 ชั่วโมง
              </button>
              <button
                type="button"
                onClick={() => applyDurationPreset(120)}
                className="px-2.5 py-1 text-xs rounded-lg border border-[var(--pw-hairline)] bg-[var(--pw-surface-onyx)] hover:bg-[var(--pw-hairline)]/30 text-[var(--pw-ink)] font-medium active:scale-95 transition-all cursor-pointer"
              >
                +2 ชั่วโมง
              </button>
              <button
                type="button"
                onClick={() => applyDurationPreset(240)}
                className="px-2.5 py-1 text-xs rounded-lg border border-[var(--pw-hairline)] bg-[var(--pw-surface-onyx)] hover:bg-[var(--pw-hairline)]/30 text-[var(--pw-ink)] font-medium active:scale-95 transition-all cursor-pointer"
              >
                +4 ชั่วโมง
              </button>
              <button
                type="button"
                onClick={() => applyDurationPreset(null)}
                className="px-2.5 py-1 text-xs rounded-lg border border-[var(--pw-hairline)] bg-[var(--pw-surface-onyx)] hover:bg-[var(--pw-hairline)]/30 text-[var(--pw-ink)]/70 font-medium active:scale-95 transition-all cursor-pointer"
              >
                จนกว่าจะปิดเอง
              </button>
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

          {/* Master Rule: Action on top (order-1), Cancel on bottom (order-2) on mobile, Solid Filled Button */}
          <BottomSheetFooter>
            <Button
              type="submit"
              disabled={updateMaintenanceMutation.isPending}
              className="w-full min-h-[44px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md disabled:bg-emerald-600 disabled:opacity-85 disabled:text-white"
            >
              {updateMaintenanceMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin text-white" />
                  <span>กำลังบันทึกการตั้งค่า...</span>
                </>
              ) : (
                <>
                  <Save className="size-4 text-white" />
                  <span>บันทึกการตั้งค่า Maintenance</span>
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowMaintenanceModal(false)}
              className="w-full min-h-[44px]"
            >
              ยกเลิก
            </Button>
          </BottomSheetFooter>
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

      {/* Section 2: General System Settings Key-Value Table */}
      <div className="p-4 sm:p-6 rounded-2xl border border-[var(--pw-hairline)] bg-[var(--pw-surface)] shadow-xs space-y-4">
        <div>
          <h2 className="font-bold text-base text-[var(--pw-ink)]">
            ตารางการตั้งค่าระบบ
          </h2>
          <p className="text-xs text-[var(--pw-ink)]/60">
            ค่าตัวแปรคอนฟิกส่วนกลางที่จัดเก็บในตาราง SystemSettings
          </p>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="space-y-2.5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--pw-ink)]/40 pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาคีย์การตั้งค่า, ค่าคอนฟิก, หรือคำอธิบาย..."
              className="pl-9 h-10 bg-[var(--pw-surface-indigo)]/50 border-[var(--pw-hairline)] text-xs sm:text-sm"
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

          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 text-xs">
            {CATEGORY_TABS.map((tab) => {
              const count = tab.id === "all"
                ? settings.length
                : settings.filter((s) => {
                    if (tab.id === "jwt") return s.settingKey.startsWith("Jwt:");
                    if (tab.id === "audit") return s.settingKey.startsWith("AuditLog");
                    if (tab.id === "token") return s.settingKey.startsWith("RefreshToken");
                    if (tab.id === "recurring") return s.settingKey.startsWith("RecurringJob");
                    if (tab.id === "maintenance") return s.settingKey.startsWith("Maintenance");
                    return false;
                  }).length;

              const isSelected = selectedCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setSelectedCategory(tab.id);
                  }}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 font-medium transition-all active:scale-95 cursor-pointer",
                    isSelected
                      ? "bg-[var(--pw-primary)] text-white font-semibold shadow-xs"
                      : "border border-[var(--pw-hairline)] bg-[var(--pw-surface-indigo)]/40 text-[var(--pw-ink)]/75 hover:bg-[var(--pw-surface-indigo)]"
                  )}
                >
                  <span>{tab.label}</span>
                  <span className={cn(
                    "rounded-full px-1.5 py-0.2 text-[10px] font-mono",
                    isSelected ? "bg-white/20 text-white" : "bg-[var(--pw-hairline)]/40 text-[var(--pw-ink)]/60"
                  )}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Loading Skeletons */}
        {isLoading ? (
          <>
            <div className="hidden md:block">
              <TableSkeleton rows={8} columns={5} />
            </div>
            <div className="md:hidden">
              <ListRowsSkeleton count={5} />
            </div>
          </>
        ) : filteredSettings.length === 0 ? (
          <div className="py-8 text-center text-[var(--pw-ink)]/60 text-xs">
            ไม่พบการตั้งค่าที่ตรงกับเงื่อนไขการค้นหา
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-[var(--pw-hairline)]">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-[var(--pw-hairline)] bg-[var(--pw-hairline)]/10 text-[var(--pw-ink)]/70 font-semibold text-xs">
                    <th className="py-2.5 px-4">คีย์การตั้งค่า (Key)</th>
                    <th className="py-2.5 px-4">ค่าปัจจุบัน (Value)</th>
                    <th className="py-2.5 px-4">คำอธิบาย</th>
                    <th className="py-2.5 px-4">อัปเดตล่าสุด</th>
                    <th className="py-2.5 px-4 text-right">แก้ไข</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--pw-hairline)]">
                  {filteredSettings.map((item) => {
                    const badge = getCategoryBadge(item.settingKey);
                    return (
                      <tr
                        key={item.settingKey}
                        className="hover:bg-[var(--pw-hairline)]/10 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-1">
                            <span className="font-mono font-bold text-xs text-[var(--pw-ink)]">
                              {item.settingKey}
                            </span>
                            <span
                              className={cn(
                                "inline-flex items-center w-fit px-1.5 py-0.5 rounded text-[10px] font-medium border",
                                badge.color
                              )}
                            >
                              {badge.label}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs max-w-xs truncate text-[var(--pw-primary)] font-semibold">
                          {item.settingValue}
                        </td>
                        <td className="py-3 px-4 text-xs text-[var(--pw-ink)]/70 max-w-xs">
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
                            onClick={() => handleOpenEditSetting(item)}
                            className="size-8 cursor-pointer"
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

            {/* Mobile Card List View (< md) - Compact Interactive Preferences Row */}
            <AnimatedList className="space-y-2.5 md:hidden">
              {filteredSettings.map((item) => {
                const badge = getCategoryBadge(item.settingKey);
                return (
                  <AnimatedListItem key={item.settingKey}>
                    <div
                      onClick={() => {
                        triggerHaptic("light");
                        handleOpenEditSetting(item);
                      }}
                      className="rounded-xl border border-[var(--pw-hairline)] bg-[var(--pw-surface)]/80 hover:bg-[var(--pw-surface-indigo)]/50 active:scale-[0.98] transition-all p-3 shadow-2xs cursor-pointer select-none space-y-2"
                    >
                      {/* Top: Category Badge + Setting Key */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className={cn(
                              "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border shrink-0",
                              badge.color
                            )}
                          >
                            {badge.label}
                          </span>
                          <span className="font-mono font-bold text-xs text-[var(--pw-ink)] truncate">
                            {item.settingKey}
                          </span>
                        </div>
                        <ChevronRight className="size-4 text-[var(--pw-ink)]/40 shrink-0" />
                      </div>

                      {/* Middle: Value Preview Capsule */}
                      <div className="flex items-center justify-between gap-2 rounded-lg bg-[var(--pw-canvas)]/60 border border-[var(--pw-hairline)]/40 px-2.5 py-1.5">
                        <span className="font-mono text-xs font-semibold text-[var(--pw-primary)] truncate">
                          {item.settingValue}
                        </span>
                        <span className="text-[10px] text-[var(--pw-ink)]/45 shrink-0">แตะเพื่อแก้ไข</span>
                      </div>

                      {/* Bottom: Description if available */}
                      {item.description && (
                        <p className="text-[11px] text-[var(--pw-ink)]/60 line-clamp-1">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </AnimatedListItem>
                );
              })}
            </AnimatedList>
          </>
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
      >
        {editingSetting && (
          <form onSubmit={handleSaveSetting} className="space-y-4 py-2">
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

            {/* BottomSheet Button Hierarchy: Save on TOP, Cancel on BOTTOM */}
            <BottomSheetFooter>
              <Button
                type="submit"
                disabled={updateSettingMutation.isPending}
                className="w-full min-h-[44px] bg-[var(--pw-primary)] hover:bg-[var(--pw-primary-hover)] text-white font-bold shadow-md disabled:opacity-85 disabled:text-white"
              >
                {updateSettingMutation.isPending ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full min-h-[44px] border-[var(--pw-hairline)] bg-[var(--pw-surface-indigo)]/70 hover:bg-[var(--pw-surface-onyx)] text-[var(--pw-ink)] order-2 shadow-2xs"
                onClick={() => setEditingSetting(null)}
              >
                ยกเลิก
              </Button>
            </BottomSheetFooter>
          </form>
        )}
      </BottomSheet>
    </motion.div>
  );
}
