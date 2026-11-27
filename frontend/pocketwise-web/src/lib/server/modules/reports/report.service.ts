import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/server/db";
import {
  bankAccounts,
  categories,
  creditCards,
  merchants,
  tags,
  transactions,
  transactionTags,
} from "@/lib/server/db/schema";
import { ValidationErrorAppError } from "@/lib/server/api-error";
import { logAudit } from "@/lib/server/audit";

export type ReportPeriod = "weekly" | "monthly" | "quarterly" | "yearly";

export interface ReportCategoryBreakdown {
  categoryId: number | null;
  categoryName: string;
  amount: number;
  percentage: number;
  transactionCount?: number;
}

export interface ReportSourceBreakdown {
  sourceType: string;
  amount: number;
  percentage: number;
  transactionCount?: number;
}

export interface ReportBankAccountBreakdown {
  bankAccountId: number | null;
  accountName: string;
  bankName: string | null;
  amount: number;
  percentage: number;
  transactionCount?: number;
}

export interface ReportCreditCardBreakdown {
  creditCardId: number | null;
  cardName: string;
  bankName: string | null;
  amount: number;
  percentage: number;
  transactionCount?: number;
}

export interface ReportCurrencySummary {
  currencyCode: string;
  totalIncome: number;
  totalExpense: number;
  netAmount: number;
  totalSlipExpense: number;
  totalCreditCardExpense: number;
  categoryBreakdown: ReportCategoryBreakdown[];
  sourceBreakdown: ReportSourceBreakdown[];
  bankAccountBreakdown: ReportBankAccountBreakdown[];
  creditCardBreakdown: ReportCreditCardBreakdown[];
}

export interface ReportSummaryResponse {
  fromDate: string;
  toDate: string;
  currencies: ReportCurrencySummary[];
}

export interface ReportTrendPoint {
  periodStart: string;
  periodEnd: string;
  currencyCode: string;
  income: number;
  expense: number;
  netAmount: number;
}

export interface ReportTrendResponse {
  period: ReportPeriod;
  fromDate: string;
  toDate: string;
  series: ReportTrendPoint[];
}

export interface ReportFilter {
  fromDate: string;
  toDate: string;
  categoryId?: number;
  tagId?: number;
}

export interface RawReportTransaction {
  transactionId: number;
  transactionDate: Date;
  transactionType: string;
  amount: number;
  currencyCode: string;
  sourceType: string;
  description: string | null;
  categoryId: number | null;
  categoryName: string | null;
  merchantName: string | null;
  bankAccountId: number | null;
  accountName: string | null;
  bankName: string | null;
  creditCardId: number | null;
  cardName: string | null;
  creditCardBankName: string | null;
}

function calculatePercentage(amount: number, total: number): number {
  return total === 0 ? 0 : Number(((amount / total) * 100).toFixed(2));
}

function toBangkokDateString(d: Date): string {
  // Add 7 hours
  const bkk = new Date(d.getTime() + 7 * 3600 * 1000);
  return bkk.toISOString().slice(0, 10);
}

function toBangkokDateTimeString(d: Date): string {
  const bkk = new Date(d.getTime() + 7 * 3600 * 1000);
  return bkk.toISOString().replace("T", " ").slice(0, 19);
}

function parsePeriodStart(dateStr: string, period: ReportPeriod): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  if (period === "weekly") {
    const day = d.getUTCDay();
    d.setUTCDate(d.getUTCDate() - day);
  } else if (period === "monthly") {
    d.setUTCDate(1);
  } else if (period === "quarterly") {
    const month = d.getUTCMonth();
    const qMonth = Math.floor(month / 3) * 3;
    d.setUTCMonth(qMonth, 1);
  } else if (period === "yearly") {
    d.setUTCMonth(0, 1);
  }
  return d.toISOString().slice(0, 10);
}

