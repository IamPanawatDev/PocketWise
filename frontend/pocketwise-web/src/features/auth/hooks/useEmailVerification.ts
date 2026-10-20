"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type {
  SendVerificationEmailResponse,
  VerifyEmailRequest,
  VerifyEmailResponse,
} from "@/types/auth.types";

export function useSendVerificationEmail() {
  return useMutation({
    mutationFn: () =>
      apiClient.post<SendVerificationEmailResponse>(
        "/api/v1/auth/send-verification-email",
      ),
  });
}

export function useVerifyEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: VerifyEmailRequest) =>
      apiClient.post<VerifyEmailResponse>("/api/v1/auth/verify-email", body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });
}
