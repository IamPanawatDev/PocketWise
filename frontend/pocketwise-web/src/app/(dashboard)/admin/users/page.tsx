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
  MoreVertical,
  RefreshCw,
  LogOut,
  History,
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
import type { AdminUserListItem } from "@/types/admin-operations.types";

export default function AdminUsersPage() {
  const { data: currentUser, isLoading: isUserLoading } = useCurrentUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [suspendedFilter, setSuspendedFilter] = useState<string>("");
  const [verifiedFilter, setVerifiedFilter] = useState<string>("");
  const [page, setPage] = useState(1);

  // Selected user for Detail Modal
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  // Suspend modal state
  const [suspendTarget, setSuspendTarget] = useState<AdminUserListItem | null>(null);
  const [suspendReason, setSuspendReason] = useState("");

  const filters = {
    q: searchQuery || undefined,
    role: selectedRole || undefined,
    isSuspended: suspendedFilter === "true" ? true : suspendedFilter === "false" ? false : undefined,
    isEmailVerified: verifiedFilter === "true" ? true : verifiedFilter === "false" ? false : undefined,
    page,
    pageSize: 15,
  };

  const { data: usersData, isLoading, refetch } = useAdminUsersQuery(filters);
  const { data: userDetail, isLoading: isDetailLoading } = useAdminUserDetailQuery(selectedUserId);
  const { data: userSessions = [], isLoading: isSessionsLoading } = useAdminUserSessionsQuery(selectedUserId);

  const suspendMutation = useSuspendUserMutation();
  const unsuspendMutation = useUnsuspendUserMutation();
  const resendVerificationMutation = useResendVerificationMutation();
  const sendResetPasswordMutation = useSendResetPasswordMutation();
  const revokeSessionMutation = useRevokeSessionMutation();
  const revokeAllSessionsMutation = useRevokeAllSessionsMutation();

  const [activeDetailTab, setActiveDetailTab] = useState<"profile" | "sessions" | "security">("profile");
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setActionSuccessMessage(msg);
    setTimeout(() => setActionSuccessMessage(null), 4000);
  };

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
    setSuspendTarget(user);
    setSuspendReason("");
  };

  const handleConfirmSuspend = async () => {
    if (!suspendTarget || !suspendReason.trim()) return;
    try {
      await suspendMutation.mutateAsync({
        userId: suspendTarget.id,
        reason: suspendReason.trim(),
      });
      setSuspendTarget(null);
      showNotification(`ระงับบัญชีผู้ใช้ ${suspendTarget.displayName} เรียบร้อยแล้ว`);
    } catch (err: any) {
      alert(err?.message || "เกิดข้อผิดพลาดในการระงับบัญชี");
    }
  };

  const handleConfirmUnsuspend = async (user: AdminUserListItem) => {
    if (!confirm(`คุณต้องการยกเลิกการระงับบัญชีของ "${user.displayName}" ใช่หรือไม่?`)) return;
    try {
      await unsuspendMutation.mutateAsync(user.id);
      showNotification(`ยกเลิกการระงับบัญชีผู้ใช้ ${user.displayName} เรียบร้อยแล้ว`);
    } catch (err: any) {
      alert(err?.message || "เกิดข้อผิดพลาด");
    }
  };

  const handleResendVerification = async (userId: number) => {
    try {
      await resendVerificationMutation.mutateAsync(userId);
      showNotification("ส่งอีเมลยืนยันตัวตนเรียบร้อยแล้ว");
    } catch (err: any) {
      alert(err?.message || "ไม่สามารถส่งอีเมลยืนยันได้");
    }
  };

  const handleSendResetPassword = async (userId: number) => {
    try {
      const res = await sendResetPasswordMutation.mutateAsync(userId);
      showNotification("ส่งลิงก์สำหรับรีเซ็ตรหัสผ่านไปยังอีเมลผู้ใช้เรียบร้อยแล้ว");
    } catch (err: any) {
      alert(err?.message || "ไม่สามารถส่งลิงก์รีเซ็ตรหัสผ่านได้");
    }
  };

  const handleRevokeSession = async (userId: number, tokenId: number) => {
    if (!confirm("คุณต้องการเพิกถอนเซสชันนี้และบังคับให้ออกจากระบบใช่หรือไม่?")) return;
    try {
      await revokeSessionMutation.mutateAsync({ userId, tokenId });
      showNotification("เพิกถอนเซสชันเรียบร้อยแล้ว");
    } catch (err: any) {
      alert(err?.message || "เกิดข้อผิดพลาด");
    }
  };

  const handleRevokeAllSessions = async (userId: number) => {
    if (!confirm("คุณต้องการบังคับให้ออกจากระบบในทุกอุปกรณ์ของผู้ใช้นี้ใช่หรือไม่?")) return;
    try {
      await revokeAllSessionsMutation.mutateAsync(userId);
      showNotification("เพิกถอนเซสชันทั้งหมดของผู้ใช้เรียบร้อยแล้ว");
    } catch (err: any) {
      alert(err?.message || "เกิดข้อผิดพลาด");
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Success banner */}
      <AnimatePresence>
        {actionSuccessMessage && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-3.5 rounded-xl border border-[var(--pw-income)]/40 bg-[var(--pw-income)]/15 text-[var(--pw-ink)] text-sm flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <CheckCircle className="size-4 text-[var(--pw-income)] shrink-0" />
              <span>{actionSuccessMessage}</span>
            </div>
            <button onClick={() => setActionSuccessMessage(null)}>
              <X className="size-4 opacity-70 hover:opacity-100" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

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
            <p className="text-xs sm:text-sm text-[var(--pw-ink)]/70">
              ค้นหา ตรวจสอบเซสชัน ระงับ/ยกเลิกการระงับ และส่งลิงก์กู้คืนบัญชี
            </p>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="p-4 rounded-xl border border-[var(--pw-hairline)] bg-[var(--pw-surface)] shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="size-4 text-[var(--pw-ink)]/50 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ค้นหาชื่อ หรืออีเมล..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-lg border border-[var(--pw-hairline)] bg-transparent text-[var(--pw-ink)] focus:outline-none focus:border-[var(--pw-primary)]"
            />
          </div>

          <div>
            <select
              value={selectedRole}
              onChange={(e) => {
                setSelectedRole(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-[var(--pw-hairline)] bg-[var(--pw-surface)] text-[var(--pw-ink)] focus:outline-none focus:border-[var(--pw-primary)]"
            >
              <option value="">ทุกบทบาท (All Roles)</option>
              <option value="Admin">Admin (ผู้ดูแลระบบ)</option>
              <option value="Member">Member (สมาชิกทั่วไป)</option>
            </select>
          </div>

          <div>
            <select
              value={suspendedFilter}
              onChange={(e) => {
                setSuspendedFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-[var(--pw-hairline)] bg-[var(--pw-surface)] text-[var(--pw-ink)] focus:outline-none focus:border-[var(--pw-primary)]"
            >
              <option value="">สถานะการระงับ (ทั้งหมด)</option>
              <option value="false">ปกติ (Active)</option>
              <option value="true">ถูกระงับ (Suspended)</option>
            </select>
          </div>

          <div>
            <select
              value={verifiedFilter}
              onChange={(e) => {
                setVerifiedFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-[var(--pw-hairline)] bg-[var(--pw-surface)] text-[var(--pw-ink)] focus:outline-none focus:border-[var(--pw-primary)]"
            >
              <option value="">การยืนยันอีเมล (ทั้งหมด)</option>
              <option value="true">ยืนยันแล้ว (Verified)</option>
              <option value="false">ยังไม่ยืนยัน (Unverified)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-xl border border-[var(--pw-hairline)] bg-[var(--pw-surface)] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-[var(--pw-hairline)] bg-[var(--pw-hairline)]/10 text-[var(--pw-ink)]/70 font-semibold">
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
                    กำลังโหลดข้อมูลผู้ใช้งาน...
                  </td>
                </tr>
              ) : usersData?.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[var(--pw-ink)]/60">
                    ไม่พบผู้ใช้งานตามเงื่อนไขที่ค้นหา
                  </td>
                </tr>
              ) : (
                usersData?.items.map((u) => (
                  <tr key={u.id} className="hover:bg-[var(--pw-hairline)]/10 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[var(--pw-ink)]">{u.displayName}</div>
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
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString("th-TH") : "ไม่เคยเข้าสู่ระบบ"}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedUserId(u.id);
                            setActiveDetailTab("profile");
                          }}
                          className="px-2.5 py-1 text-xs rounded border border-[var(--pw-hairline)] bg-[var(--pw-surface)] text-[var(--pw-ink)] hover:bg-[var(--pw-hairline)]/30 transition-colors"
                        >
                          ตรวจสอบ
                        </button>
                        {u.isSuspended ? (
                          <button
                            onClick={() => handleConfirmUnsuspend(u)}
                            disabled={unsuspendMutation.isPending}
                            className="px-2.5 py-1 text-xs rounded border border-[var(--pw-income)]/40 bg-[var(--pw-income)]/10 text-[var(--pw-income)] hover:bg-[var(--pw-income)]/20 transition-colors font-medium"
                          >
                            ยกเลิกระงับ
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenSuspendModal(u)}
                            className="px-2.5 py-1 text-xs rounded border border-[var(--pw-expense)]/40 bg-[var(--pw-expense)]/10 text-[var(--pw-expense)] hover:bg-[var(--pw-expense)]/20 transition-colors font-medium"
                          >
                            ระงับบัญชี
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {usersData && usersData.totalPages > 1 && (
          <div className="p-4 border-t border-[var(--pw-hairline)] flex items-center justify-between text-xs text-[var(--pw-ink)]/70">
            <span>
              หน้า {usersData.page} จาก {usersData.totalPages} (ทั้งหมด {usersData.totalItems} รายการ)
            </span>
            <div className="flex items-center gap-1.5">
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

      {/* Suspend Confirmation Modal */}
      <AnimatePresence>
        {suspendTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl border border-[var(--pw-hairline)] bg-[var(--pw-surface)] p-6 shadow-xl space-y-4"
            >
              <div className="flex items-center gap-3 text-[var(--pw-expense)]">
                <div className="p-2.5 rounded-xl bg-[var(--pw-expense)]/10">
                  <UserX className="size-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[var(--pw-ink)]">
                    ระงับบัญชีผู้ใช้งาน
                  </h3>
                  <p className="text-xs text-[var(--pw-ink)]/60">
                    {suspendTarget.displayName} ({suspendTarget.email})
                  </p>
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
                <p className="text-[11px] text-[var(--pw-ink)]/60">
                  เมื่อระงับบัญชี เซสชันทั้งหมดของผู้ใช้จะถูกเพิกถอนทันที และผู้ใช้จะไม่สามารถเข้าสู่ระบบได้
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setSuspendTarget(null)}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-[var(--pw-hairline)] bg-[var(--pw-surface)] text-[var(--pw-ink)] hover:bg-[var(--pw-hairline)]/30"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleConfirmSuspend}
                  disabled={!suspendReason.trim() || suspendMutation.isPending}
                  className="px-4 py-2 text-xs font-bold rounded-lg bg-[var(--pw-expense)] text-white hover:opacity-90 disabled:opacity-50"
                >
                  ยืนยันการระงับบัญชี
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* User Detail & Sessions Modal */}
      <AnimatePresence>
        {selectedUserId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col rounded-2xl border border-[var(--pw-hairline)] bg-[var(--pw-surface)] shadow-2xl"
            >
              {/* Modal Header */}
              <div className="p-4 sm:p-5 border-b border-[var(--pw-hairline)] flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg text-[var(--pw-ink)] flex items-center gap-2">
                    {userDetail?.displayName || "ข้อมูลผู้ใช้งาน"}
                    {userDetail?.isSuspended && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--pw-expense)]/15 text-[var(--pw-expense)] font-bold">
                        SUSPENDED
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-[var(--pw-ink)]/60">{userDetail?.email}</p>
                </div>
                <button
                  onClick={() => setSelectedUserId(null)}
                  className="p-1.5 rounded-lg text-[var(--pw-ink)]/60 hover:text-[var(--pw-ink)] hover:bg-[var(--pw-hairline)]/30"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* Tabs */}
              <div className="px-5 border-b border-[var(--pw-hairline)] flex gap-4 text-xs font-semibold">
                <button
                  onClick={() => setActiveDetailTab("profile")}
                  className={cn(
                    "py-3 border-b-2 transition-colors",
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
                    "py-3 border-b-2 transition-colors flex items-center gap-1.5",
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
                    "py-3 border-b-2 transition-colors flex items-center gap-1.5",
                    activeDetailTab === "security"
                      ? "border-[var(--pw-primary)] text-[var(--pw-primary)]"
                      : "border-transparent text-[var(--pw-ink)]/60 hover:text-[var(--pw-ink)]"
                  )}
                >
                  ประวัติความปลอดภัย ({userDetail?.recentSecurityEvents.length ?? 0})
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm">
                {isDetailLoading ? (
                  <div className="py-12 text-center text-[var(--pw-ink)]/60">
                    กำลังโหลดข้อมูลผู้ใช้...
                  </div>
                ) : activeDetailTab === "profile" && userDetail ? (
                  <div className="space-y-5">
                    {/* Activity summary */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 rounded-xl bg-[var(--pw-hairline)]/15 border border-[var(--pw-hairline)] text-center">
                        <div className="text-[11px] text-[var(--pw-ink)]/60">รายการธุรกรรม</div>
                        <div className="text-base sm:text-lg font-bold text-[var(--pw-ink)] mt-1">
                          {userDetail.totalTransactionsCount.toLocaleString()}
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-[var(--pw-hairline)]/15 border border-[var(--pw-hairline)] text-center">
                        <div className="text-[11px] text-[var(--pw-ink)]/60">บัญชีธนาคาร</div>
                        <div className="text-base sm:text-lg font-bold text-[var(--pw-ink)] mt-1">
                          {userDetail.totalBankAccountsCount}
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-[var(--pw-hairline)]/15 border border-[var(--pw-hairline)] text-center">
                        <div className="text-[11px] text-[var(--pw-ink)]/60">บัตรเครดิต</div>
                        <div className="text-base sm:text-lg font-bold text-[var(--pw-ink)] mt-1">
                          {userDetail.totalCreditCardsCount}
                        </div>
                      </div>
                    </div>

                    {/* Suspension info if suspended */}
                    {userDetail.isSuspended && (
                      <div className="p-3.5 rounded-xl border border-[var(--pw-expense)]/40 bg-[var(--pw-expense)]/10 space-y-1">
                        <div className="font-semibold text-[var(--pw-expense)] flex items-center gap-1.5">
                          <AlertTriangle className="size-4" /> บัญชีนี้ถูกระงับการใช้งาน
                        </div>
                        <div className="text-xs text-[var(--pw-ink)]/80">
                          <strong>เหตุผล:</strong> {userDetail.suspensionReason || "ไม่ระบุ"}
                        </div>
                        <div className="text-[11px] text-[var(--pw-ink)]/60">
                          ระงับเมื่อ {userDetail.suspendedAt ? new Date(userDetail.suspendedAt).toLocaleString("th-TH") : "-"}{" "}
                          โดย {userDetail.suspendedByDisplayName || "ผู้ดูแลระบบ"}
                        </div>
                      </div>
                    )}

                    {/* Quick Admin Actions */}
                    <div className="space-y-2 pt-2">
                      <h4 className="font-semibold text-xs text-[var(--pw-ink)]/80 uppercase tracking-wider">
                        การดำเนินการสำหรับผู้ดูแลระบบ
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <button
                          onClick={() => handleResendVerification(userDetail.id)}
                          disabled={userDetail.isEmailVerified || resendVerificationMutation.isPending}
                          className="p-3 rounded-xl border border-[var(--pw-hairline)] bg-[var(--pw-surface)] hover:bg-[var(--pw-hairline)]/20 text-left transition-colors flex items-center gap-2.5 disabled:opacity-40"
                        >
                          <Mail className="size-4 text-[var(--pw-primary)]" />
                          <div>
                            <div className="font-medium text-xs text-[var(--pw-ink)]">
                              ส่งอีเมลยืนยันตัวตนอีกครั้ง
                            </div>
                            <div className="text-[10px] text-[var(--pw-ink)]/60">
                              {userDetail.isEmailVerified ? "ผู้ใช้ยืนยันอีเมลแล้ว" : "ส่งรหัสยืนยันไปยังอีเมล"}
                            </div>
                          </div>
                        </button>

                        <button
                          onClick={() => handleSendResetPassword(userDetail.id)}
                          disabled={sendResetPasswordMutation.isPending}
                          className="p-3 rounded-xl border border-[var(--pw-hairline)] bg-[var(--pw-surface)] hover:bg-[var(--pw-hairline)]/20 text-left transition-colors flex items-center gap-2.5"
                        >
                          <KeyRound className="size-4 text-amber-500" />
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
                          onClick={() => handleRevokeAllSessions(selectedUserId)}
                          disabled={revokeAllSessionsMutation.isPending}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-[var(--pw-expense)]/15 text-[var(--pw-expense)] hover:bg-[var(--pw-expense)]/25 transition-colors"
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
                                : "border-[var(--pw-hairline)] bg-[var(--pw-surface)]"
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
                                  IP: {session.ipAddress || "ไม่ทราบ"} &bull; เข้าใช้งานเมื่อ:{" "}
                                  {new Date(session.lastUsedAt).toLocaleString("th-TH")}
                                </div>
                              </div>
                            </div>
                            {!session.isRevoked && (
                              <button
                                onClick={() => handleRevokeSession(selectedUserId, session.id)}
                                disabled={revokeSessionMutation.isPending}
                                className="px-2.5 py-1 text-xs rounded border border-[var(--pw-expense)]/30 text-[var(--pw-expense)] hover:bg-[var(--pw-expense)]/10"
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
                            className="p-3 rounded-xl border border-[var(--pw-hairline)] bg-[var(--pw-surface)] text-xs flex items-start justify-between gap-2"
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
                                IP: {ev.ipAddress || "-"} &bull; ผู้กระทำ: {ev.actorUserDisplayName || "ระบบ"}
                              </div>
                              {ev.detailsJson && (
                                <pre className="mt-1 p-1.5 rounded bg-[var(--pw-hairline)]/20 text-[10px] text-[var(--pw-ink)]/75 overflow-x-auto">
                                  {ev.detailsJson}
                                </pre>
                              )}
                            </div>
                            <span className="text-[10px] text-[var(--pw-ink)]/50 shrink-0">
                              {new Date(ev.occurredAt).toLocaleString("th-TH")}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
