"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type {
  CreateTransactionRequest,
  TransactionFilter,
  TransactionResponse,
  UpdateTransactionRequest,
} from "@/types/transaction.types";
import type { PagedResult } from "@/types/api.types";

function buildQuery(filter: TransactionFilter): string {
  const params = new URLSearchParams();
  if (filter.categoryId) params.set("categoryId", String(filter.categoryId));
  if (filter.tagId) params.set("tagId", String(filter.tagId));
  if (filter.bankAccountId) params.set("bankAccountId", String(filter.bankAccountId));
  if (filter.type) params.set("type", filter.type);
  if (filter.fromDate) params.set("fromDate", filter.fromDate);
  if (filter.toDate) params.set("toDate", filter.toDate);
  if (filter.q) params.set("q", filter.q);
  params.set("sortBy", "transactionDate");
  params.set("sortDesc", "true");
  const qs = params.toString();
  return `/api/v1/transactions${qs ? `?${qs}` : ""}`;
}

export function useTransactions(filter: TransactionFilter, page = 1) {
  const query = buildQuery(filter);
  return useQuery({
    queryKey: ["transactions", filter, page],
    queryFn: () =>
      apiClient.get<PagedResult<TransactionResponse>>(`${query}&page=${page}&pageSize=20`),
  });
}

export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateTransactionRequest) =>
      apiClient.post<TransactionResponse>("/api/v1/transactions", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transactions"] }),
  });
}

export function useUpdateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: UpdateTransactionRequest }) =>
      apiClient.put<TransactionResponse>(`/api/v1/transactions/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transactions"] }),
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.delete<unknown>(`/api/v1/transactions/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transactions"] }),
  });
}
