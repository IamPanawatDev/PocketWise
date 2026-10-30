"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sliders,
  AlertTriangle,
  CheckCircle2,
  Save,
  Clock,
  ShieldAlert,
  Server,
  Lock,
  Edit2,
  X,
  Calendar,
} from "lucide-react";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import {
  useAdminSettingsQuery,
  useUpdateSettingMutation,
  useMaintenanceStatusQuery,
  useUpdateMaintenanceMutation,
} from "@/features/admin-operations/hooks/useAdminOperations";
import { cn } from "@/lib/utils";
import type { SystemSettingItem } from "@/types/admin-operations.types";

export default function AdminSettingsPage() {
  const { data: user, isLoading: isUserLoading } = useCurrentUser();
  const { data: settings = [], isLoading: isSettingsLoading } = useAdminSettingsQuery();
  const { data: maintenance, isLoading: isMaintenanceLoading } = useMaintenanceStatusQuery();

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

  useEffect(() => {
    if (maintenance) {
      setMaintenanceEnabled(maintenance.isEnabled);
      setMaintenanceMessage(maintenance.message || "");
      setAllowedUserIdsStr(maintenance.allowedUserIds?.join(", ") || "");
      setStartsAt(
        maintenance.startsAt ? new Date(maintenance.startsAt).toISOString().slice(0, 16) : ""
      );
      setEndsAt(
        maintenance.endsAt ? new Date(maintenance.endsAt).toISOString().slice(0, 16) : ""
      );
    }
  }, [maintenance]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const isAdmin = user?.roles?.includes("Admin") ?? true;

  if (!isUserLoading && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ShieldAlert className="size-16 text-[var(--pw-expense)] mb-4" />
        <h1 className="text-xl font-bold text-[var(--pw-ink)]">
          ปฏิเสธการเข้าถึง (Access Denied)
        </h1>
        <p className="text-sm text-[var(--pw-ink)]/70 mt-2 max-w-md">
          คุณต้องมีบทบาทระดับ Admin จึงจะสามารถเข้าถึงการตั้งค่าระบบและโหมดปรับปรุงได้
        </p>
      </div>
    );
  }

  const handleSaveMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();

    const allowedIds = allowedUserIdsStr
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((id) => Number(id))
      .filter((id) => !isNaN(id) && id > 0);

    try {
      await updateMaintenanceMutation.mutateAsync({
        isEnabled: maintenanceEnabled,
        message: maintenanceMessage.trim(),
        allowedUserIds: allowedIds,
        startsAt: startsAt ? new Date(startsAt).toISOString() : null,
        endsAt: endsAt ? new Date(endsAt).toISOString() : null,
      });
      showToast("บันทึกการตั้งค่าโหมดปรับปรุงระบบเรียบร้อยแล้ว");
    } catch (err: any) {
      alert(err?.message || "เกิดข้อผิดพลาดในการบันทึก");
    }
  };

  const handleSaveSetting = async () => {
    if (!editingSetting) return;
    try {
      await updateSettingMutation.mutateAsync({
        key: editingSetting.settingKey,
        value: editingValue,
      });
      setEditingSetting(null);
      showToast(`บันทึกค่า ${editingSetting.settingKey} เรียบร้อยแล้ว`);
    } catch (err: any) {
      alert(err?.message || "เกิดข้อผิดพลาดในการบันทึกค่า");
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-3.5 rounded-xl border border-[var(--pw-income)]/40 bg-[var(--pw-income)]/15 text-[var(--pw-ink)] text-sm flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-[var(--pw-income)] shrink-0" />
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
            <p className="text-xs sm:text-sm text-[var(--pw-ink)]/70">
              จัดการเปิด/ปิดการบำรุงรักษาระบบ (Maintenance Mode) และกำหนดค่าคอนฟิกกลาง
            </p>
          </div>
        </div>
      </div>

      {/* Maintenance Mode Card */}
      <div className="p-5 sm:p-6 rounded-2xl border border-[var(--pw-hairline)] bg-[var(--pw-surface)] shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--pw-hairline)] pb-4">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "p-2.5 rounded-xl shrink-0",
                maintenanceEnabled
                  ? "bg-[var(--pw-expense)]/15 text-[var(--pw-expense)]"
                  : "bg-[var(--pw-income)]/15 text-[var(--pw-income)]"
              )}
            >
              {maintenanceEnabled ? (
                <AlertTriangle className="size-6 animate-pulse" />
              ) : (
                <Server className="size-6" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-[var(--pw-ink)]">
                โหมดปรับปรุงระบบ (Maintenance Mode)
              </h3>
              <p className="text-xs text-[var(--pw-ink)]/60">
                เมื่อเปิดใช้งาน ผู้ใช้ทั่วไปจะได้รับรหัส HTTP 503 MAINTENANCE_MODE และไม่สามารถเข้าถึงแอปได้
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={maintenanceEnabled}
              onChange={(e) => setMaintenanceEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-12 h-6 bg-[var(--pw-hairline)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--pw-expense)]"></div>
            <span className="ml-3 text-xs sm:text-sm font-bold text-[var(--pw-ink)]">
              {maintenanceEnabled ? "เปิดใช้งาน (ACTIVE)" : "ปิด (DISABLED)"}
            </span>
          </label>
        </div>

        <form onSubmit={handleSaveMaintenance} className="space-y-4 text-xs sm:text-sm">
          <div>
            <label className="block font-semibold text-[var(--pw-ink)] mb-1">
              ข้อความแจ้งเตือนผู้ใช้งานเมื่ออยู่ในโหมดปรับปรุง
            </label>
            <textarea
              rows={2}
              value={maintenanceMessage}
              onChange={(e) => setMaintenanceMessage(e.target.value)}
              placeholder="ระบบกำลังอยู่ระหว่างปรับปรุงประสิทธิภาพ กรุณากลับมาใหม่อีกครั้งในภายหลัง"
              className="w-full px-3 py-2 rounded-lg border border-[var(--pw-hairline)] bg-transparent text-[var(--pw-ink)] focus:outline-none focus:border-[var(--pw-primary)]"
            />
          </div>

          <div>
            <label className="block font-semibold text-[var(--pw-ink)] mb-1">
              รหัสผู้ใช้ที่ได้รับอนุญาตให้เข้าใช้งานได้ (Allowlisted User IDs)
            </label>
            <input
              type="text"
              value={allowedUserIdsStr}
              onChange={(e) => setAllowedUserIdsStr(e.target.value)}
              placeholder="เช่น 1, 2, 5 (คั่นด้วยเครื่องหมายจุลภาค)"
              className="w-full px-3 py-2 rounded-lg border border-[var(--pw-hairline)] bg-transparent text-[var(--pw-ink)] focus:outline-none focus:border-[var(--pw-primary)]"
            />
            <p className="text-[11px] text-[var(--pw-ink)]/60 mt-1">
              ผู้ใช้ที่มีบทบาท Admin จะได้รับอนุญาตให้เข้าใช้งานเสมอโดยอัตโนมัติ
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[var(--pw-ink)] mb-1">
                เวลาเริ่มต้น (Starts At - Optional)
              </label>
              <input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--pw-hairline)] bg-transparent text-[var(--pw-ink)] focus:outline-none focus:border-[var(--pw-primary)]"
              />
            </div>

            <div>
              <label className="block font-semibold text-[var(--pw-ink)] mb-1">
                เวลาสิ้นสุดโดยประมาณ (Ends At - Optional)
              </label>
              <input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--pw-hairline)] bg-transparent text-[var(--pw-ink)] focus:outline-none focus:border-[var(--pw-primary)]"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={updateMaintenanceMutation.isPending}
              className="px-4 py-2 text-xs sm:text-sm font-bold rounded-xl bg-[var(--pw-primary)] text-white hover:opacity-90 transition-opacity flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              <Save className="size-4" /> บันทึกการตั้งค่า Maintenance
            </button>
          </div>
        </form>
      </div>

      {/* Global System Settings Table */}
      <div className="p-5 sm:p-6 rounded-2xl border border-[var(--pw-hairline)] bg-[var(--pw-surface)] shadow-sm space-y-4">
        <div>
          <h3 className="font-bold text-base sm:text-lg text-[var(--pw-ink)]">
            ตารางการตั้งค่าระบบ (System Settings Key-Value)
          </h3>
          <p className="text-xs text-[var(--pw-ink)]/60">
            ค่าตัวแปรคอนฟิกส่วนกลางที่จัดเก็บในตาราง SystemSettings
          </p>
        </div>

        <div className="rounded-xl border border-[var(--pw-hairline)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-[var(--pw-hairline)] bg-[var(--pw-hairline)]/10 text-[var(--pw-ink)]/70 font-semibold">
                  <th className="py-3 px-4">คีย์การตั้งค่า (Key)</th>
                  <th className="py-3 px-4">ค่าปัจจุบัน (Value)</th>
                  <th className="py-3 px-4">คำอธิบาย</th>
                  <th className="py-3 px-4">อัปเดตล่าสุด</th>
                  <th className="py-3 px-4 text-right">แก้ไข</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--pw-hairline)]">
                {isSettingsLoading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-[var(--pw-ink)]/60">
                      กำลังโหลดการตั้งค่า...
                    </td>
                  </tr>
                ) : settings.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-[var(--pw-ink)]/60">
                      ไม่พบการตั้งค่าในระบบ
                    </td>
                  </tr>
                ) : (
                  settings.map((s) => (
                    <tr key={s.settingKey} className="hover:bg-[var(--pw-hairline)]/10 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-[var(--pw-ink)]">
                        {s.settingKey}
                      </td>
                      <td className="py-3 px-4 font-mono text-[var(--pw-ink)]/80 max-w-xs truncate">
                        {s.settingValue}
                      </td>
                      <td className="py-3 px-4 text-xs text-[var(--pw-ink)]/70">
                        {s.description || "-"}
                      </td>
                      <td className="py-3 px-4 text-xs text-[var(--pw-ink)]/60 whitespace-nowrap">
                        {new Date(s.updatedAt).toLocaleString("th-TH")}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            setEditingSetting(s);
                            setEditingValue(s.settingValue);
                          }}
                          className="p-1.5 rounded-lg border border-[var(--pw-hairline)] text-[var(--pw-ink)] hover:bg-[var(--pw-hairline)]/30"
                          title="แก้ไขค่า"
                        >
                          <Edit2 className="size-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit Setting Modal */}
      <AnimatePresence>
        {editingSetting && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl border border-[var(--pw-hairline)] bg-[var(--pw-surface)] p-6 shadow-xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[var(--pw-hairline)] pb-3">
                <h3 className="font-bold text-base text-[var(--pw-ink)]">
                  แก้ไขการตั้งค่าระบบ
                </h3>
                <button
                  onClick={() => setEditingSetting(null)}
                  className="p-1 rounded-lg text-[var(--pw-ink)]/60 hover:text-[var(--pw-ink)]"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs sm:text-sm">
                <div>
                  <label className="block font-semibold text-[var(--pw-ink)] mb-1">
                    คีย์ (Key)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={editingSetting.settingKey}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--pw-hairline)] bg-[var(--pw-hairline)]/15 text-[var(--pw-ink)]/70 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[var(--pw-ink)] mb-1">
                    ค่าคอนฟิก (Value)
                  </label>
                  <textarea
                    rows={3}
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--pw-hairline)] bg-transparent text-[var(--pw-ink)] font-mono text-xs focus:outline-none focus:border-[var(--pw-primary)]"
                  />
                </div>

                {editingSetting.description && (
                  <p className="text-[11px] text-[var(--pw-ink)]/60">
                    {editingSetting.description}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--pw-hairline)]">
                <button
                  onClick={() => setEditingSetting(null)}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-[var(--pw-hairline)] bg-[var(--pw-surface)] text-[var(--pw-ink)] hover:bg-[var(--pw-hairline)]/30"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleSaveSetting}
                  disabled={updateSettingMutation.isPending}
                  className="px-4 py-2 text-xs font-bold rounded-lg bg-[var(--pw-primary)] text-white hover:opacity-90 disabled:opacity-50"
                >
                  บันทึกการเปลี่ยนแปลง
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
