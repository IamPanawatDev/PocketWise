import type { Metadata } from "next";
import { LoginForm } from "@/features/auth/components/LoginForm";

export const metadata: Metadata = {
  title: "เข้าสู่ระบบ (Log in)",
  description: "เข้าสู่ระบบ PocketWise เพื่อจัดการรายรับรายจ่าย สแกนสลิปโอนเงิน และวางแผนงบประมาณการเงินของคุณ",
};

export default function LoginPage() {
  return <LoginForm />;
}
