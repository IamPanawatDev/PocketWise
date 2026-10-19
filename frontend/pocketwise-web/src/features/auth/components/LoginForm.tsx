"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@/lib/zod-resolver";
import Link from "next/link";
import { loginSchema, type LoginFormValues } from "@/schemas/auth.schema";
import { useLogin } from "@/features/auth/hooks/useAuthMutations";
import { ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/field-error";
import { Card } from "@/components/ui/card";

export function LoginForm() {
  const login = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (values: LoginFormValues) => login.mutate(values);

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <h1 className="mb-2 text-2xl font-bold">เข้าสู่ระบบ</h1>
        <p className="mb-6 text-sm text-[var(--pw-ink)]/70">
          ยินดีต้อนรับกลับมาที่ PocketWise
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

          {login.isError && (
            <p className="text-sm text-[var(--pw-magenta)]">
              {login.error instanceof ApiError
                ? login.error.message
                : "เข้าสู่ระบบไม่สำเร็จ"}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={login.isPending}>
            {login.isPending ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-[var(--pw-ink)]/70">
          ยังไม่มีบัญชี?{" "}
          <Link href="/register" className="text-[var(--pw-link)]">
            สมัครสมาชิก
          </Link>
        </p>
      </Card>
    </main>
  );
}
