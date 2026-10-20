"use client";

import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type {
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
} from "@/types/auth.types";

export function useForgotPasswordMutation() {
  return useMutation({
    mutationFn: (body: ForgotPasswordRequest) =>
      apiClient.post<ForgotPasswordResponse>(
        "/api/v1/auth/forgot-password",
        body,
      ),
  });
}

export function useResetPasswordMutation() {
  return useMutation({
    mutationFn: (body: ResetPasswordRequest) =>
      apiClient.post<ResetPasswordResponse>(
        "/api/v1/auth/reset-password",
        body,
      ),
  });
}
