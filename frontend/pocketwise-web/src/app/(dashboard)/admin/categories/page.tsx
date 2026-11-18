"use client";

import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { SystemCategoriesManager } from "@/features/admin-categories/components/SystemCategoriesManager";
import { FolderTree, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";

export default function AdminCategoriesPage() {
  const { data: user, isLoading } = useCurrentUser();
  const isAdmin = (user?.roles?.includes("Admin") || user?.roles?.includes("SuperAdmin")) ?? true;

  if (!isLoading && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ShieldAlert className="size-16 text-[var(--pw-expense)] mb-4" />
        <h1 className="text-xl font-bold text-[var(--pw-ink)]">
          ปฏิเสธการเข้าถึง
        </h1>
        <p className="text-sm text-[var(--pw-ink)]/70 mt-2 max-w-md">
          คุณต้องมีบทบาทระดับ Admin จึงจะสามารถเข้าถึงและจัดการหมวดหมู่มาตรฐานของระบบได้
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <PageHeader
        title="หมวดหมู่มาตรฐานของระบบ"
        icon={FolderTree}
        description="จัดการรายการหมวดหมู่รายรับ-รายจ่ายมาตรฐานสำหรับผู้ใช้งานทุกคนในระบบ"
      />

      {/* Main Content */}
      <SystemCategoriesManager />
    </div>
  );
}
