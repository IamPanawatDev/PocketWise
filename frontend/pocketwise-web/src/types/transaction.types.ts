// Transaction types (sync with backend DTOs.Transactions + Domain.Enums)

export type TransactionType = "income" | "expense" | "transfer";
export type SourceType = "manual" | "slip" | "cardStatement" | "recurring";
export type TransactionStatus = "draft" | "confirmed" | "void";

export interface TagRef {
  tagId: number;
  tagName: string;
}

export interface TransactionResponse {
  transactionId: number;
  transactionType: TransactionType;
  amount: number;
  currencyCode: string;
  transactionDate: string;
  description: string | null;
  categoryId: number | null;
  categoryName: string | null;
  bankAccountId: number | null;
  creditCardId: number | null;
  sourceType: SourceType;
  transferGroupId: number | null;
  recurringTransactionId: number | null;
  status: TransactionStatus;
  tags: TagRef[];
  createdAt: string;
  updatedAt: string | null;
}

export interface CreateTransactionRequest {
  transactionType: TransactionType;
  amount: number;
  currencyCode: string;
  transactionDate: string;
  description: string | null;
  categoryId: number | null;
  bankAccountId: number | null;
  creditCardId: number | null;
  tagIds: number[];
}

export type UpdateTransactionRequest = CreateTransactionRequest;

export interface TransactionFilter {
  categoryId?: number;
  tagId?: number;
  bankAccountId?: number;
  creditCardId?: number;
  sourceType?: string;
  type?: string;
  fromDate?: string;
  toDate?: string;
  q?: string;
}
