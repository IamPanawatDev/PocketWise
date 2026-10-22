import type { Metadata } from "next";
import { CreditCardsView } from "@/features/credit-cards/components/CreditCardsView";

export const metadata: Metadata = {
  title: "บัตรเครดิต (Credit Cards)",
  description: "จัดการบัตรเครดิต บันทึกรอบบิล วงเงินคงเหลือ และติดตามรายการใช้จ่ายผ่านบัตร",
};

export default function CreditCardsPage() {
  return <CreditCardsView />;
}