function advancePeriod(dateStr: string, period: ReportPeriod): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  if (period === "weekly") {
    d.setUTCDate(d.getUTCDate() + 7);
  } else if (period === "monthly") {
    d.setUTCMonth(d.getUTCMonth() + 1, 1);
  } else if (period === "quarterly") {
    d.setUTCMonth(d.getUTCMonth() + 3, 1);
  } else if (period === "yearly") {
    d.setUTCFullYear(d.getUTCFullYear() + 1, 0, 1);
  }
  return d.toISOString().slice(0, 10);
}

function escapeCsv(val: string | null | undefined): string {
  if (!val) return "";
  if (val.includes(",") || val.includes('"') || val.includes("\n") || val.includes("\r")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

export class ReportService {
  /**
   * Fetch confirmed transactions for reports excluding transfers
   */
  private static async getReportTransactions(
    userId: number,
    filter: ReportFilter
  ): Promise<RawReportTransaction[]> {
    const fromUtc = new Date(filter.fromDate);
    const toUtc = new Date(filter.toDate);

    if (fromUtc > toUtc) {
      throw new ValidationErrorAppError("fromDate ต้องไม่เกิน toDate", [
        { field: "fromDate", message: "fromDate ต้องไม่เกิน toDate" },
      ]);
    }

    const conditions = [
      eq(transactions.userId, userId),
      eq(transactions.isDeleted, false),
      sql`LOWER(${transactions.status}) = 'confirmed'`,
      sql`LOWER(${transactions.transactionType}) != 'transfer'`,
      sql`${transactions.transactionDate} >= ${fromUtc.toISOString()}::timestamptz`,
      sql`${transactions.transactionDate} <= ${toUtc.toISOString()}::timestamptz`,
    ];

    if (filter.categoryId) {
      conditions.push(eq(transactions.categoryId, filter.categoryId));
    }

    if (filter.tagId) {
      conditions.push(
        sql`EXISTS (
          SELECT 1 FROM "TransactionTags" tt
          WHERE tt."TransactionId" = ${transactions.transactionId} AND tt."TagId" = ${filter.tagId}
        )`
      );
    }

    const rows = await db
      .select({
        transactionId: transactions.transactionId,
        transactionDate: transactions.transactionDate,
        transactionType: transactions.transactionType,
        amount: transactions.amount,
        currencyCode: transactions.currencyCode,
        sourceType: transactions.sourceType,
        description: transactions.description,
        categoryId: transactions.categoryId,
        categoryName: categories.categoryName,
        merchantName: merchants.merchantName,
        bankAccountId: transactions.bankAccountId,
        accountName: bankAccounts.accountName,
        bankName: bankAccounts.bankName,
        creditCardId: transactions.creditCardId,
        cardName: creditCards.cardName,
        creditCardBankName: creditCards.bankName,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.categoryId))
      .leftJoin(merchants, eq(transactions.merchantId, merchants.merchantId))
      .leftJoin(bankAccounts, eq(transactions.bankAccountId, bankAccounts.bankAccountId))
      .leftJoin(creditCards, eq(transactions.creditCardId, creditCards.creditCardId))
      .where(and(...conditions))
      .orderBy(asc(transactions.transactionDate));

    return rows.map((r) => ({
      transactionId: r.transactionId,
      transactionDate: r.transactionDate,
      transactionType: r.transactionType,
      amount: Number(r.amount) || 0,
      currencyCode: (r.currencyCode || "THB").toUpperCase(),
      sourceType: r.sourceType,
      description: r.description,
      categoryId: r.categoryId,
      categoryName: r.categoryName,
      merchantName: r.merchantName,
      bankAccountId: r.bankAccountId,
      accountName: r.accountName,
      bankName: r.bankName,
      creditCardId: r.creditCardId,
      cardName: r.cardName,
      creditCardBankName: r.creditCardBankName,
    }));
  }

  /**
   * Helper to build currency summaries from transactions
   */
  private static buildCurrencySummaries(
    records: RawReportTransaction[]
  ): ReportCurrencySummary[] {
    const groups = new Map<string, RawReportTransaction[]>();
    for (const r of records) {
      if (!groups.has(r.currencyCode)) {
        groups.set(r.currencyCode, []);
      }
      groups.get(r.currencyCode)!.push(r);
    }

    const result: ReportCurrencySummary[] = [];

    for (const [currencyCode, list] of groups.entries()) {
      let income = 0;
      let totalExpense = 0;
      let totalSlipExpense = 0;
      let totalCreditCardExpense = 0;

      const expenses: RawReportTransaction[] = [];

      for (const t of list) {
        const typeLower = t.transactionType.toLowerCase();
        if (typeLower === "income") {
          income += t.amount;
        } else if (typeLower === "expense") {
          totalExpense += t.amount;
          expenses.push(t);

          if (t.sourceType.toLowerCase() === "slip") {
            totalSlipExpense += t.amount;
          }
          if (t.creditCardId || t.sourceType.toLowerCase() === "cardstatement") {
            totalCreditCardExpense += t.amount;
          }
        }
      }

      // 1. Category breakdown
      const catMap = new Map<string, { id: number | null; name: string; amount: number; count: number }>();
      for (const e of expenses) {
        const key = e.categoryId ? String(e.categoryId) : "uncategorized";
        if (!catMap.has(key)) {
          catMap.set(key, {
            id: e.categoryId,
            name: e.categoryName || "ไม่ระบุหมวดหมู่",
            amount: 0,
            count: 0,
          });
        }
        const item = catMap.get(key)!;
        item.amount += e.amount;
        item.count++;
      }
      const categoryBreakdown: ReportCategoryBreakdown[] = Array.from(catMap.values())
        .map((c) => ({
          categoryId: c.id,
          categoryName: c.name,
          amount: Number(c.amount.toFixed(2)),
          percentage: calculatePercentage(c.amount, totalExpense),
          transactionCount: c.count,
        }))
        .sort((a, b) => b.amount - a.amount);

      // 2. Source breakdown
      const srcMap = new Map<string, { amount: number; count: number }>();
      for (const e of expenses) {
        const key = e.sourceType.charAt(0).toLowerCase() + e.sourceType.slice(1);
        if (!srcMap.has(key)) {
          srcMap.set(key, { amount: 0, count: 0 });
        }
        const item = srcMap.get(key)!;
        item.amount += e.amount;
        item.count++;
      }
      const sourceBreakdown: ReportSourceBreakdown[] = Array.from(srcMap.entries())
        .map(([k, v]) => ({
          sourceType: k,
          amount: Number(v.amount.toFixed(2)),
          percentage: calculatePercentage(v.amount, totalExpense),
          transactionCount: v.count,
        }))
        .sort((a, b) => b.amount - a.amount);

      // 3. Bank Account breakdown
      const bankMap = new Map<number, { name: string; bankName: string | null; amount: number; count: number }>();
      for (const e of expenses) {
        if (e.bankAccountId) {
          if (!bankMap.has(e.bankAccountId)) {
            bankMap.set(e.bankAccountId, {
              name: e.accountName || "บัญชีธนาคาร",
              bankName: e.bankName,
              amount: 0,
              count: 0,
            });
          }
          const item = bankMap.get(e.bankAccountId)!;
          item.amount += e.amount;
          item.count++;
        }
      }
      const bankAccountBreakdown: ReportBankAccountBreakdown[] = Array.from(bankMap.entries())
        .map(([id, v]) => ({
          bankAccountId: id,
          accountName: v.name,
          bankName: v.bankName,
          amount: Number(v.amount.toFixed(2)),
          percentage: calculatePercentage(v.amount, totalExpense),
          transactionCount: v.count,
        }))
        .sort((a, b) => b.amount - a.amount);

      // 4. Credit Card breakdown
      const cardMap = new Map<string, { id: number | null; name: string; bankName: string | null; amount: number; count: number }>();
      for (const e of expenses) {
        if (e.creditCardId || e.sourceType.toLowerCase() === "cardstatement") {
          const key = e.creditCardId ? String(e.creditCardId) : "statement";
          if (!cardMap.has(key)) {
            cardMap.set(key, {
              id: e.creditCardId,
              name: e.cardName || (e.creditCardId ? "บัตรเครดิต" : "ใบแจ้งยอดบัตร"),
              bankName: e.creditCardBankName,
              amount: 0,
              count: 0,
            });
          }
          const item = cardMap.get(key)!;
          item.amount += e.amount;
          item.count++;
        }
      }
      const creditCardBreakdown: ReportCreditCardBreakdown[] = Array.from(cardMap.values())
        .map((c) => ({
          creditCardId: c.id,
          cardName: c.name,
          bankName: c.bankName,
          amount: Number(c.amount.toFixed(2)),
          percentage: calculatePercentage(c.amount, totalExpense),
          transactionCount: c.count,
        }))
        .sort((a, b) => b.amount - a.amount);

      result.push({
        currencyCode,
        totalIncome: Number(income.toFixed(2)),
        totalExpense: Number(totalExpense.toFixed(2)),
        netAmount: Number((income - totalExpense).toFixed(2)),
        totalSlipExpense: Number(totalSlipExpense.toFixed(2)),
        totalCreditCardExpense: Number(totalCreditCardExpense.toFixed(2)),
        categoryBreakdown,
        sourceBreakdown,
        bankAccountBreakdown,
        creditCardBreakdown,
      });
    }

    return result.sort((a, b) => a.currencyCode.localeCompare(b.currencyCode));
  }

  /**
   * GET /api/v1/reports/summary
   */
  static async getSummary(
    userId: number,
    filter: ReportFilter
  ): Promise<ReportSummaryResponse> {
    const records = await this.getReportTransactions(userId, filter);
    const currencies = this.buildCurrencySummaries(records);

    return {
      fromDate: new Date(filter.fromDate).toISOString(),
      toDate: new Date(filter.toDate).toISOString(),
      currencies,
    };
  }

  /**
   * GET /api/v1/reports/trends
   */
  static async getTrends(
    userId: number,
    filter: ReportFilter & { period: string }
  ): Promise<ReportTrendResponse> {
    const rawPeriod = (filter.period || "monthly").toLowerCase();
    if (!["weekly", "monthly", "quarterly", "yearly"].includes(rawPeriod)) {
      throw new ValidationErrorAppError("period ต้องเป็น weekly, monthly, quarterly หรือ yearly", [
        { field: "period", message: "period ต้องเป็น weekly, monthly, quarterly หรือ yearly" },
      ]);
    }
    const period = rawPeriod as ReportPeriod;

    const records = await this.getReportTransactions(userId, filter);

    // Collect all currencies
    const currencySet = new Set<string>();
    for (const r of records) {
      currencySet.add(r.currencyCode);
    }
    if (currencySet.size === 0) {
      currencySet.add("THB");
    }
    const currencies = Array.from(currencySet).sort();

    // Map records to (currency, periodStart)
    const bucketMap = new Map<string, { income: number; expense: number }>();

    for (const r of records) {
      const bkkDateStr = toBangkokDateString(r.transactionDate);
      const periodStart = parsePeriodStart(bkkDateStr, period);
      const key = `${r.currencyCode}#${periodStart}`;

      if (!bucketMap.has(key)) {
        bucketMap.set(key, { income: 0, expense: 0 });
      }
      const item = bucketMap.get(key)!;
      const typeLower = r.transactionType.toLowerCase();
      if (typeLower === "income") {
        item.income += r.amount;
      } else if (typeLower === "expense") {
        item.expense += r.amount;
      }
    }

    const fromBkk = toBangkokDateString(new Date(filter.fromDate));
    const toBkk = toBangkokDateString(new Date(filter.toDate));
    const firstPeriod = parsePeriodStart(fromBkk, period);
    const lastPeriod = parsePeriodStart(toBkk, period);

    const series: ReportTrendPoint[] = [];
    let currentStart = firstPeriod;
    let guard = 0;

    while (currentStart <= lastPeriod && guard < 500) {
      const nextStart = advancePeriod(currentStart, period);
      // periodEnd is nextStart - 1 day
      const nextStartDate = new Date(`${nextStart}T00:00:00.000Z`);
      const periodEndDate = new Date(nextStartDate.getTime() - 24 * 3600 * 1000);
      const periodEnd = periodEndDate.toISOString().slice(0, 10);

      for (const currency of currencies) {
        const key = `${currency}#${currentStart}`;
        const data = bucketMap.get(key) ?? { income: 0, expense: 0 };

        series.push({
          periodStart: currentStart,
          periodEnd,
          currencyCode: currency,
          income: Number(data.income.toFixed(2)),
          expense: Number(data.expense.toFixed(2)),
          netAmount: Number((data.income - data.expense).toFixed(2)),
        });
      }

      currentStart = nextStart;
      guard++;
    }

    return {
      period,
      fromDate: new Date(filter.fromDate).toISOString(),
      toDate: new Date(filter.toDate).toISOString(),
      series,
    };
  }

  /**
   * GET /api/v1/reports/export
   */
  static async exportReport(
    userId: number,
    filter: ReportFilter & { format?: string; type?: string }
  ): Promise<{ content: Buffer | Uint8Array; contentType: string; fileName: string }> {
    const records = await this.getReportTransactions(userId, filter);
    const format = (filter.format || "csv").toLowerCase().trim();
    const type = (filter.type || "full").toLowerCase().trim();

    if (format !== "csv" && format !== "json") {
      throw new ValidationErrorAppError("รูปแบบการส่งออกต้องเป็น csv หรือ json เท่านั้น", [
        { field: "format", message: "รูปแบบการส่งออกต้องเป็น csv หรือ json เท่านั้น" },
      ]);
    }

    const fromBkk = toBangkokDateString(new Date(filter.fromDate)).replace(/-/g, "");
    const toBkk = toBangkokDateString(new Date(filter.toDate)).replace(/-/g, "");
    const fileNameBase = `pocketwise-report-${fromBkk}-${toBkk}`;

    let result: { content: Buffer | Uint8Array; contentType: string; fileName: string };

    if (format === "json") {
      const currencies = this.buildCurrencySummaries(records);
      const payload = {
        exportedAt: new Date().toISOString(),
        period: {
          from: new Date(filter.fromDate).toISOString(),
          to: new Date(filter.toDate).toISOString(),
        },
        currencies,
        transactions: records.map((t) => ({
          transactionId: t.transactionId,
          date: toBangkokDateString(t.transactionDate),
          time: toBangkokDateTimeString(t.transactionDate).slice(11),
          type: t.transactionType,
          amount: t.amount,
          currencyCode: t.currencyCode,
          source: t.sourceType,
          categoryName: t.categoryName,
          merchantName: t.merchantName,
          description: t.description,
          account: t.bankAccountId ? `${t.bankName || ""} - ${t.accountName || ""}`.trim() : (!t.creditCardId ? "เงินสด" : null),
          card: t.creditCardId ? `${t.creditCardBankName || ""} - ${t.cardName || ""}`.trim() : null,
        })),
      };

      const jsonStr = JSON.stringify(payload, null, 2);
      result = {
        content: Buffer.from(jsonStr, "utf-8"),
        contentType: "application/json; charset=utf-8",
        fileName: `${fileNameBase}.json`,
      };
    } else {
      // CSV format with UTF-8 BOM
      const lines: string[] = [];
      const generatedAt = toBangkokDateTimeString(new Date());

      lines.push("# PocketWise Financial Report (รายงานการเงิน PocketWise)");
      lines.push(`# ช่วงวันที่รายงาน: ${toBangkokDateString(new Date(filter.fromDate))} ถึง ${toBangkokDateString(new Date(filter.toDate))}`);
      lines.push(`# วันเวลาที่สร้างรายงาน: ${generatedAt} (เวลาประเทศไทย)`);
      lines.push(`# จำนวนรายการทั้งหมด: ${records.length} รายการ`);
      lines.push("");

      if (type !== "transactions") {
        const summaries = this.buildCurrencySummaries(records);

        // 1. Financial summary
        lines.push("=== 1. สรุปภาพรวมทางการเงิน (Financial Summary) ===");
        lines.push("สกุลเงิน,รายรับรวม,รายจ่ายรวม,ยอดคงเหลือสุทธิ,รายจ่ายจากสลิปโอนเงิน (Slip),รายจ่ายจากบัตรเครดิต (Credit Card)");
        for (const c of summaries) {
          lines.push(
            `${escapeCsv(c.currencyCode)},${c.totalIncome.toFixed(2)},${c.totalExpense.toFixed(2)},${c.netAmount.toFixed(2)},${c.totalSlipExpense.toFixed(2)},${c.totalCreditCardExpense.toFixed(2)}`
          );
        }
        lines.push("");

        // 2. Category breakdown
        lines.push("=== 2. สัดส่วนรายจ่ายตามหมวดหมู่ (Expense Breakdown by Category) ===");
        lines.push("สกุลเงิน,หมวดหมู่,ยอดเงิน,สัดส่วน (%),จำนวนรายการ");
        for (const c of summaries) {
          for (const cat of c.categoryBreakdown) {
            lines.push(
              `${escapeCsv(c.currencyCode)},${escapeCsv(cat.categoryName)},${cat.amount.toFixed(2)},${cat.percentage.toFixed(2)}%,${cat.transactionCount}`
            );
          }
        }
        lines.push("");
      }

      // 4. Transaction details
      lines.push("=== รายการธุรกรรม (Transaction Details) ===");
      lines.push("รหัสรายการ,วันที่,เวลา,ประเภท,หมวดหมู่,ร้านค้า,รายละเอียด,จำนวนเงิน,สกุลเงิน,ช่องทาง,บัญชี/บัตร");
      for (const t of records) {
        const dateStr = toBangkokDateString(t.transactionDate);
        const timeStr = toBangkokDateTimeString(t.transactionDate).slice(11);
        const accountOrCard = t.bankAccountId
          ? `${t.bankName || ""} - ${t.accountName || ""}`.trim()
          : t.creditCardId
          ? `${t.creditCardBankName || ""} - ${t.cardName || ""}`.trim()
          : "เงินสด";

        lines.push(
          `${t.transactionId},${dateStr},${timeStr},${escapeCsv(t.transactionType)},${escapeCsv(t.categoryName || "ไม่ระบุหมวดหมู่")},${escapeCsv(t.merchantName || "-")},${escapeCsv(t.description || "-")},${t.amount.toFixed(2)},${escapeCsv(t.currencyCode)},${escapeCsv(t.sourceType)},${escapeCsv(accountOrCard)}`
        );
      }

      const csvContent = lines.join("\r\n");
      // Add UTF-8 BOM: 0xEF, 0xBB, 0xBF
      const bom = Buffer.from([0xef, 0xbb, 0xbf]);
      const csvBuffer = Buffer.from(csvContent, "utf-8");
      const fullBuffer = Buffer.concat([bom, csvBuffer]);

      result = {
        content: fullBuffer,
        contentType: "text/csv; charset=utf-8",
        fileName: `${fileNameBase}.csv`,
      };
    }

    await logAudit(userId, "Export", "Reports", `${format}-${fromBkk}-${toBkk}`, {
      format,
      type,
      fromDate: filter.fromDate,
      toDate: filter.toDate,
      transactionCount: records.length,
    });

    return result;
  }
}
