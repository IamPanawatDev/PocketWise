import { Suspense } from "react";
import { connection } from "next/server";
import { ReportsView } from "@/features/reports/components/ReportsView";
import { toThailandDateInputValue } from "@/lib/utils";

export default function ReportsPage() {
  return (
    <Suspense
      fallback={
        <div
          role="status"
          aria-label="กำลังโหลดรายงาน"
          className="min-h-64 animate-pulse rounded-[var(--pw-rounded-lg)] bg-[var(--pw-surface-indigo)]"
        />
      }
    >
      <ReportsContent />
    </Suspense>
  );
}

async function ReportsContent() {
  await connection();
  const today = toThailandDateInputValue(new Date());
  return (
    <ReportsView
      initialFromDate={`${today.slice(0, 4)}-01-01`}
      initialToDate={`${today.slice(0, 4)}-12-31`}
    />
  );
}
