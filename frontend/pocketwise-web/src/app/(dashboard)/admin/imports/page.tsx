"use client";

import { useState } from "react";

import {
  FileStack,
  Search,

  ShieldAlert,
  RotateCcw,
  SlidersHorizontal,
  LoaderCircle,
  Ban,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  X,
  FileText,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
} from "lucide-react";
import { triggerHaptic } from "@/lib/haptic";
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
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { TableSkeleton, ListRowsSkeleton } from "@/components/shared/Skeletons";
import { PageHeader } from "@/components/shared/PageHeader";
import { AnimatedList, AnimatedListItem } from "@/components/ui/animated-list";
import type { AdminImportJob } from "@/types/admin-operations.types";

export default function AdminImportsPage() {
  const { data: user, isLoading: isUserLoading } = useCurrentUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedJobType, setSelectedJobType] = useState("");
  const [page, setPage] = useState(1);
  const [errorDetailsJob, setErrorDetailsJob] = useState<AdminImportJob | null>(null);
  const [selectedJob, setSelectedJob] = useState<AdminImportJob | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isErrorExpanded, setIsErrorExpanded] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);

  const activeFilterCount = (selectedStatus ? 1 : 0) + (selectedJobType ? 1 : 0);

  const resetFilters = () => {
    setSelectedStatus("");
    setSelectedJobType("");
    setPage(1);
  };

  const filters = {
    q: searchQuery || undefined,
    status: selectedStatus || undefined,
    jobType: selectedJobType || undefined,
    page,
    pageSize: 15,
  };

  const { data: importsData, isLoading } = useAdminImportsQuery(filters);
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
          ปฏิเสธการเข้าถึง
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
        } catch (err: unknown) {
          toast.error((err as Error)?.message || "เกิดข้อผิดพลาดในการลองใหม่");
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
        } catch (err: unknown) {
          toast.error((err as Error)?.message || "เกิดข้อผิดพลาดในการยกเลิก");
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

      {/* Page Header */}
      <PageHeader
        title="การดำเนินงานนำเข้าทั้งระบบ"
        icon={FileStack}
        description="ตรวจสอบงานนำเข้าสลิป/ใบแจ้งยอด ลองใหม่เมื่องานล้มเหลว (สูงสุด 5 ครั้ง) หรือยกเลิกงานที่ค้าง"
      />

      {/* Search & Filters */}
      <div className="p-3 sm:p-4 rounded-xl border border-[var(--pw-hairline)] bg-[var(--pw-surface)] shadow-xs space-y-3">
        {/* Desktop Grid Filters (sm:) */}
        <div className="hidden sm:grid sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="size-4 text-[var(--pw-ink)]/50 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
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
                <SelectValue placeholder="ทุกสถานะ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">ทุกสถานะ</SelectItem>
                <SelectItem value="Pending">รอดำเนินการ</SelectItem>
                <SelectItem value="Processing">กำลังประมวลผล</SelectItem>
                <SelectItem value="Completed">สำเร็จ</SelectItem>
                <SelectItem value="Failed">ล้มเหลว</SelectItem>
                <SelectItem value="Cancelled">ยกเลิกแล้ว</SelectItem>
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
                <SelectValue placeholder="ทุกประเภทงาน" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">ทุกประเภทงาน</SelectItem>
                <SelectItem value="Slip">สลิปการโอนเงิน</SelectItem>
                <SelectItem value="Statement">ใบแจ้งยอดบัตรเครดิต</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Mobile Filter Bar (< sm) */}
        <div className="sm:hidden space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="size-4 text-[var(--pw-ink)]/50 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="ค้นหาชื่อไฟล์ หรือผู้ใช้งาน..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-3 min-h-[44px] text-xs rounded-lg border border-[var(--pw-hairline)] bg-transparent text-[var(--pw-ink)] focus:outline-none focus:border-[var(--pw-primary)]"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setShowFilterSheet(true);
              }}
              className={cn(
                "min-h-[44px] px-3.5 py-2 text-xs rounded-lg border flex items-center gap-1.5 font-medium shrink-0 transition-all active:scale-95",
                activeFilterCount > 0
                  ? "border-[var(--pw-primary)] bg-[var(--pw-primary)]/15 text-[var(--pw-primary)] font-semibold shadow-xs"
                  : "border-[var(--pw-hairline)] bg-[var(--pw-surface)] text-[var(--pw-ink)] hover:bg-[var(--pw-hairline)]/30"
              )}
              aria-label="เปิดตัวกรองงานนำเข้า"
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

          {/* Quick 1-Tap Status Pills on Mobile */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5 overscroll-contain">
            {[
              { key: "", label: "ทั้งหมด" },
              { key: "Failed", label: "ล้มเหลว" },
              { key: "Processing", label: "กำลังทำงาน" },
              { key: "Completed", label: "สำเร็จ" },
            ].map((pill) => {
              const isSelected = selectedStatus === pill.key;
              return (
                <button
                  key={pill.key}
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setSelectedStatus(pill.key);
                    setPage(1);
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 border transition-all active:scale-95 cursor-pointer shadow-2xs min-h-[34px]",
                    isSelected
                      ? "bg-[var(--pw-primary)] text-white border-[var(--pw-primary)] shadow-xs"
                      : "bg-[var(--pw-surface)]/80 text-[var(--pw-ink)]/75 border-[var(--pw-hairline)] hover:bg-[var(--pw-surface-indigo)]/50"
                  )}
                >
                  <span>{pill.label}</span>
                </button>
              );
            })}
          </div>

          {/* Active Filter Chips */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs text-[var(--pw-ink)]/75">
              <span className="font-medium text-[var(--pw-ink)]/60">ตัวกรอง:</span>
              {selectedStatus && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--pw-surface-indigo)] border border-[var(--pw-hairline)] px-2.5 py-0.5 text-[11px]">
                  สถานะ: {selectedStatus}
                  <button onClick={() => { setSelectedStatus(""); setPage(1); }} className="hover:text-[var(--pw-expense)]">
                    <X className="size-3" />
                  </button>
                </span>
              )}
              {selectedJobType && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--pw-surface-indigo)] border border-[var(--pw-hairline)] px-2.5 py-0.5 text-[11px]">
                  ประเภท: {selectedJobType}
                  <button onClick={() => { setSelectedJobType(""); setPage(1); }} className="hover:text-[var(--pw-expense)]">
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
      </div>

      {/* Loading Skeleton */}
      {isLoading ? (
        <>
          <div className="hidden md:block">
            <TableSkeleton rows={8} columns={8} />
          </div>
          <div className="md:hidden">
            <ListRowsSkeleton count={5} />
          </div>
        </>
      ) : importsData?.items.length === 0 ? (
        <div className="rounded-2xl border border-[var(--pw-hairline)] bg-[var(--pw-surface)] p-12 text-center text-[var(--pw-ink)]/60">
          <FileStack className="mx-auto mb-3 size-10 opacity-30 text-[var(--pw-primary)]" />
          <p className="text-base font-semibold text-[var(--pw-ink)]">ไม่พบงานนำเข้าตามเงื่อนไขที่เลือก</p>
          <p className="mt-1 text-xs text-[var(--pw-ink)]/60">
            ลองปรับเปลี่ยนคำค้นหา หรือตัวกรองสถานะและประเภทงานด้านบน
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block rounded-xl border border-[var(--pw-hairline)] bg-[var(--pw-surface)] shadow-sm overflow-hidden">
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
                  {importsData?.items.map((job) => (
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
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setErrorDetailsJob(job)}
                              className="h-7 px-2.5 text-xs font-medium border border-amber-500/50 bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25 active:scale-95 transition-all shadow-xs"
                              title="ดูข้อความข้อผิดพลาด"
                            >
                              ดู Error
                            </Button>
                          )}
                          {job.status === "Failed" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRetry(job)}
                              disabled={job.retryCount >= 5 || retryMutation.isPending}
                              className="h-7 px-2.5 text-xs font-semibold border border-[var(--pw-primary)]/50 bg-[var(--pw-primary)]/15 text-[var(--pw-primary)] hover:bg-[var(--pw-primary)]/25 active:scale-95 transition-all shadow-xs"
                            >
                              <RotateCcw className="size-3 mr-1" /> ลองใหม่
                            </Button>
                          )}
                          {(job.status === "Pending" || job.status === "Processing" || job.status === "NeedsReview") && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCancel(job)}
                              disabled={cancelMutation.isPending}
                              className="h-7 px-2.5 text-xs font-semibold border border-[var(--pw-expense)]/50 bg-[var(--pw-expense)]/15 text-[var(--pw-expense)] hover:bg-[var(--pw-expense)]/25 active:scale-95 transition-all shadow-xs"
                            >
                              <Ban className="size-3 mr-1" /> ยกเลิก
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card List View (< md) - Compact Native Rows with Progressive Disclosure */}
          <AnimatedList className="space-y-2.5 md:hidden">
            {importsData?.items.map((job) => {
              const isFailed = job.status === "Failed";
              const isProcessing = job.status === "Processing" || job.status === "Pending";

              return (
                <AnimatedListItem key={job.importJobId}>
                  <div
                    onClick={() => {
                      triggerHaptic("light");
                      setSelectedJob(job);
                      setIsErrorExpanded(false);
                    }}
                    className={cn(
                      "group rounded-2xl border bg-[var(--pw-surface)] p-3.5 shadow-xs transition-all active:scale-[0.98] select-none touch-pan-y cursor-pointer",
                      isFailed
                        ? "border-rose-500/30 hover:border-rose-500/50 bg-rose-500/[0.02]"
                        : "border-[var(--pw-hairline)] hover:border-[var(--pw-primary)]/40"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2.5">
                      {/* Left: Icon & Title */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                          className={cn(
                            "size-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs",
                            isFailed
                              ? "bg-rose-500/15 text-rose-500 border border-rose-500/20"
                              : isProcessing
                              ? "bg-blue-500/15 text-blue-500 border border-blue-500/20"
                              : "bg-emerald-500/15 text-emerald-500 border border-emerald-500/20"
                          )}
                        >
                          <FileText className="size-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-xs sm:text-sm text-[var(--pw-ink)] truncate">
                              {job.fileName || "ไม่มีชื่อไฟล์"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[var(--pw-ink)]/55 truncate">
                            <span className="font-mono text-[10px]">#{job.importJobId}</span>
                            <span>•</span>
                            <span className="font-medium text-[var(--pw-primary)]">{job.jobType}</span>
                            <span>•</span>
                            <span className="truncate">{job.userDisplayName || "ระบบ"}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Status badge & Count & Chevron */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <div className="flex justify-end">{renderStatusBadge(job.status)}</div>
                          <span className="text-[10px] text-[var(--pw-ink)]/50 block mt-0.5">
                            {job.successRecords}/{job.totalRecords} รายการ
                          </span>
                        </div>
                        <div className="flex size-7 items-center justify-center rounded-full bg-[var(--pw-hairline)]/20 text-[var(--pw-ink)]/40 group-hover:text-[var(--pw-primary)] group-hover:translate-x-0.5 transition-all">
                          <ChevronRight className="size-4" />
                        </div>
                      </div>
                    </div>
                  </div>
                </AnimatedListItem>
              );
            })}
          </AnimatedList>

          {/* Pagination */}
          {importsData && importsData.totalPages > 1 && (
            <div className="p-4 rounded-xl border border-[var(--pw-hairline)] bg-[var(--pw-surface)] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--pw-ink)]/70">
              <span>
                หน้า {importsData.page} จาก {importsData.totalPages} (ทั้งหมด {importsData.totalItems} รายการ)
              </span>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="flex-1 sm:flex-none min-h-[44px] sm:min-h-0 sm:h-8 text-xs"
                >
                  ก่อนหน้า
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(importsData.totalPages, p + 1))}
                  disabled={page >= importsData.totalPages}
                  className="flex-1 sm:flex-none min-h-[44px] sm:min-h-0 sm:h-8 text-xs"
                >
                  ถัดไป
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Comprehensive Import Job Inspection BottomSheet (Mobile Detail Sheet) */}
      <BottomSheet
        open={Boolean(selectedJob)}
        onOpenChange={(open) => !open && setSelectedJob(null)}
        title={
          selectedJob ? (
            <div className="flex items-center gap-2 truncate">
              <span className="truncate">{selectedJob.fileName || "รายละเอียดงานนำเข้า"}</span>
              {renderStatusBadge(selectedJob.status)}
            </div>
          ) : undefined
        }
        description={
          selectedJob
            ? `รหัสงาน: #${selectedJob.importJobId} • ประเภท: ${selectedJob.jobType} • ${formatDisplayDateTime(selectedJob.createdAt)}`
            : undefined
        }
        className="sm:max-w-xl"
        footer={
          selectedJob ? (
            <div className="flex flex-col gap-2.5 w-full">
              {selectedJob.status === "Failed" && (
                <Button
                  type="button"
                  onClick={() => {
                    triggerHaptic("medium");
                    handleRetry(selectedJob);
                    setSelectedJob(null);
                  }}
                  disabled={selectedJob.retryCount >= 5 || retryMutation.isPending}
                  className="w-full min-h-[48px] bg-[var(--pw-primary)] hover:bg-[var(--pw-primary)]/90 text-white font-bold shadow-md active:scale-98 cursor-pointer rounded-xl"
                >
                  <RotateCcw className="size-4 mr-1.5" />
                  <span>ลองประมวลผลใหม่อีกครั้ง ({selectedJob.retryCount + 1}/5)</span>
                </Button>
              )}
              {(selectedJob.status === "Pending" || selectedJob.status === "Processing" || selectedJob.status === "NeedsReview") && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    triggerHaptic("medium");
                    handleCancel(selectedJob);
                    setSelectedJob(null);
                  }}
                  disabled={cancelMutation.isPending}
                  className="w-full min-h-[48px] font-bold active:scale-98 cursor-pointer rounded-xl"
                >
                  <Ban className="size-4 mr-1.5" />
                  <span>ยกเลิกงานนำเข้านี้</span>
                </Button>
              )}
              <button
                type="button"
                onClick={() => setSelectedJob(null)}
                className="w-full min-h-[48px] px-4 py-2.5 rounded-xl border border-[var(--pw-hairline)] bg-[var(--pw-surface-onyx)] hover:bg-[var(--pw-hairline)]/30 text-[var(--pw-ink)] font-semibold text-sm active:scale-[0.98] transition-all shadow-sm flex items-center justify-center cursor-pointer"
              >
                ปิด
              </button>
            </div>
          ) : undefined
        }
      >
        {selectedJob && (
          <div className="space-y-4 py-2">
            {/* User & Meta info */}
            <div className="p-3.5 rounded-xl border border-[var(--pw-hairline)] bg-[var(--pw-surface)]/70 text-xs space-y-2">
              <div className="flex justify-between items-center text-[11px] text-[var(--pw-ink)]/60">
                <span>ผู้ส่งนำเข้า:</span>
                <span className="font-semibold text-[var(--pw-ink)]">
                  {selectedJob.userDisplayName || "-"} ({selectedJob.userEmail || "-"})
                </span>
              </div>
              <div className="flex justify-between items-center text-[11px] text-[var(--pw-ink)]/60">
                <span>สร้างเมื่อ:</span>
                <span className="text-[var(--pw-ink)]">{formatDisplayDateTime(selectedJob.createdAt)}</span>
              </div>
              <div className="flex justify-between items-center text-[11px] text-[var(--pw-ink)]/60">
                <span>จำนวนครั้งที่ลองใหม่ (Retry):</span>
                <span className={cn("font-bold", selectedJob.retryCount >= 5 ? "text-[var(--pw-expense)]" : "text-[var(--pw-ink)]")}>
                  {selectedJob.retryCount} / 5 ครั้ง
                </span>
              </div>
            </div>

            {/* Records Progress Summary */}
            <div className="p-3.5 rounded-xl border border-[var(--pw-hairline)] bg-[var(--pw-canvas)]/60 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-[var(--pw-ink)]">ความคืบหน้าการนำเข้า</span>
                <span className="font-mono text-xs font-bold text-[var(--pw-primary)]">
                  {selectedJob.totalRecords > 0
                    ? `${Math.round((selectedJob.successRecords / selectedJob.totalRecords) * 100)}%`
                    : "0%"}
                </span>
              </div>
              {/* Progress bar */}
              <div className="w-full h-2 rounded-full bg-[var(--pw-hairline)] overflow-hidden flex">
                <div
                  className="bg-[var(--pw-income)] h-full transition-all"
                  style={{
                    width: `${selectedJob.totalRecords > 0 ? (selectedJob.successRecords / selectedJob.totalRecords) * 100 : 0}%`,
                  }}
                />
                <div
                  className="bg-[var(--pw-expense)] h-full transition-all"
                  style={{
                    width: `${selectedJob.totalRecords > 0 ? (selectedJob.failedRecords / selectedJob.totalRecords) * 100 : 0}%`,
                  }}
                />
              </div>
              <div className="grid grid-cols-3 gap-2 text-center pt-1 text-xs">
                <div>
                  <span className="text-[10px] text-[var(--pw-ink)]/50 block">ทั้งหมด</span>
                  <span className="font-bold text-[var(--pw-ink)]">{selectedJob.totalRecords}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--pw-income)] block">สำเร็จ</span>
                  <span className="font-bold text-[var(--pw-income)]">{selectedJob.successRecords}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--pw-expense)] block">ล้มเหลว</span>
                  <span className="font-bold text-[var(--pw-expense)]">{selectedJob.failedRecords}</span>
                </div>
              </div>
            </div>

            {/* Error Message callout with Progressive Disclosure */}
            {selectedJob.errorMessage && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setIsErrorExpanded(!isErrorExpanded)}
                    className="text-xs font-semibold text-[var(--pw-expense)] flex items-center gap-1.5 cursor-pointer hover:underline"
                  >
                    <AlertCircle className="size-4" />
                    <span>ข้อความข้อผิดพลาด (Error Trace)</span>
                    {isErrorExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!selectedJob.errorMessage) return;
                      await navigator.clipboard.writeText(selectedJob.errorMessage);
                      setIsCopied(true);
                      toast.success("คัดลอกข้อความ Error แล้ว");
                      setTimeout(() => setIsCopied(false), 2000);
                    }}
                    className="min-h-[36px] px-2.5 py-1 text-xs font-medium rounded-lg border border-[var(--pw-hairline)] bg-[var(--pw-surface)] text-[var(--pw-ink)] hover:bg-[var(--pw-hairline)]/30 active:scale-95 transition-all flex items-center gap-1.5"
                  >
                    {isCopied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                    <span>{isCopied ? "คัดลอกแล้ว" : "คัดลอก"}</span>
                  </button>
                </div>
                <pre className={cn(
                  "p-3 rounded-xl border border-[var(--pw-expense)]/30 bg-[var(--pw-expense)]/10 text-xs font-mono text-[var(--pw-ink)]/90 whitespace-pre-wrap break-all leading-relaxed overscroll-contain transition-all",
                  isErrorExpanded ? "max-h-64 overflow-y-auto" : "max-h-20 overflow-hidden line-clamp-3"
                )}>
                  {selectedJob.errorMessage}
                </pre>
              </div>
            )}
          </div>
        )}
      </BottomSheet>

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
        footer={
          errorDetailsJob ? (
            <div className="flex flex-col gap-2.5 w-full">
              {errorDetailsJob.status === "Failed" && errorDetailsJob.retryCount < 5 && (
                <Button
                  onClick={() => {
                    const job = errorDetailsJob;
                    setErrorDetailsJob(null);
                    triggerHaptic("medium");
                    handleRetry(job);
                  }}
                  className="w-full min-h-[48px] bg-[var(--pw-primary)] hover:bg-[var(--pw-primary)]/90 text-white font-bold shadow-md rounded-xl active:scale-98 cursor-pointer"
                >
                  <RotateCcw className="size-4 mr-1.5" />
                  ลองใหม่อีกครั้ง ({errorDetailsJob.retryCount + 1}/5)
                </Button>
              )}
              <button
                type="button"
                onClick={() => setErrorDetailsJob(null)}
                className="w-full min-h-[48px] px-4 py-2.5 rounded-xl border border-[var(--pw-hairline)] bg-[var(--pw-surface-onyx)] hover:bg-[var(--pw-hairline)]/30 text-[var(--pw-ink)] font-semibold text-sm active:scale-[0.98] transition-all shadow-sm flex items-center justify-center cursor-pointer"
              >
                ปิด
              </button>
            </div>
          ) : undefined
        }
      >
        {errorDetailsJob && (
          <div className="space-y-4 py-2">
            <div className="text-xs text-[var(--pw-ink)]/75 space-y-1">
              <div><strong>ไฟล์:</strong> {errorDetailsJob.fileName}</div>
              <div><strong>ผู้ใช้:</strong> {errorDetailsJob.userDisplayName} ({errorDetailsJob.userEmail})</div>
              <div><strong>จำนวนลองใหม่แล้ว:</strong> {errorDetailsJob.retryCount} / 5 ครั้ง</div>
            </div>

            <div className="p-3.5 rounded-xl border border-[var(--pw-expense)]/30 bg-[var(--pw-expense)]/10 text-xs font-mono text-[var(--pw-ink)]/90 max-h-60 overflow-y-auto whitespace-pre-wrap leading-relaxed overscroll-contain">
              {errorDetailsJob.errorMessage}
            </div>
          </div>
        )}
      </BottomSheet>

      {/* Mobile Filter BottomSheet */}
      <BottomSheet
        open={showFilterSheet}
        onOpenChange={setShowFilterSheet}
        title="ตัวกรองงานนำเข้า"
        description="เลือกสถานะและประเภทงานเพื่อคัดกรองข้อมูล"
        className="sm:max-w-md"
        footer={
          <div className="flex flex-col gap-2.5 w-full">
            <Button
              type="button"
              className="w-full min-h-[44px] bg-[var(--pw-primary)] hover:bg-[var(--pw-primary-hover)] text-white font-bold shadow-md active:scale-[0.98] transition-all cursor-pointer"
              onClick={() => {
                triggerHaptic("light");
                setShowFilterSheet(false);
              }}
            >
              ใช้งานตัวกรอง {activeFilterCount > 0 ? `(${activeFilterCount})` : ""}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full min-h-[44px] border-[var(--pw-hairline)] bg-[var(--pw-surface-indigo)]/70 hover:bg-[var(--pw-surface-onyx)] text-[var(--pw-ink)] order-2 shadow-2xs active:scale-[0.98] transition-all cursor-pointer"
              onClick={() => {
                triggerHaptic("medium");
                resetFilters();
                setShowFilterSheet(false);
              }}
            >
              <RotateCcw className="size-3.5 mr-1" />
              ล้างตัวกรอง
            </Button>
          </div>
        }
      >
        <div className="space-y-4 py-2">
          <div>
            <label className="text-xs font-semibold text-[var(--pw-ink)] block mb-1.5">
              สถานะ
            </label>
            <Select
              value={selectedStatus || "ALL"}
              onValueChange={(val) => {
                setSelectedStatus(val === "ALL" ? "" : val);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="ทุกสถานะ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">ทุกสถานะ</SelectItem>
                <SelectItem value="Pending">รอดำเนินการ</SelectItem>
                <SelectItem value="Processing">กำลังประมวลผล</SelectItem>
                <SelectItem value="Completed">สำเร็จ</SelectItem>
                <SelectItem value="Failed">ล้มเหลว</SelectItem>
                <SelectItem value="Cancelled">ยกเลิกแล้ว</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-semibold text-[var(--pw-ink)] block mb-1.5">
              ประเภทงาน
            </label>
            <Select
              value={selectedJobType || "ALL"}
              onValueChange={(val) => {
                setSelectedJobType(val === "ALL" ? "" : val);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="ทุกประเภทงาน" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">ทุกประเภทงาน</SelectItem>
                <SelectItem value="Slip">สลิปการโอนเงิน</SelectItem>
                <SelectItem value="Statement">ใบแจ้งยอดบัตรเครดิต</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </BottomSheet>

      {/* Confirmation AlertDialog with Loading State */}
      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) => {
          if (!retryMutation.isPending && !cancelMutation.isPending) {
            setConfirmDialog((prev) => ({ ...prev, open }));
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDialog.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              disabled={retryMutation.isPending || cancelMutation.isPending}
              className={confirmDialog.destructive ? "bg-[var(--pw-expense)] hover:bg-[var(--pw-expense)]/90 text-white" : undefined}
              onClick={async (e) => {
                e.preventDefault();
                await confirmDialog.onConfirm();
                setConfirmDialog((prev) => ({ ...prev, open: false }));
              }}
            >
              {(retryMutation.isPending || cancelMutation.isPending) && (
                <LoaderCircle className="size-4 animate-spin mr-1.5" />
              )}
              {confirmDialog.confirmLabel || "ยืนยัน"}
            </AlertDialogAction>
            <AlertDialogCancel
              disabled={retryMutation.isPending || cancelMutation.isPending}
              onClick={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
            >
              ยกเลิก
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
