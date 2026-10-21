import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/features/auth/components/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "ลืมรหัสผ่าน — PocketWise",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
