import type { Metadata } from "next";
import { BudgetsView } from "@/features/budgets/components/BudgetsView";

export const metadata: Metadata = {
  title: "งบประมาณ (Budgets)",
  description: "วางแผนและควบคุมงบประมาณรายจ่ายรายเดือน พร้อมระบบแจ้งเตือนเมื่อใกล้เกินงบ",
};

export default function BudgetsPage() {
  return <BudgetsView />;
}
