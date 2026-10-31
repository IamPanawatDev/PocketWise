"use client";

import { useMemo, useState } from "react";
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
  Receipt,
  ReceiptText,
  Plus,
  Scale,
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
import { BottomSheet } from "@/components/ui/bottom-sheet";
import type { ReportPeriod } from "@/types/report.types";
import { cn, formatCurrency, formatDate, thailandDateBoundaryToUtcIso } from "@/lib/utils";
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

  // FR6.1.2 metrics: slip and credit-card calculations
  const slipBreakdown = activeCurrency?.sourceBreakdown.find(
    (item) => item.sourceType.toLowerCase() === "slip",
  );
  const slipExpense =
    activeCurrency?.totalSlipExpense ?? slipBreakdown?.amount ?? 0;
  const slipPercentage = activeCurrency?.totalExpense
    ? (slipExpense / activeCurrency.totalExpense) * 100
    : 0;
  const slipCount = slipBreakdown?.transactionCount ?? 0;

  const cardExpenses =
    activeCurrency?.creditCardBreakdown.filter((c) => c.creditCardId != null) ?? [];
  const creditCardExpense =
    activeCurrency?.totalCreditCardExpense ??
    activeCurrency?.creditCardBreakdown.reduce(
      (sum, c) => sum + (c.creditCardId != null ? c.amount : 0),
      0,
    ) ??
    0;
  const creditCardPercentage = activeCurrency?.totalExpense
    ? (creditCardExpense / activeCurrency.totalExpense) * 100
    : 0;
  const creditCardCount =
    activeCurrency?.creditCardBreakdown.reduce(
      (sum, c) => sum + (c.transactionCount ?? 0),
      0,
    ) ?? 0;

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
    setTagId(undefined);
    setPeriod("monthly");
  };

  // Export State & Handler
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<"csv" | "json">("csv");
  const [exportType, setExportType] = useState<"full" | "transactions">("full");
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!validRange) {
      toast.error(rangeMessage || "กรุณาเลือกช่วงวันที่ให้ถูกต้องก่อนส่งออก");
      return;
    }
    try {
      setIsExporting(true);
      await exportReportFile({
        fromDate: fromUtc,
        toDate: toUtc,
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
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="mb-2 flex items-center gap-2 text-2xl font-bold">
            <BarChart3 className="size-6 text-[var(--pw-primary)]" />
            รายงานและภาพรวม
          </h1>
          <p className="text-sm text-[var(--pw-ink)]/65">
            สรุปรายรับ รายจ่าย ภาพรวมสลิป บัตรเครดิต และแนวโน้มจากรายการที่ยืนยันแล้ว
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"

            className={cn(
              "relative gap-2 min-h-10 text-xs sm:text-sm font-medium transition-all shadow-xs",
              activeFilterCount > 0
                ? "border-[var(--pw-primary)] bg-[var(--pw-primary)]/15 text-[var(--pw-primary)] hover:bg-[var(--pw-primary)]/25 font-semibold"
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
            className="gap-2 min-h-10 text-xs sm:text-sm font-medium border-[var(--pw-hairline)] bg-[var(--pw-surface-indigo)] hover:bg-[var(--pw-surface-indigo)]/80 text-[var(--pw-ink)] shadow-xs"
          >
            <FileDown className="size-4 text-[var(--pw-primary)]" />
            ส่งออกข้อมูลรายงาน
          </Button>
        </div>
      </header>

      {/* Active Filter Chips & Summary */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--pw-hairline)] bg-[var(--pw-surface-indigo)]/50 px-3 py-1 text-xs text-[var(--pw-ink)]">
          <span>ช่วงเวลา: <strong>{fromDate}</strong> ถึง <strong>{toDate}</strong></span>
        </div>

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
            className="text-xs text-[var(--pw-primary)] underline hover:text-[var(--pw-primary)]/80 ml-1"
          >
            ล้างตัวกรอง
          </button>
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
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[75vh] space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="ตั้งแต่วันที่ (ค.ศ. / เวลาไทย)" htmlFor="report-from-date">
              <DateInput id="report-from-date" value={fromDate} onChange={setFromDate} />
            </FormField>
            <FormField label="ถึงวันที่ (ค.ศ. / เวลาไทย)" htmlFor="report-to-date">
              <DateInput id="report-to-date" value={toDate} onChange={setToDate} />
            </FormField>
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

          <div className="flex flex-col-reverse gap-2 pt-4 border-t border-[var(--pw-hairline)] sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={resetFilters}
              disabled={activeFilterCount === 0}
            >
              ล้างตัวกรอง
            </Button>
            <Button
              type="button"
              className="w-full sm:w-auto"
              onClick={() => setShowFilterSheet(false)}
            >
              ดูผลลัพธ์
            </Button>
          </div>
        </div>
      </BottomSheet>

      {summaryQuery.isLoading || trendQuery.isLoading ? (
        <p role="status" className="text-[var(--pw-ink)]/70">กำลังคำนวณรายงาน...</p>
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

          {/* Top KPI Cards (รวมสรุปสลิปและบัตรเครดิต) */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Card className="p-4 border-l-4 border-l-[var(--pw-green)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-center justify-between">
                <p className="text-sm text-[var(--pw-ink)]/60">รายรับทั้งหมด</p>
                <ArrowUpRight className="size-4 text-[var(--pw-green)]" />
              </div>
              <p className="mt-2 break-words text-xl font-bold text-[var(--pw-green)]">
                <AnimatedNumber value={activeCurrency.totalIncome} currencyCode={activeCurrency.currencyCode} />
              </p>
            </Card>
            <Card className="p-4 border-l-4 border-l-[var(--pw-expense)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-center justify-between">
                <p className="text-sm text-[var(--pw-ink)]/60">รายจ่ายทั้งหมด</p>
                <ArrowDownRight className="size-4 text-[var(--pw-expense)]" />
              </div>
              <p className="mt-2 break-words text-xl font-bold text-[var(--pw-expense)]">
                <AnimatedNumber value={activeCurrency.totalExpense} currencyCode={activeCurrency.currencyCode} />
              </p>
            </Card>
            <Card className="p-4 border-l-4 border-l-[var(--pw-link)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-center justify-between">
                <p className="text-sm text-[var(--pw-ink)]/60">คงเหลือสุทธิ</p>
                <Scale className="size-4 text-[var(--pw-link)]" />
              </div>
              <p className="mt-2 break-words text-xl font-bold">
                <AnimatedNumber value={activeCurrency.netAmount} currencyCode={activeCurrency.currencyCode} />
              </p>
            </Card>
            <Card className="p-4 border-l-4 border-l-[var(--pw-primary)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-center justify-between">
                <p className="text-sm text-[var(--pw-ink)]/60">รายจ่ายจากสลิป</p>
                <Receipt className="size-4 text-[var(--pw-primary)]" />
              </div>
              <p className="mt-2 break-words text-xl font-bold text-[var(--pw-primary)]">
                <AnimatedNumber value={slipExpense} currencyCode={activeCurrency.currencyCode} />
              </p>
              <p className="mt-1 text-xs text-[var(--pw-ink)]/55">
                {slipPercentage.toFixed(1)}% ของรายจ่ายรวม
              </p>
            </Card>
            <Card className="p-4 border-l-4 border-l-[var(--pw-magenta)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-center justify-between">
                <p className="text-sm text-[var(--pw-ink)]/60">รายจ่ายจากบัตรเครดิต</p>
                <CreditCard className="size-4 text-[var(--pw-magenta)]" />
              </div>
              <p className="mt-2 break-words text-xl font-bold text-[var(--pw-magenta)]">
                <AnimatedNumber value={creditCardExpense} currencyCode={activeCurrency.currencyCode} />
              </p>
              <p className="mt-1 text-xs text-[var(--pw-ink)]/55">
                {creditCardPercentage.toFixed(1)}% ของรายจ่ายรวม
              </p>
            </Card>
          </div>

          {/* FR6.1.2: ดูภาพรวมรายจ่ายจากสลิปและบัตรเครดิต */}
          <Card className="p-4 sm:p-5 border-[var(--pw-border)]">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--pw-hairline)] pb-3">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Receipt className="size-5 text-[var(--pw-primary)]" />
                  ภาพรวมรายจ่ายจากสลิปและบัตรเครดิต
                </h2>
                <p className="text-xs text-[var(--pw-ink)]/65">
                  เปรียบเทียบสัดส่วนและรายละเอียดยอดใช้จ่ายจากการสแกนสลิปโอนเงินและการรูดบัตรเครดิต
                </p>
              </div>
              <div className="flex gap-2">
                <Link href="/transactions?sourceType=slip">
                  <Button size="sm" variant="outline" className="h-8 text-xs">
                    <Receipt className="size-3.5" />
                    รายการสลิป
                  </Button>
                </Link>
                <Link href="/credit-cards">
                  <Button size="sm" variant="outline" className="h-8 text-xs">
                    <CreditCard className="size-3.5" />
                    จัดการบัตรเครดิต
                  </Button>
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* Panel 1: สลิปโอนเงิน */}
              <div className="rounded-lg border border-[var(--pw-hairline)] bg-[var(--pw-surface-raised)]/40 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-[var(--pw-primary)]/10 text-[var(--pw-primary)]">
                      <Receipt className="size-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">สลิปโอนเงิน (Slip Transactions)</h3>
                      <p className="text-xs text-[var(--pw-ink)]/60">รายการที่นำเข้าและอ่านจากสลิปโอนเงิน</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-[var(--pw-primary)]/15 px-2.5 py-0.5 text-xs font-semibold text-[var(--pw-primary)]">
                    {slipPercentage.toFixed(1)}% ของรายจ่าย
                  </span>
                </div>

                <div className="flex items-baseline justify-between pt-2">
                  <span className="text-2xl font-bold text-[var(--pw-ink)]">
                    {formatCurrency(slipExpense, activeCurrency.currencyCode)}
                  </span>
                  <span className="text-xs text-[var(--pw-ink)]/70">
                    {slipCount > 0 ? `${slipCount} รายการ` : slipExpense > 0 ? "มีรายการ" : "ยังไม่มีรายการสลิป"}
                  </span>
                </div>

                <div className="w-full bg-[var(--pw-hairline)] rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-[var(--pw-primary)] h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(100, slipPercentage)}%` }}
                  />
                </div>

                <p className="text-xs text-[var(--pw-ink)]/60">
                  {slipExpense > 0
                    ? `ยอดเงินจากการสแกนและนำเข้าสลิปคิดเป็น ${slipPercentage.toFixed(1)}% จากรายจ่ายทั้งหมด ${formatCurrency(activeCurrency.totalExpense, activeCurrency.currencyCode)}`
                    : "ยังไม่พบรายจ่ายจากการนำเข้าสลิปในช่วงเวลานี้ สามารถอัปโหลดสลิปได้ที่หน้านำเข้าข้อมูล"}
                </p>
              </div>

              {/* Panel 2: บัตรเครดิต */}
              <div className="rounded-lg border border-[var(--pw-hairline)] bg-[var(--pw-surface-raised)]/40 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-[var(--pw-magenta)]/10 text-[var(--pw-magenta)]">
                      <CreditCard className="size-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">บัตรเครดิต (Credit Card Expenses)</h3>
                      <p className="text-xs text-[var(--pw-ink)]/60">รายการที่รูดหรือตัดจ่ายผ่านบัตรเครดิต</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-[var(--pw-magenta)]/15 px-2.5 py-0.5 text-xs font-semibold text-[var(--pw-magenta)]">
                    {creditCardPercentage.toFixed(1)}% ของรายจ่าย
                  </span>
                </div>

                <div className="flex items-baseline justify-between pt-2">
                  <span className="text-2xl font-bold text-[var(--pw-ink)]">
                    {formatCurrency(creditCardExpense, activeCurrency.currencyCode)}
                  </span>
                  <span className="text-xs text-[var(--pw-ink)]/70">
                    {creditCardCount > 0 ? `${creditCardCount} รายการ` : creditCardExpense > 0 ? "มีรายการ" : "ยังไม่มีรายการบัตร"}
                  </span>
                </div>

                <div className="w-full bg-[var(--pw-hairline)] rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-[var(--pw-magenta)] h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(100, creditCardPercentage)}%` }}
                  />
                </div>

                {cardExpenses.length > 0 ? (
                  <div className="space-y-1.5 pt-1">
                    <p className="text-xs font-medium text-[var(--pw-ink)]/75">แยกตามบัตรแต่ละใบ:</p>
                    <ul className="space-y-1">
                      {cardExpenses.map((card, idx) => (
                        <li key={`${card.creditCardId}-${idx}`} className="flex items-center justify-between text-xs">
                          <span className="truncate text-[var(--pw-ink)]/80">
                            💳 {card.cardName} {card.bankName ? `(${card.bankName})` : ""}
                          </span>
                          <span className="font-medium shrink-0">
                            {formatCurrency(card.amount, activeCurrency.currencyCode)}
                            <span className="ml-1 text-[var(--pw-ink)]/50">({card.percentage.toFixed(1)}%)</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-xs text-[var(--pw-ink)]/60">
                    {creditCardExpense > 0
                      ? `ยอดเงินจากการใช้บัตรคิดเป็น ${creditCardPercentage.toFixed(1)}% จากรายจ่ายทั้งหมด`
                      : "ยังไม่พบรายจ่ายจากบัตรเครดิตในช่วงเวลานี้ สามารถเลือกผูกบัตรเครดิตได้ตอนบันทึกรายจ่าย"}
                  </p>
                )}
              </div>
            </div>
          </Card>

          {/* Charts Row */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Card className="p-4 sm:p-5">
              <h2 className="mb-4 text-lg font-bold">แนวโน้มรายรับและรายจ่าย · {periodLabels[period]}</h2>
              {trendPoints.length ? (
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trendPoints} margin={{ top: 8, right: 12, left: 8, bottom: 8 }}>
                      <CartesianGrid stroke="var(--pw-hairline)" strokeDasharray="3 3" />
                      <XAxis
                        dataKey="label"
                        interval={0}
                        angle={-25}
                        textAnchor="end"
                        height={50}
                        tick={{ fill: "var(--pw-ink)", fontSize: 11 }}
                      />
                      <YAxis tick={{ fill: "var(--pw-ink)", fontSize: 12 }} />
                      <Tooltip formatter={(value) => formatCurrency(Number(value), activeCurrency.currencyCode)} />
                      <Legend />
                      <Bar
                        dataKey="income"
                        name="รายรับ"
                        fill="var(--pw-green)"
                        radius={[5, 5, 0, 0]}
                        isAnimationActive={true}
                        animationDuration={850}
                        animationEasing="ease-out"
                      />
                      <Bar
                        dataKey="expense"
                        name="รายจ่าย"
                        fill="var(--pw-expense)"
                        radius={[5, 5, 0, 0]}
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
              <h2 className="mb-4 text-lg font-bold">รายจ่ายตามหมวดหมู่</h2>
              {activeCurrency.categoryBreakdown.length ? (
                <div className="grid grid-cols-1 items-center gap-4 md:grid-cols-2">
                  <div className="h-64 min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={activeCurrency.categoryBreakdown}
                          dataKey="amount"
                          nameKey="categoryName"
                          innerRadius={50}
                          outerRadius={88}
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
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className="space-y-2">
                    {activeCurrency.categoryBreakdown.map((item, index) => (
                      <li key={`${item.categoryId ?? "none"}-${item.categoryName}`} className="flex min-w-0 items-center gap-2 text-sm">
                        <span aria-hidden="true" className="size-3 shrink-0 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
                        <span className="min-w-0 flex-1 truncate">{item.categoryName}</span>
                        <span className="shrink-0 text-right">{item.percentage.toFixed(1)}%</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="py-12 text-center text-sm text-[var(--pw-ink)]/60">ไม่มีรายจ่ายแยกตามหมวดหมู่</p>
              )}
            </Card>
          </div>

          {/* Breakdown Cards */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
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
        </>
      )}

      {/* Export Report Modal */}
      {isExportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-[var(--pw-rounded-lg)] bg-[var(--pw-surface-indigo)] border border-[var(--pw-hairline)] p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--pw-hairline)]">
              <div className="flex items-center gap-2">
                <FileDown className="size-5 text-[var(--pw-primary)]" />
                <h3 className="text-base font-semibold text-[var(--pw-ink)]">
                  ส่งออกข้อมูลรายงาน (Export Report)
                </h3>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => setIsExportOpen(false)}>
                <X className="size-4" />
              </Button>
            </div>

            <p className="text-xs text-[var(--pw-ink)]/70">
              ดาวน์โหลดรายงานข้อมูลสรุปและรายการธุรกรรมในช่วงเวลาที่คุณเลือก
            </p>

            <div className="p-3 rounded-lg bg-[var(--pw-surface-black)] border border-[var(--pw-hairline)] space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[var(--pw-ink)]/60">ช่วงวันที่:</span>
                <span className="font-mono text-[var(--pw-ink)]">{fromDate} ถึง {toDate}</span>
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

            <div className="space-y-3">
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
                    <span className="text-[10px] text-[var(--pw-ink)]/50 mt-0.5">ภาพรวม + ทุกรายการ</span>
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
                    <span className="text-[10px] text-[var(--pw-ink)]/50 mt-0.5">ตารางรายการดิบ</span>
                  </button>
                </div>
              </div>

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
                    <FileSpreadsheet className="size-4 shrink-0" />
                    <span>CSV (Excel)</span>
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
                    <FileJson className="size-4 shrink-0" />
                    <span>JSON (Data)</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 pt-4 border-t border-[var(--pw-hairline)] sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                className="w-full sm:w-auto text-xs"
                onClick={() => setIsExportOpen(false)}
              >
                ยกเลิก
              </Button>
              <Button
                type="button"
                variant="default"
                className="w-full sm:w-auto text-xs gap-1.5"
                onClick={handleExport}
                disabled={isExporting}
              >
                {isExporting ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" />
                    กำลังสร้างไฟล์...
                  </>
                ) : (
                  <>
                    <Download className="size-4" />
                    ดาวน์โหลดไฟล์
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
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
            <li key={`${item.label}-${index}`} className="flex items-start justify-between gap-3 text-sm">
              <div className="min-w-0">
                <span className="block break-words font-medium">{item.label}</span>
                {item.count !== undefined && item.count > 0 && (
                  <span className="text-xs text-[var(--pw-ink)]/50">{item.count} รายการ</span>
                )}
              </div>
              <span className="shrink-0 text-right">
                {formatCurrency(item.amount, currencyCode)}
                <span className="ml-2 block text-xs text-[var(--pw-ink)]/55">{item.percentage.toFixed(1)}%</span>
              </span>
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
