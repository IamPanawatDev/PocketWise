"use client";

import { useForm } from "react-hook-form";
import Link from "next/link";
import { registerSchema, type RegisterFormValues } from "@/schemas/auth.schema";
import { useRegister } from "@/features/auth/hooks/useAuthMutations";
import { ApiError } from "@/lib/api-client";
import { zodResolver } from "@/lib/zod-resolver";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/field-error";
import { Card } from "@/components/ui/card";

export function RegisterForm() {
  const registerMutation = useRegister();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = (values: RegisterFormValues) =>
    registerMutation.mutate(values);

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <h1 className="mb-2 text-2xl font-bold">สมัครสมาชิก</h1>
        <p className="mb-6 text-sm text-[var(--pw-ink)]/70">
          เริ่มบันทึกรายรับรายจ่ายกับ PocketWise
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="displayName">ชื่อที่แสดง</Label>
            <Input id="displayName" {...register("displayName")} />
            <FieldError message={errors.displayName?.message} />
          </div>

          <div>
            <Label htmlFor="email">อีเมล</Label>
            <Input id="email" type="email" {...register("email")} />
            <FieldError message={errors.email?.message} />
          </div>

          <div>
            <Label htmlFor="password">รหัสผ่าน</Label>
            <Input id="password" type="password" {...register("password")} />
            <FieldError message={errors.password?.message} />
          </div>

          {registerMutation.isError && (
            <p className="text-sm text-[var(--pw-magenta)]">
              {registerMutation.error instanceof ApiError
                ? registerMutation.error.message
                : "สมัครสมาชิกไม่สำเร็จ"}
            </p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={registerMutation.isPending}
          >
            {registerMutation.isPending ? "กำลังสมัคร..." : "สมัครสมาชิก"}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-[var(--pw-ink)]/70">
          มีบัญชีอยู่แล้ว?{" "}
          <Link href="/login" className="text-[var(--pw-link)]">
            เข้าสู่ระบบ
          </Link>
        </p>
      </Card>
    </main>
  );
}
