import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { TransactionList } from "@/features/transactions/components/TransactionList";
import { getCurrentThailandMonthFilter } from "@/lib/utils";

export const metadata: Metadata = { title: "รายการ — PocketWise" };

export default function TransactionsPage() {
  return (
    <Suspense
      fallback={
        <div
          role="status"
          aria-label="กำลังโหลดรายการ"
          className="min-h-64 animate-pulse rounded-[var(--pw-rounded-lg)] bg-[var(--pw-surface-indigo)]"
        />
      }
    >
      <TransactionsContent />
    </Suspense>
  );
}

async function TransactionsContent() {
  await connection();
  return <TransactionList initialFilter={getCurrentThailandMonthFilter(new Date())} />;
}
