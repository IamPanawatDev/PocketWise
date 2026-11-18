"use client";

import { BottomSheet } from "@/components/ui/bottom-sheet";
import { formatDisplayDateTime } from "@/lib/date-utils";
import type { AuditLogResponse } from "@/types/audit-log.types";
import { CheckCircle2, Clock, FileCode, Layers, Tag, User, Copy, Check, Sparkles, Image as ImageIcon, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { BottomSheetFooter } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";

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
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(label);
      toast.success(`คัดลอก ${label} เรียบร้อยแล้ว`);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error("ไม่สามารถคัดลอกข้อมูลได้");
    }
  };

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

  const slipDetailsObj =
    log.entityType === "SlipImportFiles" &&
    parsedDetails &&
    typeof parsedDetails === "object" &&
    !Array.isArray(parsedDetails)
      ? (parsedDetails as Record<string, unknown>)
      : null;

  const slipOcrProvider = slipDetailsObj
    ? ((slipDetailsObj.ocrProvider ?? slipDetailsObj.OcrProvider) as string | undefined)
    : undefined;
  const slipOcrEngine = slipDetailsObj
    ? ((slipDetailsObj.ocrEngine ?? slipDetailsObj.OcrEngine) as string | undefined)
    : undefined;
  const slipDurationRaw = slipDetailsObj
    ? (slipDetailsObj.durationSeconds ??
      slipDetailsObj.DurationSeconds ??
      slipDetailsObj.processingDurationSeconds ??
      slipDetailsObj.ProcessingDurationSeconds)
    : undefined;
  const slipDurationSeconds = typeof slipDurationRaw === "number" ? slipDurationRaw : undefined;
  const slipImageCountRaw = slipDetailsObj
    ? (slipDetailsObj.uploadedImageCount ??
      slipDetailsObj.UploadedImageCount ??
      slipDetailsObj.batchImageCount ??
      slipDetailsObj.BatchImageCount)
    : undefined;
  const slipImageCount = typeof slipImageCountRaw === "number" ? slipImageCountRaw : undefined;
  const slipStatus = slipDetailsObj
    ? ((slipDetailsObj.status ?? slipDetailsObj.Status) as string | undefined)
    : undefined;
  const slipErrorMessage = slipDetailsObj
    ? ((slipDetailsObj.errorMessage ?? slipDetailsObj.ErrorMessage) as string | undefined)
    : undefined;

  const hasSlipSummary =
    log.entityType === "SlipImportFiles" &&
    (slipOcrProvider !== undefined ||
      slipOcrEngine !== undefined ||
      slipDurationSeconds !== undefined ||
      slipImageCount !== undefined ||
      slipStatus !== undefined);

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
            <span className="font-semibold text-[var(--pw-ink)]">{formatDisplayDateTime(log.occurredAt)}</span>
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

        {/* Slip Upload & OCR Summary Grid */}
        {hasSlipSummary && (
          <div className="space-y-2.5 rounded-[var(--pw-rounded-sm)] border border-[var(--pw-primary)]/30 bg-[var(--pw-surface-indigo)]/60 backdrop-blur-xl p-4">
            <h3 className="flex items-center gap-2 text-sm font-bold text-[var(--pw-ink)]">
              <Sparkles className="size-4 text-[var(--pw-primary)]" />
              สรุปข้อมูลการอัปโหลดและอ่านสลิป (Slip OCR Metrics)
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
              <div className="rounded-lg border border-[var(--pw-hairline)] bg-[var(--pw-surface-black)]/40 p-3">
                <div className="text-xs text-[var(--pw-ink)]/60">ระบบที่ใช้อ่านสลิป</div>
                <div className="mt-1 font-bold text-[var(--pw-ink)] flex items-center gap-1.5">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold border ${
                      slipOcrProvider?.toUpperCase() === "AI"
                        ? "bg-indigo-500/15 text-indigo-300 border-indigo-500/30"
                        : "bg-sky-500/15 text-sky-300 border-sky-500/30"
                    }`}
                  >
                    {slipOcrProvider?.toUpperCase() === "AI" ? "อ่านด้วย AI" : "อ่านด้วย OCR"}
                  </span>
                  <span className="text-xs text-[var(--pw-ink)]/75">
                    ({slipOcrEngine || (slipOcrProvider?.toUpperCase() === "AI" ? "AI (Gemini)" : "OCR (Tesseract)")})
                  </span>
                </div>
              </div>

              <div className="rounded-lg border border-[var(--pw-hairline)] bg-[var(--pw-surface-black)]/40 p-3">
                <div className="text-xs text-[var(--pw-ink)]/60">เวลาที่ใช้ในการอ่าน</div>
                <div className="mt-1 font-bold text-[var(--pw-ink)]">
                  {typeof slipDurationSeconds === "number"
                    ? `⏱️ ${slipDurationSeconds.toFixed(2)} วินาที`
                    : "-"}
                </div>
              </div>

              <div className="rounded-lg border border-[var(--pw-hairline)] bg-[var(--pw-surface-black)]/40 p-3">
                <div className="text-xs text-[var(--pw-ink)]/60">จำนวนรูปภาพที่อัปโหลด</div>
                <div className="mt-1 font-bold text-[var(--pw-ink)] flex items-center gap-1.5">
                  <ImageIcon className="size-4 text-[var(--pw-primary)]" />
                  <span>{typeof slipImageCount === "number" ? `${slipImageCount} รูปภาพ` : "1 รูปภาพ"}</span>
                </div>
              </div>

              <div className="rounded-lg border border-[var(--pw-hairline)] bg-[var(--pw-surface-black)]/40 p-3">
                <div className="text-xs text-[var(--pw-ink)]/60">สถานะการอัปโหลด/อ่าน</div>
                <div className="mt-1 font-bold flex items-center gap-1.5">
                  {slipStatus?.toLowerCase() === "failed" || slipStatus?.toLowerCase() === "error" ? (
                    <span className="inline-flex items-center rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 px-2.5 py-0.5 text-xs font-semibold">
                      ล้มเหลว
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-semibold">
                      สำเร็จ
                    </span>
                  )}
                </div>
              </div>

              {slipErrorMessage && (
                <div className="sm:col-span-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-start gap-2">
                  <AlertTriangle className="size-4 shrink-0 mt-0.5 text-rose-400" />
                  <div>
                    <span className="font-bold text-rose-400">สาเหตุข้อผิดพลาด: </span>
                    <span>{slipErrorMessage}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Change details / Before & After diff */}
        {isDiffObject ? (
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-bold text-[var(--pw-ink)]">
              <FileCode className="size-4 text-[var(--pw-primary)]" />
              เปรียบเทียบข้อมูลก่อนและหลังการแก้ไข
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-[var(--pw-rounded-sm)] border border-rose-500/30 bg-rose-950/20 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-400">ก่อนแก้ไข</span>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(
                        JSON.stringify((parsedDetails as Record<string, unknown>).before, null, 2),
                        "ข้อมูลก่อนแก้ไข"
                      )
                    }
                    className="min-h-[32px] px-2 py-1 text-[11px] rounded border border-rose-500/40 text-rose-300 hover:bg-rose-500/20 active:scale-95 transition-all flex items-center gap-1"
                    title="คัดลอกข้อมูลก่อนแก้ไข"
                  >
                    {copiedField === "ข้อมูลก่อนแก้ไข" ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                    <span>{copiedField === "ข้อมูลก่อนแก้ไข" ? "คัดลอกแล้ว" : "คัดลอก"}</span>
                  </button>
                </div>
                <pre className="max-h-64 overflow-auto rounded bg-black/40 p-2 font-mono text-xs text-[var(--pw-ink)]/90 overscroll-contain">
                  {JSON.stringify((parsedDetails as Record<string, unknown>).before, null, 2)}
                </pre>
              </div>

              <div className="rounded-[var(--pw-rounded-sm)] border border-emerald-500/30 bg-emerald-950/20 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400">หลังแก้ไข</span>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(
                        JSON.stringify((parsedDetails as Record<string, unknown>).after, null, 2),
                        "ข้อมูลหลังแก้ไข"
                      )
                    }
                    className="min-h-[32px] px-2 py-1 text-[11px] rounded border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/20 active:scale-95 transition-all flex items-center gap-1"
                    title="คัดลอกข้อมูลหลังแก้ไข"
                  >
                    {copiedField === "ข้อมูลหลังแก้ไข" ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                    <span>{copiedField === "ข้อมูลหลังแก้ไข" ? "คัดลอกแล้ว" : "คัดลอก"}</span>
                  </button>
                </div>
                <pre className="max-h-64 overflow-auto rounded bg-black/40 p-2 font-mono text-xs text-[var(--pw-ink)]/90 overscroll-contain">
                  {JSON.stringify((parsedDetails as Record<string, unknown>).after, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        ) : parsedDetails ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-bold text-[var(--pw-ink)]">
                <FileCode className="size-4 text-[var(--pw-primary)]" />
                รายละเอียดเหตุการณ์ (Details)
              </h3>
              <button
                type="button"
                onClick={() =>
                  handleCopy(
                    typeof parsedDetails === "string" ? parsedDetails : JSON.stringify(parsedDetails, null, 2),
                    "รายละเอียดเหตุการณ์"
                  )
                }
                className="min-h-[36px] px-2.5 py-1 text-xs rounded-lg border border-[var(--pw-hairline)] bg-[var(--pw-surface)] text-[var(--pw-ink)] hover:bg-[var(--pw-hairline)]/30 active:scale-95 transition-all flex items-center gap-1.5"
                title="คัดลอกรายละเอียดเหตุการณ์"
              >
                {copiedField === "รายละเอียดเหตุการณ์" ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                <span>{copiedField === "รายละเอียดเหตุการณ์" ? "คัดลอกแล้ว" : "คัดลอก JSON"}</span>
              </button>
            </div>
            <pre className="max-h-80 overflow-auto rounded-[var(--pw-rounded-sm)] border border-[var(--pw-hairline)] bg-[var(--pw-surface-black)] p-4 font-mono text-xs text-[var(--pw-ink)] overscroll-contain">
              {typeof parsedDetails === "string" ? parsedDetails : JSON.stringify(parsedDetails, null, 2)}
            </pre>
          </div>
        ) : (
          <div className="rounded-[var(--pw-rounded-sm)] border border-[var(--pw-hairline)] bg-[var(--pw-surface-black)]/30 p-6 text-center text-sm text-[var(--pw-ink)]/50">
            ไม่มีรายละเอียด JSON เพิ่มเติมสำหรับเหตุการณ์นี้
          </div>
        )}
        <BottomSheetFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            className="w-full min-h-[44px]"
            onClick={onClose}
          >
            ปิด
          </Button>
        </BottomSheetFooter>
      </div>
    </BottomSheet>
  );
}
