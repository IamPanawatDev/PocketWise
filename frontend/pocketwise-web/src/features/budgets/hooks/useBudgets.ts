"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { BudgetRequest, BudgetResponse, BudgetTrackingResponse, UpdateBudgetRequest } from "@/types/budget.types";

export function useBudgets() {
  return useQuery({
    queryKey: ["budgets"],
    queryFn: () => apiClient.get<BudgetResponse[]>("/api/v1/budgets"),
  });
}

export function useBudgetTracking() {
  return useQuery({
    queryKey: ["budgets", "tracking"],
    queryFn: () => apiClient.get<BudgetTrackingResponse[]>("/api/v1/budgets/tracking"),
  });
}

export function useCreateBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: BudgetRequest) => apiClient.post<BudgetResponse>("/api/v1/budgets", body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["budgets"] }),
  });
}

export function useUpdateBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: UpdateBudgetRequest }) =>
      apiClient.put<BudgetResponse>(`/api/v1/budgets/${id}`, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["budgets"] }),
  });
}

export function useDeleteBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete<unknown>(`/api/v1/budgets/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["budgets"] }),
  });
}
