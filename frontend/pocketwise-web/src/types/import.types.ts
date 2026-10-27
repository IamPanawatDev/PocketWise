export interface SlipImportResponse {
  slipImportFileId: number;
  importJobId: number | null;
  originalFileName: string;
  fileSizeBytes: number;
  fileHash?: string | null;
  bankCode?: string | null;
  payerName?: string | null;
  payeeName?: string | null;
  detectedAmount?: number | null;
  detectedAt?: string | null;
  transactionReference?: string | null;
  reviewStatus: string;
  isDuplicate: boolean;
  suggestedCategoryId?: number | null;
  suggestedCategoryName?: string | null;
  createdAt: string;
}

export interface ConfirmSlipRequest {
  amount: number;
  transactionDate: string; // ISO string or YYYY-MM-DDTHH:mm:ss
  description: string;
  categoryId?: number | null;
  bankAccountId?: number | null;
  creditCardId?: number | null;
  payeeName?: string | null;
  payerName?: string | null;
  transactionReference?: string | null;
  tagIds?: number[];
}

export interface StatementItemResponse {
  statementItemId: number;
  transactionDate: string;
  description: string;
  itemType: string;
  amount: number;
  externalReference?: string | null;
  isDuplicate: boolean;
  isLinked: boolean;
  transactionId?: number | null;
  suggestedCategoryId?: number | null;
  suggestedCategoryName?: string | null;
}

export interface CreditCardStatementImportResponse {
  statementId: number;
  importJobId?: number | null;
  creditCardId: number;
  cardName?: string | null;
  statementDate: string;
  statementPeriodStart: string;
  statementPeriodEnd: string;
  paymentDueDate?: string | null;
  previousBalance: number;
  purchaseAmount: number;
  installmentAmount: number;
  interestAmount: number;
  cashbackAmount: number;
  paymentAmount: number;
  totalDue: number;
  status: string;
  totalItems: number;
  duplicateItems: number;
  items: StatementItemResponse[];
}

export interface ConfirmStatementItemDto {
  statementItemId: number;
  categoryId?: number | null;
  description?: string | null;
}

export interface ConfirmStatementItemsRequest {
  items: ConfirmStatementItemDto[];
}

export interface BatchConfirmStatementItemsResponse {
  statementId: number;
  confirmedCount: number;
  createdTransactionIds: number[];
}

export interface ImportJobResponse {
  importJobId: number;
  importType: string;
  fileName: string;
  status: string;
  totalRecords: number;
  importedRecords: number;
  duplicateRecords: number;
  errorMessage?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  slipId?: number | null;
  statementId?: number | null;
  creditCardId?: number | null;
}

