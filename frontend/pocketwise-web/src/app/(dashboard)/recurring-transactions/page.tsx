import type { Metadata } from "next";
import { RecurringTransactionsView } from "@/features/recurring-transactions/components/RecurringTransactionsView";

export const metadata: Metadata = {
  title: "รายการที่เกิดขึ้นประจำ (Recurring)",
  description: "จัดการรายการรายรับรายจ่ายที่เกิดขึ้นซ้ำเป็นประจำทุกเดือนแบบอัตโนมัติ",
};

export default function RecurringTransactionsPage() {
  return <RecurringTransactionsView />;
}
