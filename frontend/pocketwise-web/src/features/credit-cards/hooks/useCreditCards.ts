"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { CreditCardRequest, CreditCardResponse, UpdateCreditCardRequest } from "@/types/credit-card.types";

export function useCreditCards() {
  return useQuery({
    queryKey: ["credit-cards"],
    queryFn: () => apiClient.get<CreditCardResponse[]>("/api/v1/credit-cards"),
  });
}

export function useCreateCreditCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreditCardRequest) => apiClient.post<CreditCardResponse>("/api/v1/credit-cards", body),
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: ["credit-cards"] }),
      queryClient.invalidateQueries({ queryKey: ["reports"] }),
    ]),
  });
}

export function useUpdateCreditCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: UpdateCreditCardRequest }) =>
      apiClient.put<CreditCardResponse>(`/api/v1/credit-cards/${id}`, body),
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: ["credit-cards"] }),
      queryClient.invalidateQueries({ queryKey: ["reports"] }),
    ]),
  });
}

export function useDeleteCreditCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete<unknown>(`/api/v1/credit-cards/${id}`),
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: ["credit-cards"] }),
      queryClient.invalidateQueries({ queryKey: ["reports"] }),
    ]),
  });
}
