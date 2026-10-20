"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  useAuditEntityTypes,
  useAuditLogs,
} from "@/features/audit-logs/hooks/useAuditLogs";
import type { AuditLogFilter, AuditLogResponse } from "@/types/audit-log.types";
import { History, RefreshCw } from "lucide-react";
import { AuditLogDetailDialog } from "./AuditLogDetailDialog";
import { AuditLogFilterBar } from "./AuditLogFilterBar";
import { AuditLogTable } from "./AuditLogTable";

export function AuditLogsView() {
  const [filter, setFilter] = useState<AuditLogFilter>({});
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<AuditLogResponse | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const { data, isLoading, refetch, isFetching } = useAuditLogs(filter, page, 20);
  const { data: entityTypes = [] } = useAuditEntityTypes();

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

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="self-start sm:self-auto"
        >
          <RefreshCw className={`mr-1.5 size-4 ${isFetching ? "animate-spin" : ""}`} />
          รีเฟรชข้อมูล
        </Button>
      </div>

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
        totalPages={totalPages}
        totalItems={totalItems}
        isLoading={isLoading}
        onPageChange={setPage}
        onSelectLog={handleSelectLog}
      />

      {/* Detail Dialog */}
      <AuditLogDetailDialog
        log={selectedLog}
        open={isDetailOpen}
        onClose={handleCloseDetail}
      />
    </div>
  );
}
