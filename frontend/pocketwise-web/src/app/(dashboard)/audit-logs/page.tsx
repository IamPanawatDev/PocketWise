import type { Metadata } from "next";
import { Suspense } from "react";
import { AuditLogsView } from "@/features/audit-logs/components/AuditLogsView";
import { TableSkeleton } from "@/components/shared/Skeletons";

export const metadata: Metadata = {
  title: "ประวัติการเปลี่ยนแปลง (Audit Logs) — PocketWise",
};

export default function AuditLogsPage() {
  return (
    <Suspense fallback={<TableSkeleton rows={8} columns={6} />}>
      <AuditLogsView />
    </Suspense>
  );
}
