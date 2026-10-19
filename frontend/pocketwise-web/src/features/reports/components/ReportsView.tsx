"use client";

import { useMemo, useState } from "react";
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
    () => validRange ? thailandDateBoundaryToUtcIso(fromDate) : "",
    [fromDate, validRange],
  );
  const toUtc = useMemo(
    () => validRange ? thailandDateBoundaryToUtcIso(toDate, true) : "",
    [toDate, validRange],
  );
  const summaryQuery = useReportSummary(fromUtc, toUtc, categoryId, tagId);
  const trendQuery = useReportTrends(fromUtc, toUtc, period, categoryId, tagId);

  const summary = summaryQuery.data;
  const activeCurrency = summary?.currencies.find((item) => item.currencyCode === currencyCode)
    ?? summary?.currencies[0];
  const trendPoints = trendQuery.data?.series
    .filter((item) => item.currencyCode === activeCurrency?.currencyCode)
    .map((item) => ({
      ...item,
      label: formatDate(item.periodStart),
    })) ?? [];

  const rangeMessage = fromDate && toDate && fromDate > toDate
    ? "วันเริ่มต้นต้องไม่มากกว่าวันสิ้นสุด"
    : !fromDate || !toDate
      ? "กรุณาเลือกช่วงวันที่ให้ครบ"
      : "";

  return (
    <div className="space-y-6">
      <header>
        <h1 className="mb-2 text-2xl font-bold">รายงานและภาพรวม</h1>
        <p className="text-sm text-[var(--pw-ink)]/65">สรุปรายรับ รายจ่าย และแนวโน้มจากรายการที่ยืนยันแล้ว</p>
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
                    <SelectItem key={currency.currencyCode} value={currency.currencyCode}>{currency.currencyCode}</SelectItem>
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
                  <SelectItem key={category.categoryId} value={String(category.categoryId)}>{category.categoryName}</SelectItem>
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
                  <SelectItem key={tag.tagId} value={String(tag.tagId)}>#{tag.tagName}</SelectItem>
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
        <Card className="p-6 text-center text-[var(--pw-ink)]/65">ไม่มีรายการที่ยืนยันแล้วในช่วงวันที่นี้</Card>
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="p-4">
              <p className="text-sm text-[var(--pw-ink)]/60">รายรับ</p>
              <p className="mt-2 break-words text-xl font-bold text-[var(--pw-green)]">
                {formatCurrency(activeCurrency.totalIncome, activeCurrency.currencyCode)}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-[var(--pw-ink)]/60">รายจ่าย</p>
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
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Card className="p-4 sm:p-5">
              <h2 className="mb-4 text-lg font-bold">แนวโน้มรายรับและรายจ่าย · {periodLabels[period]}</h2>
              {trendPoints.length ? (
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trendPoints} margin={{ top: 8, right: 12, left: 8, bottom: 8 }}>
                      <CartesianGrid stroke="var(--pw-hairline)" strokeDasharray="3 3" />
                      <XAxis dataKey="label" tick={{ fill: "var(--pw-ink)", fontSize: 12 }} />
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

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <BreakdownCard
              title="ตามแหล่งที่มา"
              items={activeCurrency.sourceBreakdown.map((item) => ({
                label: item.sourceType,
                amount: item.amount,
                percentage: item.percentage,
              }))}
              currencyCode={activeCurrency.currencyCode}
            />
            <BreakdownCard
              title="ตามบัญชีธนาคาร"
              items={activeCurrency.bankAccountBreakdown.map((item) => ({
                label: item.bankName ? `${item.accountName} · ${item.bankName}` : item.accountName,
                amount: item.amount,
                percentage: item.percentage,
              }))}
              currencyCode={activeCurrency.currencyCode}
            />
            <BreakdownCard
              title="ตามบัตรเครดิต"
              items={activeCurrency.creditCardBreakdown.map((item) => ({
                label: item.bankName ? `${item.cardName} · ${item.bankName}` : item.cardName,
                amount: item.amount,
                percentage: item.percentage,
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
  items: { label: string; amount: number; percentage: number }[];
  currencyCode: string;
}) {
  return (
    <Card className="p-4 sm:p-5">
      <h2 className="mb-4 text-lg font-bold">{title}</h2>
      {items.length ? (
        <ul className="space-y-3">
          {items.map((item, index) => (
            <li key={`${item.label}-${index}`} className="flex items-start justify-between gap-3 text-sm">
              <span className="min-w-0 break-words">{item.label}</span>
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
