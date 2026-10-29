"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { LoginRequest, RegisterRequest, UserProfileResponse } from "@/types/auth.types";

interface AuthResponsePayload {
  user: UserProfileResponse;
  refreshToken?: string;
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: LoginRequest) =>
      apiClient.post<AuthResponsePayload>("/api/auth/login", body),
    onSuccess: (res) => {
      if (res?.refreshToken && typeof window !== "undefined") {
        try {
          localStorage.setItem("pw_fallback_refresh", res.refreshToken);
        } catch {}
      }
      qc.setQueryData(["me"], res?.user);
      window.location.href = "/transactions";
    },
  });
}

export function useRegister() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: RegisterRequest) =>
      apiClient.post<AuthResponsePayload>("/api/auth/register", body),
    onSuccess: (res) => {
      if (res?.refreshToken && typeof window !== "undefined") {
        try {
          localStorage.setItem("pw_fallback_refresh", res.refreshToken);
        } catch {}
      }
      qc.setQueryData(["me"], res?.user);
      window.location.href = "/transactions";
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post<unknown>("/api/auth/logout"),
    onSettled: () => {
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem("pw_fallback_refresh");
        } catch {}
      }
      queryClient.clear();
      window.location.href = "/login";
    },
  });
}
