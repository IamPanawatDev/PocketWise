"use client";

import { useState } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { formatDateTime } from "@/lib/utils";
import { toast } from "sonner";
import {
  useAuditLogSettings,
  usePurgeAuditLogsMutation,
  useUpdateAuditLogSettingsMutation,
} from "../hooks/useAuditLogs";
import {
  AlertTriangle,
  Database,
  HardDrive,
  LoaderCircle,
  Save,
  ShieldAlert,
  Trash2,
} from "lucide-react";

interface AuditLogSettingsModalProps {
  open: boolean;
  onClose: () => void;
}

const RETENTION_OPTIONS = [
  { value: 30, label: "ลบข้อมูลที่เก่ากว่า 30 วัน" },
  { value: 60, label: "ลบข้อมูลที่เก่ากว่า 60 วัน" },
  { value: 90, label: "ลบข้อมูลที่เก่ากว่า 90 วัน (แนะนำ)" },
  { value: 180, label: "ลบข้อมูลที่เก่ากว่า 180 วัน (6 เดือน)" },
  { value: 0, label: "ลบข้อมูลประวัติทั้งหมด (ล้างตาราง Audit Logs)" },
];

export function AuditLogSettingsModal({ open, onClose }: AuditLogSettingsModalProps) {
  const { data: settings, isLoading, isError } = useAuditLogSettings(open);
  const updateSettingsMutation = useUpdateAuditLogSettingsMutation();
  const purgeMutation = usePurgeAuditLogsMutation();

  const [userToggledEnabled, setUserToggledEnabled] = useState<boolean | null>(null);
  const [selectedRetentionDays, setSelectedRetentionDays] = useState(90);

  const isEnabled = userToggledEnabled !== null ? userToggledEnabled : (settings?.isEnabled ?? true);
  const hasChanged = userToggledEnabled !== null && settings && userToggledEnabled !== settings.isEnabled;

  const handleSaveSettings = async () => {
    try {
      await updateSettingsMutation.mutateAsync({ isEnabled });
      setUserToggledEnabled(null);
      toast.success(
        isEnabled
          ? "เปิดการบันทึก Audit Log เรียบร้อยแล้ว"
          : "ปิดการบันทึก Audit Log เรียบร้อยแล้ว (ไม่บันทึกประวัติใหม่เพื่อประหยัดพื้นที่)",
      );
    } catch {
      toast.error("ไม่สามารถบันทึกการตั้งค่าได้ กรุณาลองใหม่อีกครั้ง");
    }
  };

  const handlePurge = async () => {
    try {
      const result = await purgeMutation.mutateAsync({
        olderThanDays: selectedRetentionDays,
      });
      toast.success(
        result.message || `ล้างประวัติ Audit Logs สำเร็จ (ลบไปแล้ว ${result.deletedCount.toLocaleString()} รายการ)`,
      );
    } catch {
      toast.error("เกิดข้อผิดพลาดในการล้างข้อมูล Audit Logs");
    }
  };

  const selectedOptionLabel =
    RETENTION_OPTIONS.find((opt) => opt.value === selectedRetentionDays)?.label ?? "";

  return (
    <BottomSheet
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
      title="ตั้งค่าการบันทึกประวัติ (Admin Audit Log Setup)"
      description="จัดการการเปิด/ปิดบันทึก Audit Log และการล้างข้อมูลเก่าเพื่อป้องกัน Database บวม"
      className="sm:max-w-2xl"
    >
      <div className="flex-1 space-y-6 overflow-y-auto px-5 py-4 sm:px-6">
        {isLoading ? (
          <div className="space-y-4 py-2">
            <div className="rounded-[var(--pw-rounded-sm)] border border-[var(--pw-hairline)] p-4 space-y-3">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <div className="rounded-[var(--pw-rounded-sm)] border border-[var(--pw-hairline)] p-4 space-y-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-9 w-32" />
            </div>
          </div>
        ) : isError ? (
          <div className="rounded-[var(--pw-rounded-sm)] border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-400">
            ไม่สามารถโหลดการตั้งค่าได้ กรุณาตรวจสอบสิทธิ์ Admin หรือลองใหม่อีกครั้ง
          </div>
        ) : (
          <>
            {/* Section 1: Toggle Audit Log Recording */}
            <div className="rounded-[var(--pw-rounded-sm)] border border-[var(--pw-hairline)] bg-[var(--pw-surface-black)]/40 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Database className="size-4 text-[var(--pw-primary)]" />
                    <h3 className="font-bold text-[var(--pw-ink)]">
                      การบันทึกประวัติการเปลี่ยนแปลง (Audit Logs)
                    </h3>
                  </div>
                  <p className="text-xs leading-relaxed text-[var(--pw-ink)]/70 sm:text-sm">
                    เมื่อเปิดใช้งาน ทุกการทำรายการสำคัญ (สร้าง, แก้ไข, ลบ) ของผู้ใช้และระบบจะถูกบันทึก
                    หากปิดการบันทึก ระบบจะไม่เขียนประวัติใหม่ ช่วยประหยัดพื้นที่และป้องกันฐานข้อมูลบวม
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-[var(--pw-hairline)] pt-4">
                <label
                  htmlFor="toggle-audit"
                  className="flex cursor-pointer items-center gap-3 text-sm font-medium text-[var(--pw-ink)]"
                >
                  <Checkbox
                    id="toggle-audit"
                    checked={isEnabled}
                    onCheckedChange={(checked) => setUserToggledEnabled(Boolean(checked))}
                  />
                  <span>
                    {isEnabled ? (
                      <span className="text-emerald-400">เปิดบันทึกข้อมูล (Enabled)</span>
                    ) : (
                      <span className="text-amber-400">ปิดบันทึกข้อมูลชั่วคราว (Disabled)</span>
                    )}
                  </span>
                </label>

                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveSettings}
                  disabled={!hasChanged || updateSettingsMutation.isPending}
                >
                  {updateSettingsMutation.isPending ? (
                    <LoaderCircle className="mr-1.5 size-4 animate-spin" />
                  ) : (
                    <Save className="mr-1.5 size-4" />
                  )}
                  บันทึกการตั้งค่า
                </Button>
              </div>

              {!isEnabled && (
                <div className="mt-3 flex items-start gap-2 rounded border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-300">
                  <AlertTriangle className="size-4 shrink-0 text-amber-400" />
                  <span>
                    ขณะนี้การบันทึกปิดอยู่ — ระบบจะไม่บันทึกประวัติการเปลี่ยนแปลงใดๆ ลงตาราง Audit Logs
                    จนกว่าจะเปิดบันทึกอีกครั้ง
                  </span>
                </div>
              )}
            </div>

            {/* Section 2: Storage Metrics & Statistics */}
            <div className="space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-bold text-[var(--pw-ink)]">
                <HardDrive className="size-4 text-[var(--pw-link)]" />
                สถิติและสถานะพื้นที่จัดเก็บ (Database Metrics)
              </h3>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-[var(--pw-rounded-sm)] border border-[var(--pw-hairline)] bg-[var(--pw-surface-black)]/60 p-3">
                  <span className="text-xs text-[var(--pw-ink)]/60">จำนวนประวัติทั้งหมด</span>
                  <p className="mt-1 font-mono text-xl font-bold text-[var(--pw-ink)]">
                    {settings?.totalLogs.toLocaleString() ?? 0}
                  </p>
                  <span className="text-[11px] text-[var(--pw-ink)]/50">รายการในฐานข้อมูล</span>
                </div>

                <div className="rounded-[var(--pw-rounded-sm)] border border-[var(--pw-hairline)] bg-[var(--pw-surface-black)]/60 p-3">
                  <span className="text-xs text-[var(--pw-ink)]/60">ข้อมูลประวัติเก่าที่สุด</span>
                  <p className="mt-1 text-xs font-semibold text-[var(--pw-ink)]">
                    {settings?.oldestLogDate ? (
                      formatDateTime(settings.oldestLogDate)
                    ) : (
                      <span className="text-[var(--pw-ink)]/40">ยังไม่มีข้อมูล</span>
                    )}
                  </p>
                  <span className="text-[11px] text-[var(--pw-ink)]/50">จุดเริ่มต้นของประวัติ</span>
                </div>

                <div className="rounded-[var(--pw-rounded-sm)] border border-[var(--pw-hairline)] bg-[var(--pw-surface-black)]/60 p-3">
                  <span className="text-xs text-[var(--pw-ink)]/60">ข้อมูลประวัติล่าสุด</span>
                  <p className="mt-1 text-xs font-semibold text-[var(--pw-ink)]">
                    {settings?.latestLogDate ? (
                      formatDateTime(settings.latestLogDate)
                    ) : (
                      <span className="text-[var(--pw-ink)]/40">ยังไม่มีข้อมูล</span>
                    )}
                  </p>
                  <span className="text-[11px] text-[var(--pw-ink)]/50">การเคลื่อนไหวล่าสุด</span>
                </div>
              </div>

              {settings?.updatedAt && (
                <p className="text-[11px] text-[var(--pw-ink)]/50">
                  อัปเดตการตั้งค่าล่าสุดเมื่อ: {formatDateTime(settings.updatedAt)}
                  {settings.updatedByUserId && ` (โดยผู้ใช้ #${settings.updatedByUserId})`}
                </p>
              )}
            </div>

            {/* Section 3: Database Purge / Maintenance */}
            <div className="space-y-3 rounded-[var(--pw-rounded-sm)] border border-rose-500/20 bg-rose-500/5 p-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="size-4 text-rose-400" />
                <h3 className="font-bold text-rose-300">
                  ล้างข้อมูลประวัติเก่า (Database Cleanup & Purge)
                </h3>
              </div>

              <p className="text-xs leading-relaxed text-[var(--pw-ink)]/70">
                หากฐานข้อมูลมีขนาดใหญ่หรือต้องการลดพื้นที่จัดเก็บ คุณสามารถเลือกลบประวัติที่เก่ากว่าระยะเวลาที่กำหนดได้
                ข้อมูลที่ถูกลบจะไม่สามารถกู้คืนได้
              </p>

              <div className="space-y-2 pt-2">
                <label className="text-xs font-medium text-[var(--pw-ink)]/80">
                  เลือกระยะเวลาที่ต้องการล้างข้อมูล:
                </label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {RETENTION_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className={`flex cursor-pointer items-center gap-2.5 rounded border p-2.5 text-xs transition-colors ${
                        selectedRetentionDays === option.value
                          ? "border-[var(--pw-primary)] bg-[var(--pw-primary)]/10 text-[var(--pw-ink)] font-semibold"
                          : "border-[var(--pw-hairline)] bg-[var(--pw-surface-black)]/40 text-[var(--pw-ink)]/70 hover:border-[var(--pw-hairline)]/80"
                      }`}
                    >
                      <input
                        type="radio"
                        name="retention"
                        value={option.value}
                        checked={selectedRetentionDays === option.value}
                        onChange={() => setSelectedRetentionDays(option.value)}
                        className="size-3.5 accent-[var(--pw-primary)]"
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-rose-500/20 pt-3">
                <span className="text-xs text-rose-400/90">
                  ⚠️ คำสั่งนี้จะทำการลบข้อมูลออกจาก SQL Server ทันที
                </span>

                <ConfirmDialog
                  trigger={
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={purgeMutation.isPending || (settings?.totalLogs ?? 0) === 0}
                    >
                      {purgeMutation.isPending ? (
                        <LoaderCircle className="mr-1.5 size-4 animate-spin" />
                      ) : (
                        <Trash2 className="mr-1.5 size-4" />
                      )}
                      ล้างข้อมูลตามที่เลือก
                    </Button>
                  }
                  title="ยืนยันการล้างประวัติ Audit Logs?"
                  description={`คุณกำลังจะดำเนินการ "${selectedOptionLabel}" ซึ่งจะลบข้อมูลประวัติออกจากฐานข้อมูลอย่างถาวรเพื่อลดขนาด Database ไม่สามารถย้อนกลับหรือกู้คืนได้ คุณแน่ใจหรือไม่?`}
                  confirmLabel="ยืนยันล้างข้อมูล"
                  cancelLabel="ยกเลิก"
                  onConfirm={handlePurge}
                  pending={purgeMutation.isPending}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </BottomSheet>
  );
}