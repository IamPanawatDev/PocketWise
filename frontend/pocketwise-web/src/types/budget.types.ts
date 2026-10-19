export type BudgetScopeType = "total" | "category" | "tag";
export type BudgetPeriodType = "weekly" | "monthly" | "quarterly" | "yearly" | "custom";

export interface BudgetResponse {
  budgetId: number;
  budgetName: string;
  currencyCode: string;
  scopeType: BudgetScopeType;
  categoryId: number | null;
  categoryName: string | null;
  tagId: number | null;
  tagName: string | null;
  amountLimit: number;
  periodType: BudgetPeriodType;
  startDate: string;
  endDate: string | null;
  alertThresholdPercent: number;
  isActive: boolean;
  createdAt: string;
}

export interface BudgetTrackingResponse extends BudgetResponse {
  spentAmount: number;
  remainingAmount: number;
  percentageUsed: number;
  isOverLimit: boolean;
}

export interface BudgetRequest {
  budgetName: string;
  scopeType: BudgetScopeType;
  categoryId: number | null;
  tagId: number | null;
  amountLimit: number;
  periodType: BudgetPeriodType;
  startDate: string;
  endDate: string | null;
  alertThresholdPercent: number;
}

export interface UpdateBudgetRequest extends BudgetRequest {
  isActive: boolean;
}
