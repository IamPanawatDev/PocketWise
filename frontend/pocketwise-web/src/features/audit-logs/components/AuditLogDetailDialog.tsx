"use client";

import { BottomSheet } from "@/components/ui/bottom-sheet";
import { formatDateTime } from "@/lib/utils";
import type { AuditLogResponse } from "@/types/audit-log.types";
import { CheckCircle2, Clock, FileCode, Layers, Tag, User } from "lucide-react";

interface AuditLogDetailDialogProps {
  log: AuditLogResponse | null;
  open: boolean;
  onClose: () => void;
}

function getActionBadge(action: string) {
  const norm = action.toLowerCase();
  switch (norm) {
    case "create":
      return {
        label: "สร้าง (Create)",
        className: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
      };
    case "update":
      return {
        label: "แก้ไข (Update)",
        className: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
      };
    case "delete":
      return {
        label: "ลบ (Delete)",
        className: "bg-rose-500/15 text-rose-400 border border-rose-500/30",
      };
    case "import":
      return {
        label: "นำเข้า (Import)",
        className: "bg-sky-500/15 text-sky-400 border border-sky-500/30",
      };
    default:
      return {
        label: action,
        className: "bg-[var(--pw-surface-indigo)] text-[var(--pw-ink)]/80 border border-[var(--pw-hairline)]",
      };
  }
}

export function AuditLogDetailDialog({
  log,
  open,
  onClose,
}: AuditLogDetailDialogProps) {
  if (!log) return null;

  const actionBadge = getActionBadge(log.action);

  let parsedDetails: unknown = null;
  if (log.detailsJson) {
    try {
      parsedDetails = JSON.parse(log.detailsJson);
    } catch {
      parsedDetails = log.detailsJson;
    }
  }

  const isDiffObject =
    parsedDetails &&
    typeof parsedDetails === "object" &&
    "before" in (parsedDetails as Record<string, unknown>) &&
    "after" in (parsedDetails as Record<string, unknown>);

  return (
    <BottomSheet
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
      title={`รายละเอียดประวัติ #${log.auditLogId}`}
      description="บันทึกการกระทำและรายละเอียดข้อมูลก่อน/หลังเปลี่ยนแปลง"
      className="sm:max-w-3xl"
    >
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 sm:px-6">
        {/* Metadata grid */}
        <div className="grid grid-cols-1 gap-3 rounded-[var(--pw-rounded-sm)] border border-[var(--pw-hairline)] bg-[var(--pw-surface-black)]/60 p-4 sm:grid-cols-2">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="size-4 shrink-0 text-[var(--pw-ink)]/60" />
            <span className="text-[var(--pw-ink)]/70">วันเวลา:</span>
            <span className="font-semibold text-[var(--pw-ink)]">{formatDateTime(log.occurredAt)}</span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="size-4 shrink-0 text-[var(--pw-ink)]/60" />
            <span className="text-[var(--pw-ink)]/70">เหตุการณ์:</span>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${actionBadge.className}`}>
              {actionBadge.label}
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Layers className="size-4 shrink-0 text-[var(--pw-ink)]/60" />
            <span className="text-[var(--pw-ink)]/70">ชนิดข้อมูล:</span>
            <span className="font-semibold text-[var(--pw-link)]">{log.entityType}</span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Tag className="size-4 shrink-0 text-[var(--pw-ink)]/60" />
            <span className="text-[var(--pw-ink)]/70">รหัสข้อมูล (Entity ID):</span>
            <span className="font-mono text-xs text-[var(--pw-ink)]">{log.entityId ?? "-"}</span>
          </div>

          <div className="flex items-center gap-2 text-sm sm:col-span-2">
            <User className="size-4 shrink-0 text-[var(--pw-ink)]/60" />
            <span className="text-[var(--pw-ink)]/70">ผู้กระทำ (Actor):</span>
            <span className="font-medium text-[var(--pw-ink)]">
              {log.userDisplayName ?? (log.userId ? `User #${log.userId}` : "ระบบ (System)")}
            </span>
          </div>
        </div>

        {/* Change details / Before & After diff */}
        {isDiffObject ? (
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-bold text-[var(--pw-ink)]">
              <FileCode className="size-4 text-[var(--pw-primary)]" />
              เปรียบเทียบข้อมูลก่อนและหลังการแก้ไข
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-[var(--pw-rounded-sm)] border border-rose-500/30 bg-rose-950/20 p-3">
                <div className="mb-2 text-xs font-bold text-rose-400">ก่อนแก้ไข (Before)</div>
                <pre className="max-h-64 overflow-auto rounded bg-black/40 p-2 font-mono text-xs text-[var(--pw-ink)]/90">
                  {JSON.stringify((parsedDetails as Record<string, unknown>).before, null, 2)}
                </pre>
              </div>

              <div className="rounded-[var(--pw-rounded-sm)] border border-emerald-500/30 bg-emerald-950/20 p-3">
                <div className="mb-2 text-xs font-bold text-emerald-400">หลังแก้ไข (After)</div>
                <pre className="max-h-64 overflow-auto rounded bg-black/40 p-2 font-mono text-xs text-[var(--pw-ink)]/90">
                  {JSON.stringify((parsedDetails as Record<string, unknown>).after, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        ) : parsedDetails ? (
          <div className="space-y-2">
            <h3 className="flex items-center gap-2 text-sm font-bold text-[var(--pw-ink)]">
              <FileCode className="size-4 text-[var(--pw-primary)]" />
              รายละเอียดเหตุการณ์ (Details)
            </h3>
            <pre className="max-h-80 overflow-auto rounded-[var(--pw-rounded-sm)] border border-[var(--pw-hairline)] bg-[var(--pw-surface-black)] p-4 font-mono text-xs text-[var(--pw-ink)]">
              {typeof parsedDetails === "string" ? parsedDetails : JSON.stringify(parsedDetails, null, 2)}
            </pre>
          </div>
        ) : (
          <div className="rounded-[var(--pw-rounded-sm)] border border-[var(--pw-hairline)] bg-[var(--pw-surface-black)]/30 p-6 text-center text-sm text-[var(--pw-ink)]/50">
            ไม่มีรายละเอียด JSON เพิ่มเติมสำหรับเหตุการณ์นี้
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
