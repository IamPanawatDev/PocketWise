import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { TransactionList } from "@/features/transactions/components/TransactionList";
import { TransactionPageSkeleton } from "@/components/shared/Skeletons";
import { getCurrentThailandMonthFilter } from "@/lib/utils";

export const metadata: Metadata = {
  title: "รายการธุรกรรม รายรับ-รายจ่าย (Transactions)",
  description: "จัดการและติดตามรายการรายรับ รายจ่าย ทั้งหมดของคุณอย่างละเอียด พร้อมตัวกรองและหมวดหมู่",
};

export default function TransactionsPage() {
  return (
    <Suspense fallback={<TransactionPageSkeleton />}>
      <TransactionsContent />
    </Suspense>
  );
}

async function TransactionsContent() {
  await connection();
  return <TransactionList initialFilter={getCurrentThailandMonthFilter(new Date())} />;
}
