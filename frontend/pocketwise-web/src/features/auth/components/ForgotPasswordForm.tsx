"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@/lib/zod-resolver";
import Link from "next/link";
import { forgotPasswordSchema, type ForgotPasswordFormValues } from "@/schemas/auth.schema";
import { useForgotPasswordMutation } from "@/features/auth/hooks/usePasswordReset";
import { ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { Card } from "@/components/ui/card";
import { LoaderCircle, Mail, ArrowLeft, CheckCircle2, RotateCw } from "lucide-react";

export function ForgotPasswordForm() {
  const [cooldown, setCooldown] = useState<number>(0);
  const forgotMutation = useForgotPasswordMutation();

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const onSubmit = (values: ForgotPasswordFormValues) => {
    forgotMutation.mutate(values, {
      onSuccess: (data) => {
        setCooldown(data.cooldownSeconds || 60);
      },
      onError: (err) => {
        if (err instanceof ApiError && err.code === "COOLDOWN") {
          // Extract remaining seconds if available or set default
          const match = err.message.match(/(\d+)/);
          const secs = match ? parseInt(match[1], 10) : 60;
          setCooldown(secs);
        }
      },
    });
  };

  const handleResend = () => {
    const email = getValues("email");
    if (!email || cooldown > 0) return;
    forgotMutation.mutate({ email }, {
      onSuccess: (data) => {
        setCooldown(data.cooldownSeconds || 60);
      },
    });
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md p-6 sm:p-8 shadow-lg border-[var(--pw-border)]">
        {forgotMutation.isSuccess ? (
          <div className="space-y-5 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-8" />
            </div>

            <div className="space-y-1">
              <h1 className="text-xl font-bold">ตรวจสอบอีเมลของคุณ</h1>
              <p className="text-sm text-[var(--pw-ink)]/75">
                {forgotMutation.data?.message ||
                  "หากอีเมลนี้ลงทะเบียนไว้ในระบบ ลิงก์สำหรับตั้งรหัสผ่านใหม่ได้ถูกส่งไปยังอีเมลของคุณเรียบร้อยแล้ว"}
              </p>
            </div>

            <div className="rounded-lg bg-[var(--pw-surface-raised)] p-3 text-xs text-[var(--pw-ink)]/70">
              กรุณาตรวจสอบกล่องจดหมาย หรือโฟลเดอร์ Junk/Spam ในอีเมลของคุณ ลิงก์มีระยะเวลาหมดอายุเพื่อความปลอดภัย
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleResend}
                disabled={cooldown > 0 || forgotMutation.isPending}
              >
                {forgotMutation.isPending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <RotateCw className="size-4" />
                )}
                {cooldown > 0
                  ? `ส่งใหม่อีกครั้ง (${cooldown} วินาที)`
                  : "ส่งลิงก์ใหม่อีกครั้ง"}
              </Button>

              <Link href="/login">
                <Button variant="ghost" className="w-full text-sm">
                  <ArrowLeft className="size-4" />
                  กลับสู่หน้าเข้าสู่ระบบ
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-6 space-y-1">
              <div className="mb-3 inline-flex size-10 items-center justify-center rounded-lg bg-[var(--pw-primary)]/10 text-[var(--pw-primary)]">
                <Mail className="size-5" />
              </div>
              <h1 className="text-2xl font-bold">ลืมรหัสผ่าน?</h1>
              <p className="text-sm text-[var(--pw-ink)]/70">
                กรอกอีเมลของคุณเพื่อรับลิงก์สำหรับกำหนดรหัสผ่านใหม่
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <FormField label="อีเมล" htmlFor="email" error={errors.email?.message}>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  autoComplete="email"
                  {...register("email")}
                />
              </FormField>

              {forgotMutation.isError && (
                <p className="text-sm text-[var(--pw-magenta)]">
                  {forgotMutation.error instanceof ApiError
                    ? forgotMutation.error.message
                    : "เกิดข้อผิดพลาดในการส่งคำขอ"}
                </p>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={forgotMutation.isPending || cooldown > 0}
              >
                {forgotMutation.isPending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Mail className="size-4" />
                )}
                {forgotMutation.isPending
                  ? "กำลังส่งคำขอ..."
                  : cooldown > 0
                  ? `กรุณารอ (${cooldown} วินาที)`
                  : "ส่งลิงก์ตั้งรหัสผ่านใหม่"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-sm text-[var(--pw-ink)]/70 hover:text-[var(--pw-ink)]"
              >
                <ArrowLeft className="size-3.5" />
                กลับสู่หน้าเข้าสู่ระบบ
              </Link>
            </div>
          </div>
        )}
      </Card>
    </main>
  );
}
