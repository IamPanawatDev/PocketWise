"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type {
  BankAccountResponse,
  CreateBankAccountRequest,
  UpdateBankAccountRequest,
} from "@/types/bank-account.types";

export function useBankAccounts() {
  return useQuery({
    queryKey: ["bank-accounts"],
    queryFn: () => apiClient.get<BankAccountResponse[]>("/api/v1/bank-accounts"),
  });
}

export function useCreateBankAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateBankAccountRequest) =>
      apiClient.post<BankAccountResponse>("/api/v1/bank-accounts", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bank-accounts"] }),
  });
}

export function useUpdateBankAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: UpdateBankAccountRequest }) =>
      apiClient.put<BankAccountResponse>(`/api/v1/bank-accounts/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bank-accounts"] }),
  });
}

export function useDeleteBankAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.delete<unknown>(`/api/v1/bank-accounts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bank-accounts"] }),
  });
}
