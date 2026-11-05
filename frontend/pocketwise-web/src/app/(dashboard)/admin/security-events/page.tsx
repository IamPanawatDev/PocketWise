"use client";

import { useState } from "react";

import {
  ShieldAlert,
  Search,

  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Clock,
  Laptop,

  FileCode,
  X,

  Lock,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  RotateCcw,
} from "lucide-react";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { useAdminSecurityEventsQuery } from "@/features/admin-operations/hooks/useAdminOperations";
import { cn } from "@/lib/utils";
import { formatDisplayDateTime } from "@/lib/date-utils";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BottomSheet,
  BottomSheetFooter,
} from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import type { SecurityEventItem } from "@/types/admin-operations.types";

export default function AdminSecurityEventsPage() {
  const { data: user, isLoading: isUserLoading } = useCurrentUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEventType, setSelectedEventType] = useState("");
  const [succeededFilter, setSucceededFilter] = useState<string>("");
  const [maskIp, setMaskIp] = useState(true);
  const [page, setPage] = useState(1);
  const [selectedEvent, setSelectedEvent] = useState<SecurityEventItem | null>(null);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [isUaExpanded, setIsUaExpanded] = useState(false);
  const [copiedType, setCopiedType] = useState<string | null>(null);

  const activeFilterCount =
    (selectedEventType ? 1 : 0) +
    (succeededFilter ? 1 : 0);

  const resetFilters = () => {
    setSelectedEventType("");
    setSucceededFilter("");
    setPage(1);
  };

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedType(label);
      toast.success(`คัดลอก ${label} เรียบร้อยแล้ว`);
      setTimeout(() => setCopiedType(null), 2000);
    } catch {
      toast.error("ไม่สามารถคัดลอกข้อความได้");
    }
  };

  const filters = {
    q: searchQuery || undefined,
    eventType: selectedEventType || undefined,
    succeeded: succeededFilter === "true" ? true : succeededFilter === "false" ? false : undefined,
    maskIp,
    page,
    pageSize: 20,
  };

  const { data: eventsData, isLoading } = useAdminSecurityEventsQuery(filters);

  const isAdmin = (user?.roles?.includes("Admin") || user?.roles?.includes("SuperAdmin")) ?? true;

  if (!isUserLoading && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ShieldAlert className="size-16 text-[var(--pw-expense)] mb-4" />
        <h1 className="text-xl font-bold text-[var(--pw-ink)]">
          ปฏิเสธการเข้าถึง (Access Denied)
        </h1>
        <p className="text-sm text-[var(--pw-ink)]/70 mt-2 max-w-md">
          คุณต้องมีบทบาทระดับ Admin จึงจะสามารถเข้าถึงบันทึกเหตุการณ์ความปลอดภัยของระบบได้
        </p>
      </div>
    );
  }

  const renderEventBadge = (type: string, succeeded: boolean) => {
    let colorClass = "bg-[var(--pw-primary)]/15 text-[var(--pw-primary)]";
    if (!succeeded) {
      colorClass = "bg-[var(--pw-expense)]/15 text-[var(--pw-expense)]";
    } else if (type === "LOGIN_SUCCEEDED") {
      colorClass = "bg-[var(--pw-income)]/15 text-[var(--pw-income)]";
    } else if (type === "ACCOUNT_SUSPENDED") {
      colorClass = "bg-rose-500/15 text-rose-500";
    } else if (type === "TOKEN_REUSE") {
      colorClass = "bg-purple-500/15 text-purple-500";
    } else if (type === "PASSWORD_RESET") {
      colorClass = "bg-amber-500/15 text-amber-500";
    }

    return (
      <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase", colorClass)}>
        {type}
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[var(--pw-primary)]/10 text-[var(--pw-primary)]">
            <Lock className="size-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--pw-ink)]">
              บันทึกเหตุการณ์ความปลอดภัย (Security Events Audit)
            </h1>
            <p className="text-xs sm:text-sm text-[var(--pw-ink)]/70">
              ตรวจสอบบันทึกการเข้าสู่ระบบ การละเมิดโทเค็น และการเปลี่ยนแปลงสิทธิ์ทั้งระบบ
            </p>
          </div>
        </div>

        {/* IP Masking Toggle */}
        <button
          type="button"
          onClick={() => setMaskIp(!maskIp)}
          className={cn(
            "self-stretch sm:self-auto min-h-[44px] sm:min-h-0 px-3.5 py-2 sm:py-1.5 text-xs font-semibold rounded-lg border transition-all active:scale-95 flex items-center justify-center gap-2",
            maskIp
              ? "border-[var(--pw-primary)]/40 bg-[var(--pw-primary)]/10 text-[var(--pw-primary)]"
              : "border-[var(--pw-hairline)] bg-[var(--pw-surface)] text-[var(--pw-ink)]"
          )}
        >
          {maskIp ? <EyeOff className="size-4 sm:size-3.5" /> : <Eye className="size-4 sm:size-3.5" />}
          <span>{maskIp ? "ซ่อน IP (Masked IP)" : "แสดง IP จริง (Raw IP)"}</span>
        </button>
      </div>

      {/* Filters */}
      <div className="p-3 sm:p-4 rounded-xl border border-[var(--pw-hairline)] bg-[var(--pw-surface)] shadow-xs space-y-3">
        {/* Desktop Filter Grid (sm:) */}
        <div className="hidden sm:grid sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="size-4 text-[var(--pw-ink)]/50 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="ค้นหา IP, User Agent หรืออีเมล..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-lg border border-[var(--pw-hairline)] bg-transparent text-[var(--pw-ink)] focus:outline-none focus:border-[var(--pw-primary)]"
            />
          </div>

          <div>
            <Select
              value={selectedEventType || "ALL"}
              onValueChange={(val) => {
                setSelectedEventType(val === "ALL" ? "" : val);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="ทุกประเภทเหตุการณ์ (All Events)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">ทุกประเภทเหตุการณ์ (All Events)</SelectItem>
                <SelectItem value="LOGIN_SUCCEEDED">LOGIN_SUCCEEDED (เข้าสู่ระบบสำเร็จ)</SelectItem>
                <SelectItem value="LOGIN_FAILED">LOGIN_FAILED (เข้าสู่ระบบล้มเหลว)</SelectItem>
                <SelectItem value="TOKEN_REUSE">TOKEN_REUSE (ตรวจพบการใช้ Token ซ้ำ)</SelectItem>
                <SelectItem value="PASSWORD_RESET">PASSWORD_RESET (รีเซ็ตรหัสผ่านสำเร็จ)</SelectItem>
                <SelectItem value="ACCOUNT_SUSPENDED">ACCOUNT_SUSPENDED (ระงับบัญชี)</SelectItem>
                <SelectItem value="ACCOUNT_UNSUSPENDED">ACCOUNT_UNSUSPENDED (ยกเลิกระงับบัญชี)</SelectItem>
                <SelectItem value="SESSION_REVOKED">SESSION_REVOKED (เพิกถอนเซสชัน)</SelectItem>
                <SelectItem value="MAINTENANCE_MODE_UPDATED">MAINTENANCE_MODE_UPDATED (เปลี่ยนโหมดปรับปรุง)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Select
              value={succeededFilter || "ALL"}
              onValueChange={(val) => {
                setSucceededFilter(val === "ALL" ? "" : val);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="ผลลัพธ์ (ทั้งหมด)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">ผลลัพธ์ (ทั้งหมด)</SelectItem>
                <SelectItem value="true">สำเร็จ (Succeeded)</SelectItem>
                <SelectItem value="false">ล้มเหลว (Failed / Blocked)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Mobile Filter Bar (< sm) */}
        <div className="sm:hidden space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="size-4 text-[var(--pw-ink)]/50 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="ค้นหา IP, User Agent หรืออีเมล..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-3 min-h-[44px] text-xs rounded-lg border border-[var(--pw-hairline)] bg-transparent text-[var(--pw-ink)] focus:outline-none focus:border-[var(--pw-primary)]"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowFilterSheet(true)}
              className={cn(
                "min-h-[44px] px-3.5 py-2 text-xs rounded-lg border flex items-center gap-1.5 font-medium shrink-0 transition-all active:scale-95",
                activeFilterCount > 0
                  ? "border-[var(--pw-primary)] bg-[var(--pw-primary)]/15 text-[var(--pw-primary)] font-semibold shadow-xs"
                  : "border-[var(--pw-hairline)] bg-[var(--pw-surface)] text-[var(--pw-ink)] hover:bg-[var(--pw-hairline)]/30"
              )}
              aria-label="เปิดตัวกรองเหตุการณ์ความปลอดภัย"
            >
              <SlidersHorizontal className="size-4" />
              <span>ตัวกรอง</span>
              {activeFilterCount > 0 && (
                <span className="flex size-5 items-center justify-center rounded-full bg-[var(--pw-primary)] text-[11px] font-bold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Active Filter Chips */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs text-[var(--pw-ink)]/75">
              <span className="font-medium text-[var(--pw-ink)]/60">ตัวกรอง:</span>
              {selectedEventType && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--pw-surface-indigo)] border border-[var(--pw-hairline)] px-2.5 py-0.5 text-[11px]">
                  ประเภท: {selectedEventType}
                  <button onClick={() => { setSelectedEventType(""); setPage(1); }} className="hover:text-[var(--pw-expense)]">
                    <X className="size-3" />
                  </button>
                </span>
              )}
              {succeededFilter && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--pw-surface-indigo)] border border-[var(--pw-hairline)] px-2.5 py-0.5 text-[11px]">
                  ผลลัพธ์: {succeededFilter === "true" ? "สำเร็จ" : "ล้มเหลว"}
                  <button onClick={() => { setSucceededFilter(""); setPage(1); }} className="hover:text-[var(--pw-expense)]">
                    <X className="size-3" />
                  </button>
                </span>
              )}
              <button
                onClick={resetFilters}
                className="text-xs text-[var(--pw-primary)] hover:underline ml-1 font-medium"
              >
                ล้างทั้งหมด
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Events Timeline / Table */}
      <div className="rounded-xl border border-[var(--pw-hairline)] bg-[var(--pw-surface)] shadow-sm overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-[var(--pw-hairline)] bg-[var(--pw-hairline)]/10 text-[var(--pw-ink)]/70 font-semibold">
                <th className="py-3 px-4">เวลา</th>
                <th className="py-3 px-4">เหตุการณ์</th>
                <th className="py-3 px-4">เป้าหมาย (Target)</th>
                <th className="py-3 px-4">ผู้กระทำ (Actor)</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4">ผลลัพธ์</th>
                <th className="py-3 px-4 text-right">รายละเอียด</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--pw-hairline)]">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[var(--pw-ink)]/60">
                    กำลังโหลดประวัติเหตุการณ์ความปลอดภัย...
                  </td>
                </tr>
              ) : eventsData?.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[var(--pw-ink)]/60">
                    ไม่พบเหตุการณ์ตามเงื่อนไขที่ค้นหา
                  </td>
                </tr>
              ) : (
                eventsData?.items.map((ev) => (
                  <tr key={ev.securityEventId} className="hover:bg-[var(--pw-hairline)]/10 transition-colors">
                    <td className="py-3.5 px-4 text-xs text-[var(--pw-ink)]/70 whitespace-nowrap">
                      {formatDisplayDateTime(ev.occurredAt)}
                    </td>
                    <td className="py-3.5 px-4">
                      {renderEventBadge(ev.eventType, ev.succeeded)}
                    </td>
                    <td className="py-3.5 px-4">
                      {ev.targetUserDisplayName ? (
                        <div>
                          <div className="font-medium text-[var(--pw-ink)]">{ev.targetUserDisplayName}</div>
                          <div className="text-[11px] text-[var(--pw-ink)]/60">{ev.targetUserEmail}</div>
                        </div>
                      ) : (
                        <span className="text-[var(--pw-ink)]/40">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {ev.actorUserDisplayName ? (
                        <div className="text-xs text-[var(--pw-ink)]/80 font-medium">
                          {ev.actorUserDisplayName}
                        </div>
                      ) : (
                        <span className="text-[var(--pw-ink)]/50 text-xs">ระบบ / ผู้ใช้</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-[var(--pw-ink)]/80">
                      {ev.ipAddress || "-"}
                    </td>
                    <td className="py-3.5 px-4">
                      {ev.succeeded ? (
                        <span className="inline-flex items-center gap-1 text-[var(--pw-income)] text-xs font-semibold">
                          <CheckCircle2 className="size-3.5" /> สำเร็จ
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[var(--pw-expense)] text-xs font-semibold">
                          <XCircle className="size-3.5" /> ล้มเหลว
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {ev.detailsJson || ev.userAgent ? (
                        <button
                          onClick={() => setSelectedEvent(ev)}
                          className="px-2.5 py-1 text-xs rounded border border-[var(--pw-hairline)] bg-[var(--pw-surface)] text-[var(--pw-ink)] hover:bg-[var(--pw-hairline)]/30 transition-colors flex items-center gap-1 ml-auto"
                        >
                          <FileCode className="size-3" /> ดู JSON
                        </button>
                      ) : (
                        <span className="text-[var(--pw-ink)]/40 text-xs">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Security Event Cards List (visible on mobile only) */}
        <div className="md:hidden divide-y divide-[var(--pw-hairline)]">
          {isLoading ? (
            <div className="py-10 text-center text-[var(--pw-ink)]/60 text-xs">
              กำลังโหลดประวัติเหตุการณ์ความปลอดภัย...
            </div>
          ) : eventsData?.items.length === 0 ? (
            <div className="py-10 text-center text-[var(--pw-ink)]/60 text-xs">
              ไม่พบเหตุการณ์ตามเงื่อนไขที่ค้นหา
            </div>
          ) : (
            eventsData?.items.map((ev) => (
              <div key={ev.securityEventId} className="p-3.5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  {renderEventBadge(ev.eventType, ev.succeeded)}
                  {ev.succeeded ? (
                    <span className="inline-flex items-center gap-1 text-[var(--pw-income)] text-xs font-semibold">
                      <CheckCircle2 className="size-3.5" /> สำเร็จ
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[var(--pw-expense)] text-xs font-semibold">
                      <XCircle className="size-3.5" /> ล้มเหลว
                    </span>
                  )}
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-1.5 text-[11px] text-[var(--pw-ink)]/50">
                    <Clock className="size-3" />
                    <span>{formatDisplayDateTime(ev.occurredAt)}</span>
                  </div>

                  {ev.targetUserDisplayName && (
                    <div className="text-[var(--pw-ink)] font-medium">
                      เป้าหมาย: {ev.targetUserDisplayName}
                      {ev.targetUserEmail && (
                        <span className="text-[var(--pw-ink)]/50 text-[11px] ml-1">({ev.targetUserEmail})</span>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-[var(--pw-ink)]/70">
                    <span>
                      ผู้กระทำ: {ev.actorUserDisplayName ?? "ระบบ / ผู้ใช้"}
                    </span>
                    {ev.ipAddress && (
                      <span className="font-mono text-[var(--pw-ink)]/50">
                        IP: {ev.ipAddress}
                      </span>
                    )}
                  </div>
                </div>

                {(ev.detailsJson || ev.userAgent) && (
                  <div className="pt-1.5 border-t border-[var(--pw-hairline)]/40 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedEvent(ev);
                        setIsUaExpanded(false);
                      }}
                      className="w-full min-h-[44px] px-3.5 py-2 text-xs font-semibold rounded-lg border border-[var(--pw-hairline)] bg-[var(--pw-surface)] text-[var(--pw-ink)] hover:bg-[var(--pw-hairline)]/30 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                    >
                      <FileCode className="size-4" /> ดูรายละเอียด / JSON
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {eventsData && eventsData.totalPages > 1 && (
          <div className="p-3 sm:p-4 border-t border-[var(--pw-hairline)] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--pw-ink)]/70">
            <span className="text-center sm:text-left">
              หน้า {eventsData.page} จาก {eventsData.totalPages} (ทั้งหมด {eventsData.totalItems} รายการ)
            </span>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex-1 sm:flex-initial min-h-[44px] sm:min-h-0 sm:h-9 px-4 sm:px-3 py-2 sm:py-1 rounded-lg border border-[var(--pw-hairline)] bg-[var(--pw-surface)] text-[var(--pw-ink)] font-medium disabled:opacity-40 active:scale-95 transition-all text-center flex items-center justify-center"
              >
                ก่อนหน้า
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(eventsData.totalPages, p + 1))}
                disabled={page >= eventsData.totalPages}
                className="flex-1 sm:flex-initial min-h-[44px] sm:min-h-0 sm:h-9 px-4 sm:px-3 py-2 sm:py-1 rounded-lg border border-[var(--pw-hairline)] bg-[var(--pw-surface)] text-[var(--pw-ink)] font-medium disabled:opacity-40 active:scale-95 transition-all text-center flex items-center justify-center"
              >
                ถัดไป
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Filter BottomSheet */}
      <BottomSheet
        open={showFilterSheet}
        onOpenChange={setShowFilterSheet}
        title="ตัวกรองเหตุการณ์ความปลอดภัย"
        description="เลือกประเภทเหตุการณ์และผลลัพธ์เพื่อคัดกรองข้อมูล"
        className="sm:max-w-md"
      >
        <div className="space-y-4 py-2">
          <div>
            <label className="text-xs font-semibold text-[var(--pw-ink)] block mb-1.5">
              ประเภทเหตุการณ์ (Event Type)
            </label>
            <Select
              value={selectedEventType || "ALL"}
              onValueChange={(val) => {
                setSelectedEventType(val === "ALL" ? "" : val);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="ทุกประเภทเหตุการณ์ (All Events)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">ทุกประเภทเหตุการณ์ (All Events)</SelectItem>
                <SelectItem value="LOGIN_SUCCEEDED">LOGIN_SUCCEEDED (เข้าสู่ระบบสำเร็จ)</SelectItem>
                <SelectItem value="LOGIN_FAILED">LOGIN_FAILED (เข้าสู่ระบบล้มเหลว)</SelectItem>
                <SelectItem value="TOKEN_REUSE">TOKEN_REUSE (ตรวจพบการใช้ Token ซ้ำ)</SelectItem>
                <SelectItem value="PASSWORD_RESET">PASSWORD_RESET (รีเซ็ตรหัสผ่านสำเร็จ)</SelectItem>
                <SelectItem value="ACCOUNT_SUSPENDED">ACCOUNT_SUSPENDED (ระงับบัญชี)</SelectItem>
                <SelectItem value="ACCOUNT_UNSUSPENDED">ACCOUNT_UNSUSPENDED (ยกเลิกระงับบัญชี)</SelectItem>
                <SelectItem value="SESSION_REVOKED">SESSION_REVOKED (เพิกถอนเซสชัน)</SelectItem>
                <SelectItem value="MAINTENANCE_MODE_UPDATED">MAINTENANCE_MODE_UPDATED (เปลี่ยนโหมดปรับปรุง)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-semibold text-[var(--pw-ink)] block mb-1.5">
              ผลลัพธ์ (Result)
            </label>
            <Select
              value={succeededFilter || "ALL"}
              onValueChange={(val) => {
                setSucceededFilter(val === "ALL" ? "" : val);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="ผลลัพธ์ (ทั้งหมด)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">ผลลัพธ์ (ทั้งหมด)</SelectItem>
                <SelectItem value="true">สำเร็จ (Succeeded)</SelectItem>
                <SelectItem value="false">ล้มเหลว (Failed / Blocked)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <BottomSheetFooter>
            <Button
              type="button"
              className="w-full min-h-[44px]"
              onClick={() => setShowFilterSheet(false)}
            >
              ใช้งานตัวกรอง
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full min-h-[44px]"
              onClick={() => {
                resetFilters();
                setShowFilterSheet(false);
              }}
            >
              <RotateCcw className="size-3.5 mr-1" />
              ล้างตัวกรอง
            </Button>
          </BottomSheetFooter>
        </div>
      </BottomSheet>

      {/* JSON Details Inspector BottomSheet / Modal */}
      <BottomSheet
        open={!!selectedEvent}
        onOpenChange={(open) => !open && setSelectedEvent(null)}
        title={
          selectedEvent ? (
            <div className="flex items-center gap-2">
              <span>รายละเอียดเหตุการณ์</span>
              {renderEventBadge(selectedEvent.eventType, selectedEvent.succeeded)}
            </div>
          ) : undefined
        }
        description={
          selectedEvent
            ? `${formatDisplayDateTime(selectedEvent.occurredAt)} • ID: #${selectedEvent.securityEventId}`
            : undefined
        }
        className="sm:max-w-2xl"
      >
        {selectedEvent && (() => {
          let prettyJson = "";
          if (selectedEvent.detailsJson) {
            try {
              prettyJson = JSON.stringify(JSON.parse(selectedEvent.detailsJson), null, 2);
            } catch {
              prettyJson = selectedEvent.detailsJson;
            }
          }

          return (
            <div className="space-y-4 py-2">
              {/* Target & Actor overview */}
              <div className="p-3 rounded-xl border border-[var(--pw-hairline)] bg-[var(--pw-surface)]/70 text-xs space-y-1.5">
                <div className="flex justify-between items-center text-[11px] text-[var(--pw-ink)]/60">
                  <span>วันเวลา: {formatDisplayDateTime(selectedEvent.occurredAt)}</span>
                  <span>IP: {selectedEvent.ipAddress || "-"}</span>
                </div>
                {selectedEvent.targetUserDisplayName && (
                  <div className="text-[var(--pw-ink)]">
                    เป้าหมาย: <strong>{selectedEvent.targetUserDisplayName}</strong> ({selectedEvent.targetUserEmail})
                  </div>
                )}
                <div className="text-[var(--pw-ink)]/80">
                  ผู้กระทำ: <strong>{selectedEvent.actorUserDisplayName ?? "ระบบ / ผู้ใช้"}</strong>
                </div>
              </div>

              {/* Collapsible User Agent */}
              {selectedEvent.userAgent && (
                <div className="rounded-xl border border-[var(--pw-hairline)] bg-[var(--pw-surface)]/60 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setIsUaExpanded(!isUaExpanded)}
                    className="w-full min-h-[44px] p-3 flex items-center justify-between text-xs font-semibold text-[var(--pw-ink)] hover:bg-[var(--pw-hairline)]/10 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Laptop className="size-4 text-[var(--pw-primary)]" />
                      <span>User Agent ({isUaExpanded ? "ย่อ" : "คลิกเพื่อขยาย"})</span>
                    </div>
                    {isUaExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                  </button>
                  {isUaExpanded && (
                    <div className="p-3 border-t border-[var(--pw-hairline)]/60 bg-[var(--pw-hairline)]/10 space-y-2">
                      <div className="p-2.5 rounded-lg border border-[var(--pw-hairline)] bg-black/20 text-xs text-[var(--pw-ink)]/90 break-all font-mono leading-relaxed">
                        {selectedEvent.userAgent}
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleCopy(selectedEvent.userAgent!, "User Agent")}
                          className="min-h-[44px] sm:min-h-0 px-3 py-1.5 text-xs rounded-lg border border-[var(--pw-hairline)] bg-[var(--pw-surface)] text-[var(--pw-ink)] hover:bg-[var(--pw-hairline)]/30 active:scale-95 transition-all flex items-center gap-1.5"
                        >
                          {copiedType === "User Agent" ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                          <span>{copiedType === "User Agent" ? "คัดลอกแล้ว" : "คัดลอก User Agent"}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Pretty JSON Details with One-tap Copy */}
              {prettyJson ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold text-[var(--pw-ink)] flex items-center gap-1.5">
                      <FileCode className="size-4 text-[var(--pw-primary)]" />
                      <span>Details Payload (Formatted JSON)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(prettyJson, "JSON Payload")}
                      className="min-h-[44px] sm:min-h-0 px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--pw-hairline)] bg-[var(--pw-surface)] text-[var(--pw-ink)] hover:bg-[var(--pw-hairline)]/30 active:scale-95 transition-all flex items-center gap-1.5"
                    >
                      {copiedType === "JSON Payload" ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                      <span>{copiedType === "JSON Payload" ? "คัดลอกแล้ว" : "คัดลอก JSON"}</span>
                    </button>
                  </div>
                  <pre className="p-3.5 rounded-xl border border-[var(--pw-hairline)] bg-black/30 text-xs font-mono text-[var(--pw-ink)]/90 max-h-72 overflow-y-auto whitespace-pre leading-relaxed overscroll-contain">
                    {prettyJson}
                  </pre>
                </div>
              ) : (
                <div className="text-xs text-[var(--pw-ink)]/50 text-center py-4">
                  ไม่มีรายละเอียด Payload เพิ่มเติม
                </div>
              )}

              <BottomSheetFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedEvent(null)}
                  className="w-full min-h-[44px]"
                >
                  ปิด
                </Button>
              </BottomSheetFooter>
            </div>
          );
        })()}
      </BottomSheet>
    </div>
  );
}
