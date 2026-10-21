"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { UserProfileResponse } from "@/types/auth.types";

export function useCurrentUser() {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => apiClient.get<UserProfileResponse>("/api/v1/auth/me"),
    retry: false,
    staleTime: 60_000,
  });
}
