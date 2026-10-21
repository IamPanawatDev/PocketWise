"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import type {
  DataResetResponse,
  UpdateUserSettingsRequest,
  UserSettingsResponse,
} from "@/types/settings.types";

export function useUserSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: () => apiClient.get<UserSettingsResponse>("/api/v1/settings"),
  });
}

export function useUpdateUserSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateUserSettingsRequest) =>
      apiClient.put<UserSettingsResponse>("/api/v1/settings", body),
    onSuccess: (settings) => {
      queryClient.setQueryData(["settings"], settings);
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
    },
  });
}

export function useResetFinancialData() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: () =>
      apiClient.post<DataResetResponse>("/api/v1/users/me/data-reset", {}),
    onSuccess: async () => {
      queryClient.clear();
      router.replace("/login");
      router.refresh();
    },
  });
}
