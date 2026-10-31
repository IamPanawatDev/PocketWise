"use client";

import { useState, useEffect } from "react";
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
import { TiltCard } from "@/components/ui/tilt-card";
import { motion, AnimatePresence } from "motion/react";
import {
  CheckCircle2,
  XCircle,
  LoaderCircle,
  ArrowRight,
  ArrowLeft,
  Lock,
  Check,
  ShieldCheck,
} from "lucide-react";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const userIdParam = searchParams.get("userId");
  const tokenParam = searchParams.get("token");

  const userId = userIdParam ? Number(userIdParam) : 0;
  const token = tokenParam ?? "";

  const resetMutation = useResetPasswordMutation();
  const [passwordInput, setPasswordInput] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const watchedPassword = watch("password") || "";

  useEffect(() => {
    setPasswordInput(watchedPassword);
  }, [watchedPassword]);

  const isInvalidLink = !userId || userId <= 0 || !token;

  // Password strength evaluation
  const hasMinLength = passwordInput.length >= 8;
  const hasNumber = /\d/.test(passwordInput);
  const hasLetter = /[a-zA-Z]/.test(passwordInput);
  const hasSpecial = /[^a-zA-Z0-9]/.test(passwordInput);

  let strengthScore = 0;
  if (hasMinLength) strengthScore += 1;
  if (hasNumber) strengthScore += 1;
  if (hasLetter) strengthScore += 1;
  if (hasSpecial) strengthScore += 1;

  const strengthPercentage = passwordInput.length === 0 ? 0 : (strengthScore / 4) * 100;

  const getStrengthColor = () => {
    if (strengthScore <= 1) return "bg-[var(--pw-magenta)]";
    if (strengthScore === 2) return "bg-amber-400";
    if (strengthScore === 3) return "bg-[var(--pw-link)]";
    return "bg-[var(--pw-green)]";
  };

  const getStrengthLabel = () => {
    if (passwordInput.length === 0) return "";
    if (strengthScore <= 1) return "รหัสผ่านง่ายเกินไป";
    if (strengthScore === 2) return "ความปลอดภัยปานกลาง";
    if (strengthScore === 3) return "รหัสผ่านปลอดภัย";
    return "รหัสผ่านแข็งแกร่งมาก";
  };

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
    <main className="flex flex-1 items-center justify-center px-4 py-6">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
          x: resetMutation.isError ? [-8, 8, -6, 6, -3, 3, 0] : 0,
        }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md"
      >
        <TiltCard maxTilt={5}>
          <Card className="w-full p-6 sm:p-8 shadow-lg border-[var(--pw-border)]">
            {isInvalidLink ? (
              <div className="space-y-4 text-center">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="mx-auto flex size-14 items-center justify-center rounded-full bg-red-500/10 text-red-500"
                >
                  <XCircle className="size-8" />
                </motion.div>
                <h1 className="text-xl font-bold">ลิงก์ไม่ถูกต้องหรือหมดอายุ</h1>
                <p className="text-sm text-[var(--pw-ink)]/70">
                  ลิงก์สำหรับตั้งรหัสผ่านใหม่นี้ไม่ถูกต้องหรืออาจหมดอายุแล้ว กรุณาขอลิงก์ใหม่อีกครั้ง
                </p>
                <div className="pt-2 flex flex-col gap-2">
                  <Link href="/forgot-password">
                    <Button className="w-full">
                      ขอลิงก์ตั้งรหัสผ่านใหม่
                      <ArrowRight className="size-4" />
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button variant="ghost" className="w-full text-sm">
                      <ArrowLeft className="size-4" />
                      กลับสู่หน้าเข้าสู่ระบบ
                    </Button>
                  </Link>
                </div>
              </div>
            ) : resetMutation.isSuccess ? (
              <div className="space-y-4 text-center">
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
                  ตั้งรหัสผ่านใหม่สำเร็จ
                </h1>
                <p className="text-sm text-[var(--pw-ink)]/75">
                  รหัสผ่านของคุณได้รับการเปลี่ยนเรียบร้อยแล้ว สามารถเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้ทันที
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
                  <motion.div
                    animate={{ y: [0, -6, 0] }}
                    transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                    whileHover={{ scale: 1.08, rotate: [0, -3, 3, 0] }}
                    className="mb-3 flex justify-center cursor-pointer"
                  >
                    <Image
                      src="/brand-logo.png"
                      alt="PocketWise brand"
                      width={72}
                      height={72}
                      priority
                      className="size-18 object-contain drop-shadow-md"
                    />
                  </motion.div>
                  <h1 className="text-2xl font-bold">กำหนดรหัสผ่านใหม่</h1>
                  <p className="text-sm text-[var(--pw-ink)]/70">
                    สร้างรหัสผ่านใหม่สำหรับบัญชีของคุณ
                  </p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-1.5">
                    <FormField label="รหัสผ่านใหม่" htmlFor="password" error={errors.password?.message}>
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        {...register("password")}
                      />
                    </FormField>

                    {/* Animated Password Strength Bar */}
                    <AnimatePresence>
                      {passwordInput.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-1.5 pt-1 overflow-hidden"
                        >
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-[var(--pw-ink)]/60 flex items-center gap-1">
                              <ShieldCheck className="size-3" /> ระดับความปลอดภัย
                            </span>
                            <span className="font-medium text-[var(--pw-ink)]/80">
                              {getStrengthLabel()}
                            </span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--pw-surface-onyx)]">
                            <motion.div
                              className={`h-full rounded-full transition-colors duration-300 ${getStrengthColor()}`}
                              initial={{ width: 0 }}
                              animate={{ width: `${strengthPercentage}%` }}
                              transition={{ type: "spring", stiffness: 300, damping: 25 }}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-1 pt-1 text-[10px] text-[var(--pw-ink)]/60">
                            <span className={`flex items-center gap-1 transition-colors ${hasMinLength ? "text-emerald-400 font-medium" : ""}`}>
                              {hasMinLength ? <Check className="size-3 text-emerald-400" /> : "•"} อย่างน้อย 8 ตัวอักษร
                            </span>
                            <span className={`flex items-center gap-1 transition-colors ${hasNumber ? "text-emerald-400 font-medium" : ""}`}>
                              {hasNumber ? <Check className="size-3 text-emerald-400" /> : "•"} มีตัวเลข (0-9)
                            </span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <FormField
                    label="ยืนยันรหัสผ่านใหม่"
                    htmlFor="confirmPassword"
                    error={errors.confirmPassword?.message}
                  >
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      {...register("confirmPassword")}
                    />
                  </FormField>

                  {resetMutation.isError && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-sm text-[var(--pw-magenta)]"
                    >
                      {resetMutation.error instanceof ApiError
                        ? resetMutation.error.message
                        : "เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน กรุณาลองใหม่อีกครั้ง"}
                    </motion.p>
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
                      ? "กำลังบันทึก..."
                      : "บันทึกรหัสผ่านใหม่"}
                  </Button>
                </form>

                <div className="mt-5 text-center">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1.5 text-xs text-[var(--pw-link)] hover:underline"
                  >
                    <ArrowLeft className="size-3.5" />
                    กลับสู่หน้าเข้าสู่ระบบ
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
