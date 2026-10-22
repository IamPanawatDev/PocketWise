import type { Metadata } from "next";
import { RegisterForm } from "@/features/auth/components/RegisterForm";

export const metadata: Metadata = {
  title: "สมัครสมาชิก (Sign up)",
  description: "สมัครสมาชิก PocketWise ฟรี เริ่มต้นบันทึกรายรับรายจ่าย วางแผนการเงิน และควบคุมงบประมาณอย่างมีประสิทธิภาพ",
};

export default function RegisterPage() {
  return <RegisterForm />;
}
