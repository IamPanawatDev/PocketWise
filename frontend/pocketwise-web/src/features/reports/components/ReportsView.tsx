"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CreditCard,
  Download,
  FileDown,
  FileJson,
  FileSpreadsheet,
  Filter,
  Landmark,
  Layers,
  LoaderCircle,
  ReceiptText,
  Plus,
  Scale,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useCategories } from "@/features/categories/hooks/useCategories";
import { useTags } from "@/features/tags/hooks/useTags";
import {
  exportReportFile,
  useReportSummary,
  useReportTrends,
} from "@/features/reports/hooks/useReports";
import { BottomSheet, BottomSheetFooter } from "@/components/ui/bottom-sheet";
import { ReportContentSkeleton } from "@/components/shared/Skeletons";
import type { ReportPeriod } from "@/types/report.types";
import {
  cn,
  formatCurrency,
  formatDate,
  thailandDateBoundaryToUtcIso,
  toThailandDateInputValue,
  getTodayRange,
  getThisWeekRange,
  getThisMonthRange,
  getThisYearRange,
} from "@/lib/utils";
import { formatDisplayDate, getRecentMonthOptions } from "@/lib/date-utils";
import { ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { DateInput } from "@/components/ui/date-input";
import { FormField } from "@/components/ui/form-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const colors = [
  "var(--pw-primary)",
  "var(--pw-green)",
  "var(--pw-magenta)",
  "var(--pw-link)",
  "var(--pw-expense)",
  "var(--pw-input-border)",
];

const periodLabels: Record<ReportPeriod, string> = {
  weekly: "รายสัปดาห์ (เริ่มวันอาทิตย์)",
  monthly: "รายเดือน",
  quarterly: "รายไตรมาส",
  yearly: "รายปี",
};

function formatSourceTypeName(sourceType: string): string {
  switch (sourceType.toLowerCase()) {
    case "slip":
      return "สลิปโอนเงิน (Slip)";
    case "cardstatement":
      return "ใบแจ้งยอดบัตร (Card Statement)";
    case "manual":
      return "บันทึกเอง (Manual)";
    case "recurring":
      return "รายการประจำ (Recurring)";
    default:
      return sourceType;
  }
}

interface ReportsViewProps {
  initialFromDate: string;
  initialToDate: string;
}


