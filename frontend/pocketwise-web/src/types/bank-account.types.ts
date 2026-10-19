// Bank account types (sync with backend DTOs.BankAccounts + Domain.Enums.AccountType)

export type AccountType = "cash" | "bank" | "wallet" | "other";

export interface BankAccountResponse {
  bankAccountId: number;
  bankCode: string | null;
  bankName: string;
  accountName: string;
  accountNumberMasked: string | null;
  accountType: AccountType;
  isActive: boolean;
  createdAt: string;
}

export interface CreateBankAccountRequest {
  bankCode: string | null;
  bankName: string;
  accountName: string;
  accountNumberMasked: string | null;
  accountType: AccountType;
}

export interface UpdateBankAccountRequest {
  bankCode: string | null;
  bankName: string;
  accountName: string;
  accountNumberMasked: string | null;
  accountType: AccountType;
  isActive: boolean;
}
