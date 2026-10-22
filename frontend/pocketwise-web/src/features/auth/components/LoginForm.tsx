"use client";

import { useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@/lib/zod-resolver";
import Link from "next/link";
import { loginSchema, type LoginFormValues } from "@/schemas/auth.schema";
import { useLogin } from "@/features/auth/hooks/useAuthMutations";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { Card } from "@/components/ui/card";
import { LoaderCircle, LogIn } from "lucide-react";
import { motion } from "motion/react";

export function LoginForm() {
  const router = useRouter();
  const { data: user, isSuccess } = useCurrentUser();
  const login = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    const hasFrom = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("from");
    if (isSuccess && user && !hasFrom) {
      router.replace("/");
    }
  }, [isSuccess, user, router]);

  const onSubmit = (values: LoginFormValues) => login.mutate(values);

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-6">
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm"
      >
        <Card className="w-full">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.35, delay: 0.06, ease: "easeOut" }}
            className="mb-3 flex justify-center"
          >
            <Image
              src="/brand-logo.png"
              alt="PocketWise brand"
              width={72}
              height={72}
              priority
              className="size-18 object-contain drop-shadow"
            />
          </motion.div>
        <h1 className="mb-1 text-center text-2xl font-bold">เข้าสู่ระบบ</h1>
        <p className="mb-6 text-center text-sm text-[var(--pw-ink)]/70">
          ยินดีต้อนรับกลับมาที่ PocketWise
        </p>

        <form method="post" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="อีเมล" htmlFor="email" error={errors.email?.message}>
            <Input id="email" type="email" {...register("email")} />
          </FormField>

          <FormField
            label={
              <div className="flex items-center justify-between">
                <span>รหัสผ่าน</span>
                <Link
                  href="/forgot-password"
                  className="text-xs font-normal text-[var(--pw-link)] hover:underline"
                >
                  ลืมรหัสผ่าน?
                </Link>
              </div>
            }
            htmlFor="password"
            error={errors.password?.message}
          >
            <Input id="password" type="password" {...register("password")} />
          </FormField>

          {login.isError && (
            <p className="text-sm text-[var(--pw-magenta)]">
              {login.error instanceof ApiError
                ? login.error.message
                : "เข้าสู่ระบบไม่สำเร็จ"}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={login.isPending}>
            {login.isPending ? <LoaderCircle className="animate-spin" /> : <LogIn />}
            {login.isPending ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-[var(--pw-ink)]/70">
          ยังไม่มีบัญชี?{" "}
          <Link href="/register" className="text-[var(--pw-link)]">
            สมัครสมาชิก
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
    </motion.div>
  </main>
  );
}