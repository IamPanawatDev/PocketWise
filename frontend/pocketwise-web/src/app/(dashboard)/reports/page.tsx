import { Suspense } from "react";
import { connection } from "next/server";
import { ReportsView } from "@/features/reports/components/ReportsView";
import { ReportPageSkeleton } from "@/components/shared/Skeletons";
import { toThailandDateInputValue } from "@/lib/utils";

export default function ReportsPage() {
  return (
    <Suspense fallback={<ReportPageSkeleton />}>
      <ReportsContent />
    </Suspense>
  );
}

async function ReportsContent() {
  await connection();
  const today = toThailandDateInputValue(new Date());
  const firstDayOfMonth = `${today.slice(0, 7)}-01`;
  return (
    <ReportsView
      initialFromDate={firstDayOfMonth}
      initialToDate={today}
    />
  );
}
