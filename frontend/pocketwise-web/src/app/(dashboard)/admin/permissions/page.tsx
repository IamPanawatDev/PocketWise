"use client";

import { useState } from "react";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { RolePermissionsMatrix } from "@/features/admin-permissions/components/RolePermissionsMatrix";
import { RolesManager } from "@/features/admin-permissions/components/RolesManager";
import { UserRolesManager } from "@/features/admin-permissions/components/UserRolesManager";
import { KeyRound, ShieldAlert, ShieldCheck, Users } from "lucide-react";

type TabKey = "matrix" | "roles" | "users";

export default function AdminPermissionsPage() {
  const { data: user, isLoading } = useCurrentUser();
  const [activeTab, setActiveTab] = useState<TabKey>("matrix");

  const isAdmin = user?.roles?.includes("Admin") ?? true;

  if (!isLoading && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ShieldAlert className="size-16 text-[var(--pw-expense)] mb-4" />
        <h1 className="text-xl font-bold text-[var(--pw-ink)]">
          ปฏิเสธการเข้าถึง (Access Denied)
        </h1>
        <p className="text-sm text-[var(--pw-ink)]/70 mt-2 max-w-md">
          คุณต้องมีบทบาทระดับ Admin จึงจะสามารถเข้าถึงและแก้ไขสิทธิ์และบทบาทของระบบได้
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-[var(--pw-primary)]/10 text-[var(--pw-primary)]">
            <ShieldCheck className="size-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--pw-ink)]">
              ตั้งค่าสิทธิ์และบทบาท (Admin Management)
            </h1>
            <p className="text-xs text-[var(--pw-ink)]/70">
              จัดการบทบาท กำหนดสิทธิ์การเข้าถึงตามโมดูล และมอบหมายบทบาทให้ผู้ใช้งาน
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap border-b border-[var(--pw-hairline)] gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("matrix")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition ${
            activeTab === "matrix"
              ? "border-[var(--pw-primary)] text-[var(--pw-primary)]"
              : "border-transparent text-[var(--pw-ink)]/70 hover:text-[var(--pw-ink)]"
          }`}
        >
          <KeyRound className="size-4" />
          ตารางสิทธิ์ (Permission Matrix)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("roles")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition ${
            activeTab === "roles"
              ? "border-[var(--pw-primary)] text-[var(--pw-primary)]"
              : "border-transparent text-[var(--pw-ink)]/70 hover:text-[var(--pw-ink)]"
          }`}
        >
          <ShieldCheck className="size-4" />
          จัดการบทบาท (Roles)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("users")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition ${
            activeTab === "users"
              ? "border-[var(--pw-primary)] text-[var(--pw-primary)]"
              : "border-transparent text-[var(--pw-ink)]/70 hover:text-[var(--pw-ink)]"
          }`}
        >
          <Users className="size-4" />
          กำหนดบทบาทผู้ใช้งาน (User Roles)
        </button>
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === "matrix" && <RolePermissionsMatrix />}
        {activeTab === "roles" && <RolesManager />}
        {activeTab === "users" && <UserRolesManager />}
      </div>
    </div>
  );
}
