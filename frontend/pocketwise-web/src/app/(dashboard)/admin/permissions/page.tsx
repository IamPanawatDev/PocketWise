"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { RolePermissionsMatrix } from "@/features/admin-permissions/components/RolePermissionsMatrix";
import { RolesManager } from "@/features/admin-permissions/components/RolesManager";
import { UserRolesManager } from "@/features/admin-permissions/components/UserRolesManager";
import { KeyRound, ShieldAlert, ShieldCheck, Users } from "lucide-react";
import { cn } from "@/lib/utils";

type TabKey = "matrix" | "roles" | "users";

export default function AdminPermissionsPage() {
  const { data: user, isLoading } = useCurrentUser();
  const [activeTab, setActiveTab] = useState<TabKey>("matrix");

  const isAdmin = (user?.roles?.includes("Admin") || user?.roles?.includes("SuperAdmin")) ?? true;

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

      {/* Tabs with Animated Sliding Indicator */}
      <div className="flex flex-wrap border-b border-[var(--pw-hairline)] gap-2">
        {(
          [
            { key: "matrix", label: "ตารางสิทธิ์ (Permission Matrix)", icon: KeyRound },
            { key: "roles", label: "จัดการบทบาท (Roles)", icon: ShieldCheck },
            { key: "users", label: "กำหนดบทบาทผู้ใช้งาน (User Roles)", icon: Users },
          ] as const
        ).map((t) => {
          const isActive = activeTab === t.key;
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              className={cn(
                "relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition active:scale-95",
                isActive
                  ? "text-[var(--pw-primary)] font-semibold"
                  : "text-[var(--pw-ink)]/70 hover:text-[var(--pw-ink)]"
              )}
            >
              <Icon className="size-4" />
              <span>{t.label}</span>
              {isActive && (
                <motion.div
                  layoutId="adminTabIndicator"
                  className="absolute bottom-0 inset-x-0 h-0.5 bg-[var(--pw-primary)] rounded-full shadow-sm"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          {activeTab === "matrix" && <RolePermissionsMatrix />}
          {activeTab === "roles" && <RolesManager />}
          {activeTab === "users" && <UserRolesManager />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
