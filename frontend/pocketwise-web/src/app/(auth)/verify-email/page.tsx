import type { Metadata } from "next";
import { Suspense } from "react";
import { VerifyEmailView } from "@/features/auth/components/VerifyEmailView";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "ยืนยันที่อยู่อีเมล — PocketWise",
};

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center px-4">
          <Card className="w-full max-w-md p-8 text-center space-y-4 border-[var(--pw-border)]">
            <Skeleton className="mx-auto size-12 rounded-full" />
            <Skeleton className="mx-auto h-6 w-48" />
            <Skeleton className="mx-auto h-4 w-64" />
            <Skeleton className="mx-auto h-10 w-36 rounded-md pt-2" />
          </Card>
        </main>
      }
    >
      <VerifyEmailView />
    </Suspense>
  );
}
