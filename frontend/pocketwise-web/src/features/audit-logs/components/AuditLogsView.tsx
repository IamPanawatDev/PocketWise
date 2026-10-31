"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import {
  useAuditEntityTypes,
  useAuditLogSettings,
  useAuditLogs,
} from "@/features/audit-logs/hooks/useAuditLogs";
import type { AuditLogFilter, AuditLogResponse } from "@/types/audit-log.types";
import { AlertTriangle, History, RefreshCw, Settings, ShieldAlert } from "lucide-react";
import { AuditLogDetailDialog } from "./AuditLogDetailDialog";
import { AuditLogFilterBar } from "./AuditLogFilterBar";
import { AuditLogSettingsModal } from "./AuditLogSettingsModal";
import { AuditLogTable } from "./AuditLogTable";

export function AuditLogsView() {
  const [filter, setFilter] = useState<AuditLogFilter>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedLog, setSelectedLog] = useState<AuditLogResponse | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const { data: user, isLoading: isLoadingUser } = useCurrentUser();
  const isAdmin = (user?.roles?.includes("Admin") || user?.roles?.includes("SuperAdmin")) ?? true;

  const { data, isLoading, refetch, isFetching } = useAuditLogs(filter, page, pageSize, isAdmin);
  const { data: entityTypes = [] } = useAuditEntityTypes(isAdmin);
  const { data: settings } = useAuditLogSettings(isAdmin);

  const handleFilterChange = (patch: Partial<AuditLogFilter>) => {
    setFilter((prev) => ({ ...prev, ...patch }));
    setPage(1);
  };

  const handleReset = () => {
    setFilter({});
    setPage(1);
  };

  const handleSelectLog = (log: AuditLogResponse) => {
    setSelectedLog(log);
    setIsDetailOpen(true);
  };

  const handleCloseDetail = () => {
    setIsDetailOpen(false);
    setSelectedLog(null);
  };

  const logs = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalItems = data?.totalItems ?? 0;

  if (!isLoadingUser && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ShieldAlert className="size-16 text-[var(--pw-expense)] mb-4" />
        <h1 className="text-xl font-bold text-[var(--pw-ink)]">
          ปฏิเสธการเข้าถึง (Access Denied)
        </h1>
        <p className="text-sm text-[var(--pw-ink)]/70 mt-2 max-w-md">
          คุณต้องมีบทบาทระดับ Admin จึงจะสามารถเข้าถึงและตรวจสอบประวัติการเปลี่ยนแปลงของระบบ (Audit Logs) ได้
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <History className="size-6 text-[var(--pw-primary)]" />
            <h1 className="text-xl font-bold text-[var(--pw-ink)] sm:text-2xl">
              ประวัติการเปลี่ยนแปลง (Audit Logs)
            </h1>
          </div>
          <p className="mt-1 text-xs text-[var(--pw-ink)]/65 sm:text-sm">
            ตรวจสอบประวัติการสร้าง แก้ไข ลบ และนำเข้าข้อมูลย้อนหลังของระบบ
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isAdmin && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsSettingsOpen(true)}
              className="border-[var(--pw-primary)]/40 hover:bg-[var(--pw-primary)]/10"
            >
              <Settings className="mr-1.5 size-4 text-[var(--pw-primary)]" />
              ตั้งค่าการบันทึก (Admin Setup)
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`mr-1.5 size-4 ${isFetching ? "animate-spin" : ""}`} />
            รีเฟรชข้อมูล
          </Button>
        </div>
      </div>

      {/* Warning banner when Audit Log is disabled */}
      {settings && !settings.isEnabled && (
        <div className="flex items-center justify-between rounded-[var(--pw-rounded-sm)] border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300 sm:text-sm">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="size-5 shrink-0 text-amber-400" />
            <div>
              <span className="font-bold">ระบบปิดการบันทึก Audit Log ชั่วคราว:</span>{" "}
              <span>
                ข้อมูลการเปลี่ยนแปลงใหม่จะไม่ถูกบันทึกลงฐานข้อมูลเพื่อประหยัดพื้นที่จัดเก็บ
              </span>
            </div>
          </div>
          {isAdmin && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsSettingsOpen(true)}
              className="text-xs text-amber-300 underline hover:text-amber-200"
            >
              เปิดการบันทึก
            </Button>
          )}
        </div>
      )}

      {/* Filter Bar */}
      <AuditLogFilterBar
        filter={filter}
        onFilterChange={handleFilterChange}
        onReset={handleReset}
        entityTypes={entityTypes}
      />

      {/* Logs Table */}
      <AuditLogTable
        logs={logs}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        totalItems={totalItems}
        isLoading={isLoading}
        onPageChange={setPage}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setPage(1);
        }}
        onSelectLog={handleSelectLog}
      />

      {/* Detail Dialog */}
      <AuditLogDetailDialog
        log={selectedLog}
        open={isDetailOpen}
        onClose={handleCloseDetail}
      />

      {/* Admin Settings Modal */}
      {isAdmin && (
        <AuditLogSettingsModal
          open={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </div>
  );
}
