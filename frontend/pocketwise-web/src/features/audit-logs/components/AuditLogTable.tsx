"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";
import type { AuditLogResponse } from "@/types/audit-log.types";
import { ChevronLeft, ChevronRight, Eye, FileText, Loader2 } from "lucide-react";

interface AuditLogTableProps {
  logs: AuditLogResponse[];
  page: number;
  totalPages: number;
  totalItems: number;
  isLoading: boolean;
  onPageChange: (newPage: number) => void;
  onSelectLog: (log: AuditLogResponse) => void;
}

function getActionBadge(action: string) {
  const norm = action.toLowerCase();
  switch (norm) {
    case "create":
      return {
        label: "สร้าง",
        className: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
      };
    case "update":
      return {
        label: "แก้ไข",
        className: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
      };
    case "delete":
      return {
        label: "ลบ",
        className: "bg-rose-500/15 text-rose-400 border border-rose-500/30",
      };
    case "import":
      return {
        label: "นำเข้า",
        className: "bg-sky-500/15 text-sky-400 border border-sky-500/30",
      };
    default:
      return {
        label: action,
        className: "bg-white/10 text-white/80 border border-white/20",
      };
  }
}

export function AuditLogTable({
  logs,
  page,
  totalPages,
  totalItems,
  isLoading,
  onPageChange,
  onSelectLog,
}: AuditLogTableProps) {
  if (isLoading) {
    return (
      <Card className="flex min-h-[300px] flex-col items-center justify-center p-8 text-[var(--pw-ink)]/60">
        <Loader2 className="mb-3 size-8 animate-spin text-[var(--pw-primary)]" />
        <p className="text-sm">กำลังโหลดประวัติการเปลี่ยนแปลง...</p>
      </Card>
    );
  }

  if (logs.length === 0) {
    return (
      <Card className="flex min-h-[300px] flex-col items-center justify-center p-8 text-center text-[var(--pw-ink)]/60">
        <FileText className="mb-3 size-12 opacity-30" />
        <p className="text-base font-semibold text-[var(--pw-ink)]">ไม่พบประวัติการเปลี่ยนแปลง</p>
        <p className="mt-1 text-sm text-[var(--pw-ink)]/50">
          ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา หรือยังไม่มีเหตุการณ์ถูกบันทึก
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Desktop Table View */}
      <Card className="hidden overflow-hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--pw-hairline)] bg-[var(--pw-surface-black)]/50 text-xs text-[var(--pw-ink)]/60">
              <tr>
                <th className="px-4 py-3 font-semibold">วันเวลา (Occurred At)</th>
                <th className="px-4 py-3 font-semibold">เหตุการณ์ (Action)</th>
                <th className="px-4 py-3 font-semibold">ชนิดข้อมูล (Entity)</th>
                <th className="px-4 py-3 font-semibold">รหัส (Entity ID)</th>
                <th className="px-4 py-3 font-semibold">ผู้กระทำ (Actor)</th>
                <th className="px-4 py-3 text-right font-semibold">ดูรายละเอียด</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--pw-hairline)]">
              {logs.map((log) => {
                const badge = getActionBadge(log.action);
                return (
                  <tr
                    key={log.auditLogId}
                    className="transition-colors hover:bg-white/[0.03]"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-[var(--pw-ink)]/80">
                      {formatDateTime(log.occurredAt)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.className}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-[var(--pw-link)]">
                      {log.entityType}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-[var(--pw-ink)]/70">
                      {log.entityId ?? "-"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-[var(--pw-ink)]/80">
                      {log.userDisplayName ?? (log.userId ? `User #${log.userId}` : "ระบบ")}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onSelectLog(log)}
                        className="text-[var(--pw-link)] hover:text-white"
                        aria-label={`ดูรายละเอียดประวัติ #${log.auditLogId}`}
                      >
                        <Eye className="mr-1 size-4" />
                        ดู
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Mobile Card List View */}
      <div className="space-y-3 md:hidden">
        {logs.map((log) => {
          const badge = getActionBadge(log.action);
          return (
            <Card key={log.auditLogId} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${badge.className}`}>
                    {badge.label}
                  </span>
                  <span className="ml-2 font-semibold text-[var(--pw-link)]">{log.entityType}</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onSelectLog(log)}
                  className="h-7 px-2 text-xs"
                >
                  <Eye className="mr-1 size-3.5" />
                  ดู
                </Button>
              </div>

              <div className="mt-2.5 space-y-1 text-xs text-[var(--pw-ink)]/70">
                {log.entityId && (
                  <div>
                    <span className="text-[var(--pw-ink)]/40">Entity ID: </span>
                    <span className="font-mono">{log.entityId}</span>
                  </div>
                )}
                <div>
                  <span className="text-[var(--pw-ink)]/40">โดย: </span>
                  <span>{log.userDisplayName ?? (log.userId ? `User #${log.userId}` : "ระบบ")}</span>
                </div>
                <div>
                  <span className="text-[var(--pw-ink)]/40">เมื่อ: </span>
                  <span>{formatDateTime(log.occurredAt)}</span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Pagination Controls */}
      <div className="flex flex-col items-center justify-between gap-3 px-1 py-2 text-xs text-[var(--pw-ink)]/70 sm:flex-row sm:text-sm">
        <div>
          ทั้งหมด <span className="font-bold text-[var(--pw-ink)]">{totalItems.toLocaleString()}</span> รายการ
          {" "}(หน้า {page} จาก {Math.max(1, totalPages)})
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="หน้าก่อนหน้า"
          >
            <ChevronLeft className="size-4" />
            ก่อนหน้า
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            aria-label="หน้าถัดไป"
          >
            ถัดไป
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
