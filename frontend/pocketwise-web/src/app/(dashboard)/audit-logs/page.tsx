import type { Metadata } from "next";
import { Suspense } from "react";
import { AuditLogsView } from "@/features/audit-logs/components/AuditLogsView";

export const metadata: Metadata = {
  title: "ประวัติการเปลี่ยนแปลง (Audit Logs) — PocketWise",
};

export default function AuditLogsPage() {
  return (
    <Suspense
      fallback={
        <div
          role="status"
          aria-label="กำลังโหลดประวัติการเปลี่ยนแปลง"
          className="min-h-64 animate-pulse rounded-[var(--pw-rounded-lg)] bg-[var(--pw-surface-indigo)]"
        />
      }
    >
      <AuditLogsView />
    </Suspense>
  );
}
