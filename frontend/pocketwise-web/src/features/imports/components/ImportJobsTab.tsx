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
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { FormField } from "@/components/ui/form-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

  const formatDate = (isoStr?: string | null) => {
    if (!isoStr) return "-";
    try {
      return new Intl.DateTimeFormat("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(isoStr));
    } catch {
      return isoStr;
    }
  };

  const handleResetFilter = () => {
    setTypeFilter("all");
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Filter header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-[var(--pw-text-primary)]">
            ประวัติการนำเข้าข้อมูล
          </h3>
          <p className="text-xs text-[var(--pw-text-secondary)]">
            ติดตามสถานะของงานนำเข้าสลิปและใบแจ้งยอดบัตรเครดิตทั้งหมด
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsFilterSheetOpen(true)}
          className={cn(
            "relative gap-2 cursor-pointer transition-all",
            activeFilterCount > 0
              ? "border-[var(--pw-primary)] bg-[var(--pw-primary)]/15 text-[var(--pw-primary)] hover:bg-[var(--pw-primary)]/25 font-semibold"
              : "border-[var(--pw-hairline)] bg-[var(--pw-surface-indigo)] hover:bg-[var(--pw-surface-onyx)] text-[var(--pw-ink)]",
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
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs text-[var(--pw-text-muted)]">ตัวกรองที่ใช้งาน:</span>
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

      {/* Table */}
      <Card className="p-0 bg-[var(--pw-surface-black)] border border-[var(--pw-hairline)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[var(--pw-hairline)] bg-[var(--pw-surface-indigo)]/40 text-[var(--pw-text-muted)]">
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
                    <td className="py-3 px-4"><Skeleton className="h-4 w-20" /></td>
                    <td className="py-3 px-4"><Skeleton className="h-5 w-16 rounded-full" /></td>
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
                    className="py-12 text-center text-[var(--pw-text-muted)]"
                  >
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
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
                      className="hover:bg-[var(--pw-surface-indigo)]/20 transition-colors"
                    >
                      <td className="py-3 px-4 font-medium text-[var(--pw-text-primary)] whitespace-nowrap">
                        {formatDate(job.createdAt)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-medium text-[10px] bg-[var(--pw-surface-indigo)] text-[var(--pw-text-primary)] border border-[var(--pw-hairline)]">
                          {isSlip ? (
                            <Receipt className="h-3 w-3 text-[var(--pw-accent-primary)]" />
                          ) : (
                            <CreditCard className="h-3 w-3 text-[var(--pw-accent-primary)]" />
                          )}
                          {isSlip ? "สลิปโอนเงิน" : "ใบแจ้งยอด"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[var(--pw-text-primary)] max-w-[200px] truncate">
                        {job.fileName}
                      </td>
                      <td className="py-3 px-4 text-center text-[var(--pw-text-primary)] font-medium">
                        {job.totalRecords}
                      </td>
                      <td className="py-3 px-4 text-center text-[var(--pw-accent-green)] font-medium">
                        {job.importedRecords}
                      </td>
                      <td className="py-3 px-4 text-center text-[var(--pw-accent-yellow)] font-medium">
                        {job.duplicateRecords}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {statusLower === "completed" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--pw-accent-green)]/10 text-[var(--pw-accent-green)]">
                            <CheckCircle2 className="h-3 w-3" />
                            เสร็จสมบูรณ์
                          </span>
                        ) : statusLower === "needsreview" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--pw-accent-yellow)]/10 text-[var(--pw-accent-yellow)]">
                            <Clock className="h-3 w-3" />
                            รอตรวจสอบ
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--pw-accent-red)]/10 text-[var(--pw-accent-red)]">
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
                          <span className="text-[var(--pw-text-muted)]">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-3 border-t border-[var(--pw-hairline)] bg-[var(--pw-surface-indigo)]/10 text-xs">
            <span className="text-[var(--pw-text-muted)]">
              หน้า {page} จาก {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-7 w-7 p-0 cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="h-7 w-7 p-0 cursor-pointer"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Filter BottomSheet */}
      <BottomSheet
        open={isFilterSheetOpen}
        onOpenChange={setIsFilterSheetOpen}
        title="ตัวกรองประวัติการนำเข้า"
        description="กรองประวัติตามประเภทงานนำเข้า เช่น สลิปโอนเงิน หรือใบแจ้งยอดบัตรเครดิต"
      >
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[75vh] space-y-4">
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

          <div className="flex flex-col-reverse gap-2 pt-4 border-t border-[var(--pw-hairline)] sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                handleResetFilter();
                setIsFilterSheetOpen(false);
              }}
              className="w-full sm:w-auto cursor-pointer"
            >
              ล้างตัวกรอง
            </Button>
            <Button
              type="button"
              onClick={() => setIsFilterSheetOpen(false)}
              className="w-full sm:w-auto bg-[var(--pw-link)] text-white hover:brightness-110 cursor-pointer"
            >
              เสร็จสิ้น
            </Button>
          </div>
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
