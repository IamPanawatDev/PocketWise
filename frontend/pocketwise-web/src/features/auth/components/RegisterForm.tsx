"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { registerSchema, type RegisterFormValues } from "@/schemas/auth.schema";
import { useRegister } from "@/features/auth/hooks/useAuthMutations";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { ApiError } from "@/lib/api-client";
import { zodResolver } from "@/lib/zod-resolver";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { Card } from "@/components/ui/card";
import { TiltCard } from "@/components/ui/tilt-card";
import { LoaderCircle, UserRoundPlus, Check, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export function RegisterForm() {
  const router = useRouter();
  const { data: user, isSuccess } = useCurrentUser();
  const registerMutation = useRegister();
  const [passwordInput, setPasswordInput] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const watchedPassword = watch("password") || "";

  useEffect(() => {
    setPasswordInput(watchedPassword);
  }, [watchedPassword]);

  useEffect(() => {
    const hasFrom = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("from");
    if (isSuccess && user && !hasFrom) {
      router.replace("/");
    }
  }, [isSuccess, user, router]);

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

  const onSubmit = (values: RegisterFormValues) =>
    registerMutation.mutate({
      email: values.email,
      password: values.password,
      displayName: values.displayName,
    });

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-6">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
          x: registerMutation.isError ? [-8, 8, -6, 6, -3, 3, 0] : 0,
        }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm"
      >
        <TiltCard maxTilt={5}>
          <Card className="w-full">
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
                className="size-18 object-contain drop-shadow-md transition-transform"
              />
            </motion.div>
            <h1 className="mb-1 text-center text-2xl font-bold">สมัครสมาชิก</h1>
            <p className="mb-6 text-center text-sm text-[var(--pw-ink)]/70">
              เริ่มบันทึกรายรับรายจ่ายกับ PocketWise
            </p>

            <form method="post" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <FormField label="ชื่อที่แสดง" htmlFor="displayName" error={errors.displayName?.message}>
                <Input id="displayName" placeholder="เช่น Somchai" {...register("displayName")} />
              </FormField>

              <FormField label="อีเมล" htmlFor="email" error={errors.email?.message}>
                <Input id="email" type="email" placeholder="example@gmail.com" {...register("email")} />
              </FormField>

              <div className="space-y-1.5">
                <FormField label="รหัสผ่าน" htmlFor="password" error={errors.password?.message}>
                  <Input id="password" type="password" {...register("password")} />
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

                      {/* Criteria check indicators */}
                      <div className="grid grid-cols-2 gap-1 pt-1 text-[10px] text-[var(--pw-ink)]/60">
                        <span className={`flex items-center gap-1 transition-colors ${hasMinLength ? "text-emerald-400 font-medium" : ""}`}>
                          {hasMinLength ? <Check className="size-3 text-emerald-400" /> : "•"} อย่างน้อย 8 ตัวอักษร
                        </span>
                        <span className={`flex items-center gap-1 transition-colors ${hasNumber ? "text-emerald-400 font-medium" : ""}`}>
                          {hasNumber ? <Check className="size-3 text-emerald-400" /> : "•"} มีตัวเลข (0-9)
                        </span>
                        <span className={`flex items-center gap-1 transition-colors ${hasLetter ? "text-emerald-400 font-medium" : ""}`}>
                          {hasLetter ? <Check className="size-3 text-emerald-400" /> : "•"} มีตัวอักษร (A-Z)
                        </span>
                        <span className={`flex items-center gap-1 transition-colors ${hasSpecial ? "text-emerald-400 font-medium" : ""}`}>
                          {hasSpecial ? <Check className="size-3 text-emerald-400" /> : "•"} มีอักขระพิเศษ (!@#)
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <FormField label="ยืนยันรหัสผ่าน" htmlFor="confirmPassword" error={errors.confirmPassword?.message}>
                <Input id="confirmPassword" type="password" {...register("confirmPassword")} />
              </FormField>

              {registerMutation.isError && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-[var(--pw-magenta)]"
                >
                  {registerMutation.error instanceof ApiError
                    ? registerMutation.error.message
                    : "สมัครสมาชิกไม่สำเร็จ"}
                </motion.p>
              )}

              <p className="text-center text-[11px] leading-relaxed text-[var(--pw-ink)]/65">
                การสร้างบัญชี ถือว่าคุณยอมรับ{" "}
                <Link
                  href="/terms"
                  className="text-[var(--pw-link)] underline hover:opacity-80"
                  target="_blank"
                >
                  ข้อกำหนดการใช้งาน
                </Link>{" "}
                และ{" "}
                <Link
                  href="/privacy-policy"
                  className="text-[var(--pw-link)] underline hover:opacity-80"
                  target="_blank"
                >
                  นโยบายความเป็นส่วนตัว
                </Link>
              </p>

              <Button
                type="submit"
                className="w-full"
                disabled={registerMutation.isPending}
              >
                {registerMutation.isPending
                  ? <LoaderCircle className="animate-spin" />
                  : <UserRoundPlus />}
                {registerMutation.isPending ? "กำลังสมัคร..." : "สมัครสมาชิก"}
              </Button>
            </form>

            <p className="mt-4 text-center text-sm text-[var(--pw-ink)]/70">
              มีบัญชีอยู่แล้ว?{" "}
              <Link href="/login" className="text-[var(--pw-link)] hover:underline">
                เข้าสู่ระบบ
              </Link>
            </p>

            <div className="mt-5 flex items-center justify-center gap-3 border-t border-[var(--pw-hairline)] pt-3 text-[11px] text-[var(--pw-ink)]/50">
              <Link href="/privacy-policy" className="hover:underline">
                นโยบายความเป็นส่วนตัว
              </Link>
              <span>•</span>
              <Link href="/terms" className="hover:underline">
                ข้อกำหนดการใช้งาน
              </Link>
            </div>
          </Card>
        </TiltCard>
      </motion.div>
    </main>
  );
}