export function ReportsView({ initialFromDate, initialToDate }: ReportsViewProps) {
  const [fromDate, setFromDate] = useState(initialFromDate);
  const [toDate, setToDate] = useState(initialToDate);
  const [period, setPeriod] = useState<ReportPeriod>("monthly");
  const monthOptions = useMemo(() => getRecentMonthOptions(24, 1), []);
  const [isCustomDateMode, setIsCustomDateMode] = useState(false);
  const [isNarrowMobile, setIsNarrowMobile] = useState(false);
  const [showDetailedBreakdown, setShowDetailedBreakdown] = useState(false);

  useEffect(() => {
    const checkNarrowMobile = () => {
      setIsNarrowMobile(window.innerWidth < 375);
    };
    checkNarrowMobile();
    window.addEventListener("resize", checkNarrowMobile);
    return () => window.removeEventListener("resize", checkNarrowMobile);
  }, []);

  const currentMonthValue = useMemo(() => {
    if (!fromDate) return "all";
    return fromDate.slice(0, 7);
  }, [fromDate]);

  const handleMonthSelect = (value: string) => {
    if (value === "all") {
      setFromDate("2000-01-01");
      setToDate("2099-12-31");
      setPeriod("yearly");
      return;
    }
    const selected = monthOptions.find((m) => m.value === value);
    if (selected) {
      setFromDate(selected.from);
      setToDate(selected.to);
      setPeriod("monthly");
    }
  };

  const handlePrevMonth = () => {
    setIsCustomDateMode(false);
    const idx = monthOptions.findIndex((m) => m.value === currentMonthValue);
    if (idx !== -1 && idx < monthOptions.length - 1) {
      handleMonthSelect(monthOptions[idx + 1].value);
    } else if (monthOptions.length > 0) {
      handleMonthSelect(monthOptions[0].value);
    }
  };

  const handleNextMonth = () => {
    setIsCustomDateMode(false);
    const idx = monthOptions.findIndex((m) => m.value === currentMonthValue);
    if (idx > 0) {
      handleMonthSelect(monthOptions[idx - 1].value);
    } else if (monthOptions.length > 0) {
      handleMonthSelect(monthOptions[0].value);
    }
  };

  const activeQuickPeriod = useMemo(() => {
    if (!fromDate && !toDate) return "all";
    if (fromDate === "2000-01-01" && toDate === "2099-12-31") return "all";

    const today = getTodayRange();
    if (fromDate === today.from && toDate === today.to) return "today";

    const week = getThisWeekRange();
    if (fromDate === week.from && toDate === week.to) return "week";

    const month = getThisMonthRange();
    if (fromDate === month.from && toDate === month.to) return "month";

    const year = getThisYearRange();
    if (fromDate === year.from && toDate === year.to) return "year";

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = String(now.getMonth() + 1).padStart(2, "0");
    const currentToday = toThailandDateInputValue(now);
    if (
      fromDate === `${currentYear}-${currentMonth}-01` &&
      (toDate === currentToday || toDate === month.to)
    ) {
      return "month";
    }

    return "custom";
  }, [fromDate, toDate]);
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [tagId, setTagId] = useState<number | undefined>();
  const [currencyCode, setCurrencyCode] = useState("");
  const { data: categories } = useCategories();
  const { data: tags } = useTags();

  const validRange = Boolean(fromDate && toDate && fromDate <= toDate);
  const fromUtc = useMemo(
    () => (validRange ? thailandDateBoundaryToUtcIso(fromDate) : ""),
    [fromDate, validRange],
  );
  const toUtc = useMemo(
    () => (validRange ? thailandDateBoundaryToUtcIso(toDate, true) : ""),
    [toDate, validRange],
  );
  const summaryQuery = useReportSummary(fromUtc, toUtc, categoryId, tagId);
  const trendQuery = useReportTrends(fromUtc, toUtc, period, categoryId, tagId);

  const summary = summaryQuery.data;
  const activeCurrency =
    summary?.currencies.find((item) => item.currencyCode === currencyCode) ??
    summary?.currencies[0];
  const trendPoints =
    trendQuery.data?.series
      .filter((item) => item.currencyCode === activeCurrency?.currencyCode)
      .map((item) => ({
        ...item,
        label: formatDate(item.periodStart),
      })) ?? [];

  const rangeMessage =
    fromDate && toDate && fromDate > toDate
      ? "วันเริ่มต้นต้องไม่มากกว่าวันสิ้นสุด"
      : !fromDate || !toDate
        ? "กรุณาเลือกช่วงวันที่ให้ครบ"
        : "";


  const [showFilterSheet, setShowFilterSheet] = useState(false);

  const selectedCategoryName = useMemo(() => {
    if (categoryId == null) return null;
    return categories?.find((c) => c.categoryId === categoryId)?.categoryName ?? null;
  }, [categoryId, categories]);

  const selectedTagName = useMemo(() => {
    if (tagId == null) return null;
    return tags?.find((t) => t.tagId === tagId)?.tagName ?? null;
  }, [tagId, tags]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (categoryId != null) count++;
    if (tagId != null) count++;
    if (period !== "monthly") count++;
    return count;
  }, [categoryId, tagId, period]);

  const resetFilters = () => {
    setCategoryId(undefined);
    setIsCustomDateMode(false);
    setTagId(undefined);
    setPeriod("monthly");
  };

  // Export State & Handler
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<"csv" | "json">("csv");
  const [exportType, setExportType] = useState<"full" | "transactions">("full");
  const [exportMonthMode, setExportMonthMode] = useState<"current" | "specific">("current");
  const [selectedExportMonth, setSelectedExportMonth] = useState<string>(() => monthOptions[0]?.value || "");
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    let targetFromUtc = fromUtc;
    let targetToUtc = toUtc;

    if (exportMonthMode === "specific") {
      const selected = monthOptions.find((m) => m.value === selectedExportMonth);
      if (selected) {
        targetFromUtc = thailandDateBoundaryToUtcIso(selected.from, false);
        targetToUtc = thailandDateBoundaryToUtcIso(selected.to, true);
      }
    } else if (!validRange) {
      toast.error(rangeMessage || "กรุณาเลือกช่วงวันที่ให้ถูกต้องก่อนส่งออก");
      return;
    }

    try {
      setIsExporting(true);
      await exportReportFile({
        fromDate: targetFromUtc,
        toDate: targetToUtc,
        format: exportFormat,
        type: exportType,
        categoryId,
        tagId,
      });
      toast.success("ดาวน์โหลดข้อมูลรายงานสำเร็จ");
      setIsExportOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "ส่งออกรายงานไม่สำเร็จ";
      toast.error(msg);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl sm:text-2xl font-bold">
            <BarChart3 className="size-6 text-[var(--pw-primary)]" />
            รายงานและภาพรวม
          </h1>
          <p className="hidden sm:block text-sm text-[var(--pw-ink)]/65 mt-0.5">
            สรุปรายรับ รายจ่าย ภาพรวมสลิป บัตรเครดิต และแนวโน้มจากรายการที่ยืนยันแล้ว
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className={cn(
              "relative gap-1.5 min-h-[44px] text-xs sm:text-sm font-semibold transition-all shadow-xs cursor-pointer",
              activeFilterCount > 0
                ? "border-[var(--pw-primary)] bg-[var(--pw-primary)]/15 text-[var(--pw-primary)] hover:bg-[var(--pw-primary)]/25 font-bold"
                : "border-[var(--pw-hairline)] bg-[var(--pw-surface-indigo)] hover:bg-[var(--pw-surface-onyx)] text-[var(--pw-ink)]",
            )}
            size="sm"
            onClick={() => setShowFilterSheet(true)}
          >
            <Filter className="size-4 text-[var(--pw-primary)]" />
            <span>ตัวกรอง</span>
            {activeFilterCount > 0 && (
              <span className="flex size-5 items-center justify-center rounded-full bg-[var(--pw-primary)] text-[10px] font-bold text-white shadow-xs">
                {activeFilterCount}
              </span>
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsExportOpen(true)}
            disabled={!validRange}
            className="gap-1.5 min-h-[44px] text-xs sm:text-sm font-medium border-[var(--pw-hairline)] bg-[var(--pw-surface-indigo)] hover:bg-[var(--pw-surface-indigo)]/80 text-[var(--pw-ink)] shadow-xs cursor-pointer"
            title="ส่งออกข้อมูลรายงาน"
            aria-label="ส่งออกข้อมูลรายงาน"
          >
            <FileDown className="size-4 text-[var(--pw-primary)]" />
            <span className="hidden sm:inline">ส่งออกข้อมูลรายงาน</span>
            <span className="sm:hidden">ส่งออก</span>
          </Button>
        </div>
      </header>

      {/* Unified Time-Control Bar (Quick Pills & Month Stepper) */}
      <div className="space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          {/* Quick Period Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <button
              type="button"
              onClick={() => {
                setFromDate("2000-01-01");
                setToDate("2099-12-31");
                setPeriod("yearly");
              }}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all cursor-pointer border active:scale-95 min-h-[36px]",
                activeQuickPeriod === "all"
                  ? "bg-[var(--pw-primary)] text-white border-[var(--pw-primary)] shadow-xs"
                  : "bg-[var(--pw-surface-indigo)]/80 text-[var(--pw-ink)]/75 border-[var(--pw-hairline)] hover:bg-[var(--pw-surface-onyx)] hover:text-[var(--pw-ink)]"
              )}
            >
              ทั้งหมด
            </button>
            <button
              type="button"
              onClick={() => {
                const r = getTodayRange();
                setFromDate(r.from);
                setToDate(r.to);
                setPeriod("weekly");
              }}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all cursor-pointer border active:scale-95 min-h-[36px]",
                activeQuickPeriod === "today"
                  ? "bg-[var(--pw-primary)] text-white border-[var(--pw-primary)] shadow-xs"
                  : "bg-[var(--pw-surface-indigo)]/80 text-[var(--pw-ink)]/75 border-[var(--pw-hairline)] hover:bg-[var(--pw-surface-onyx)] hover:text-[var(--pw-ink)]"
              )}
            >
              วันนี้
            </button>
            <button
              type="button"
              onClick={() => {
                const r = getThisWeekRange();
                setFromDate(r.from);
                setToDate(r.to);
                setPeriod("weekly");
              }}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all cursor-pointer border active:scale-95 min-h-[36px]",
                activeQuickPeriod === "week"
                  ? "bg-[var(--pw-primary)] text-white border-[var(--pw-primary)] shadow-xs"
                  : "bg-[var(--pw-surface-indigo)]/80 text-[var(--pw-ink)]/75 border-[var(--pw-hairline)] hover:bg-[var(--pw-surface-onyx)] hover:text-[var(--pw-ink)]"
              )}
            >
              สัปดาห์นี้
            </button>
            <button
              type="button"
              onClick={() => {
                const r = getThisMonthRange();
                setFromDate(r.from);
                setToDate(r.to);
                setPeriod("monthly");
              }}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all cursor-pointer border active:scale-95 min-h-[36px]",
                activeQuickPeriod === "month"
                  ? "bg-[var(--pw-primary)] text-white border-[var(--pw-primary)] shadow-xs"
                  : "bg-[var(--pw-surface-indigo)]/80 text-[var(--pw-ink)]/75 border-[var(--pw-hairline)] hover:bg-[var(--pw-surface-onyx)] hover:text-[var(--pw-ink)]"
              )}
            >
              เดือนนี้
            </button>
            <button
              type="button"
              onClick={() => {
                const r = getThisYearRange();
                setFromDate(r.from);
                setToDate(r.to);
                setPeriod("yearly");
              }}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all cursor-pointer border active:scale-95 min-h-[36px]",
                activeQuickPeriod === "year"
                  ? "bg-[var(--pw-primary)] text-white border-[var(--pw-primary)] shadow-xs"
                  : "bg-[var(--pw-surface-indigo)]/80 text-[var(--pw-ink)]/75 border-[var(--pw-hairline)] hover:bg-[var(--pw-surface-onyx)] hover:text-[var(--pw-ink)]"
              )}
            >
              ปีนี้
            </button>
          </div>

          {/* Quick Month Stepper */}
          <div className="inline-flex items-center self-start sm:self-auto rounded-full border border-[var(--pw-hairline)] bg-[var(--pw-surface-indigo)]/70 p-0.5 text-xs shadow-2xs backdrop-blur-xs">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded-full text-[var(--pw-ink)]/70 hover:text-[var(--pw-ink)] hover:bg-[var(--pw-surface-onyx)] active:scale-90 transition-all cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
              aria-label="เดือนก่อนหน้า"
              title="เดือนก่อนหน้า"
            >
              <ChevronLeft className="size-4" />
            </button>

            <span className="px-2.5 font-semibold text-[var(--pw-ink)] text-xs select-none">
              {activeQuickPeriod === "all"
                ? "ทั้งหมด"
                : activeQuickPeriod === "today"
                ? "วันนี้"
                : activeQuickPeriod === "week"
                ? "สัปดาห์นี้"
                : activeQuickPeriod === "year"
                ? "ปีนี้"
                : monthOptions.find((m) => m.value === currentMonthValue)?.label ??
                  `${formatDisplayDate(fromDate)} - ${formatDisplayDate(toDate)}`}
            </span>

            <button
              type="button"
              onClick={handleNextMonth}
              disabled={monthOptions.findIndex((m) => m.value === currentMonthValue) === 0}
              className="p-1 rounded-full text-[var(--pw-ink)]/70 hover:text-[var(--pw-ink)] hover:bg-[var(--pw-surface-onyx)] disabled:opacity-30 disabled:pointer-events-none active:scale-90 transition-all cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
              aria-label="เดือนถัดไป"
              title="เดือนถัดไป"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>

        {/* Active Filter Chips */}
        {(selectedCategoryName || selectedTagName || period !== "monthly") && (
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            {selectedCategoryName && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--pw-primary)]/30 bg-[var(--pw-primary)]/10 px-2.5 py-1 text-xs font-medium text-[var(--pw-primary)]">
                หมวดหมู่: {selectedCategoryName}
                <button
                  type="button"
                  onClick={() => setCategoryId(undefined)}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-[var(--pw-primary)]/20"
                  aria-label="ลบตัวกรองหมวดหมู่"
                >
                  <X className="size-3" />
                </button>
              </span>
            )}

            {selectedTagName && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--pw-primary)]/30 bg-[var(--pw-primary)]/10 px-2.5 py-1 text-xs font-medium text-[var(--pw-primary)]">
                แท็ก: #{selectedTagName}
                <button
                  type="button"
                  onClick={() => setTagId(undefined)}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-[var(--pw-primary)]/20"
                  aria-label="ลบตัวกรองแท็ก"
                >
                  <X className="size-3" />
                </button>
              </span>
            )}

            {period !== "monthly" && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--pw-primary)]/30 bg-[var(--pw-primary)]/10 px-2.5 py-1 text-xs font-medium text-[var(--pw-primary)]">
                ช่วงกราฟ: {period === "weekly" ? "รายสัปดาห์" : period === "quarterly" ? "รายไตรมาส" : "รายปี"}
                <button
                  type="button"
                  onClick={() => setPeriod("monthly")}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-[var(--pw-primary)]/20"
                  aria-label="รีเซ็ตช่วงกราฟ"
                >
                  <X className="size-3" />
                </button>
              </span>
            )}

            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs text-[var(--pw-primary)] underline hover:text-[var(--pw-primary)]/80 ml-1 cursor-pointer"
              >
                ล้างตัวกรอง
              </button>
            )}
          </div>
        )}
      </div>

      {rangeMessage && <p role="alert" className="text-sm text-[var(--pw-expense)]">{rangeMessage}</p>}

      {/* Filter BottomSheet */}
      <BottomSheet
        open={showFilterSheet}
        onOpenChange={setShowFilterSheet}
        title="ตัวกรองรายงาน"
        description="เลือกช่วงวันที่ หมวดหมู่ แท็ก และช่วงกราฟที่ต้องการวิเคราะห์"
      >
        <div className="flex flex-col max-h-[75vh]">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Month Picker as Primary with Progressive Disclosure for Custom Dates */}
          {!isCustomDateMode ? (
            <div className="space-y-1.5 sm:col-span-2">
              <FormField label="เลือกช่วงเดือน" htmlFor="report-month-filter" className="w-full min-w-0">
                <Select
                  value={
                    activeQuickPeriod === "all"
                      ? "all"
                      : monthOptions.some((m) => m.value === currentMonthValue)
                      ? currentMonthValue
                      : "custom"
                  }
                  onValueChange={(val) => {
                    if (val === "custom") {
                      setIsCustomDateMode(true);
                    } else {
                      handleMonthSelect(val);
                    }
                  }}
                >
                  <SelectTrigger id="report-month-filter" className="w-full">
                    <SelectValue placeholder="เลือกเดือน" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="all">ทุกช่วงเวลา (ทั้งหมด)</SelectItem>
                    {monthOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                    {activeQuickPeriod === "custom" && (
                      <SelectItem value="custom">กำหนดช่วงวันที่เอง (กำลังใช้งาน)</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </FormField>
              <div className="flex justify-end pt-0.5">
                <button
                  type="button"
                  onClick={() => setIsCustomDateMode(true)}
                  className="text-xs text-[var(--pw-primary)] hover:underline flex items-center gap-1 cursor-pointer font-medium py-0.5"
                >
                  <Calendar className="size-3.5" />
                  กำหนดช่วงวันที่เอง (ขั้นสูง)
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5 rounded-xl border border-[var(--pw-hairline)] bg-[var(--pw-surface-indigo)]/30 p-3 sm:col-span-2">
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs font-semibold text-[var(--pw-ink)] flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-[var(--pw-primary)]" />
                  กำหนดช่วงวันที่เอง (วัน/เดือน/ปี)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomDateMode(false);
                    const thisMonth = getThisMonthRange();
                    setFromDate(thisMonth.from);
                    setToDate(thisMonth.to);
                    setPeriod("monthly");
                  }}
                  className="text-xs text-[var(--pw-primary)] hover:underline cursor-pointer font-medium"
                >
                  กลับไปเลือกรายเดือน
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label="ตั้งแต่วันที่ (ค.ศ. / เวลาไทย)" htmlFor="report-from-date">
                  <DateInput id="report-from-date" value={fromDate} onChange={setFromDate} />
                </FormField>
                <FormField label="ถึงวันที่ (ค.ศ. / เวลาไทย)" htmlFor="report-to-date">
                  <DateInput id="report-to-date" value={toDate} onChange={setToDate} />
                </FormField>
              </div>
            </div>
          )}
            <FormField label="ช่วงกราฟ" htmlFor="report-period">
              <Select value={period} onValueChange={(value) => setPeriod(value as ReportPeriod)}>
                <SelectTrigger id="report-period"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">รายสัปดาห์ (เริ่มวันอาทิตย์)</SelectItem>
                  <SelectItem value="monthly">รายเดือน</SelectItem>
                  <SelectItem value="quarterly">รายไตรมาส</SelectItem>
                  <SelectItem value="yearly">รายปี</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            {summary && summary.currencies.length > 1 && (
              <FormField label="สกุลเงิน" htmlFor="report-currency">
                <Select value={activeCurrency?.currencyCode ?? ""} onValueChange={setCurrencyCode}>
                  <SelectTrigger id="report-currency"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {summary.currencies.map((currency) => (
                      <SelectItem key={currency.currencyCode} value={currency.currencyCode}>
                        {currency.currencyCode}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            )}
            <FormField label="กรองหมวดหมู่" htmlFor="report-category">
              <Select
                value={categoryId == null ? "all" : String(categoryId)}
                onValueChange={(value) => setCategoryId(value === "all" ? undefined : Number(value))}
              >
                <SelectTrigger id="report-category"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกหมวดหมู่</SelectItem>
                  {categories?.map((category) => (
                    <SelectItem key={category.categoryId} value={String(category.categoryId)}>
                      {category.categoryName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="กรองแท็ก" htmlFor="report-tag">
              <Select
                value={tagId == null ? "all" : String(tagId)}
                onValueChange={(value) => setTagId(value === "all" ? undefined : Number(value))}
              >
                <SelectTrigger id="report-tag"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกแท็ก</SelectItem>
                  {tags?.map((tag) => (
                    <SelectItem key={tag.tagId} value={String(tag.tagId)}>
                      #{tag.tagName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>

          </div>

          <BottomSheetFooter>
            <Button
              type="button"
              className="w-full sm:w-auto min-h-[44px] text-sm font-bold shadow-md cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white order-1"
              onClick={() => setShowFilterSheet(false)}
            >
              ดูผลลัพธ์
            </Button>
            <div className="flex items-center gap-2 w-full sm:w-auto order-2">
              {activeFilterCount > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 sm:flex-initial min-h-[44px] text-xs text-[var(--pw-ink)]/75 hover:text-[var(--pw-ink)] border-[var(--pw-hairline)] cursor-pointer"
                  onClick={resetFilters}
                >
                  ล้างตัวกรอง
                </Button>
              )}
              <Button
                type="button"
                variant="outline" className="flex-1 sm:flex-initial min-h-[44px] gap-1.5 font-medium border border-[var(--pw-hairline)] bg-[var(--pw-surface-indigo)]/70 hover:bg-[var(--pw-surface-onyx)] text-[var(--pw-ink)]/85 hover:text-[var(--pw-ink)] cursor-pointer shadow-2xs" onClick={() => setShowFilterSheet(false)}
              >
                ปิด
              </Button>
            </div>
          </BottomSheetFooter>
        </div>
      </BottomSheet>

      {summaryQuery.isLoading || trendQuery.isLoading ? (
        <ReportContentSkeleton />
      ) : summaryQuery.isError || trendQuery.isError ? (
        <p role="alert" className="text-[var(--pw-expense)]">
          {summaryQuery.error instanceof ApiError
            ? summaryQuery.error.message
            : trendQuery.error instanceof ApiError
              ? trendQuery.error.message
              : "โหลดรายงานไม่สำเร็จ"}
        </p>
      ) : !activeCurrency ? (
        <Card className="flex flex-col items-center justify-center p-8 sm:p-12 text-center border-[var(--pw-hairline)] bg-[var(--pw-surface-raised)]/40 shadow-xs backdrop-blur-xs">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-[var(--pw-primary)]/10 text-[var(--pw-primary)] mb-3.5 ring-8 ring-[var(--pw-primary)]/5">
            <ReceiptText className="size-7" />
          </div>
          <h2 className="text-lg font-bold text-[var(--pw-ink)] sm:text-xl">
            ยังไม่มีข้อมูลธุรกรรมที่จะแสดงในรายงาน
          </h2>
          <p className="mt-1.5 max-w-md text-sm text-[var(--pw-ink)]/75">
            เมื่อคุณเริ่มบันทึกรายรับหรือรายจ่าย ระบบจะรวบรวมข้อมูลมาสรุปเป็นสถิติ กราฟแนวโน้ม และสัดส่วนการเงินให้เห็นภาพรวมทันที
          </p>
          <Button asChild size="default" className="mt-5 gap-2 font-medium shadow-sm hover:scale-102 active:scale-98 transition-transform">
            <Link href="/transactions?action=new">
              <Plus className="size-4" />
              เพิ่มธุรกรรมแรกของคุณ
            </Link>
          </Button>

        </Card>
      ) : (
        <>
          {summary && summary.currencies.length > 1 && (
            <div className="flex flex-wrap gap-2" aria-label="สกุลเงินในรายงาน">
              {summary.currencies.map((currency) => (
                <Button
                  key={currency.currencyCode}
                  type="button"
                  size="sm"
                  variant={activeCurrency.currencyCode === currency.currencyCode ? "default" : "secondary"}
                  onClick={() => setCurrencyCode(currency.currencyCode)}
                >
                  {currency.currencyCode}
                </Button>
              ))}
            </div>
          )}

          {/* Mobile: Executive Financial Hero Card (รายรับ รายจ่าย คงเหลือ คมชัดใน 1 วินาที) */}
          <div className="block sm:hidden">
            <Card className="relative overflow-hidden rounded-2xl border border-[var(--pw-hairline)] bg-gradient-to-br from-[var(--pw-surface-raised)]/95 via-[var(--pw-surface-indigo)]/85 to-[var(--pw-surface-onyx)]/95 p-4 shadow-md backdrop-blur-xl">
              {/* Top Row: Net Balance */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--pw-ink)]/70">
                  คงเหลือสุทธิ ({activeCurrency.currencyCode})
                </span>
                <span className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold shadow-2xs",
                  activeCurrency.netAmount >= 0
                    ? "bg-[var(--pw-green)]/15 text-[var(--pw-green)]"
                    : "bg-[var(--pw-expense)]/15 text-[var(--pw-expense)]"
                )}>
                  <Scale className="size-3.5" />
                  {activeCurrency.netAmount >= 0 ? "ดุลบวก" : "ดุลลบ"}
                </span>
              </div>
              <p className={cn(
                "mt-1.5 text-3xl font-extrabold tracking-tight",
                activeCurrency.netAmount >= 0 ? "text-[var(--pw-ink)]" : "text-[var(--pw-expense)]"
              )}>
                <AnimatedNumber value={activeCurrency.netAmount} currencyCode={activeCurrency.currencyCode} />
              </p>

              {/* Bottom Row: Income & Expense Summary */}
              <div className="mt-4 grid grid-cols-2 gap-2.5 pt-3.5 border-t border-[var(--pw-hairline)]/70">
                <div className="rounded-xl bg-[var(--pw-surface-sunken)]/60 p-3 border border-[var(--pw-hairline)]/60">
                  <div className="flex items-center gap-1.5 text-xs text-[var(--pw-green)] font-semibold">
                    <ArrowUpRight className="size-4" />
                    <span>รายรับรวม</span>
                  </div>
                  <p className="mt-1 text-lg font-bold text-[var(--pw-green)] truncate">
                    <AnimatedNumber value={activeCurrency.totalIncome} currencyCode={activeCurrency.currencyCode} />
                  </p>
                </div>
                <div className="rounded-xl bg-[var(--pw-surface-sunken)]/60 p-3 border border-[var(--pw-hairline)]/60">
                  <div className="flex items-center gap-1.5 text-xs text-[var(--pw-expense)] font-semibold">
                    <ArrowDownRight className="size-4" />
                    <span>รายจ่ายรวม</span>
                  </div>
                  <p className="mt-1 text-lg font-bold text-[var(--pw-expense)] truncate">
                    <AnimatedNumber value={activeCurrency.totalExpense} currencyCode={activeCurrency.currencyCode} />
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Desktop: 3 Essential KPI Cards (sm+) */}
          <div className="hidden sm:grid sm:grid-cols-3 gap-4">
            <Card className="p-5 border-l-4 border-l-[var(--pw-green)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md bg-[var(--pw-surface-raised)]/60">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-[var(--pw-ink)]/70">รายรับทั้งหมด</p>
                <div className="flex size-8 items-center justify-center rounded-lg bg-[var(--pw-green)]/10 text-[var(--pw-green)]">
                  <ArrowUpRight className="size-4.5" />
                </div>
              </div>
              <p className="mt-2.5 break-words text-2xl font-extrabold text-[var(--pw-green)]">
                <AnimatedNumber value={activeCurrency.totalIncome} currencyCode={activeCurrency.currencyCode} />
              </p>
            </Card>
            <Card className="p-5 border-l-4 border-l-[var(--pw-expense)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md bg-[var(--pw-surface-raised)]/60">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-[var(--pw-ink)]/70">รายจ่ายทั้งหมด</p>
                <div className="flex size-8 items-center justify-center rounded-lg bg-[var(--pw-expense)]/10 text-[var(--pw-expense)]">
                  <ArrowDownRight className="size-4.5" />
                </div>
              </div>
              <p className="mt-2.5 break-words text-2xl font-extrabold text-[var(--pw-expense)]">
                <AnimatedNumber value={activeCurrency.totalExpense} currencyCode={activeCurrency.currencyCode} />
              </p>
            </Card>
            <Card className="p-5 border-l-4 border-l-[var(--pw-link)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md bg-[var(--pw-surface-raised)]/60">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-[var(--pw-ink)]/70">คงเหลือสุทธิ</p>
                <span className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold",
                  activeCurrency.netAmount >= 0
                    ? "bg-[var(--pw-green)]/15 text-[var(--pw-green)]"
                    : "bg-[var(--pw-expense)]/15 text-[var(--pw-expense)]"
                )}>
                  <Scale className="size-3.5" />
                  {activeCurrency.netAmount >= 0 ? "ดุลบวก" : "ดุลลบ"}
                </span>
              </div>
              <p className={cn(
                "mt-2.5 break-words text-2xl font-extrabold",
                activeCurrency.netAmount >= 0 ? "text-[var(--pw-ink)]" : "text-[var(--pw-expense)]"
              )}>
                <AnimatedNumber value={activeCurrency.netAmount} currencyCode={activeCurrency.currencyCode} />
              </p>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Card className="p-4 sm:p-5">
              <h2 className="mb-4 text-lg font-bold">แนวโน้มรายรับและรายจ่าย · {periodLabels[period]}</h2>
              {trendPoints.length ? (
                <div className="h-60 sm:h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={trendPoints}
                      margin={
                        isNarrowMobile
                          ? { top: 8, right: 4, left: -24, bottom: 10 }
                          : { top: 8, right: 8, left: -16, bottom: 12 }
                      }
                    >
                      <CartesianGrid stroke="var(--pw-hairline)" strokeDasharray="3 3" />
                      <XAxis
                        dataKey="label"
                        interval="preserveStartEnd"
                        angle={isNarrowMobile ? 0 : -15}
                        textAnchor={isNarrowMobile ? "middle" : "end"}
                        height={isNarrowMobile ? 30 : 42}
                        tick={{ fill: "var(--pw-ink)", fontSize: 10 }}
                      />
                      <YAxis
                        width={36}
                        tick={{ fill: "var(--pw-ink)", fontSize: isNarrowMobile ? 10 : 11 }}
                        tickFormatter={(v) => {
                          if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
                          if (v >= 1000) return `${(v / 1000).toFixed(0)}k`;
                          return String(v);
                        }}
                      />
                      <Tooltip formatter={(value) => formatCurrency(Number(value), activeCurrency.currencyCode)} />
                      <Legend
                        layout="horizontal"
                        verticalAlign="bottom"
                        wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                      />
                      <Bar
                        dataKey="income"
                        name="รายรับ"
                        maxBarSize={32}
                        fill="var(--pw-green)"
                        radius={[4, 4, 0, 0]}
                        isAnimationActive={true}
                        animationDuration={850}
                        animationEasing="ease-out"
                      />
                      <Bar
                        dataKey="expense"
                        name="รายจ่าย"
                        maxBarSize={32}
                        fill="var(--pw-expense)"
                        radius={[4, 4, 0, 0]}
                        isAnimationActive={true}
                        animationDuration={850}
                        animationEasing="ease-out"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="py-12 text-center text-sm text-[var(--pw-ink)]/60">ไม่มีข้อมูลแนวโน้มในช่วงนี้</p>
              )}
            </Card>

            <Card className="p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold">รายจ่ายตามหมวดหมู่</h2>
                  <p className="text-xs text-[var(--pw-ink)]/60">สัดส่วนค่าใช้จ่ายและการกระจายตัวของเงิน</p>
                </div>
                <span className="rounded-full bg-[var(--pw-surface-indigo)] px-2.5 py-0.5 text-xs font-semibold text-[var(--pw-ink)]/75 border border-[var(--pw-hairline)]">
                  {activeCurrency.categoryBreakdown.length} หมวดหมู่
                </span>
              </div>
              {activeCurrency.categoryBreakdown.length ? (
                <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-2">
                  <div className="h-64 sm:h-72 min-w-0 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={activeCurrency.categoryBreakdown}
                          dataKey="amount"
                          nameKey="categoryName"
                          innerRadius={isNarrowMobile ? 44 : 52}
                          outerRadius={isNarrowMobile ? 80 : 88}
                          paddingAngle={2}
                          isAnimationActive={true}
                          animationDuration={850}
                          animationEasing="ease-out"
                        >
                          {activeCurrency.categoryBreakdown.map((item, index) => (
                            <Cell key={`${item.categoryId ?? "none"}-${item.categoryName}`} fill={colors[index % colors.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatCurrency(Number(value), activeCurrency.currencyCode)} />
                        {!isNarrowMobile && (
                          <Legend
                            layout="horizontal"
                            verticalAlign="bottom"
                            wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
                          />
                        )}
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                    {activeCurrency.categoryBreakdown.map((item, index) => {
                      const color = colors[index % colors.length];
                      return (
                        <div
                          key={`${item.categoryId ?? "none"}-${item.categoryName}`}
                          className="group relative rounded-xl border border-[var(--pw-hairline)]/70 bg-[var(--pw-surface-raised)]/40 p-2.5 transition-all hover:border-[var(--pw-hairline)] hover:bg-[var(--pw-surface-raised)]/70"
                        >
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                aria-hidden="true"
                                className="size-2.5 shrink-0 rounded-full"
                                style={{ backgroundColor: color }}
                              />
                              <Link
                                href={item.categoryId ? `/transactions?categoryId=${item.categoryId}` : "/transactions"}
                                className="truncate font-semibold text-[var(--pw-ink)] hover:text-[var(--pw-primary)] hover:underline flex items-center gap-1"
                              >
                                <span>{item.categoryName}</span>
                                <ChevronRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </Link>
                              {item.transactionCount !== undefined && item.transactionCount > 0 && (
                                <span className="text-[10px] text-[var(--pw-ink)]/50 shrink-0">
                                  ({item.transactionCount} รายการ)
                                </span>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-bold text-[var(--pw-ink)] block">
                                {formatCurrency(item.amount, activeCurrency.currencyCode)}
                              </span>
                              <span className="text-[10px] font-medium text-[var(--pw-ink)]/60">
                                {item.percentage.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                          {/* Visual Progress Bar */}
                          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--pw-surface-sunken)]">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(100, Math.max(0, item.percentage))}%`, backgroundColor: color }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="py-12 text-center text-sm text-[var(--pw-ink)]/60">ไม่มีรายจ่ายแยกตามหมวดหมู่</p>
              )}
            </Card>
          </div>

          {/* Optional Deep Breakdown (ซ่อนไว้ให้หน้าจอสะอาด แต่กางดูได้เมื่อต้องการ) */}
          <div className="pt-2">
            <div className="flex justify-center">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowDetailedBreakdown(!showDetailedBreakdown)}
                className="gap-2 text-xs font-semibold text-[var(--pw-ink)]/70 hover:text-[var(--pw-ink)] hover:bg-[var(--pw-surface-raised)] rounded-full px-4 py-2 cursor-pointer border border-[var(--pw-hairline)] bg-[var(--pw-surface-indigo)]/40 transition-all"
              >
                <ChevronDown className={cn("size-3.5 transition-transform duration-300", showDetailedBreakdown && "rotate-180")} />
                <span>{showDetailedBreakdown ? "ซ่อนรายละเอียดช่องทางชำระ" : "ดูรายละเอียดเชิงลึก (ตามบัญชีและช่องทางจ่าย)"}</span>
              </Button>
            </div>

            {showDetailedBreakdown && (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-3 mt-4">
                <BreakdownCard
                  title="ตามแหล่งที่มา (Source Breakdown)"
                  icon={<Layers className="size-5 text-[var(--pw-primary)]" />}
                  items={activeCurrency.sourceBreakdown.map((item) => ({
                    label: formatSourceTypeName(item.sourceType),
                    amount: item.amount,
                    percentage: item.percentage,
                    count: item.transactionCount,
                  }))}
                  currencyCode={activeCurrency.currencyCode}
                  emptyMessage="ไม่มีข้อมูลแหล่งที่มา"
                />
                <BreakdownCard
                  title="ตามบัญชีธนาคาร"
                  icon={<Landmark className="size-5 text-[var(--pw-primary)]" />}
                  items={activeCurrency.bankAccountBreakdown
                    .filter((item) => item.bankAccountId != null)
                    .map((item) => ({
                      label: item.bankName ? `${item.accountName} · ${item.bankName}` : item.accountName,
                      amount: item.amount,
                      percentage: item.percentage,
                      count: item.transactionCount,
                    }))}
                  currencyCode={activeCurrency.currencyCode}
                  emptyMessage="ไม่มีรายการที่จ่ายผ่านบัญชีธนาคาร"
                />
                <BreakdownCard
                  title="ตามบัตรเครดิต"
                  icon={<CreditCard className="size-5 text-[var(--pw-magenta)]" />}
                  items={activeCurrency.creditCardBreakdown
                    .filter((item) => item.creditCardId != null || (item.cardName && item.cardName !== "ไม่ระบุบัตร"))
                    .map((item) => ({
                      label: item.bankName ? `${item.cardName} · ${item.bankName}` : item.cardName,
                      amount: item.amount,
                      percentage: item.percentage,
                      count: item.transactionCount,
                    }))}
                  currencyCode={activeCurrency.currencyCode}
                  emptyMessage="ไม่มีรายการใช้จ่ายผ่านบัตรเครดิต"
                />
              </div>
            )}
          </div>
        </>
      )}

      {/* Export Report Responsive BottomSheet / Modal */}
      <BottomSheet
        open={isExportOpen}
        onOpenChange={setIsExportOpen}
        title={
          <div className="flex items-center gap-2">
            <FileDown className="size-5 text-[var(--pw-primary)]" />
            <span>ส่งออกข้อมูลรายงาน (Export Report)</span>
          </div>
        }
        description="ดาวน์โหลดสรุปภาพรวมรายรับ-รายจ่าย รายหมวดหมู่ หรือรายการธุรกรรมประจำเดือน"
      >
        <div className="space-y-4">
          {/* Export Mode / Month Selector */}
          <div>
            <label className="text-xs font-medium text-[var(--pw-ink)] mb-1.5 block">
              เลือกช่วงเดือนที่ต้องการส่งออก
            </label>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <button
                type="button"
                onClick={() => setExportMonthMode("current")}
                className={cn(
                  "p-2.5 rounded-[var(--pw-rounded-sm)] border text-xs font-medium text-center transition-all cursor-pointer",
                  exportMonthMode === "current"
                    ? "border-[var(--pw-primary)] bg-[var(--pw-primary)]/15 text-[var(--pw-primary)] font-semibold"
                    : "border-[var(--pw-hairline)] bg-[var(--pw-surface-black)] text-[var(--pw-ink)]/70 hover:border-[var(--pw-primary)]/50"
                )}
              >
                <span>ตามช่วงที่ดูอยู่</span>
                <span className="block text-[10px] text-[var(--pw-ink)]/50 mt-0.5 font-mono truncate">
                  {fromDate} ถึง {toDate}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setExportMonthMode("specific")}
                className={cn(
                  "p-2.5 rounded-[var(--pw-rounded-sm)] border text-xs font-medium text-center transition-all cursor-pointer",
                  exportMonthMode === "specific"
                    ? "border-[var(--pw-primary)] bg-[var(--pw-primary)]/15 text-[var(--pw-primary)] font-semibold"
                    : "border-[var(--pw-hairline)] bg-[var(--pw-surface-black)] text-[var(--pw-ink)]/70 hover:border-[var(--pw-primary)]/50"
                )}
              >
                <span>เลือกรายเดือนเฉพาะ</span>
                <span className="block text-[10px] text-[var(--pw-ink)]/50 mt-0.5">
                  สรุปประจำเดือน
                </span>
              </button>
            </div>

            {exportMonthMode === "specific" && (
              <div className="mt-2">
                <Select value={selectedExportMonth} onValueChange={setSelectedExportMonth}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="เลือกเดือน" />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    {monthOptions.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Active Filter Context */}
          <div className="p-3 rounded-lg bg-[var(--pw-surface-black)]/60 border border-[var(--pw-hairline)] space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-[var(--pw-ink)]/60">ช่วงเวลาส่งออก:</span>
              <span className="font-mono text-[var(--pw-ink)] font-medium">
                {exportMonthMode === "specific"
                  ? monthOptions.find((m) => m.value === selectedExportMonth)?.label ?? selectedExportMonth
                  : `${fromDate} ถึง ${toDate}`}
              </span>
            </div>
            {categoryId && (
              <div className="flex justify-between">
                <span className="text-[var(--pw-ink)]/60">หมวดหมู่:</span>
                <span className="text-[var(--pw-ink)]">
                  {categories?.find((c) => c.categoryId === categoryId)?.categoryName ?? "-"}
                </span>
              </div>
            )}
            {tagId && (
              <div className="flex justify-between">
                <span className="text-[var(--pw-ink)]/60">แท็ก:</span>
                <span className="text-[var(--pw-ink)]">
                  {tags?.find((t) => t.tagId === tagId)?.tagName ?? "-"}
                </span>
              </div>
            )}
          </div>

          {/* Scope Selector */}
          <div>
            <label className="text-xs font-medium text-[var(--pw-ink)] mb-1.5 block">
              เนื้อหาที่ต้องการส่งออก (Export Scope)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setExportType("full")}
                className={cn(
                  "flex flex-col items-center justify-center p-3 rounded-[var(--pw-rounded-sm)] border text-xs font-medium text-center transition-colors cursor-pointer",
                  exportType === "full"
                    ? "border-[var(--pw-primary)] bg-[var(--pw-primary)]/15 text-[var(--pw-primary)] font-semibold"
                    : "border-[var(--pw-hairline)] bg-[var(--pw-surface-black)] text-[var(--pw-ink)]/70 hover:border-[var(--pw-primary)]/50"
                )}
              >
                <span>รายงานฉบับเต็ม</span>
                <span className="text-[10px] text-[var(--pw-ink)]/50 mt-0.5">ภาพรวมสรุป + รายหมวด + ทุกรายการ</span>
              </button>
              <button
                type="button"
                onClick={() => setExportType("transactions")}
                className={cn(
                  "flex flex-col items-center justify-center p-3 rounded-[var(--pw-rounded-sm)] border text-xs font-medium text-center transition-colors cursor-pointer",
                  exportType === "transactions"
                    ? "border-[var(--pw-primary)] bg-[var(--pw-primary)]/15 text-[var(--pw-primary)] font-semibold"
                    : "border-[var(--pw-hairline)] bg-[var(--pw-surface-black)] text-[var(--pw-ink)]/70 hover:border-[var(--pw-primary)]/50"
                )}
              >
                <span>เฉพาะรายการธุรกรรม</span>
                <span className="text-[10px] text-[var(--pw-ink)]/50 mt-0.5">ตารางรายการย่อยสำหรับ Excel</span>
              </button>
            </div>
          </div>

          {/* Format Selector */}
          <div>
            <label className="text-xs font-medium text-[var(--pw-ink)] mb-1.5 block">
              รูปแบบไฟล์ (File Format)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setExportFormat("csv")}
                className={cn(
                  "flex items-center justify-center gap-2 p-3 rounded-[var(--pw-rounded-sm)] border text-xs font-medium transition-colors cursor-pointer",
                  exportFormat === "csv"
                    ? "border-[var(--pw-primary)] bg-[var(--pw-primary)]/15 text-[var(--pw-primary)] font-semibold"
                    : "border-[var(--pw-hairline)] bg-[var(--pw-surface-black)] text-[var(--pw-ink)]/70 hover:border-[var(--pw-primary)]/50"
                )}
              >
                <FileSpreadsheet className="size-4 shrink-0 text-emerald-400" />
                <span>CSV (Excel ภาษาไทย)</span>
              </button>
              <button
                type="button"
                onClick={() => setExportFormat("json")}
                className={cn(
                  "flex items-center justify-center gap-2 p-3 rounded-[var(--pw-rounded-sm)] border text-xs font-medium transition-colors cursor-pointer",
                  exportFormat === "json"
                    ? "border-[var(--pw-primary)] bg-[var(--pw-primary)]/15 text-[var(--pw-primary)] font-semibold"
                    : "border-[var(--pw-hairline)] bg-[var(--pw-surface-black)] text-[var(--pw-ink)]/70 hover:border-[var(--pw-primary)]/50"
                )}
              >
                <FileJson className="size-4 shrink-0 text-sky-400" />
                <span>JSON (Raw Data)</span>
              </button>
            </div>
          </div>

          {/* BottomSheetFooter: Confirm TOP on Mobile, Cancel BOTTOM */}
          <BottomSheetFooter>
            <Button
              type="button"
              variant="default"
              className="gap-1.5"
              onClick={handleExport}
              disabled={isExporting}
            >
              {isExporting ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" />
                  กำลังส่งออกรายงาน...
                </>
              ) : (
                <>
                  <Download className="size-4" />
                  ดาวน์โหลดรายงาน
                </>
              )}
            </Button>
            <Button type="button" variant="outline" className="w-full sm:w-auto min-h-[44px] gap-1.5 font-medium border border-[var(--pw-hairline)] bg-[var(--pw-surface-indigo)]/70 hover:bg-[var(--pw-surface-onyx)] text-[var(--pw-ink)]/85 hover:text-[var(--pw-ink)] cursor-pointer order-2 active:scale-[0.98] transition-all shadow-2xs" onClick={() => setIsExportOpen(false)} disabled={isExporting}>ยกเลิก</Button>
          </BottomSheetFooter>
        </div>
      </BottomSheet>
    </div>
  );
}

function BreakdownCard({
  title,
  icon,
  items,
  currencyCode,
  emptyMessage = "ไม่มีข้อมูล",
}: {
  title: string;
  icon?: React.ReactNode;
  items: { label: string; amount: number; percentage: number; count?: number }[];
  currencyCode: string;
  emptyMessage?: string;
}) {
  return (
    <Card className="p-4 sm:p-5">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
        {icon}
        {title}
      </h2>
      {items.length ? (
        <ul className="space-y-3">
          {items.map((item, index) => (
            <li
              key={`${item.label}-${index}`}
              className="rounded-xl border border-[var(--pw-hairline)]/60 bg-[var(--pw-surface-raised)]/30 p-2.5 space-y-2 hover:bg-[var(--pw-surface-raised)]/60 transition-colors"
            >
              <div className="flex items-start justify-between gap-3 text-xs">
                <div className="min-w-0">
                  <span className="block truncate font-semibold text-[var(--pw-ink)]">{item.label}</span>
                  {item.count !== undefined && item.count > 0 && (
                    <span className="text-[10px] text-[var(--pw-ink)]/50">{item.count} รายการ</span>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <span className="font-bold text-[var(--pw-ink)]">
                    {formatCurrency(item.amount, currencyCode)}
                  </span>
                  <span className="ml-1.5 text-[10px] text-[var(--pw-ink)]/55 font-medium">
                    ({item.percentage.toFixed(1)}%)
                  </span>
                </div>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--pw-surface-sunken)]">
                <div
                  className="h-full rounded-full bg-[var(--pw-primary)] transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, item.percentage))}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="py-6 text-center text-sm text-[var(--pw-ink)]/55">
          <p>{emptyMessage}</p>
        </div>
      )}
    </Card>
  );
}
