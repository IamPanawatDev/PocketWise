"use client";

import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@/lib/zod-resolver";
import Link from "next/link";
import { resetPasswordSchema, type ResetPasswordFormValues } from "@/schemas/auth.schema";
import { useResetPasswordMutation } from "@/features/auth/hooks/usePasswordReset";
import { ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { Card } from "@/components/ui/card";
import {
  CheckCircle2,
  XCircle,
  LoaderCircle,
  ArrowRight,
  ArrowLeft,
  Lock,
} from "lucide-react";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const userIdParam = searchParams.get("userId");
  const tokenParam = searchParams.get("token");

  const userId = userIdParam ? Number(userIdParam) : 0;
  const token = tokenParam ?? "";

  const resetMutation = useResetPasswordMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const isInvalidLink = !userId || userId <= 0 || !token;

  const onSubmit = (values: ResetPasswordFormValues) => {
    if (isInvalidLink) return;

    resetMutation.mutate({
      userId,
      token,
      newPassword: values.password,
      confirmPassword: values.confirmPassword,
    });
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md p-6 sm:p-8 shadow-lg border-[var(--pw-border)]">
        {isInvalidLink ? (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-red-500/10 text-red-500">
              <XCircle className="size-8" />
            </div>
            <h1 className="text-xl font-bold">ลิงก์ตั้งรหัสผ่านไม่ถูกต้อง</h1>
            <p className="text-sm text-[var(--pw-ink)]/70">
              ลิงก์นี้ไม่มีข้อมูลสำหรับตั้งรหัสผ่านใหม่ที่ถูกต้อง หรืออาจถูกตัดทอน กรุณาขอลิงก์ใหม่อีกครั้ง
            </p>
            <div className="pt-2 flex flex-col gap-2">
              <Link href="/forgot-password">
                <Button className="w-full">
                  ขอลิงก์ตั้งรหัสผ่านใหม่
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" className="w-full">
                  กลับสู่หน้าเข้าสู่ระบบ
                </Button>
              </Link>
            </div>
          </div>
        ) : resetMutation.isSuccess ? (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-8" />
            </div>
            <h1 className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              ตั้งรหัสผ่านใหม่สำเร็จ!
            </h1>
            <p className="text-sm text-[var(--pw-ink)]/75">
              {resetMutation.data?.message ||
                "รหัสผ่านของคุณได้รับการเปลี่ยนแปลงเรียบร้อยแล้ว เซสชันในอุปกรณ์อื่นๆ ทั้งหมดถูกออกจากระบบเพื่อความปลอดภัย"}
            </p>
            <div className="pt-4">
              <Link href="/login">
                <Button className="w-full">
                  เข้าสู่ระบบด้วยรหัสผ่านใหม่
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-6 space-y-1 text-center">
              <div className="mb-3 flex justify-center">
                <Image
                  src="/brand-logo.png"
                  alt="PocketWise brand"
                  width={72}
                  height={72}
                  priority
                  className="size-18 object-contain drop-shadow"
                />
              </div>
              <h1 className="text-2xl font-bold">ตั้งรหัสผ่านใหม่</h1>
              <p className="text-sm text-[var(--pw-ink)]/70">
                กำหนดรหัสผ่านใหม่สำหรับบัญชี PocketWise ของคุณ (อย่างน้อย 8 ตัวอักษร)
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                label="รหัสผ่านใหม่"
                htmlFor="password"
                error={errors.password?.message}
              >
                <Input
                  id="password"
                  type="password"
                  placeholder="อย่างน้อย 8 ตัวอักษร"
                  autoComplete="new-password"
                  {...register("password")}
                />
              </FormField>

              <FormField
                label="ยืนยันรหัสผ่านใหม่"
                htmlFor="confirmPassword"
                error={errors.confirmPassword?.message}
              >
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="พิมพ์รหัสผ่านใหม่อีกครั้ง"
                  autoComplete="new-password"
                  {...register("confirmPassword")}
                />
              </FormField>

              {resetMutation.isError && (
                <div className="rounded-lg bg-red-500/10 p-3 text-sm text-[var(--pw-magenta)]">
                  {resetMutation.error instanceof ApiError
                    ? resetMutation.error.message
                    : "เกิดข้อผิดพลาดในการตั้งรหัสผ่านใหม่ กรุณาลองอีกครั้ง"}
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={resetMutation.isPending}
              >
                {resetMutation.isPending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Lock className="size-4" />
                )}
                {resetMutation.isPending
                  ? "กำลังบันทึกรหัสผ่านใหม่..."
                  : "บันทึกรหัสผ่านใหม่"}
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
