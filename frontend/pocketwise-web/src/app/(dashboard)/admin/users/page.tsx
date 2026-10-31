"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Users,
  Search,
  Filter,
  ShieldAlert,
  UserCheck,
  UserX,
  Mail,
  KeyRound,
  Laptop,
  Globe,
  Clock,
  AlertTriangle,
  X,
  CheckCircle,
  RefreshCw,
  LogOut,
  History,
  SlidersHorizontal,
  RotateCcw,
} from "lucide-react";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import {
  useAdminUsersQuery,
  useAdminUserDetailQuery,
  useAdminUserSessionsQuery,
  useSuspendUserMutation,
  useUnsuspendUserMutation,
  useResendVerificationMutation,
  useSendResetPasswordMutation,
  useRevokeSessionMutation,
  useRevokeAllSessionsMutation,
} from "@/features/admin-operations/hooks/useAdminOperations";
import { cn } from "@/lib/utils";
import {
  formatDisplayDate,
  formatDisplayDateTime,
  formatRelativeTime,
} from "@/lib/date-utils";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { BottomSheet, BottomSheetFooter } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import type { AdminUserListItem } from "@/types/admin-operations.types";

export default function AdminUsersPage() {
  const { data: currentUser, isLoading: isUserLoading } = useCurrentUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [suspendedFilter, setSuspendedFilter] = useState<string>("");
  const [verifiedFilter, setVerifiedFilter] = useState<string>("");
  const [page, setPage] = useState(1);

  // Filter Drawer State
  const [showFilterSheet, setShowFilterSheet] = useState(false);

  // Selected user for Detail Inspection Modal
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  // Suspend modal state
  const [suspendTarget, setSuspendTarget] = useState<AdminUserListItem | null>(null);
  const [suspendReason, setSuspendReason] = useState("");

  const activeFilterCount =
    (selectedRole ? 1 : 0) +
    (suspendedFilter ? 1 : 0) +
    (verifiedFilter ? 1 : 0);

  const filters = {
    q: searchQuery || undefined,
    role: selectedRole || undefined,
    isSuspended:
      suspendedFilter === "true"
        ? true
        : suspendedFilter === "false"
        ? false
        : undefined,
    isEmailVerified:
      verifiedFilter === "true"
        ? true
        : verifiedFilter === "false"
        ? false
        : undefined,
    page,
    pageSize: 15,
  };

  const { data: usersData, isLoading, refetch } = useAdminUsersQuery(filters);
  const { data: userDetail, isLoading: isDetailLoading } =
    useAdminUserDetailQuery(selectedUserId);
  const { data: userSessions = [], isLoading: isSessionsLoading } =
    useAdminUserSessionsQuery(selectedUserId);

  const suspendMutation = useSuspendUserMutation();
  const unsuspendMutation = useUnsuspendUserMutation();
  const resendVerificationMutation = useResendVerificationMutation();
  const sendResetPasswordMutation = useSendResetPasswordMutation();
  const revokeSessionMutation = useRevokeSessionMutation();
  const revokeAllSessionsMutation = useRevokeAllSessionsMutation();

  const [activeDetailTab, setActiveDetailTab] = useState<
    "profile" | "sessions" | "security"
  >("profile");

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    destructive?: boolean;
    onConfirm: () => Promise<void> | void;
  }>({
    open: false,
    title: "",
    description: "",
    confirmLabel: "ยืนยัน",
    destructive: false,
    onConfirm: () => {},
  });

  const isAdmin = currentUser?.roles?.includes("Admin") ?? true;

  if (!isUserLoading && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ShieldAlert className="size-16 text-[var(--pw-expense)] mb-4" />
        <h1 className="text-xl font-bold text-[var(--pw-ink)]">
          ปฏิเสธการเข้าถึง (Access Denied)
        </h1>
        <p className="text-sm text-[var(--pw-ink)]/70 mt-2 max-w-md">
          คุณต้องมีบทบาทระดับ Admin จึงจะสามารถเข้าถึงและจัดการบัญชีผู้ใช้งานได้
        </p>
      </div>
    );
  }

  const handleOpenSuspendModal = (user: AdminUserListItem) => {
    if (user.id === currentUser?.id) {
      toast.error("ไม่สามารถระงับบัญชีของตนเองได้");
      return;
    }
    setSuspendTarget(user);
    setSuspendReason("");
  };

  const handleConfirmSuspend = async () => {
    if (!suspendTarget || !suspendReason.trim()) return;
    if (suspendTarget.id === currentUser?.id) {
      toast.error("ไม่สามารถระงับบัญชีของตนเองได้");
      return;
    }
    try {
      await suspendMutation.mutateAsync({
        userId: suspendTarget.id,
        reason: suspendReason.trim(),
      });
      const name = suspendTarget.displayName;
      setSuspendTarget(null);
      toast.success(`ระงับบัญชีผู้ใช้ ${name} เรียบร้อยแล้ว`);
    } catch (err: any) {
      toast.error(err?.message || "เกิดข้อผิดพลาดในการระงับบัญชี");
    }
  };

  const handleConfirmUnsuspend = (user: AdminUserListItem) => {
    setConfirmDialog({
      open: true,
      title: "ยกเลิกการระงับบัญชี",
      description: `คุณต้องการยกเลิกการระงับบัญชีของ "${user.displayName}" ใช่หรือไม่? ผู้ใช้จะสามารถเข้าสู่ระบบและใช้งานได้ตามปกติ`,
      confirmLabel: "ยกเลิกระงับบัญชี",
      destructive: false,
      onConfirm: async () => {
        try {
          await unsuspendMutation.mutateAsync(user.id);
          toast.success(`ยกเลิกการระงับบัญชี ${user.displayName} เรียบร้อยแล้ว`);
        } catch (err: any) {
          toast.error(err?.message || "เกิดข้อผิดพลาดในการยกเลิกการระงับบัญชี");
        }
      },
    });
  };

  const handleResendVerification = async (userId: number) => {
    try {
      await resendVerificationMutation.mutateAsync(userId);
      toast.success("ส่งอีเมลยืนยันตัวตนเรียบร้อยแล้ว");
    } catch (err: any) {
      toast.error(err?.message || "ไม่สามารถส่งอีเมลยืนยันได้");
    }
  };

  const handleSendResetPassword = async (userId: number) => {
    try {
      const res = await sendResetPasswordMutation.mutateAsync(userId);
      toast.success("ส่งลิงก์สำหรับรีเซ็ตรหัสผ่านไปยังอีเมลผู้ใช้เรียบร้อยแล้ว");
      if (res?.resetToken) {
        console.log(`[Admin Token Generated]: ${res.resetToken}`);
      }
    } catch (err: any) {
      toast.error(err?.message || "ไม่สามารถส่งลิงก์รีเซ็ตรหัสผ่านได้");
    }
  };

  const handleRevokeSession = (userId: number, tokenId: number) => {
    setConfirmDialog({
      open: true,
      title: "เพิกถอนเซสชัน (Revoke Session)",
      description: "คุณต้องการเพิกถอนเซสชันนี้ใช่หรือไม่? อุปกรณ์ดังกล่าวจะถูกบังคับให้ออกจากระบบทันที",
      confirmLabel: "เพิกถอนเซสชัน",
      destructive: true,
      onConfirm: async () => {
        try {
          await revokeSessionMutation.mutateAsync({ userId, tokenId });
          toast.success("เพิกถอนเซสชันเรียบร้อยแล้ว");
        } catch (err: any) {
          toast.error(err?.message || "เกิดข้อผิดพลาดในการเพิกถอนเซสชัน");
        }
      },
    });
  };

  const handleRevokeAllSessions = (userId: number) => {
    setConfirmDialog({
      open: true,
      title: "บังคับออกจากระบบทุกเครื่อง",
      description: "คุณต้องการบังคับออกจากระบบทุกเครื่องสำหรับผู้ใช้นี้ใช่หรือไม่? เซสชันทั้งหมดจะถูกเพิกถอนทันที",
      confirmLabel: "บังคับออกจากระบบทั้งหมด",
      destructive: true,
      onConfirm: async () => {
        try {
          await revokeAllSessionsMutation.mutateAsync(userId);
          toast.success("บังคับออกจากระบบทุกอุปกรณ์เรียบร้อยแล้ว");
        } catch (err: any) {
          toast.error(err?.message || "เกิดข้อผิดพลาดในการเพิกถอนเซสชันทั้งหมด");
        }
      },
    });
  };

  const resetFilters = () => {
    setSelectedRole("");
    setSuspendedFilter("");
    setVerifiedFilter("");
    setPage(1);
    setShowFilterSheet(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[var(--pw-primary)]/10 text-[var(--pw-primary)]">
            <Users className="size-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--pw-ink)]">
              จัดการบัญชีผู้ใช้งาน (User Account Operations)
            </h1>
            <p className="text-xs sm:text-sm text-[var(--pw-ink)]/75">
              ค้นหา ตรวจสอบเซสชัน ระงับ/ยกเลิกการระงับ และส่งลิงก์กู้คืนบัญชี
            </p>
          </div>
        </div>
      </div>

      {/* Search & Filter Trigger Bar */}
      <div className="p-3 sm:p-4 rounded-xl border border-[var(--pw-hairline)] bg-[var(--pw-surface)] shadow-xs space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="relative flex-1">
            <Search className="size-4 text-[var(--pw-ink)]/50 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="ค้นหาชื่อ หรืออีเมล..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-lg border border-[var(--pw-hairline)] bg-transparent text-[var(--pw-ink)] focus:outline-none focus:border-[var(--pw-primary)] transition-colors"
            />
          </div>

          {/* Filter Trigger Button */}
          <button
            type="button"
            onClick={() => setShowFilterSheet(true)}
            className={cn(
              "px-3.5 py-2 text-xs sm:text-sm rounded-lg border flex items-center gap-2 font-medium shrink-0 transition-all duration-150 active:scale-95",
              activeFilterCount > 0
                ? "border-[var(--pw-primary)] bg-[var(--pw-primary)]/15 text-[var(--pw-primary)] font-semibold shadow-xs"
                : "border-[var(--pw-hairline)] bg-[var(--pw-surface)] text-[var(--pw-ink)] hover:bg-[var(--pw-hairline)]/30"
            )}
            aria-label="เปิดตัวกรองผู้ใช้งาน"
          >
            <SlidersHorizontal className="size-4" />
            <span>ตัวกรอง</span>
            {activeFilterCount > 0 && (
              <span className="flex size-5 items-center justify-center rounded-full bg-[var(--pw-primary)] text-[11px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Active Filter Chips */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs text-[var(--pw-ink)]/75">
            <span className="font-medium text-[var(--pw-ink)]/60">ตัวกรองที่เลือก:</span>
            {selectedRole && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--pw-surface-indigo)] border border-[var(--pw-hairline)] px-2.5 py-0.5 text-[11px]">
                บทบาท: {selectedRole}
                <button onClick={() => setSelectedRole("")} className="hover:text-[var(--pw-expense)]">
                  <X className="size-3" />
                </button>
              </span>
            )}
            {suspendedFilter && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--pw-surface-indigo)] border border-[var(--pw-hairline)] px-2.5 py-0.5 text-[11px]">
                สถานะ: {suspendedFilter === "true" ? "ถูกระงับ" : "ปกติ"}
                <button onClick={() => setSuspendedFilter("")} className="hover:text-[var(--pw-expense)]">
                  <X className="size-3" />
                </button>
              </span>
            )}
            {verifiedFilter && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--pw-surface-indigo)] border border-[var(--pw-hairline)] px-2.5 py-0.5 text-[11px]">
                อีเมล: {verifiedFilter === "true" ? "ยืนยันแล้ว" : "ยังไม่ยืนยัน"}
                <button onClick={() => setVerifiedFilter("")} className="hover:text-[var(--pw-expense)]">
                  <X className="size-3" />
                </button>
              </span>
            )}
            <button
              onClick={resetFilters}
              className="text-xs text-[var(--pw-primary)] hover:underline ml-1 font-medium"
            >
              ล้างทั้งหมด
            </button>
          </div>
        )}
      </div>

      {/* Users Table */}
      <div className="rounded-xl border border-[var(--pw-hairline)] bg-[var(--pw-surface)] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-[var(--pw-hairline)] bg-[var(--pw-hairline)]/10 text-[var(--pw-ink)]/70 font-semibold text-xs">
                <th className="py-3 px-4">ผู้ใช้งาน</th>
                <th className="py-3 px-4">บทบาท</th>
                <th className="py-3 px-4">สถานะอีเมล</th>
                <th className="py-3 px-4">สถานะบัญชี</th>
                <th className="py-3 px-4">เข้าสู่ระบบล่าสุด</th>
                <th className="py-3 px-4 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--pw-hairline)]">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[var(--pw-ink)]/60">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="size-5 animate-spin text-[var(--pw-primary)]" />
                      <span>กำลังโหลดรายชื่อผู้ใช้...</span>
                    </div>
                  </td>
                </tr>
              ) : !usersData?.items || usersData.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[var(--pw-ink)]/60">
                    ไม่พบผู้ใช้งานที่ตรงตามเงื่อนไข
                  </td>
                </tr>
              ) : (
                usersData.items.map((u) => {
                  const isSelf = currentUser?.id === u.id;
                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-[var(--pw-hairline)]/10 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="font-semibold text-[var(--pw-ink)]">
                            {u.displayName}
                          </div>
                          {isSelf && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-[var(--pw-primary)]/20 text-[var(--pw-primary)]">
                              คุณ
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[var(--pw-ink)]/60">{u.email}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {u.roles.map((r) => (
                            <span
                              key={r}
                              className={cn(
                                "px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase",
                                r === "Admin"
                                  ? "bg-[var(--pw-primary)]/15 text-[var(--pw-primary)]"
                                  : "bg-[var(--pw-hairline)]/40 text-[var(--pw-ink)]/80"
                              )}
                            >
                              {r}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {u.isEmailVerified ? (
                          <span className="inline-flex items-center gap-1 text-xs text-[var(--pw-income)] font-medium">
                            <CheckCircle className="size-3.5" /> ยืนยันแล้ว
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-500 font-medium">
                            <AlertTriangle className="size-3.5" /> ยังไม่ยืนยัน
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {u.isSuspended ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-[var(--pw-expense)]/15 text-[var(--pw-expense)]">
                            <UserX className="size-3" /> ระงับใช้งาน
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-[var(--pw-income)]/15 text-[var(--pw-income)]">
                            <UserCheck className="size-3" /> ปกติ
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-[var(--pw-ink)]/70">
                        {formatDisplayDateTime(u.lastLoginAt, "ไม่เคยเข้าสู่ระบบ")}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedUserId(u.id);
                              setActiveDetailTab("profile");
                            }}
                            className="px-2.5 py-1 text-xs rounded border border-[var(--pw-hairline)] bg-[var(--pw-surface)] text-[var(--pw-ink)] hover:bg-[var(--pw-hairline)]/30 transition-all duration-150 active:scale-95"
                          >
                            ตรวจสอบ
                          </button>
                          {u.isSuspended ? (
                            <button
                              onClick={() => handleConfirmUnsuspend(u)}
                              disabled={unsuspendMutation.isPending}
                              className="px-2.5 py-1 text-xs rounded border border-[var(--pw-income)]/40 bg-[var(--pw-income)]/10 text-[var(--pw-income)] hover:bg-[var(--pw-income)]/20 transition-all duration-150 active:scale-95 font-medium"
                            >
                              ยกเลิกระงับ
                            </button>
                          ) : isSelf ? (
                            <span className="text-[11px] text-[var(--pw-ink)]/40 px-2 py-1 select-none">
                              (บัญชีของคุณ)
                            </span>
                          ) : (
                            <button
                              onClick={() => handleOpenSuspendModal(u)}
                              className="px-2.5 py-1 text-xs rounded border border-[var(--pw-expense)]/40 bg-[var(--pw-expense)]/10 text-[var(--pw-expense)] hover:bg-[var(--pw-expense)]/20 transition-all duration-150 active:scale-95 font-medium"
                            >
                              ระงับบัญชี
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {usersData && usersData.totalPages > 1 && (
          <div className="p-3 border-t border-[var(--pw-hairline)] flex items-center justify-between text-xs text-[var(--pw-ink)]/70">
            <div>
              หน้า {usersData.page} จาก {usersData.totalPages} ({usersData.totalItems} บัญชี)
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-2.5 py-1 rounded border border-[var(--pw-hairline)] bg-[var(--pw-surface)] disabled:opacity-40"
              >
                ก่อนหน้า
              </button>
              <button
                onClick={() => setPage((p) => Math.min(usersData.totalPages, p + 1))}
                disabled={page >= usersData.totalPages}
                className="px-2.5 py-1 rounded border border-[var(--pw-hairline)] bg-[var(--pw-surface)] disabled:opacity-40"
              >
                ถัดไป
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* 1. FILTER BOTTOM SHEET                                           */}
      {/* ---------------------------------------------------------------- */}
      <BottomSheet
        open={showFilterSheet}
        onOpenChange={setShowFilterSheet}
        title="ตัวกรองบัญชีผู้ใช้งาน"
        description="เลือกเงื่อนไขเพื่อคัดกรองรายชื่อผู้ใช้งานในระบบ"
        className="sm:max-w-md"
      >
        <div className="space-y-4 py-2">
          <div>
            <label className="text-xs font-semibold text-[var(--pw-ink)] block mb-1.5">
              บทบาทผู้ใช้ (Role)
            </label>
            <Select
              value={selectedRole || "ALL"}
              onValueChange={(val) => setSelectedRole(val === "ALL" ? "" : val)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="ทุกบทบาท (All Roles)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">ทุกบทบาท (All Roles)</SelectItem>
                <SelectItem value="Admin">Admin (ผู้ดูแลระบบ)</SelectItem>
                <SelectItem value="Member">Member (สมาชิกทั่วไป)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-semibold text-[var(--pw-ink)] block mb-1.5">
              สถานะการระงับ (Suspension Status)
            </label>
            <Select
              value={suspendedFilter || "ALL"}
              onValueChange={(val) => setSuspendedFilter(val === "ALL" ? "" : val)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="สถานะการระงับ (ทั้งหมด)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">สถานะการระงับ (ทั้งหมด)</SelectItem>
                <SelectItem value="false">ปกติ (Active)</SelectItem>
                <SelectItem value="true">ถูกระงับ (Suspended)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-semibold text-[var(--pw-ink)] block mb-1.5">
              สถานะยืนยันอีเมล (Email Verification)
            </label>
            <Select
              value={verifiedFilter || "ALL"}
              onValueChange={(val) => setVerifiedFilter(val === "ALL" ? "" : val)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="สถานะการยืนยันอีเมล (ทั้งหมด)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">สถานะการยืนยันอีเมล (ทั้งหมด)</SelectItem>
                <SelectItem value="true">ยืนยันแล้ว (Verified)</SelectItem>
                <SelectItem value="false">ยังไม่ยืนยัน (Unverified)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* BottomSheet Button Hierarchy: Confirm on TOP, Cancel/Reset on BOTTOM */}
          <BottomSheetFooter>
            <Button
              type="button"
              className="w-full"
              onClick={() => {
                setPage(1);
                setShowFilterSheet(false);
              }}
            >
              ใช้ตัวกรอง ({activeFilterCount})
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={resetFilters}
            >
              <RotateCcw className="size-3.5 mr-1" />
              ล้างตัวกรอง
            </Button>
          </BottomSheetFooter>
        </div>
      </BottomSheet>

      {/* ---------------------------------------------------------------- */}
      {/* 2. SUSPEND CONFIRMATION BOTTOM SHEET                             */}
      {/* ---------------------------------------------------------------- */}
      <BottomSheet
        open={Boolean(suspendTarget)}
        onOpenChange={(open) => !open && setSuspendTarget(null)}
        title="ระงับบัญชีผู้ใช้งาน"
        description={
          suspendTarget
            ? `${suspendTarget.displayName} (${suspendTarget.email})`
            : undefined
        }
        className="sm:max-w-md"
      >
        {suspendTarget && (
          <div className="space-y-4 py-2">
            <div className="p-3 rounded-xl bg-[var(--pw-expense)]/10 border border-[var(--pw-expense)]/30 text-xs text-[var(--pw-ink)]/80 flex items-start gap-2.5">
              <UserX className="size-5 text-[var(--pw-expense)] shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-[var(--pw-expense)]">
                  คำเตือนการระงับบัญชี
                </div>
                <div>
                  เมื่อระงับบัญชี เซสชันทั้งหมดของผู้ใช้จะถูกเพิกถอนทันที และผู้ใช้จะไม่สามารถเข้าสู่ระบบได้จนกว่าจะได้รับการยกเลิก
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--pw-ink)]">
                เหตุผลในการระงับบัญชี <span className="text-[var(--pw-expense)]">*</span>
              </label>
              <textarea
                rows={3}
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="เช่น ละเมิดข้อกำหนดการใช้งาน, ตรวจพบกิจกรรมผิดปกติ หรือแจ้งจากเจ้าของบัญชี"
                className="w-full p-2.5 text-xs sm:text-sm rounded-lg border border-[var(--pw-hairline)] bg-transparent text-[var(--pw-ink)] focus:outline-none focus:border-[var(--pw-expense)]"
              />
            </div>

            {/* BottomSheet Button Hierarchy: Confirm on TOP, Cancel on BOTTOM */}
            <BottomSheetFooter>
              <button
                type="button"
                onClick={handleConfirmSuspend}
                disabled={suspendMutation.isPending || !suspendReason.trim()}
                className="w-full px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-lg bg-[var(--pw-expense)] text-white hover:brightness-110 disabled:opacity-40 transition-colors"
              >
                {suspendMutation.isPending ? "กำลังระงับ..." : "ยืนยันการระงับบัญชี"}
              </button>
              <button
                type="button"
                onClick={() => setSuspendTarget(null)}
                className="w-full px-4 py-2.5 text-xs sm:text-sm font-medium rounded-lg border border-[var(--pw-hairline)] bg-[var(--pw-surface)] text-[var(--pw-ink)] hover:bg-[var(--pw-hairline)]/30 transition-colors"
              >
                ยกเลิก
              </button>
            </BottomSheetFooter>
          </div>
        )}
      </BottomSheet>

      {/* ---------------------------------------------------------------- */}
      {/* 3. USER DETAIL INSPECTION BOTTOM SHEET                           */}
      {/* ---------------------------------------------------------------- */}
      <BottomSheet
        open={Boolean(selectedUserId)}
        onOpenChange={(open) => !open && setSelectedUserId(null)}
        title={
          <div className="flex items-center gap-2">
            <span>{userDetail?.displayName || "ข้อมูลผู้ใช้งาน"}</span>
            {userDetail?.isSuspended && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--pw-expense)]/15 text-[var(--pw-expense)] font-bold">
                ถูกระงับการใช้งาน
              </span>
            )}
          </div>
        }
        description={userDetail?.email}
        className="sm:max-w-3xl"
      >
        <div className="flex flex-col h-full">
          {/* Tabs */}
          <div className="border-b border-[var(--pw-hairline)] flex gap-4 text-xs font-semibold -mt-2 mb-4">
            <button
              onClick={() => setActiveDetailTab("profile")}
              className={cn(
                "py-2.5 border-b-2 transition-colors",
                activeDetailTab === "profile"
                  ? "border-[var(--pw-primary)] text-[var(--pw-primary)]"
                  : "border-transparent text-[var(--pw-ink)]/60 hover:text-[var(--pw-ink)]"
              )}
            >
              ข้อมูลบัญชี & การกระทำ
            </button>
            <button
              onClick={() => setActiveDetailTab("sessions")}
              className={cn(
                "py-2.5 border-b-2 transition-colors flex items-center gap-1.5",
                activeDetailTab === "sessions"
                  ? "border-[var(--pw-primary)] text-[var(--pw-primary)]"
                  : "border-transparent text-[var(--pw-ink)]/60 hover:text-[var(--pw-ink)]"
              )}
            >
              เซสชันและอุปกรณ์ ({userSessions.length})
            </button>
            <button
              onClick={() => setActiveDetailTab("security")}
              className={cn(
                "py-2.5 border-b-2 transition-colors flex items-center gap-1.5",
                activeDetailTab === "security"
                  ? "border-[var(--pw-primary)] text-[var(--pw-primary)]"
                  : "border-transparent text-[var(--pw-ink)]/60 hover:text-[var(--pw-ink)]"
              )}
            >
              ประวัติความปลอดภัย ({userDetail?.recentSecurityEvents?.length ?? 0})
            </button>
          </div>

          {/* Tab Content */}
          <div className="pb-4">
            {isDetailLoading ? (
              <div className="py-12 text-center text-xs text-[var(--pw-ink)]/60">
                <RefreshCw className="size-5 animate-spin mx-auto text-[var(--pw-primary)] mb-2" />
                กำลังโหลดรายละเอียดผู้ใช้...
              </div>
            ) : !userDetail ? (
              <div className="py-12 text-center text-xs text-[var(--pw-ink)]/60">
                ไม่พบข้อมูลผู้ใช้
              </div>
            ) : activeDetailTab === "profile" ? (
              <div className="space-y-4">
                {/* User Info Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl border border-[var(--pw-hairline)] bg-[var(--pw-surface)]/50 backdrop-blur-xs">
                    <span className="text-[11px] text-[var(--pw-ink)]/60">
                      รายการธุรกรรม
                    </span>
                    <div className="text-xl font-bold text-[var(--pw-ink)] mt-0.5">
                      {userDetail.totalTransactionsCount.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl border border-[var(--pw-hairline)] bg-[var(--pw-surface)]/50 backdrop-blur-xs">
                    <span className="text-[11px] text-[var(--pw-ink)]/60">
                      บัญชีธนาคาร
                    </span>
                    <div className="text-xl font-bold text-[var(--pw-ink)] mt-0.5">
                      {userDetail.totalBankAccountsCount.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl border border-[var(--pw-hairline)] bg-[var(--pw-surface)]/50 backdrop-blur-xs">
                    <span className="text-[11px] text-[var(--pw-ink)]/60">
                      บัตรเครดิต
                    </span>
                    <div className="text-xl font-bold text-[var(--pw-ink)] mt-0.5">
                      {userDetail.totalCreditCardsCount.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Account Details Box */}
                <div className="p-4 rounded-xl border border-[var(--pw-hairline)] bg-[var(--pw-surface)]/40 space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-[var(--pw-hairline)]/50">
                    <span className="text-[var(--pw-ink)]/60">วันที่สมัครสมาชิก</span>
                    <span className="font-medium text-[var(--pw-ink)]">
                      {formatDisplayDateTime(userDetail.createdAt)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[var(--pw-hairline)]/50">
                    <span className="text-[var(--pw-ink)]/60">เข้าสู่ระบบล่าสุด</span>
                    <span className="font-medium text-[var(--pw-ink)]">
                      {formatDisplayDateTime(userDetail.lastLoginAt, "ไม่เคยเข้าสู่ระบบ")}
                    </span>
                  </div>
                  {userDetail.birthDate && (
                    <div className="flex justify-between py-1 border-b border-[var(--pw-hairline)]/50">
                      <span className="text-[var(--pw-ink)]/60">วันเกิด</span>
                      <span className="font-medium text-[var(--pw-ink)]">
                        {formatDisplayDate(userDetail.birthDate)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between py-1">
                    <span className="text-[var(--pw-ink)]/60">บทบาทในระบบ</span>
                    <span className="font-medium text-[var(--pw-ink)]">
                      {userDetail.roles
                        .map((r) =>
                          r === "Admin"
                            ? "Admin (ผู้ดูแลระบบ)"
                            : r === "Member"
                            ? "Member (สมาชิกทั่วไป)"
                            : r
                        )
                        .join(", ")}
                    </span>
                  </div>
                </div>

                {/* Suspension reason if suspended */}
                {userDetail.isSuspended && (
                  <div className="p-3.5 rounded-xl border border-[var(--pw-expense)]/40 bg-[var(--pw-expense)]/10 text-xs space-y-1">
                    <div className="font-bold text-[var(--pw-expense)] flex items-center gap-1.5">
                      <UserX className="size-4" /> บัญชีนี้ถูกระงับการใช้งาน
                    </div>
                    <div className="text-[var(--pw-ink)]/80">
                      เหตุผล: {userDetail.suspensionReason || "ไม่ได้ระบุเหตุผล"}
                    </div>
                    <div className="text-[11px] text-[var(--pw-ink)]/60">
                      ระงับเมื่อ: {formatDisplayDateTime(userDetail.suspendedAt)}
                    </div>
                  </div>
                )}

                {/* Admin Actions */}
                <div className="pt-2">
                  <h4 className="text-xs font-bold text-[var(--pw-ink)] mb-2.5">
                    การดำเนินการสำหรับผู้ดูแลระบบ
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      onClick={() => handleResendVerification(userDetail.id)}
                      disabled={resendVerificationMutation.isPending || userDetail.isEmailVerified}
                      className={cn(
                        "p-3 rounded-xl border border-[var(--pw-hairline)] bg-[var(--pw-surface)] text-left transition-all duration-150 active:scale-95 flex items-center gap-2.5",
                        userDetail.isEmailVerified
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:bg-[var(--pw-hairline)]/20"
                      )}
                    >
                      <Mail className="size-4 text-[var(--pw-primary)] shrink-0" />
                      <div>
                        <div className="font-medium text-xs text-[var(--pw-ink)]">
                          ส่งอีเมลยืนยันตัวตนอีกครั้ง
                        </div>
                        <div className="text-[10px] text-[var(--pw-ink)]/60">
                          {userDetail.isEmailVerified
                            ? "ผู้ใช้ยืนยันอีเมลแล้ว"
                            : "ส่งลิงก์ยืนยันไปยังอีเมล"}
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => handleSendResetPassword(userDetail.id)}
                      disabled={sendResetPasswordMutation.isPending}
                      className="p-3 rounded-xl border border-[var(--pw-hairline)] bg-[var(--pw-surface)] hover:bg-[var(--pw-hairline)]/20 text-left transition-all duration-150 active:scale-95 flex items-center gap-2.5"
                    >
                      <KeyRound className="size-4 text-amber-500 shrink-0" />
                      <div>
                        <div className="font-medium text-xs text-[var(--pw-ink)]">
                          ส่งลิงก์รีเซ็ตรหัสผ่าน
                        </div>
                        <div className="text-[10px] text-[var(--pw-ink)]/60">
                          ส่งรหัสสำหรับตั้งรหัสผ่านใหม่ทางอีเมล
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            ) : activeDetailTab === "sessions" ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-[var(--pw-ink)]/70">
                    รายการเซสชันการเข้าสู่ระบบและ Refresh Tokens ของผู้ใช้
                  </p>
                  {userSessions.some((s) => !s.isRevoked) && (
                    <button
                      onClick={() => handleRevokeAllSessions(selectedUserId!)}
                      disabled={revokeAllSessionsMutation.isPending}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-[var(--pw-expense)]/15 text-[var(--pw-expense)] hover:bg-[var(--pw-expense)]/25 transition-all duration-150 active:scale-95"
                    >
                      บังคับออกจากระบบทุกเครื่อง
                    </button>
                  )}
                </div>

                {userSessions.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[var(--pw-ink)]/60">
                    ไม่พบเซสชันที่บันทึกไว้
                  </div>
                ) : (
                  <div className="space-y-2">
                    {userSessions.map((session) => (
                      <div
                        key={session.id}
                        className={cn(
                          "p-3 rounded-xl border flex items-center justify-between gap-3 text-xs",
                          session.isRevoked
                            ? "border-[var(--pw-hairline)]/60 bg-[var(--pw-hairline)]/10 opacity-60"
                            : "border-[var(--pw-hairline)] bg-[var(--pw-surface)]/60 backdrop-blur-xs"
                        )}
                      >
                        <div className="flex items-start gap-2.5">
                          <Laptop className="size-4 text-[var(--pw-primary)] mt-0.5 shrink-0" />
                          <div>
                            <div className="font-semibold text-[var(--pw-ink)]">
                              {session.deviceName || "อุปกรณ์ที่ไม่ระบุ"}
                              {session.isRevoked && (
                                <span className="ml-2 text-[10px] font-bold text-[var(--pw-expense)]">
                                  (เพิกถอนแล้ว)
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-[var(--pw-ink)]/60 mt-0.5">
                              IP: {session.ipAddress || "ไม่ทราบ"} &bull; เข้าใช้งาน:{" "}
                              {formatDisplayDateTime(session.lastUsedAt)}
                            </div>
                          </div>
                        </div>
                        {!session.isRevoked && (
                          <button
                            onClick={() => handleRevokeSession(selectedUserId!, session.id)}
                            disabled={revokeSessionMutation.isPending}
                            className="px-2.5 py-1 text-xs rounded border border-[var(--pw-expense)]/30 text-[var(--pw-expense)] hover:bg-[var(--pw-expense)]/10 transition-colors"
                          >
                            เพิกถอน
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-[var(--pw-ink)]/70">
                  ไทม์ไลน์บันทึกความปลอดภัยล่าสุดของผู้ใช้นี้
                </p>
                {userDetail?.recentSecurityEvents.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[var(--pw-ink)]/60">
                    ยังไม่มีบันทึกเหตุการณ์ความปลอดภัย
                  </div>
                ) : (
                  <div className="space-y-2">
                    {userDetail?.recentSecurityEvents.map((ev) => (
                      <div
                        key={ev.securityEventId}
                        className="p-3 rounded-xl border border-[var(--pw-hairline)] bg-[var(--pw-surface)]/60 text-xs flex items-start justify-between gap-2"
                      >
                        <div>
                          <div className="font-semibold text-[var(--pw-ink)] flex items-center gap-1.5">
                            <span
                              className={cn(
                                "size-2 rounded-full",
                                ev.succeeded ? "bg-[var(--pw-income)]" : "bg-[var(--pw-expense)]"
                              )}
                            />
                            {ev.eventType}
                          </div>
                          <div className="text-[11px] text-[var(--pw-ink)]/60 mt-0.5">
                            IP: {ev.ipAddress || "-"} &bull; ผู้กระทำ:{" "}
                            {ev.actorUserDisplayName || "ระบบ"}
                          </div>
                          {ev.detailsJson && (
                            <pre className="mt-1 p-1.5 rounded bg-[var(--pw-hairline)]/20 text-[10px] text-[var(--pw-ink)]/75 overflow-x-auto">
                              {ev.detailsJson}
                            </pre>
                          )}
                        </div>
                        <span className="text-[10px] text-[var(--pw-ink)]/50 shrink-0">
                          {formatDisplayDateTime(ev.occurredAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </BottomSheet>

      {/* Confirmation AlertDialog (Replacing native window.confirm) */}
      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDialog.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              className={confirmDialog.destructive ? "bg-[var(--pw-expense)] hover:bg-[var(--pw-expense)]/90 text-white" : undefined}
              onClick={async () => {
                const action = confirmDialog.onConfirm;
                setConfirmDialog((prev) => ({ ...prev, open: false }));
                await action();
              }}
            >
              {confirmDialog.confirmLabel || "ยืนยัน"}
            </AlertDialogAction>
            <AlertDialogCancel onClick={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}>
              ยกเลิก
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
