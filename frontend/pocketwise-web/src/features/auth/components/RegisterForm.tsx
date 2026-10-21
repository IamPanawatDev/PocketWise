"use client";

import { useEffect } from "react";
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
import { LoaderCircle, UserRoundPlus } from "lucide-react";

export function RegisterForm() {
  const router = useRouter();
  const { data: user, isSuccess } = useCurrentUser();
  const registerMutation = useRegister();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  useEffect(() => {
    if (isSuccess && user) {
      router.replace("/");
    }
  }, [isSuccess, user, router]);

  const onSubmit = (values: RegisterFormValues) =>
    registerMutation.mutate({
      email: values.email,
      password: values.password,
      displayName: values.displayName,
    });

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <h1 className="mb-2 text-2xl font-bold">สมัครสมาชิก</h1>
        <p className="mb-6 text-sm text-[var(--pw-ink)]/70">
          เริ่มบันทึกรายรับรายจ่ายกับ PocketWise
        </p>

        <form method="post" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="ชื่อที่แสดง" htmlFor="displayName" error={errors.displayName?.message}>
            <Input id="displayName" {...register("displayName")} />
          </FormField>

          <FormField label="อีเมล" htmlFor="email" error={errors.email?.message}>
            <Input id="email" type="email" {...register("email")} />
          </FormField>

          <FormField label="รหัสผ่าน" htmlFor="password" error={errors.password?.message}>
            <Input id="password" type="password" {...register("password")} />
          </FormField>

          <FormField label="ยืนยันรหัสผ่าน" htmlFor="confirmPassword" error={errors.confirmPassword?.message}>
            <Input id="confirmPassword" type="password" {...register("confirmPassword")} />
          </FormField>

          {registerMutation.isError && (
            <p className="text-sm text-[var(--pw-magenta)]">
              {registerMutation.error instanceof ApiError
                ? registerMutation.error.message
                : "สมัครสมาชิกไม่สำเร็จ"}
            </p>
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
          <Link href="/login" className="text-[var(--pw-link)]">
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
    </main>
  );
}
