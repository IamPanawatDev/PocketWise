"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import type { LoginRequest, RegisterRequest, UserProfileResponse } from "@/types/auth.types";

export function useLogin() {
  const router = useRouter();
  return useMutation({
    mutationFn: (body: LoginRequest) =>
      apiClient.post<{ user: UserProfileResponse }>("/api/auth/login", body),
    onSuccess: () => router.push("/dashboard"),
  });
}

export function useRegister() {
  const router = useRouter();
  return useMutation({
    mutationFn: (body: RegisterRequest) =>
      apiClient.post<{ user: UserProfileResponse }>("/api/auth/register", body),
    onSuccess: () => router.push("/dashboard"),
  });
}

export function useLogout() {
  const router = useRouter();
  return useMutation({
    mutationFn: () => apiClient.post<unknown>("/api/auth/logout"),
    onSuccess: () => {
      router.push("/login");
      router.refresh();
    },
  });
}
