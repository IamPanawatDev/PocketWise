"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useVerifyEmail } from "@/features/auth/hooks/useEmailVerification";
import { ApiError } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { TiltCard } from "@/components/ui/tilt-card";
import { Button } from "@/components/ui/button";
import { motion } from "motion/react";
import { CheckCircle2, XCircle, LoaderCircle, ArrowRight, Mail } from "lucide-react";

export function VerifyEmailView() {
  const searchParams = useSearchParams();
  const userIdParam = searchParams.get("userId");
  const tokenParam = searchParams.get("token");

  const userId = userIdParam ? Number(userIdParam) : 0;
  const token = tokenParam ?? "";

  const verifyMutation = useVerifyEmail();
  const hasTriggered = useRef(false);

  useEffect(() => {
    if (hasTriggered.current) return;

    if (userId > 0 && token) {
      hasTriggered.current = true;
      verifyMutation.mutate({ userId, token });
    }
  }, [userId, token, verifyMutation]);

  const isInvalidParams = !userId || userId <= 0 || !token;

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-6">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md"
      >
        <TiltCard maxTilt={5}>
          <Card className="w-full p-6 sm:p-8 text-center shadow-lg border-[var(--pw-border)]">
            {isInvalidParams ? (
              <div className="space-y-4">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="mx-auto flex size-14 items-center justify-center rounded-full bg-red-500/10 text-red-500"
                >
                  <XCircle className="size-8" />
                </motion.div>
                <h1 className="text-xl font-bold">ลิงก์ยืนยันไม่ถูกต้อง</h1>
                <p className="text-sm text-[var(--pw-ink)]/70">
                  ลิงก์นี้ไม่มีข้อมูลสำหรับยืนยันที่ถูกต้อง หรืออาจถูกตัดทอน กรุณาเข้าสู่ระบบและขอลิงก์ยืนยันใหม่อีกครั้ง
                </p>
                <div className="pt-2 flex flex-col gap-2">
                  <Link href="/login">
                    <Button className="w-full">
                      เข้าสู่ระบบ
                      <ArrowRight className="size-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            ) : verifyMutation.isPending ? (
              <div className="space-y-4 py-4">
                <div className="relative mx-auto flex size-16 items-center justify-center">
                  <div className="absolute size-14 animate-ping rounded-full bg-[var(--pw-primary)]/20" />
                  <div className="flex size-14 items-center justify-center rounded-full bg-[var(--pw-primary)]/10 text-[var(--pw-primary)]">
                    <LoaderCircle className="size-8 animate-spin" />
                  </div>
                </div>
                <h1 className="text-xl font-bold">กำลังยืนยันที่อยู่อีเมล...</h1>
                <p className="text-sm text-[var(--pw-ink)]/70">
                  กรุณารอสักครู่ ระบบกำลังตรวจสอบข้อมูลความถูกต้องของโทเค็น
                </p>
              </div>
            ) : verifyMutation.isSuccess ? (
              <div className="space-y-4">
                {/* Success Radar Pulse Effect */}
                <div className="relative mx-auto flex size-20 items-center justify-center">
                  <motion.div
                    className="absolute size-16 rounded-full bg-emerald-500/20"
                    animate={{ scale: [1, 1.45, 1], opacity: [0.7, 0.2, 0.7] }}
                    transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
                  />
                  <motion.div
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 350, damping: 20 }}
                    className="flex size-14 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400"
                  >
                    <CheckCircle2 className="size-8" />
                  </motion.div>
                </div>

                <h1 className="text-xl font-bold text-emerald-400">
                  ยืนยันที่อยู่อีเมลสำเร็จ
                </h1>
                <p className="text-sm text-[var(--pw-ink)]/75">
                  {verifyMutation.data?.message || "ที่อยู่อีเมลของคุณได้รับการยืนยันเรียบร้อยแล้ว"}
                </p>
                {verifyMutation.data?.email && (
                  <p className="inline-flex items-center gap-1.5 rounded-full bg-[var(--pw-surface-onyx)] px-3 py-1 text-xs font-mono text-[var(--pw-ink)]/80">
                    <Mail className="size-3.5" />
                    {verifyMutation.data.email}
                  </p>
                )}
                <div className="pt-4 flex flex-col gap-2">
                  <Link href="/transactions">
                    <Button className="w-full">
                      ไปที่หน้ารายการธุรกรรม
                      <ArrowRight className="size-4" />
                    </Button>
                  </Link>
                  <Link href="/settings">
                    <Button variant="outline" className="w-full">
                      ไปที่หน้าการตั้งค่า
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="mx-auto flex size-14 items-center justify-center rounded-full bg-red-500/10 text-red-500"
                >
                  <XCircle className="size-8" />
                </motion.div>
                <h1 className="text-xl font-bold text-red-500">
                  การยืนยันอีเมลล้มเหลว
                </h1>
                <p className="text-sm text-[var(--pw-ink)]/70">
                  {verifyMutation.error instanceof ApiError
                    ? verifyMutation.error.message
                    : "ลิงก์ยืนยันอีเมลอาจหมดอายุแล้ว หรือถูกใช้งานไปแล้ว"}
                </p>
                <div className="pt-4 flex flex-col gap-2">
                  <Link href="/settings">
                    <Button className="w-full">
                      ไปที่หน้าการตั้งค่าเพื่อขอลิงก์ใหม่
                      <ArrowRight className="size-4" />
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button variant="outline" className="w-full">
                      เข้าสู่ระบบ
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </Card>
        </TiltCard>
      </motion.div>
    </main>
  );
}
