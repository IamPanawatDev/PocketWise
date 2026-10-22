"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import type { LoginRequest, RegisterRequest, UserProfileResponse } from "@/types/auth.types";

export function useLogin() {
  const router = useRouter();
  return useMutation({
    mutationFn: (body: LoginRequest) =>
      apiClient.post<{ user: UserProfileResponse }>("/api/auth/login", body),
    onSuccess: () => router.push("/transactions"),
  });
}

export function useRegister() {
  const router = useRouter();
  return useMutation({
    mutationFn: (body: RegisterRequest) =>
      apiClient.post<{ user: UserProfileResponse }>("/api/auth/register", body),
    onSuccess: () => router.push("/transactions"),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post<unknown>("/api/auth/logout"),
    onSuccess: () => {
      queryClient.clear();
      window.location.href = "/login";
    },
    onError: () => {
      queryClient.clear();
      window.location.href = "/login";
    },
  });
}
