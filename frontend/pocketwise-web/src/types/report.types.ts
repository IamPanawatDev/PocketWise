export type ReportPeriod = "weekly" | "monthly" | "quarterly" | "yearly";

export interface ReportSummaryResponse {
  fromDate: string;
  toDate: string;
  currencies: ReportCurrencySummary[];
}

export interface ReportCurrencySummary {
  currencyCode: string;
  totalIncome: number;
  totalExpense: number;
  netAmount: number;
  categoryBreakdown: ReportCategoryBreakdown[];
  sourceBreakdown: ReportSourceBreakdown[];
  bankAccountBreakdown: ReportBankAccountBreakdown[];
  creditCardBreakdown: ReportCreditCardBreakdown[];
}

export interface ReportCategoryBreakdown {
  categoryId: number | null;
  categoryName: string;
  amount: number;
  percentage: number;
}

export interface ReportSourceBreakdown {
  sourceType: string;
  amount: number;
  percentage: number;
}

export interface ReportBankAccountBreakdown {
  bankAccountId: number | null;
  accountName: string;
  bankName: string | null;
  amount: number;
  percentage: number;
}

export interface ReportCreditCardBreakdown {
  creditCardId: number | null;
  cardName: string;
  bankName: string | null;
  amount: number;
  percentage: number;
}

export interface ReportTrendResponse {
  period: ReportPeriod;
  fromDate: string;
  toDate: string;
  series: ReportTrendPoint[];
}

export interface ReportTrendPoint {
  periodStart: string;
  periodEnd: string;
  currencyCode: string;
  income: number;
  expense: number;
  netAmount: number;
}
