import type { Metadata } from "next";
import { SettingsView } from "@/features/settings/components/SettingsView";

export const metadata: Metadata = {
  title: "ตั้งค่าระบบและโปรไฟล์ (Settings)",
  description: "จัดการโปรไฟล์ผู้ใช้งาน การแจ้งเตือน สกุลเงินหลัก และการตั้งค่าระบบ PocketWise",
};

export default function SettingsPage() {
  return <SettingsView />;
}
