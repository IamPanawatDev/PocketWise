import type { Metadata } from "next";
import { ImportsView } from "@/features/imports/components/ImportsView";

export const metadata: Metadata = {
  title: "นำเข้าข้อมูลสลิป & บัตรเครดิต (Imports)",
  description: "นำเข้าสลิปโอนเงินธนาคารด้วย OCR อัจฉริยะ และนำเข้าใบแจ้งยอดบัตรเครดิตผ่านไฟล์ CSV / JSON พร้อมระบบตรวจรายการซ้ำ",
};

export default function ImportsPage() {
  return <ImportsView />;
}
