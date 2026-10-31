"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sliders,
  ShieldAlert,
  Save,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Power,
  X,
  Edit2,
  Lock,
} from "lucide-react";
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
import type { SystemSettingItem } from "@/types/admin-operations.types";

const getCategoryBadge = (key: string) => {
  if (key.startsWith("Jwt:")) return { label: "ความปลอดภัย & JWT", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" };
  if (key.startsWith("AuditLog")) return { label: "ประวัติการใช้งาน (Audit)", color: "bg-purple-500/10 text-purple-500 border-purple-500/20" };
  if (key.startsWith("RefreshToken")) return { label: "การทำความสะอาดโทเคน", color: "bg-amber-500/10 text-amber-500 border-amber-500/20" };
  if (key.startsWith("RecurringJob")) return { label: "ธุรกรรมประจำ (Recurring)", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" };
  if (key.startsWith("Email")) return { label: "อีเมลแจ้งเตือน (Email)", color: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20" };
  if (key.startsWith("Maintenance")) return { label: "โหมดบำรุงรักษา", color: "bg-rose-500/10 text-rose-500 border-rose-500/20" };
  return { label: "ทั่วไป", color: "bg-gray-500/10 text-gray-500 border-gray-500/20" };
};

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

  // Edit setting modal
  const [editingSetting, setEditingSetting] = useState<SystemSettingItem | null>(null);
  const [editingValue, setEditingValue] = useState("");

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

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
          ปฏิเสธการเข้าถึง (Access Denied)
        </h1>
        <p className="text-sm text-[var(--pw-ink)]/70 mt-2 max-w-md">
          คุณต้องมีบทบาทระดับ Admin จึงจะสามารถจัดการการตั้งค่าระบบได้
        </p>
      </div>
    );
  }

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
      toast.success("บันทึกการตั้งค่า Maintenance Mode เรียบร้อยแล้ว");
    } catch (err: any) {
      toast.error(err?.message || "เกิดข้อผิดพลาดในการบันทึกโหมดปรับปรุงระบบ");
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
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3.5 rounded-xl border border-[var(--pw-income)]/40 bg-[var(--pw-income)]/15 backdrop-blur-md text-[var(--pw-income)] text-sm flex items-center justify-between shadow-lg"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 shrink-0" />
              <span>{toastMessage}</span>
            </div>
            <button onClick={() => setToastMessage(null)}>
              <X className="size-4 opacity-70 hover:opacity-100" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[var(--pw-primary)]/10 text-[var(--pw-primary)]">
            <Sliders className="size-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--pw-ink)]">
              การตั้งค่าระบบ & โหมดปรับปรุง (System Settings & Maintenance)
            </h1>
            <p className="text-xs sm:text-sm text-[var(--pw-ink)]/75">
              จัดการเปิด/ปิดการบำรุงรักษาระบบ (Maintenance Mode) และกำหนดค่าคอนฟิกกลาง
            </p>
          </div>
        </div>
      </div>

      {/* Section 1: Maintenance Mode Configuration Card */}
      <div className="p-5 sm:p-6 rounded-2xl border border-[var(--pw-hairline)] bg-[var(--pw-surface)] shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--pw-hairline)]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--pw-primary)]/15 text-[var(--pw-primary)]">
              <Power className="size-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-[var(--pw-ink)]">
                โหมดปรับปรุงระบบ (Maintenance Mode)
              </h2>
              <p className="text-xs text-[var(--pw-ink)]/60">
                เมื่อเปิดใช้งาน ผู้ใช้ทั่วไปจะได้รับรหัส HTTP 503 MAINTENANCE_MODE และไม่สามารถเข้าถึงแอปได้
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={cn(
                "text-xs font-bold px-2.5 py-1 rounded-full uppercase",
                maintenanceEnabled
                  ? "bg-[var(--pw-expense)]/15 text-[var(--pw-expense)] animate-pulse"
                  : "bg-[var(--pw-hairline)] text-[var(--pw-ink)]/70"
              )}
            >
              {maintenanceEnabled ? "เปิดใช้งาน (ENABLED)" : "ปิด (DISABLED)"}
            </span>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={maintenanceEnabled}
                onChange={(e) => setMaintenanceEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-12 h-6 bg-[var(--pw-hairline)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--pw-expense)]"></div>
            </label>
          </div>
        </div>

        <form onSubmit={handleSaveMaintenance} className="space-y-4">
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
            <label className="block font-semibold text-xs text-[var(--pw-ink)] mb-1">
              รหัสผู้ใช้ที่ได้รับอนุญาตให้เข้าใช้งานได้ (Allowlisted User IDs)
            </label>
            <input
              type="text"
              value={allowedUserIdsStr}
              onChange={(e) => setAllowedUserIdsStr(e.target.value)}
              placeholder="เช่น 1, 2, 5 (คั่นด้วยเครื่องหมายจุลภาค)"
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-[var(--pw-hairline)] bg-transparent text-[var(--pw-ink)] focus:outline-none focus:border-[var(--pw-primary)]"
            />
            <p className="text-[11px] text-[var(--pw-ink)]/50 mt-1">
              ผู้ใช้ที่มีบทบาท Admin จะได้รับอนุญาตให้เข้าใช้งานเสมอโดยอัตโนมัติ
            </p>
          </div>

          {/* Unified DateTimeInputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="เวลาเริ่มต้น (Starts At - Optional)" htmlFor="maintenance-starts-at">
              <DateTimeInput
                id="maintenance-starts-at"
                value={startsAt}
                onChange={setStartsAt}
              />
            </FormField>

            <FormField label="เวลาสิ้นสุดโดยประมาณ (Ends At - Optional)" htmlFor="maintenance-ends-at">
              <DateTimeInput
                id="maintenance-ends-at"
                value={endsAt}
                onChange={setEndsAt}
              />
            </FormField>
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              type="submit"
              disabled={updateMaintenanceMutation.isPending}
              className="w-full sm:w-auto"
            >
              <Save className="size-4" />
              <span>บันทึกการตั้งค่า Maintenance</span>
            </Button>
          </div>
        </form>
      </div>

      {/* Section 2: General System Settings Key-Value Table */}
      <div className="p-5 sm:p-6 rounded-2xl border border-[var(--pw-hairline)] bg-[var(--pw-surface)] shadow-xs space-y-4">
        <div>
          <h2 className="font-bold text-base text-[var(--pw-ink)]">
            ตารางการตั้งค่าระบบ (System Settings Key-Value)
          </h2>
          <p className="text-xs text-[var(--pw-ink)]/60">
            ค่าตัวแปรคอนฟิกส่วนกลางที่จัดเก็บในตาราง SystemSettings
          </p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[var(--pw-hairline)]">
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
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[var(--pw-ink)]/60">
                    กำลังโหลดการตั้งค่าระบบ...
                  </td>
                </tr>
              ) : settings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[var(--pw-ink)]/60">
                    ไม่พบรายการตั้งค่าระบบ
                  </td>
                </tr>
              ) : (
                settings.map((item) => {
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
                      <td className="py-3 px-4 font-mono text-xs max-w-xs truncate text-[var(--pw-primary)]">
                        {item.settingValue}
                      </td>
                      <td className="py-3 px-4 text-xs text-[var(--pw-ink)]/70 max-w-xs">
                        {item.description || "-"}
                      </td>
                      <td className="py-3 px-4 text-xs text-[var(--pw-ink)]/60">
                        {formatDisplayDateTime(item.updatedAt)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleOpenEditSetting(item)}
                          className="p-1.5 rounded-lg border border-[var(--pw-hairline)] text-[var(--pw-ink)] hover:bg-[var(--pw-hairline)]/30 transition-all duration-150 active:scale-95"
                          title="แก้ไขค่านี้"
                        >
                          <Edit2 className="size-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
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
              const isDate = lKey.includes("at") || lKey.includes("date");
              const isNumber = lKey.includes("count") || lKey.includes("limit") || lKey.includes("days") || lKey.includes("timeout") || /^\d+$/.test(editingValue);

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
                        <SelectItem value="true">เปิดใช้งาน (true / Enabled)</SelectItem>
                        <SelectItem value="false">ปิดใช้งาน (false / Disabled)</SelectItem>
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
                      ค่าที่กำหนด (ตัวเลข) <span className="text-[var(--pw-expense)]">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      className="w-full px-3 py-2 text-xs sm:text-sm font-mono rounded-lg border border-[var(--pw-hairline)] bg-[var(--pw-surface)] text-[var(--pw-ink)] focus:outline-none focus:border-[var(--pw-primary)]"
                    />
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
                className="w-full"
              >
                {updateSettingMutation.isPending ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
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
