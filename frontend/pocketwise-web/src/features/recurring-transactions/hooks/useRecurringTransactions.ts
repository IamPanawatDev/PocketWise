"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type {
  RecurringTransactionRequest,
  RecurringTransactionResponse,
  UpdateRecurringTransactionRequest,
} from "@/types/recurring-transaction.types";

export function useRecurringTransactions() {
  return useQuery({
    queryKey: ["recurring-transactions"],
    queryFn: () => apiClient.get<RecurringTransactionResponse[]>("/api/v1/recurring-transactions"),
  });
}

export function useCreateRecurringTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: RecurringTransactionRequest) =>
      apiClient.post<RecurringTransactionResponse>("/api/v1/recurring-transactions", body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["recurring-transactions"] }),
  });
}

export function useUpdateRecurringTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: UpdateRecurringTransactionRequest }) =>
      apiClient.put<RecurringTransactionResponse>(`/api/v1/recurring-transactions/${id}`, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["recurring-transactions"] }),
  });
}

export function useDeleteRecurringTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete<unknown>(`/api/v1/recurring-transactions/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["recurring-transactions"] }),
  });
}
