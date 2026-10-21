"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type {
  CategoryRuleRequest,
  CategoryRuleResponse,
  CategorySuggestionResponse,
  MerchantRequest,
  MerchantResponse,
  UpdateCategoryRuleRequest,
  UpdateMerchantRequest,
} from "@/types/categorization.types";

export function useMerchants() {
  return useQuery({
    queryKey: ["merchants"],
    queryFn: () => apiClient.get<MerchantResponse[]>("/api/v1/merchants"),
  });
}

export function useCreateMerchant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: MerchantRequest) => apiClient.post<MerchantResponse>("/api/v1/merchants", body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["merchants"] }),
  });
}

export function useUpdateMerchant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: UpdateMerchantRequest }) =>
      apiClient.put<MerchantResponse>(`/api/v1/merchants/${id}`, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["merchants"] }),
  });
}

export function useDeleteMerchant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete<unknown>(`/api/v1/merchants/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["merchants"] }),
  });
}

export function useCategoryRules() {
  return useQuery({
    queryKey: ["category-rules"],
    queryFn: () => apiClient.get<CategoryRuleResponse[]>("/api/v1/category-rules"),
  });
}

export function useCreateCategoryRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CategoryRuleRequest) =>
      apiClient.post<CategoryRuleResponse>("/api/v1/category-rules", body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["category-rules"] }),
  });
}

export function useUpdateCategoryRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: UpdateCategoryRuleRequest }) =>
      apiClient.put<CategoryRuleResponse>(`/api/v1/category-rules/${id}`, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["category-rules"] }),
  });
}

export function useDeleteCategoryRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete<unknown>(`/api/v1/category-rules/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["category-rules"] }),
  });
}

export function useCategorySuggestion(description: string, enabled: boolean) {
  const query = new URLSearchParams({ description });
  return useQuery({
    queryKey: ["category-suggestion", description],
    queryFn: () =>
      apiClient.get<CategorySuggestionResponse | null>(`/api/v1/category-rules/suggest?${query.toString()}`),
    enabled: enabled && description.trim().length > 0,
    staleTime: 30_000,
  });
}
