"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
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
import { TiltCard } from "@/components/ui/tilt-card";
import { LoaderCircle, Mail, ArrowLeft, CheckCircle2, RotateCw, Send } from "lucide-react";
import { motion } from "motion/react";

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
    <main className="flex flex-1 items-center justify-center px-4 py-6">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md"
      >
        <TiltCard maxTilt={5}>
          <Card className="w-full p-6 sm:p-8 shadow-lg border-[var(--pw-border)]">
            {forgotMutation.isSuccess ? (
              <div className="space-y-5 text-center">
                {/* Paper Plane Flying Animation */}
                <div className="relative mx-auto flex size-20 items-center justify-center">
                  <motion.div
                    className="absolute size-16 rounded-full bg-emerald-500/15"
                    animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0.2, 0.6] }}
                    transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                  />
                  <motion.div
                    initial={{ x: -20, y: 20, scale: 0.5, opacity: 0 }}
                    animate={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="flex size-14 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400"
                  >
                    <Send className="size-7" />
                  </motion.div>
                </div>

                <div className="space-y-1">
                  <h1 className="text-xl font-bold">ตรวจสอบอีเมลของคุณ</h1>
                  <p className="text-sm text-[var(--pw-ink)]/75">
                    {forgotMutation.data?.message ||
                      "หากอีเมลนี้ลงทะเบียนไว้ในระบบ ลิงก์สำหรับตั้งรหัสผ่านใหม่ได้ถูกส่งไปยังอีเมลของคุณเรียบร้อยแล้ว"}
                  </p>
                </div>

                <div className="rounded-lg bg-[var(--pw-surface-onyx)] p-3 text-xs text-[var(--pw-ink)]/70">
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
                      placeholder="example@gmail.com"
                      {...register("email")}
                    />
                  </FormField>

                  {forgotMutation.isError && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-sm text-[var(--pw-magenta)]"
                    >
                      {forgotMutation.error instanceof ApiError
                        ? forgotMutation.error.message
                        : "เกิดข้อผิดพลาดในการส่งข้อมูล กรุณาลองใหม่อีกครั้ง"}
                    </motion.p>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={forgotMutation.isPending}
                  >
                    {forgotMutation.isPending ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <Mail className="size-4" />
                    )}
                    {forgotMutation.isPending
                      ? "กำลังส่งลิงก์..."
                      : "ส่งลิงก์ตั้งรหัสผ่านใหม่"}
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
