"use client";

import { useState } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Users,
  ShieldAlert,
  FileStack,
  Megaphone,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Server,
  UserCheck,
  UserX,
  MailQuestion,
  Lock,
} from "lucide-react";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { useAdminOverviewQuery, useUpdateMaintenanceMutation } from "@/features/admin-operations/hooks/useAdminOperations";
import { cn } from "@/lib/utils";

export default function AdminOverviewPage() {
  const { data: user, isLoading: isUserLoading } = useCurrentUser();
  const { data: overview, isLoading, refetch } = useAdminOverviewQuery();
  const updateMaintenance = useUpdateMaintenanceMutation();
  const [showMaintenanceConfirm, setShowMaintenanceConfirm] = useState(false);

  const isAdmin = (user?.roles?.includes("Admin") || user?.roles?.includes("SuperAdmin")) ?? true;

  if (!isUserLoading && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ShieldAlert className="size-16 text-[var(--pw-expense)] mb-4" />
        <h1 className="text-xl font-bold text-[var(--pw-ink)]">
          ปฏิเสธการเข้าถึง (Access Denied)
        </h1>
        <p className="text-sm text-[var(--pw-ink)]/70 mt-2 max-w-md">
          คุณต้องมีบทบาทระดับ Admin จึงจะสามารถเข้าถึงหน้าแดชบอร์ดภาพรวมผู้ดูแลระบบได้
        </p>
      </div>
    );
  }

  const handleToggleMaintenance = () => {
    if (!overview) return;
    setShowMaintenanceConfirm(true);
  };

  const handleConfirmMaintenance = async () => {
    if (!overview) return;
    const nextState = !overview.maintenanceStatus.isEnabled;
    setShowMaintenanceConfirm(false);
    try {
      await updateMaintenance.mutateAsync({
        isEnabled: nextState,
      });
      toast.success(
        nextState
          ? "เปิดโหมดปรับปรุงระบบเรียบร้อยแล้ว"
          : "ปิดโหมดปรับปรุงระบบเรียบร้อยแล้ว"
      );
    } catch (err: any) {
      toast.error(err?.message || "เกิดข้อผิดพลาดในการเปลี่ยนโหมดปรับปรุงระบบ");
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[var(--pw-primary)]/10 text-[var(--pw-primary)]">
            <Server className="size-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--pw-ink)]">
              ภาพรวมระบบและการดำเนินงาน (Admin Overview)
            </h1>
            <p className="text-xs sm:text-sm text-[var(--pw-ink)]/70">
              ติดตามสถานะความปลอดภัย ผู้ใช้งาน และงานระบบทั้งระบบแบบเรียลไทม์
            </p>
          </div>
        </div>
        <button
          onClick={() => refetch()}
          className="self-start sm:self-auto px-3.5 py-1.5 text-xs font-medium rounded-lg border border-[var(--pw-hairline)] bg-[var(--pw-surface)] text-[var(--pw-ink)] hover:bg-[var(--pw-hairline)]/30 transition-colors"
        >
          รีเฟรชข้อมูล
        </button>
      </div>

      {/* Maintenance Mode Banner / Warning */}
      {overview && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm",
            overview.maintenanceStatus.isEnabled
              ? "bg-[var(--pw-expense)]/10 border-[var(--pw-expense)]/40 text-[var(--pw-ink)]"
              : "bg-[var(--pw-income)]/10 border-[var(--pw-income)]/30 text-[var(--pw-ink)]"
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "p-2 rounded-lg shrink-0",
                overview.maintenanceStatus.isEnabled
                  ? "bg-[var(--pw-expense)]/20 text-[var(--pw-expense)]"
                  : "bg-[var(--pw-income)]/20 text-[var(--pw-income)]"
              )}
            >
              {overview.maintenanceStatus.isEnabled ? (
                <AlertTriangle className="size-5 animate-pulse" />
              ) : (
                <CheckCircle2 className="size-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm sm:text-base">
                  {overview.maintenanceStatus.isEnabled
                    ? "โหมดปรับปรุงระบบกำลังเปิดใช้งาน (Maintenance Active)"
                    : "ระบบทำงานปกติ (All Systems Operational)"}
                </span>
                <span
                  className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase",
                    overview.maintenanceStatus.isEnabled
                      ? "bg-[var(--pw-expense)] text-white"
                      : "bg-[var(--pw-income)] text-white"
                  )}
                >
                  {overview.maintenanceStatus.isEnabled ? "ACTIVE" : "ONLINE"}
                </span>
              </div>
              <p className="text-xs text-[var(--pw-ink)]/75 mt-0.5">
                {overview.maintenanceStatus.isEnabled
                  ? overview.maintenanceStatus.message
                  : "บริการทั้งหมดเปิดให้บริการสำหรับผู้ใช้ทุกคนตามปกติ"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleToggleMaintenance}
              disabled={updateMaintenance.isPending}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors shadow-sm",
                overview.maintenanceStatus.isEnabled
                  ? "bg-[var(--pw-surface)] border border-[var(--pw-hairline)] text-[var(--pw-ink)] hover:bg-[var(--pw-hairline)]/30"
                  : "bg-[var(--pw-expense)] text-white hover:opacity-90"
              )}
            >
              {overview.maintenanceStatus.isEnabled ? "ปิดโหมดปรับปรุง" : "เปิดโหมดปรับปรุง"}
            </button>
            <Link
              href="/admin/settings"
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--pw-hairline)] bg-[var(--pw-surface)] text-[var(--pw-ink)] hover:bg-[var(--pw-hairline)]/40 transition-colors"
            >
              ตั้งค่าเพิ่มเติม
            </Link>
          </div>
        </motion.div>
      )}

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl border border-[var(--pw-hairline)] bg-[var(--pw-surface)] shadow-sm">
          <div className="flex items-center justify-between text-[var(--pw-ink)]/70 text-xs">
            <span>ผู้ใช้งานทั้งหมด</span>
            <Users className="size-4 text-[var(--pw-primary)]" />
          </div>
          <div className="text-2xl font-bold text-[var(--pw-ink)] mt-2">
            {isLoading ? "..." : overview?.totalUsers.toLocaleString()}
          </div>
          <div className="text-[11px] text-[var(--pw-ink)]/60 mt-1 flex items-center gap-1">
            <TrendingUp className="size-3 text-[var(--pw-income)]" />
            <span>+{overview?.signupsThisMonth ?? 0} เดือนนี้</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-[var(--pw-hairline)] bg-[var(--pw-surface)] shadow-sm">
          <div className="flex items-center justify-between text-[var(--pw-ink)]/70 text-xs">
            <span>ผู้ใช้งานที่ใช้งาน (30 วัน)</span>
            <UserCheck className="size-4 text-[var(--pw-income)]" />
          </div>
          <div className="text-2xl font-bold text-[var(--pw-income)] mt-2">
            {isLoading ? "..." : overview?.activeUsers30Days.toLocaleString()}
          </div>
          <div className="text-[11px] text-[var(--pw-ink)]/60 mt-1">
            Active Rate {overview && overview.totalUsers > 0 ? Math.round((overview.activeUsers30Days / overview.totalUsers) * 100) : 0}%
          </div>
        </div>

        <div className="p-4 rounded-xl border border-[var(--pw-hairline)] bg-[var(--pw-surface)] shadow-sm">
          <div className="flex items-center justify-between text-[var(--pw-ink)]/70 text-xs">
            <span>บัญชีที่ถูกระงับ</span>
            <UserX className="size-4 text-[var(--pw-expense)]" />
          </div>
          <div className="text-2xl font-bold text-[var(--pw-expense)] mt-2">
            {isLoading ? "..." : overview?.suspendedUsers.toLocaleString()}
          </div>
          <div className="text-[11px] text-[var(--pw-ink)]/60 mt-1">
            <Link href="/admin/users?isSuspended=true" className="text-[var(--pw-primary)] hover:underline">
              ดูรายชื่อบัญชี &rarr;
            </Link>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-[var(--pw-hairline)] bg-[var(--pw-surface)] shadow-sm">
          <div className="flex items-center justify-between text-[var(--pw-ink)]/70 text-xs">
            <span>ยังไม่ยืนยันอีเมล</span>
            <MailQuestion className="size-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-500 mt-2">
            {isLoading ? "..." : overview?.unverifiedEmailUsers.toLocaleString()}
          </div>
          <div className="text-[11px] text-[var(--pw-ink)]/60 mt-1">
            <Link href="/admin/users?isEmailVerified=false" className="text-[var(--pw-primary)] hover:underline">
              กรองบัญชี &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Two-Column Operations Hub */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Import Operations Summary Card */}
        <div className="p-5 rounded-xl border border-[var(--pw-hairline)] bg-[var(--pw-surface)] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileStack className="size-5 text-[var(--pw-primary)]" />
                <h3 className="font-semibold text-base text-[var(--pw-ink)]">
                  งานนำเข้าข้อมูลระบบ (Import Operations)
                </h3>
              </div>
              <Link
                href="/admin/imports"
                className="text-xs text-[var(--pw-primary)] hover:underline flex items-center gap-1 font-medium"
              >
                จัดการงานนำเข้า <ArrowRight className="size-3" />
              </Link>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center my-4">
              <div className="p-3 rounded-lg bg-[var(--pw-hairline)]/20">
                <div className="text-xs text-[var(--pw-ink)]/70">ทั้งหมด</div>
                <div className="text-lg font-bold text-[var(--pw-ink)] mt-1">
                  {overview?.importJobsSummary.total ?? 0}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-[var(--pw-income)]/10 text-[var(--pw-income)]">
                <div className="text-xs">สำเร็จ</div>
                <div className="text-lg font-bold mt-1">
                  {overview?.importJobsSummary.completed ?? 0}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-[var(--pw-expense)]/10 text-[var(--pw-expense)]">
                <div className="text-xs">ล้มเหลว</div>
                <div className="text-lg font-bold mt-1">
                  {overview?.importJobsSummary.failed ?? 0}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-blue-500/10 text-blue-500">
                <div className="text-xs">กำลังทำงาน</div>
                <div className="text-lg font-bold mt-1">
                  {(overview?.importJobsSummary.processing ?? 0) + (overview?.importJobsSummary.pending ?? 0)}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[var(--pw-hairline)] flex items-center justify-between text-xs text-[var(--pw-ink)]/70">
            <span>รองรับสลิปธนาคารและใบแจ้งยอดบัตรเครดิต</span>
            <Link href="/admin/imports?status=Failed" className="text-[var(--pw-expense)] font-medium hover:underline">
              ดูงานที่ล้มเหลว ({overview?.importJobsSummary.failed ?? 0})
            </Link>
          </div>
        </div>

        {/* Security Events Summary Card */}
        <div className="p-5 rounded-xl border border-[var(--pw-hairline)] bg-[var(--pw-surface)] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Lock className="size-5 text-[var(--pw-primary)]" />
                <h3 className="font-semibold text-base text-[var(--pw-ink)]">
                  เหตุการณ์ความปลอดภัย 24 ชม. (Security Logs)
                </h3>
              </div>
              <Link
                href="/admin/security-events"
                className="text-xs text-[var(--pw-primary)] hover:underline flex items-center gap-1 font-medium"
              >
                ดูบันทึกทั้งหมด <ArrowRight className="size-3" />
              </Link>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center my-4">
              <div className="p-3 rounded-lg bg-[var(--pw-hairline)]/20">
                <div className="text-xs text-[var(--pw-ink)]/70">เหตุการณ์</div>
                <div className="text-lg font-bold text-[var(--pw-ink)] mt-1">
                  {overview?.securityEvents24Hours.total ?? 0}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-amber-500/10 text-amber-500">
                <div className="text-xs">Login ผิดพลาด</div>
                <div className="text-lg font-bold mt-1">
                  {overview?.securityEvents24Hours.failedLogins ?? 0}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-[var(--pw-expense)]/10 text-[var(--pw-expense)]">
                <div className="text-xs">ระงับบัญชี</div>
                <div className="text-lg font-bold mt-1">
                  {overview?.securityEvents24Hours.suspensions ?? 0}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-purple-500/10 text-purple-500">
                <div className="text-xs">Token Reuse</div>
                <div className="text-lg font-bold mt-1">
                  {overview?.securityEvents24Hours.tokenReuses ?? 0}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[var(--pw-hairline)] flex items-center justify-between text-xs text-[var(--pw-ink)]/70">
            <span>ตรวจจับการขโมยโทเค็นและเซสชันต้องสงสัยอัตโนมัติ</span>
            <Link href="/admin/security-events" className="text-[var(--pw-primary)] font-medium hover:underline">
              ไทม์ไลน์ความปลอดภัย &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/admin/users"
          className="p-4 rounded-xl border border-[var(--pw-hairline)] bg-[var(--pw-surface)] hover:border-[var(--pw-primary)]/50 transition-all shadow-sm group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-[var(--pw-primary)]/10 text-[var(--pw-primary)] group-hover:scale-105 transition-transform">
              <Users className="size-5" />
            </div>
            <div>
              <h4 className="font-semibold text-sm text-[var(--pw-ink)]">
                จัดการบัญชีผู้ใช้งาน
              </h4>
              <p className="text-xs text-[var(--pw-ink)]/60">
                ค้นหา ระงับบัญชี รีเซ็ตรหัสผ่าน และเพิกถอนเซสชัน
              </p>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/announcements"
          className="p-4 rounded-xl border border-[var(--pw-hairline)] bg-[var(--pw-surface)] hover:border-[var(--pw-primary)]/50 transition-all shadow-sm group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-pink-500/10 text-pink-500 group-hover:scale-105 transition-transform">
              <Megaphone className="size-5" />
            </div>
            <div>
              <h4 className="font-semibold text-sm text-[var(--pw-ink)]">
                ระบบประกาศและแจ้งเตือน
              </h4>
              <p className="text-xs text-[var(--pw-ink)]/60">
                เผยแพร่ประกาศพร้อมระบุกลุ่มเป้าหมาย (Role / User)
              </p>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/permissions"
          className="p-4 rounded-xl border border-[var(--pw-hairline)] bg-[var(--pw-surface)] hover:border-[var(--pw-primary)]/50 transition-all shadow-sm group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-500 group-hover:scale-105 transition-transform">
              <Sparkles className="size-5" />
            </div>
            <div>
              <h4 className="font-semibold text-sm text-[var(--pw-ink)]">
                บทบาทและสิทธิ์ระบบ
              </h4>
              <p className="text-xs text-[var(--pw-ink)]/60">
                จัดการเมทริกซ์สิทธิ์ มอบหมายบทบาท Admin/Member
              </p>
            </div>
          </div>
        </Link>
      </div>

      {/* Maintenance Mode Confirmation AlertDialog */}
      <AlertDialog
        open={showMaintenanceConfirm}
        onOpenChange={setShowMaintenanceConfirm}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {overview?.maintenanceStatus.isEnabled
                ? "ยืนยันการปิดโหมดปรับปรุงระบบ"
                : "ยืนยันการเปิดโหมดปรับปรุงระบบ"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {overview?.maintenanceStatus.isEnabled
                ? "เมื่อปิดโหมดปรับปรุงระบบ ผู้ใช้งานทุกคนจะสามารถเข้าสู่ระบบและใช้งานได้ตามปกติทันที"
                : "เมื่อเปิดโหมดปรับปรุงระบบ ผู้ใช้ทั่วไปจะถูกปฏิเสธการเข้าถึงและเห็นหน้าแจ้งเตือนปรับปรุงระบบ (ยกเว้น Admin และผู้ใช้ที่ได้รับอนุญาต)"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              className={
                !overview?.maintenanceStatus.isEnabled
                  ? "bg-amber-600 hover:bg-amber-700 text-white"
                  : undefined
              }
              onClick={handleConfirmMaintenance}
            >
              {overview?.maintenanceStatus.isEnabled
                ? "ปิดโหมดปรับปรุงระบบ"
                : "เปิดโหมดปรับปรุงระบบ"}
            </AlertDialogAction>
            <AlertDialogCancel onClick={() => setShowMaintenanceConfirm(false)}>
              ยกเลิก
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
