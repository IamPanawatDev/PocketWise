"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AnimatedList, AnimatedListItem } from "@/components/ui/animated-list";
import { TableSkeleton } from "@/components/shared/Skeletons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDateTime } from "@/lib/utils";
import type { AuditLogResponse } from "@/types/audit-log.types";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  FileUp,
  Loader2,
  Pencil,
  PlusCircle,
  Trash2,
} from "lucide-react";

interface AuditLogTableProps {
  logs: AuditLogResponse[];
  page: number;
  pageSize?: number;
  totalPages: number;
  totalItems: number;
  isLoading: boolean;
  onPageChange: (newPage: number) => void;
  onPageSizeChange?: (newSize: number) => void;
  onSelectLog: (log: AuditLogResponse) => void;
}

function getActionBadge(action: string) {
  const norm = action.toLowerCase();
  switch (norm) {
    case "create":
      return {
        label: "สร้าง",
        icon: <PlusCircle className="mr-1 size-3 shrink-0" />,
        className: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
      };
    case "update":
      return {
        label: "แก้ไข",
        icon: <Pencil className="mr-1 size-3 shrink-0" />,
        className: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
      };
    case "delete":
      return {
        label: "ลบ",
        icon: <Trash2 className="mr-1 size-3 shrink-0" />,
        className: "bg-rose-500/15 text-rose-400 border border-rose-500/30",
      };
    case "import":
      return {
        label: "นำเข้า",
        icon: <FileUp className="mr-1 size-3 shrink-0" />,
        className: "bg-sky-500/15 text-sky-400 border border-sky-500/30",
      };
    default:
      return {
        label: action,
        icon: null,
        className: "bg-[var(--pw-surface-indigo)] text-[var(--pw-ink)]/80 border border-[var(--pw-hairline)]",
      };
  }
}

export function AuditLogTable({
  logs,
  page,
  pageSize = 20,
  totalPages,
  totalItems,
  isLoading,
  onPageChange,
  onPageSizeChange,
  onSelectLog,
}: AuditLogTableProps) {
  const fromItem = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const toItem = Math.min(page * pageSize, totalItems);
  if (isLoading) {
    return <TableSkeleton rows={8} columns={6} />;
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
                        {badge.icon}
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
                        className="text-[var(--pw-link)] hover:text-[var(--pw-ink)] hover:underline"
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
      <AnimatedList className="space-y-3 md:hidden">
        {logs.map((log) => {
          const badge = getActionBadge(log.action);
          return (
            <AnimatedListItem key={log.auditLogId}>
              <Card className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${badge.className}`}>
                      {badge.icon}
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
            </AnimatedListItem>
          );
        })}
      </AnimatedList>

      {/* Pagination Controls */}
      <div className="flex flex-col items-center justify-between gap-3 px-1 py-3 text-xs text-[var(--pw-ink)]/70 sm:flex-row sm:text-sm">
        <div className="flex flex-wrap items-center gap-3">
          <span>
            แสดง <span className="font-semibold text-[var(--pw-ink)]">{fromItem} - {toItem}</span> จากทั้งหมด{" "}
            <span className="font-bold text-[var(--pw-ink)]">{totalItems.toLocaleString()}</span> รายการ
            {" "}(หน้า {page} จาก {Math.max(1, totalPages)})
          </span>

          {onPageSizeChange && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[var(--pw-ink)]/50">ต่อหน้า:</span>
              <Select
                value={String(pageSize)}
                onValueChange={(val) => onPageSizeChange(Number(val))}
              >
                <SelectTrigger className="h-7 w-24 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 / หน้า</SelectItem>
                  <SelectItem value="20">20 / หน้า</SelectItem>
                  <SelectItem value="50">50 / หน้า</SelectItem>
                  <SelectItem value="100">100 / หน้า</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
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
