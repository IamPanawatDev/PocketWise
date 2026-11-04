"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  FileText,
  Receipt,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
  Eye,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedList, AnimatedListItem } from "@/components/ui/animated-list";
import { BottomSheet, BottomSheetFooter } from "@/components/ui/bottom-sheet";
import { FormField } from "@/components/ui/form-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDisplayDateTime } from "@/lib/date-utils";
import { useImportJobs } from "@/features/imports/hooks/useImports";
import type { ImportJobResponse } from "@/types/import.types";
import { ReviewImportModal } from "./ReviewImportModal";

export function ImportJobsTab() {
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [reviewingJob, setReviewingJob] = useState<ImportJobResponse | null>(null);

  const queryType = typeFilter === "all" ? undefined : typeFilter;
  const { data, isLoading } = useImportJobs(page, 15, queryType);

  const jobs = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;

  const activeFilterCount = typeFilter !== "all" ? 1 : 0;

  const handleResetFilter = () => {
    setTypeFilter("all");
    setPage(1);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Filter header */}
      <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-[var(--pw-ink)]">
            ประวัติการนำเข้าข้อมูล
          </h3>
          <p className="text-xs text-[var(--pw-ink)]/65">
            ติดตามสถานะของงานนำเข้าสลิปและใบแจ้งยอดบัตรเครดิตทั้งหมด
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsFilterSheetOpen(true)}
          className={cn(
            "relative gap-2 cursor-pointer transition-all h-9 text-xs sm:text-sm",
            activeFilterCount > 0
              ? "border-[var(--pw-primary)] bg-[var(--pw-primary)]/15 text-[var(--pw-primary)] hover:bg-[var(--pw-primary)]/25 font-semibold"
              : "border-[var(--pw-hairline)] bg-[var(--pw-surface)] hover:bg-[var(--pw-hairline)]/30 text-[var(--pw-ink)]",
          )}
        >
          <Filter className="h-4 w-4" />
          <span>ตัวกรอง</span>
          {activeFilterCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--pw-primary)] px-1.5 text-[11px] font-bold text-white shadow-xs">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </div>

      {/* Active filter chips */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-[var(--pw-ink)]/75">
          <span className="text-[var(--pw-ink)]/50">ตัวกรองที่ใช้งาน:</span>
          {typeFilter !== "all" && (
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--pw-link)]/30 bg-[var(--pw-link)]/10 px-2.5 py-1 text-xs font-medium text-[var(--pw-link)]">
              ประเภท: {typeFilter === "slip" ? "สลิปโอนเงิน" : "ใบแจ้งยอดบัตรเครดิต"}
              <button
                type="button"
                onClick={handleResetFilter}
                className="ml-0.5 rounded-full p-0.5 hover:bg-[var(--pw-link)]/20 cursor-pointer"
                aria-label="ลบตัวกรองประเภทงาน"
              >
                <X className="size-3" />
              </button>
            </span>
          )}
          <button
            type="button"
            onClick={handleResetFilter}
            className="text-xs text-[var(--pw-link)] underline hover:text-[var(--pw-link)]/80 ml-1 cursor-pointer"
          >
            ล้างตัวกรอง
          </button>
        </div>
      )}

      {/* Desktop Table View (hidden on mobile) */}
      <Card className="hidden md:block p-0 bg-[var(--pw-surface)] border border-[var(--pw-hairline)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[var(--pw-hairline)] bg-[var(--pw-surface-indigo)]/30 text-[var(--pw-ink)]/60 font-semibold">
                <th className="py-3 px-4">วันที่ทำรายการ</th>
                <th className="py-3 px-4">ประเภทงาน</th>
                <th className="py-3 px-4">ชื่อไฟล์</th>
                <th className="py-3 px-4 text-center">รายการทั้งหมด</th>
                <th className="py-3 px-4 text-center">รายการนำเข้า</th>
                <th className="py-3 px-4 text-center">รายการซ้ำ</th>
                <th className="py-3 px-4 text-center">สถานะ</th>
                <th className="py-3 px-4 text-center">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--pw-hairline)]">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-[var(--pw-hairline)]">
                    <td className="py-3 px-4"><Skeleton className="h-4 w-24" /></td>
                    <td className="py-3 px-4"><Skeleton className="h-5 w-20 rounded-full" /></td>
                    <td className="py-3 px-4"><Skeleton className="h-4 w-32" /></td>
                    <td className="py-3 px-4 text-center"><Skeleton className="h-4 w-8 mx-auto" /></td>
                    <td className="py-3 px-4 text-center"><Skeleton className="h-4 w-8 mx-auto" /></td>
                    <td className="py-3 px-4 text-center"><Skeleton className="h-4 w-8 mx-auto" /></td>
                    <td className="py-3 px-4 text-center"><Skeleton className="h-5 w-16 mx-auto rounded-full" /></td>
                    <td className="py-3 px-4 text-center"><Skeleton className="h-8 w-16 mx-auto rounded-md" /></td>
                  </tr>
                ))
              ) : jobs.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="py-12 text-center text-[var(--pw-ink)]/60"
                  >
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-40 text-[var(--pw-primary)]" />
                    <p>ยังไม่มีประวัติการนำเข้าข้อมูล</p>
                  </td>
                </tr>
              ) : (
                jobs.map((job) => {
                  const isSlip = job.importType.toLowerCase() === "slip";
                  const statusLower = job.status.toLowerCase();

                  return (
                    <tr
                      key={job.importJobId}
                      className="hover:bg-white/[0.03] transition-colors"
                    >
                      <td className="py-3 px-4 font-medium text-[var(--pw-ink)] whitespace-nowrap">
                        {formatDisplayDateTime(job.createdAt)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-medium text-[10px] bg-[var(--pw-surface-indigo)]/50 text-[var(--pw-ink)] border border-[var(--pw-hairline)]">
                          {isSlip ? (
                            <Receipt className="h-3 w-3 text-[var(--pw-primary)]" />
                          ) : (
                            <CreditCard className="h-3 w-3 text-[var(--pw-primary)]" />
                          )}
                          {isSlip ? "สลิปโอนเงิน" : "ใบแจ้งยอด"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[var(--pw-ink)] max-w-[200px] truncate">
                        {job.fileName}
                      </td>
                      <td className="py-3 px-4 text-center text-[var(--pw-ink)] font-medium">
                        {job.totalRecords}
                      </td>
                      <td className="py-3 px-4 text-center text-[var(--pw-green)] font-medium">
                        {job.importedRecords}
                      </td>
                      <td className="py-3 px-4 text-center text-amber-400 font-medium">
                        {job.duplicateRecords}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {statusLower === "completed" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-[var(--pw-green)]/15 text-[var(--pw-green)] border border-[var(--pw-green)]/20">
                            <CheckCircle2 className="h-3 w-3" />
                            เสร็จสมบูรณ์
                          </span>
                        ) : statusLower === "needsreview" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/15 text-amber-400 border border-amber-500/20">
                            <Clock className="h-3 w-3" />
                            รอตรวจสอบ
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-[var(--pw-expense)]/15 text-[var(--pw-expense)] border border-[var(--pw-expense)]/20">
                            <AlertCircle className="h-3 w-3" />
                            {job.errorMessage ? "พบข้อผิดพลาด" : "ล้มเหลว"}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {statusLower === "needsreview" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 px-2.5 text-xs border-[var(--pw-primary)] text-[var(--pw-primary)] hover:bg-[var(--pw-primary)]/10 cursor-pointer"
                            onClick={() => setReviewingJob(job)}
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            ตรวจสอบ
                          </Button>
                        ) : (
                          <span className="text-[var(--pw-ink)]/40">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Mobile Card List View (visible on mobile only) */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-4 space-y-3 border-[var(--pw-hairline)] bg-[var(--pw-surface)]/80">
              <div className="flex justify-between items-center">
                <Skeleton className="h-5 w-24 rounded-full" />
                <Skeleton className="h-4 w-28" />
              </div>
              <Skeleton className="h-4 w-44" />
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[var(--pw-hairline)]">
                <Skeleton className="h-8 rounded" />
                <Skeleton className="h-8 rounded" />
                <Skeleton className="h-8 rounded" />
              </div>
            </Card>
          ))
        ) : jobs.length === 0 ? (
          <Card className="flex flex-col items-center justify-center p-8 text-center border-[var(--pw-hairline)] bg-[var(--pw-surface)]/70">
            <FileText className="h-10 w-10 opacity-30 text-[var(--pw-primary)] mb-2" />
            <p className="font-semibold text-sm text-[var(--pw-ink)]">ยังไม่มีประวัติการนำเข้าข้อมูล</p>
            <p className="text-xs text-[var(--pw-ink)]/50 mt-1">
              สลิปและใบแจ้งยอดที่นำเข้าจะแสดงประวัติที่นี่
            </p>
          </Card>
        ) : (
          <AnimatedList className="space-y-3">
            {jobs.map((job) => {
              const isSlip = job.importType.toLowerCase() === "slip";
              const statusLower = job.status.toLowerCase();

              return (
                <AnimatedListItem key={job.importJobId}>
                  <Card className="p-3.5 border-[var(--pw-hairline)] bg-[var(--pw-surface)]/80 hover:border-[var(--pw-primary)]/40 transition-colors">
                    <div className="flex flex-col gap-2.5">
                      {/* Top Row: Type Badge + Status Pill */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-medium text-[11px] bg-[var(--pw-surface-indigo)]/50 text-[var(--pw-ink)] border border-[var(--pw-hairline)]">
                          {isSlip ? (
                            <Receipt className="h-3 w-3 text-[var(--pw-primary)]" />
                          ) : (
                            <CreditCard className="h-3 w-3 text-[var(--pw-primary)]" />
                          )}
                          {isSlip ? "สลิปโอนเงิน" : "ใบแจ้งยอด"}
                        </span>

                        {statusLower === "completed" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--pw-green)]/15 text-[var(--pw-green)] border border-[var(--pw-green)]/20">
                            <CheckCircle2 className="h-3 w-3" />
                            เสร็จสมบูรณ์
                          </span>
                        ) : statusLower === "needsreview" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/15 text-amber-400 border border-amber-500/20">
                            <Clock className="h-3 w-3" />
                            รอตรวจสอบ
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--pw-expense)]/15 text-[var(--pw-expense)] border border-[var(--pw-expense)]/20">
                            <AlertCircle className="h-3 w-3" />
                            {job.errorMessage ? "พบข้อผิดพลาด" : "ล้มเหลว"}
                          </span>
                        )}
                      </div>

                      {/* File Name & Time */}
                      <div>
                        <p className="text-xs font-semibold text-[var(--pw-ink)] truncate">
                          {job.fileName}
                        </p>
                        <p className="text-[10px] text-[var(--pw-ink)]/50 mt-0.5">
                          {formatDisplayDateTime(job.createdAt)}
                        </p>
                      </div>

                      {/* Metrics Summary Grid */}
                      <div className="grid grid-cols-3 gap-1.5 rounded-lg bg-[var(--pw-surface-indigo)]/20 p-2 text-center border border-[var(--pw-hairline)]/50">
                        <div>
                          <span className="text-[10px] text-[var(--pw-ink)]/50 block">ทั้งหมด</span>
                          <span className="text-xs font-bold text-[var(--pw-ink)]">{job.totalRecords}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[var(--pw-green)] block">นำเข้า</span>
                          <span className="text-xs font-bold text-[var(--pw-green)]">{job.importedRecords}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-amber-400 block">ซ้ำ</span>
                          <span className="text-xs font-bold text-amber-400">{job.duplicateRecords}</span>
                        </div>
                      </div>

                      {/* Action Button if Needs Review */}
                      {statusLower === "needsreview" && (
                        <Button
                          type="button"
                          className="w-full h-9 text-xs font-semibold gap-1.5 mt-1"
                          onClick={() => setReviewingJob(job)}
                        >
                          <Eye className="size-3.5" />
                          ตรวจสอบและยืนยันรายการ
                        </Button>
                      )}
                    </div>
                  </Card>
                </AnimatedListItem>
              );
            })}
          </AnimatedList>
        )}
      </div>

      {/* Pagination footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between p-3 rounded-xl border border-[var(--pw-hairline)] bg-[var(--pw-surface)] text-xs text-[var(--pw-ink)]/70">
          <span>
            หน้า {page} จาก {totalPages}
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-8 w-8 p-0 cursor-pointer"
              aria-label="หน้าก่อนหน้า"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-8 w-8 p-0 cursor-pointer"
              aria-label="หน้าถัดไป"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Filter BottomSheet */}
      <BottomSheet
        open={isFilterSheetOpen}
        onOpenChange={setIsFilterSheetOpen}
        title="ตัวกรองประวัติการนำเข้า"
        description="กรองประวัติตามประเภทงานนำเข้า เช่น สลิปโอนเงิน หรือใบแจ้งยอดบัตรเครดิต"
      >
        <div className="space-y-4 pt-1">
          <FormField label="ประเภทงานนำเข้า">
            <Select
              value={typeFilter}
              onValueChange={(val) => {
                setTypeFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="เลือกประเภทงาน" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด (ทุกประเภท)</SelectItem>
                <SelectItem value="slip">สลิปโอนเงิน</SelectItem>
                <SelectItem value="creditCardStatement">ใบแจ้งยอดบัตรเครดิต</SelectItem>
              </SelectContent>
            </Select>
          </FormField>

          <BottomSheetFooter>
            <Button
              type="button"
              onClick={() => setIsFilterSheetOpen(false)}
              className="h-11 sm:h-10 font-semibold cursor-pointer"
            >
              นำตัวกรองไปใช้
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                handleResetFilter();
                setIsFilterSheetOpen(false);
              }}
              className="h-11 sm:h-10 cursor-pointer"
            >
              ล้างตัวกรอง
            </Button>
          </BottomSheetFooter>
        </div>
      </BottomSheet>

      {/* Review Modal */}
      <ReviewImportModal
        job={reviewingJob}
        onClose={() => setReviewingJob(null)}
      />
    </div>
  );
}
