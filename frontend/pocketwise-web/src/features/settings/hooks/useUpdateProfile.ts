"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { UpdateUserProfileRequest, UserProfileResponse } from "@/types/auth.types";

export function useUpdateUserProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateUserProfileRequest) =>
      apiClient.put<UserProfileResponse>("/api/v1/auth/me", body),
    onSuccess: (profile) => {
      queryClient.setQueryData(["me"], profile);
    },
  });
}
