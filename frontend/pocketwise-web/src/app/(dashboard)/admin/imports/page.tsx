"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  FileStack,
  Search,
  Filter,
  ShieldAlert,
  RotateCcw,
  Ban,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  X,
  FileText,
  User,
} from "lucide-react";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import {
  useAdminImportsQuery,
  useRetryImportJobMutation,
  useCancelImportJobMutation,
} from "@/features/admin-operations/hooks/useAdminOperations";
import { cn } from "@/lib/utils";
import { formatDisplayDateTime } from "@/lib/date-utils";
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
import type { AdminImportJob } from "@/types/admin-operations.types";

export default function AdminImportsPage() {
  const { data: user, isLoading: isUserLoading } = useCurrentUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedJobType, setSelectedJobType] = useState("");
  const [page, setPage] = useState(1);
  const [errorDetailsJob, setErrorDetailsJob] = useState<AdminImportJob | null>(null);

  const filters = {
    q: searchQuery || undefined,
    status: selectedStatus || undefined,
    jobType: selectedJobType || undefined,
    page,
    pageSize: 15,
  };

  const { data: importsData, isLoading, refetch } = useAdminImportsQuery(filters);
  const retryMutation = useRetryImportJobMutation();
  const cancelMutation = useCancelImportJobMutation();

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

  const isAdmin = (user?.roles?.includes("Admin") || user?.roles?.includes("SuperAdmin")) ?? true;

  if (!isUserLoading && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ShieldAlert className="size-16 text-[var(--pw-expense)] mb-4" />
        <h1 className="text-xl font-bold text-[var(--pw-ink)]">
          ปฏิเสธการเข้าถึง (Access Denied)
        </h1>
        <p className="text-sm text-[var(--pw-ink)]/70 mt-2 max-w-md">
          คุณต้องมีบทบาทระดับ Admin จึงจะสามารถเข้าถึงและจัดการงานนำเข้าข้อมูลของระบบได้
        </p>
      </div>
    );
  }

  const handleRetry = (job: AdminImportJob) => {
    if (job.retryCount >= 5) {
      toast.error("งานนี้ลองใหม่ครบจำนวนสูงสุด 5 ครั้งแล้ว ไม่สามารถลองใหม่ได้อีก");
      return;
    }

    setConfirmDialog({
      open: true,
      title: "ลองประมวลผลงานใหม่อีกครั้ง",
      description: `คุณต้องการส่งงาน #${job.importJobId} (${job.fileName}) กลับเข้าคิวประมวลผลใช่หรือไม่? (ครั้งที่ ${job.retryCount + 1}/5)`,
      confirmLabel: "ลองใหม่อีกครั้ง",
      destructive: false,
      onConfirm: async () => {
        try {
          await retryMutation.mutateAsync(job.importJobId);
          toast.success(`งาน #${job.importJobId} ถูกส่งกลับเข้าคิวประมวลผลใหม่เรียบร้อยแล้ว`);
        } catch (err: any) {
          toast.error(err?.message || "เกิดข้อผิดพลาดในการลองใหม่");
        }
      },
    });
  };

  const handleCancel = (job: AdminImportJob) => {
    setConfirmDialog({
      open: true,
      title: "ยืนยันการยกเลิกงานนำเข้า",
      description: `คุณต้องการยกเลิกงาน #${job.importJobId} (${job.fileName}) ใช่หรือไม่?`,
      confirmLabel: "ยกเลิกงานนี้",
      destructive: true,
      onConfirm: async () => {
        try {
          await cancelMutation.mutateAsync(job.importJobId);
          toast.success(`ยกเลิกงาน #${job.importJobId} เรียบร้อยแล้ว`);
        } catch (err: any) {
          toast.error(err?.message || "เกิดข้อผิดพลาดในการยกเลิก");
        }
      },
    });
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "Completed":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-[var(--pw-income)]/15 text-[var(--pw-income)]">
            <CheckCircle2 className="size-3" /> สำเร็จ
          </span>
        );
      case "Failed":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-[var(--pw-expense)]/15 text-[var(--pw-expense)]">
            <XCircle className="size-3" /> ล้มเหลว
          </span>
        );
      case "Processing":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-blue-500/15 text-blue-500 animate-pulse">
            <Clock className="size-3" /> กำลังประมวลผล
          </span>
        );
      case "Cancelled":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-[var(--pw-hairline)]/60 text-[var(--pw-ink)]/60">
            <Ban className="size-3" /> ยกเลิกแล้ว
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/15 text-amber-500">
            <Clock className="size-3" /> รอดำเนินการ
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[var(--pw-primary)]/10 text-[var(--pw-primary)]">
            <FileStack className="size-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--pw-ink)]">
              การดำเนินงานนำเข้าทั้งระบบ (System Import Operations)
            </h1>
            <p className="text-xs sm:text-sm text-[var(--pw-ink)]/70">
              ตรวจสอบงานนำเข้าสลิป/ใบแจ้งยอด ลองใหม่เมื่องานล้มเหลว (สูงสุด 5 ครั้ง) หรือยกเลิกงานที่ค้าง
            </p>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="p-4 rounded-xl border border-[var(--pw-hairline)] bg-[var(--pw-surface)] shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="size-4 text-[var(--pw-ink)]/50 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ค้นหาชื่อไฟล์ หรือผู้ใช้งาน..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-lg border border-[var(--pw-hairline)] bg-transparent text-[var(--pw-ink)] focus:outline-none focus:border-[var(--pw-primary)]"
            />
          </div>

          <div>
            <Select
              value={selectedStatus || "ALL"}
              onValueChange={(val) => {
                setSelectedStatus(val === "ALL" ? "" : val);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="ทุกสถานะ (All Statuses)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">ทุกสถานะ (All Statuses)</SelectItem>
                <SelectItem value="Pending">รอดำเนินการ (Pending)</SelectItem>
                <SelectItem value="Processing">กำลังประมวลผล (Processing)</SelectItem>
                <SelectItem value="Completed">สำเร็จ (Completed)</SelectItem>
                <SelectItem value="Failed">ล้มเหลว (Failed)</SelectItem>
                <SelectItem value="Cancelled">ยกเลิกแล้ว (Cancelled)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Select
              value={selectedJobType || "ALL"}
              onValueChange={(val) => {
                setSelectedJobType(val === "ALL" ? "" : val);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="ทุกประเภทงาน (All Types)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">ทุกประเภทงาน (All Types)</SelectItem>
                <SelectItem value="Slip">สลิปการโอนเงิน (Slip)</SelectItem>
                <SelectItem value="Statement">ใบแจ้งยอดบัตรเครดิต (Statement)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[var(--pw-hairline)] bg-[var(--pw-surface)] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-[var(--pw-hairline)] bg-[var(--pw-hairline)]/10 text-[var(--pw-ink)]/70 font-semibold">
                <th className="py-3 px-4">รหัส / ไฟล์</th>
                <th className="py-3 px-4">ผู้ส่งนำเข้า</th>
                <th className="py-3 px-4">ประเภท</th>
                <th className="py-3 px-4">สถานะ</th>
                <th className="py-3 px-4">จำนวนรายการ</th>
                <th className="py-3 px-4">ลองใหม่</th>
                <th className="py-3 px-4">เวลาสร้าง</th>
                <th className="py-3 px-4 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--pw-hairline)]">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[var(--pw-ink)]/60">
                    กำลังโหลดงานนำเข้า...
                  </td>
                </tr>
              ) : importsData?.items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[var(--pw-ink)]/60">
                    ไม่พบงานนำเข้าตามเงื่อนไขที่เลือก
                  </td>
                </tr>
              ) : (
                importsData?.items.map((job) => (
                  <tr key={job.importJobId} className="hover:bg-[var(--pw-hairline)]/10 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[var(--pw-ink)] flex items-center gap-1.5">
                        <FileText className="size-3.5 text-[var(--pw-primary)] shrink-0" />
                        <span className="truncate max-w-[180px]">{job.fileName || "ไม่มีชื่อไฟล์"}</span>
                      </div>
                      <div className="text-[11px] text-[var(--pw-ink)]/50">ID: #{job.importJobId}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-[var(--pw-ink)] font-medium">{job.userDisplayName || "-"}</div>
                      <div className="text-[11px] text-[var(--pw-ink)]/60">{job.userEmail || "-"}</div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-xs">
                      {job.jobType}
                    </td>
                    <td className="py-3.5 px-4">
                      {renderStatusBadge(job.status)}
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      <div>ทั้งหมด: {job.totalRecords}</div>
                      <div className="text-[11px] text-[var(--pw-income)]">สำเร็จ: {job.successRecords}</div>
                      {job.failedRecords > 0 && (
                        <div className="text-[11px] text-[var(--pw-expense)]">ล้มเหลว: {job.failedRecords}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      <span className={cn(
                        "font-semibold",
                        job.retryCount >= 5 ? "text-[var(--pw-expense)]" : "text-[var(--pw-ink)]/80"
                      )}>
                        {job.retryCount} / 5
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[var(--pw-ink)]/70">
                      {formatDisplayDateTime(job.createdAt)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {job.errorMessage && (
                          <button
                            onClick={() => setErrorDetailsJob(job)}
                            className="px-2 py-1 text-xs rounded border border-amber-500/40 text-amber-500 hover:bg-amber-500/10 transition-colors"
                            title="ดูข้อความข้อผิดพลาด"
                          >
                            ดู Error
                          </button>
                        )}
                        {job.status === "Failed" && (
                          <button
                            onClick={() => handleRetry(job)}
                            disabled={job.retryCount >= 5 || retryMutation.isPending}
                            className="px-2.5 py-1 text-xs rounded border border-[var(--pw-primary)]/40 bg-[var(--pw-primary)]/10 text-[var(--pw-primary)] hover:bg-[var(--pw-primary)]/20 transition-colors font-medium flex items-center gap-1 disabled:opacity-40"
                          >
                            <RotateCcw className="size-3" /> ลองใหม่
                          </button>
                        )}
                        {(job.status === "Pending" || job.status === "Processing" || job.status === "NeedsReview") && (
                          <button
                            onClick={() => handleCancel(job)}
                            disabled={cancelMutation.isPending}
                            className="px-2.5 py-1 text-xs rounded border border-[var(--pw-expense)]/40 bg-[var(--pw-expense)]/10 text-[var(--pw-expense)] hover:bg-[var(--pw-expense)]/20 transition-colors font-medium flex items-center gap-1"
                          >
                            <Ban className="size-3" /> ยกเลิก
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
        {importsData && importsData.totalPages > 1 && (
          <div className="p-4 border-t border-[var(--pw-hairline)] flex items-center justify-between text-xs text-[var(--pw-ink)]/70">
            <span>
              หน้า {importsData.page} จาก {importsData.totalPages} (ทั้งหมด {importsData.totalItems} รายการ)
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
                onClick={() => setPage((p) => Math.min(importsData.totalPages, p + 1))}
                disabled={page >= importsData.totalPages}
                className="px-2.5 py-1 rounded border border-[var(--pw-hairline)] bg-[var(--pw-surface)] disabled:opacity-40"
              >
                ถัดไป
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Error Details Bottom Sheet */}
      <BottomSheet
        open={Boolean(errorDetailsJob)}
        onOpenChange={(open) => !open && setErrorDetailsJob(null)}
        title={
          <div className="flex items-center gap-2 text-[var(--pw-expense)]">
            <AlertCircle className="size-5" />
            <span>รายละเอียดข้อผิดพลาดของงาน #{errorDetailsJob?.importJobId}</span>
          </div>
        }
        description={errorDetailsJob ? `${errorDetailsJob.fileName} (${errorDetailsJob.userDisplayName})` : undefined}
        className="sm:max-w-lg"
      >
        {errorDetailsJob && (
          <div className="space-y-4 py-2">
            <div className="text-xs text-[var(--pw-ink)]/75 space-y-1">
              <div><strong>ไฟล์:</strong> {errorDetailsJob.fileName}</div>
              <div><strong>ผู้ใช้:</strong> {errorDetailsJob.userDisplayName} ({errorDetailsJob.userEmail})</div>
              <div><strong>จำนวนลองใหม่แล้ว:</strong> {errorDetailsJob.retryCount} / 5 ครั้ง</div>
            </div>

            <div className="p-3.5 rounded-xl border border-[var(--pw-expense)]/30 bg-[var(--pw-expense)]/10 text-xs font-mono text-[var(--pw-ink)]/90 max-h-60 overflow-y-auto whitespace-pre-wrap">
              {errorDetailsJob.errorMessage}
            </div>

            {/* BottomSheet Button Hierarchy: Confirm on TOP, Cancel on BOTTOM */}
            <BottomSheetFooter>
              {errorDetailsJob.status === "Failed" && errorDetailsJob.retryCount < 5 && (
                <Button
                  onClick={() => {
                    const job = errorDetailsJob;
                    setErrorDetailsJob(null);
                    handleRetry(job);
                  }}
                  className="w-full"
                >
                  <RotateCcw className="size-4 mr-1.5" />
                  ลองใหม่อีกครั้ง ({errorDetailsJob.retryCount + 1}/5)
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setErrorDetailsJob(null)}
                className="w-full"
              >
                ปิด
              </Button>
            </BottomSheetFooter>
          </div>
        )}
      </BottomSheet>

      {/* Confirmation AlertDialog */}
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
    </div>
  );
}
