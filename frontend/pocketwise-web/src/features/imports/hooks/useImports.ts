"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { PagedResult } from "@/types/api.types";
import type {
  SlipImportResponse,
  ConfirmSlipRequest,
  CreditCardStatementImportResponse,
  ConfirmStatementItemsRequest,
  BatchConfirmStatementItemsResponse,
  ImportJobResponse,
} from "@/types/import.types";
import type { TransactionResponse } from "@/types/transaction.types";

export function useUploadSlip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) =>
      apiClient.post<SlipImportResponse>("/api/v1/imports/slips", formData),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["importJobs"] });
    },
  });
}

export function useConfirmSlip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      slipImportFileId,
      body,
    }: {
      slipImportFileId: number;
      body: ConfirmSlipRequest;
    }) =>
      apiClient.post<TransactionResponse>(
        `/api/v1/imports/slips/${slipImportFileId}/confirm`,
        body,
      ),
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: ["transactions"] }),
        qc.invalidateQueries({ queryKey: ["budgets"] }),
        qc.invalidateQueries({ queryKey: ["reports"] }),
        qc.invalidateQueries({ queryKey: ["importJobs"] }),
        qc.invalidateQueries({ queryKey: ["bankAccounts"] }),
      ]),
  });
}

export function useRejectSlip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (slipImportFileId: number) =>
      apiClient.post<void>(`/api/v1/imports/slips/${slipImportFileId}/reject`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["importJobs"] });
    },
  });
}

export function useUploadStatement(creditCardId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) =>
      apiClient.post<CreditCardStatementImportResponse>(
        `/api/v1/credit-cards/${creditCardId}/statements`,
        formData,
      ),
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: ["statements", creditCardId] }),
        qc.invalidateQueries({ queryKey: ["importJobs"] }),
      ]),
  });
}

export function useStatement(creditCardId: number, statementId: number | null) {
  return useQuery({
    queryKey: ["statement", creditCardId, statementId],
    queryFn: () =>
      apiClient.get<CreditCardStatementImportResponse>(
        `/api/v1/credit-cards/${creditCardId}/statements/${statementId}`,
      ),
    enabled: !!statementId && !!creditCardId,
  });
}

export function useStatementById(statementId: number | null) {
  return useQuery({
    queryKey: ["statement-by-id", statementId],
    queryFn: () =>
      apiClient.get<CreditCardStatementImportResponse>(
        `/api/v1/credit-cards/statements/${statementId}`,
      ),
    enabled: !!statementId,
  });
}

export function useSlip(slipId: number | null) {
  return useQuery({
    queryKey: ["slip", slipId],
    queryFn: () =>
      apiClient.get<SlipImportResponse>(`/api/v1/imports/slips/${slipId}`),
    enabled: !!slipId,
  });
}

export function useConfirmStatementItemsById(statementId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ConfirmStatementItemsRequest) =>
      apiClient.post<BatchConfirmStatementItemsResponse>(
        `/api/v1/credit-cards/statements/${statementId}/confirm-items`,
        body,
      ),
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: ["transactions"] }),
        qc.invalidateQueries({ queryKey: ["statement-by-id", statementId] }),
        qc.invalidateQueries({ queryKey: ["creditCards"] }),
        qc.invalidateQueries({ queryKey: ["budgets"] }),
        qc.invalidateQueries({ queryKey: ["reports"] }),
        qc.invalidateQueries({ queryKey: ["importJobs"] }),
      ]),
  });
}

export function useCardStatements(creditCardId: number) {
  return useQuery({
    queryKey: ["statements", creditCardId],
    queryFn: () =>
      apiClient.get<CreditCardStatementImportResponse[]>(
        `/api/v1/credit-cards/${creditCardId}/statements`,
      ),
    enabled: !!creditCardId,
  });
}

export function useConfirmStatementItems(creditCardId: number, statementId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ConfirmStatementItemsRequest) =>
      apiClient.post<BatchConfirmStatementItemsResponse>(
        `/api/v1/credit-cards/${creditCardId}/statements/${statementId}/confirm-items`,
        body,
      ),
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: ["transactions"] }),
        qc.invalidateQueries({ queryKey: ["statement", creditCardId, statementId] }),
        qc.invalidateQueries({ queryKey: ["statements", creditCardId] }),
        qc.invalidateQueries({ queryKey: ["creditCards"] }),
        qc.invalidateQueries({ queryKey: ["budgets"] }),
        qc.invalidateQueries({ queryKey: ["reports"] }),
        qc.invalidateQueries({ queryKey: ["importJobs"] }),
      ]),
  });
}

export function useImportJobs(page = 1, pageSize = 20, type?: string) {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  if (type) params.set("type", type);

  return useQuery({
    queryKey: ["importJobs", page, pageSize, type],
    queryFn: () =>
      apiClient.get<PagedResult<ImportJobResponse>>(
        `/api/v1/imports/jobs?${params.toString()}`,
      ),
  });
}
