"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type {
  CreateTagRequest,
  ReorderTagsRequest,
  TagResponse,
  UpdateTagRequest,
} from "@/types/tag.types";

export function useTags() {
  return useQuery({
    queryKey: ["tags"],
    queryFn: () => apiClient.get<TagResponse[]>("/api/v1/tags"),
  });
}

export function useCreateTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateTagRequest) =>
      apiClient.post<TagResponse>("/api/v1/tags", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tags"] }),
  });
}

export function useUpdateTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: UpdateTagRequest }) =>
      apiClient.put<TagResponse>(`/api/v1/tags/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tags"] }),
  });
}

export function useReorderTags() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ReorderTagsRequest) =>
      apiClient.put<unknown>("/api/v1/tags/reorder", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tags"] }),
  });
}

export function useDeleteTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete<unknown>(`/api/v1/tags/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tags"] }),
  });
}
