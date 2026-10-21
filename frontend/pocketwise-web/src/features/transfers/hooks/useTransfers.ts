"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type {
  CreateTransferRequest,
  TransferResponse,
} from "@/types/transfer.types";

export function useTransfers() {
  return useQuery({
    queryKey: ["transfers"],
    queryFn: () => apiClient.get<TransferResponse[]>("/api/v1/transfers"),
  });
}

export function useCreateTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateTransferRequest) =>
      apiClient.post<TransferResponse>("/api/v1/transfers", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transfers"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}
