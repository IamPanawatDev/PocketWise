import type { Metadata } from "next";
import { CategorizationView } from "@/features/categorization/components/CategorizationView";

export const metadata: Metadata = {
  title: "จัดหมวดหมู่อัตโนมัติ (Auto-Categorization)",
  description: "ตั้งค่ากฎจัดหมวดหมู่อัจฉริยะสำหรับร้านค้า รายการสลิปโอนเงิน และใบแจ้งยอด",
};

export default function CategorizationPage() {
  return <CategorizationView />;
}
