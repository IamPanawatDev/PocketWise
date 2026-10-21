// Transfer types (sync with backend DTOs.Transfers + Domain.Enums.TransferGroupStatus)

export type TransferGroupStatus = "pending" | "matched" | "confirmed" | "void";

export interface TransferResponse {
  transferGroupId: number;
  fromBankAccountId: number;
  toBankAccountId: number;
  amount: number;
  transferDate: string;
  reference: string | null;
  status: TransferGroupStatus;
  createdAt: string;
}

export interface CreateTransferRequest {
  fromBankAccountId: number;
  toBankAccountId: number;
  amount: number;
  transferDate: string;
  reference: string | null;
}
