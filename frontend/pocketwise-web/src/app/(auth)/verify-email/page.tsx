import type { Metadata } from "next";
import { Suspense } from "react";
import { VerifyEmailView } from "@/features/auth/components/VerifyEmailView";
import { Card } from "@/components/ui/card";
import { LoaderCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "ยืนยันที่อยู่อีเมล — PocketWise",
};

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center px-4">
          <Card className="w-full max-w-md p-8 text-center border-[var(--pw-border)]">
            <LoaderCircle className="mx-auto size-8 animate-spin text-[var(--pw-primary)]" />
            <p className="mt-3 text-sm text-[var(--pw-ink)]/70">กำลังโหลด...</p>
          </Card>
        </main>
      }
    >
      <VerifyEmailView />
    </Suspense>
  );
}
