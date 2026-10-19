import type { Metadata } from "next";
import { LoginForm } from "@/features/auth/components/LoginForm";

export const metadata: Metadata = { title: "เข้าสู่ระบบ — PocketWise" };

export default function LoginPage() {
  return <LoginForm />;
}
