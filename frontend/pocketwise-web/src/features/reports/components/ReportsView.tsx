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
import { CreditCard, Receipt } from "lucide-react";
import { useCategories } from "@/features/categories/hooks/useCategories";
import { useTags } from "@/features/tags/hooks/useTags";
import { useReportSummary, useReportTrends } from "@/features/reports/hooks/useReports";
import type { ReportPeriod } from "@/types/report.types";
import { formatCurrency, formatDate, thailandDateBoundaryToUtcIso } from "@/lib/utils";
import { ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

  return (
    <div className="space-y-6">
      <header>
        <h1 className="mb-2 text-2xl font-bold">รายงานและภาพรวม</h1>
        <p className="text-sm text-[var(--pw-ink)]/65">
          สรุปรายรับ รายจ่าย ภาพรวมสลิป บัตรเครดิต และแนวโน้มจากรายการที่ยืนยันแล้ว
        </p>
      </header>

      <Card className="p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        {rangeMessage && <p role="alert" className="mt-3 text-sm text-[var(--pw-expense)]">{rangeMessage}</p>}
      </Card>

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
        <Card className="p-6 text-center text-[var(--pw-ink)]/65">
          ไม่มีรายการที่ยืนยันแล้วในช่วงวันที่นี้
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
            <Card className="p-4">
              <p className="text-sm text-[var(--pw-ink)]/60">รายรับทั้งหมด</p>
              <p className="mt-2 break-words text-xl font-bold text-[var(--pw-green)]">
                {formatCurrency(activeCurrency.totalIncome, activeCurrency.currencyCode)}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-[var(--pw-ink)]/60">รายจ่ายทั้งหมด</p>
              <p className="mt-2 break-words text-xl font-bold text-[var(--pw-expense)]">
                {formatCurrency(activeCurrency.totalExpense, activeCurrency.currencyCode)}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-[var(--pw-ink)]/60">คงเหลือสุทธิ</p>
              <p className="mt-2 break-words text-xl font-bold">
                {formatCurrency(activeCurrency.netAmount, activeCurrency.currencyCode)}
              </p>
            </Card>
            <Card className="p-4 border-l-4 border-l-[var(--pw-primary)]">
              <div className="flex items-center justify-between">
                <p className="text-sm text-[var(--pw-ink)]/60">รายจ่ายจากสลิป</p>
                <Receipt className="size-4 text-[var(--pw-primary)]" />
              </div>
              <p className="mt-2 break-words text-xl font-bold text-[var(--pw-primary)]">
                {formatCurrency(slipExpense, activeCurrency.currencyCode)}
              </p>
              <p className="mt-1 text-xs text-[var(--pw-ink)]/55">
                {slipPercentage.toFixed(1)}% ของรายจ่ายรวม
              </p>
            </Card>
            <Card className="p-4 border-l-4 border-l-[var(--pw-magenta)]">
              <div className="flex items-center justify-between">
                <p className="text-sm text-[var(--pw-ink)]/60">รายจ่ายจากบัตรเครดิต</p>
                <CreditCard className="size-4 text-[var(--pw-magenta)]" />
              </div>
              <p className="mt-2 break-words text-xl font-bold text-[var(--pw-magenta)]">
                {formatCurrency(creditCardExpense, activeCurrency.currencyCode)}
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
                      <Bar dataKey="income" name="รายรับ" fill="var(--pw-green)" radius={[5, 5, 0, 0]} />
                      <Bar dataKey="expense" name="รายจ่าย" fill="var(--pw-expense)" radius={[5, 5, 0, 0]} />
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
              items={activeCurrency.sourceBreakdown.map((item) => ({
                label: formatSourceTypeName(item.sourceType),
                amount: item.amount,
                percentage: item.percentage,
                count: item.transactionCount,
              }))}
              currencyCode={activeCurrency.currencyCode}
            />
            <BreakdownCard
              title="ตามบัญชีธนาคาร"
              items={activeCurrency.bankAccountBreakdown.map((item) => ({
                label: item.bankName ? `${item.accountName} · ${item.bankName}` : item.accountName,
                amount: item.amount,
                percentage: item.percentage,
                count: item.transactionCount,
              }))}
              currencyCode={activeCurrency.currencyCode}
            />
            <BreakdownCard
              title="ตามบัตรเครดิต"
              items={activeCurrency.creditCardBreakdown.map((item) => ({
                label: item.bankName ? `${item.cardName} · ${item.bankName}` : item.cardName,
                amount: item.amount,
                percentage: item.percentage,
                count: item.transactionCount,
              }))}
              currencyCode={activeCurrency.currencyCode}
            />
          </div>
        </>
      )}
    </div>
  );
}

function BreakdownCard({
  title,
  items,
  currencyCode,
}: {
  title: string;
  items: { label: string; amount: number; percentage: number; count?: number }[];
  currencyCode: string;
}) {
  return (
    <Card className="p-4 sm:p-5">
      <h2 className="mb-4 text-lg font-bold">{title}</h2>
      {items.length ? (
        <ul className="space-y-3">
          {items.map((item, index) => (
            <li key={`${item.label}-${index}`} className="flex items-start justify-between gap-3 text-sm">
              <div className="min-w-0">
                <span className="block break-words">{item.label}</span>
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
        <p className="text-sm text-[var(--pw-ink)]/60">ไม่มีข้อมูล</p>
      )}
    </Card>
  );
}
