export type RecurringFrequency = "daily" | "weekly" | "monthly" | "quarterly" | "yearly";

export interface RecurringTransactionResponse {
  recurringTransactionId: number;
  transactionType: "income" | "expense";
  amount: number;
  description: string | null;
  categoryId: number | null;
  categoryName: string | null;
  frequency: RecurringFrequency;
  intervalValue: number;
  startDate: string;
  endDate: string | null;
  nextRunAt: string;
  isActive: boolean;
  createdAt: string;
}

export interface RecurringTransactionRequest {
  transactionType: "income" | "expense";
  amount: number;
  description: string | null;
  categoryId: number | null;
  frequency: RecurringFrequency;
  intervalValue: number;
  startDate: string;
  endDate: string | null;
}

export interface UpdateRecurringTransactionRequest extends RecurringTransactionRequest {
  isActive: boolean;
}
