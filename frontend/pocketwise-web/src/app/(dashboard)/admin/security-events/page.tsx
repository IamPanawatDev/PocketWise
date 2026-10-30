"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ShieldAlert,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Clock,
  Laptop,
  Globe,
  FileCode,
  X,
  AlertTriangle,
  Lock,
} from "lucide-react";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { useAdminSecurityEventsQuery } from "@/features/admin-operations/hooks/useAdminOperations";
import { cn } from "@/lib/utils";
import type { SecurityEventItem } from "@/types/admin-operations.types";

export default function AdminSecurityEventsPage() {
  const { data: user, isLoading: isUserLoading } = useCurrentUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEventType, setSelectedEventType] = useState("");
  const [succeededFilter, setSucceededFilter] = useState<string>("");
  const [maskIp, setMaskIp] = useState(true);
  const [page, setPage] = useState(1);
  const [selectedEvent, setSelectedEvent] = useState<SecurityEventItem | null>(null);

  const filters = {
    q: searchQuery || undefined,
    eventType: selectedEventType || undefined,
    succeeded: succeededFilter === "true" ? true : succeededFilter === "false" ? false : undefined,
    maskIp,
    page,
    pageSize: 20,
  };

  const { data: eventsData, isLoading, refetch } = useAdminSecurityEventsQuery(filters);

  const isAdmin = user?.roles?.includes("Admin") ?? true;

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
          onClick={() => setMaskIp(!maskIp)}
          className={cn(
            "self-start sm:self-auto px-3.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-2",
            maskIp
              ? "border-[var(--pw-primary)]/40 bg-[var(--pw-primary)]/10 text-[var(--pw-primary)]"
              : "border-[var(--pw-hairline)] bg-[var(--pw-surface)] text-[var(--pw-ink)]"
          )}
        >
          {maskIp ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
          <span>{maskIp ? "ซ่อน IP (Masked IP)" : "แสดง IP จริง (Raw IP)"}</span>
        </button>
      </div>

      {/* Filters */}
      <div className="p-4 rounded-xl border border-[var(--pw-hairline)] bg-[var(--pw-surface)] shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="size-4 text-[var(--pw-ink)]/50 absolute left-3 top-1/2 -translate-y-1/2" />
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
            <select
              value={selectedEventType}
              onChange={(e) => {
                setSelectedEventType(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-[var(--pw-hairline)] bg-[var(--pw-surface)] text-[var(--pw-ink)] focus:outline-none focus:border-[var(--pw-primary)]"
            >
              <option value="">ทุกประเภทเหตุการณ์ (All Events)</option>
              <option value="LOGIN_SUCCEEDED">LOGIN_SUCCEEDED (เข้าสู่ระบบสำเร็จ)</option>
              <option value="LOGIN_FAILED">LOGIN_FAILED (เข้าสู่ระบบล้มเหลว)</option>
              <option value="TOKEN_REUSE">TOKEN_REUSE (ตรวจพบการใช้ Token ซ้ำ)</option>
              <option value="PASSWORD_RESET">PASSWORD_RESET (รีเซ็ตรหัสผ่านสำเร็จ)</option>
              <option value="ACCOUNT_SUSPENDED">ACCOUNT_SUSPENDED (ระงับบัญชี)</option>
              <option value="ACCOUNT_UNSUSPENDED">ACCOUNT_UNSUSPENDED (ยกเลิกระงับบัญชี)</option>
              <option value="SESSION_REVOKED">SESSION_REVOKED (เพิกถอนเซสชัน)</option>
              <option value="MAINTENANCE_MODE_UPDATED">MAINTENANCE_MODE_UPDATED (เปลี่ยนโหมดปรับปรุง)</option>
            </select>
          </div>

          <div>
            <select
              value={succeededFilter}
              onChange={(e) => {
                setSucceededFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-[var(--pw-hairline)] bg-[var(--pw-surface)] text-[var(--pw-ink)] focus:outline-none focus:border-[var(--pw-primary)]"
            >
              <option value="">ผลลัพธ์ (ทั้งหมด)</option>
              <option value="true">สำเร็จ (Succeeded)</option>
              <option value="false">ล้มเหลว (Failed / Blocked)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Events Timeline / Table */}
      <div className="rounded-xl border border-[var(--pw-hairline)] bg-[var(--pw-surface)] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
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
                      {new Date(ev.occurredAt).toLocaleString("th-TH")}
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

        {/* Pagination */}
        {eventsData && eventsData.totalPages > 1 && (
          <div className="p-4 border-t border-[var(--pw-hairline)] flex items-center justify-between text-xs text-[var(--pw-ink)]/70">
            <span>
              หน้า {eventsData.page} จาก {eventsData.totalPages} (ทั้งหมด {eventsData.totalItems} รายการ)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-2.5 py-1 rounded border border-[var(--pw-hairline)] bg-[var(--pw-surface)] disabled:opacity-40"
              >
                ก่อนหน้า
              </button>
              <button
                onClick={() => setPage((p) => Math.min(eventsData.totalPages, p + 1))}
                disabled={page >= eventsData.totalPages}
                className="px-2.5 py-1 rounded border border-[var(--pw-hairline)] bg-[var(--pw-surface)] disabled:opacity-40"
              >
                ถัดไป
              </button>
            </div>
          </div>
        )}
      </div>

      {/* JSON Details Inspector Modal */}
      <AnimatePresence>
        {selectedEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-2xl border border-[var(--pw-hairline)] bg-[var(--pw-surface)] p-6 shadow-xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-[var(--pw-ink)] flex items-center gap-2">
                    <span>รายละเอียดเหตุการณ์</span>
                    {renderEventBadge(selectedEvent.eventType, selectedEvent.succeeded)}
                  </h3>
                  <p className="text-xs text-[var(--pw-ink)]/60 mt-0.5">
                    {new Date(selectedEvent.occurredAt).toLocaleString("th-TH")} &bull; ID: #{selectedEvent.securityEventId}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="p-1 rounded-lg text-[var(--pw-ink)]/60 hover:text-[var(--pw-ink)]"
                >
                  <X className="size-5" />
                </button>
              </div>

              {selectedEvent.userAgent && (
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-[var(--pw-ink)]">User Agent</div>
                  <div className="p-2.5 rounded-lg border border-[var(--pw-hairline)] bg-[var(--pw-hairline)]/10 text-xs text-[var(--pw-ink)]/80 break-all font-mono">
                    {selectedEvent.userAgent}
                  </div>
                </div>
              )}

              {selectedEvent.detailsJson && (
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-[var(--pw-ink)]">Details (JSON)</div>
                  <pre className="p-3 rounded-lg border border-[var(--pw-hairline)] bg-[var(--pw-hairline)]/20 text-xs font-mono text-[var(--pw-ink)]/90 max-h-60 overflow-y-auto whitespace-pre-wrap">
                    {selectedEvent.detailsJson}
                  </pre>
                </div>
              )}

              <div className="flex items-center justify-end pt-2">
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-[var(--pw-hairline)] bg-[var(--pw-surface)] text-[var(--pw-ink)] hover:bg-[var(--pw-hairline)]/30"
                >
                  ปิด
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
