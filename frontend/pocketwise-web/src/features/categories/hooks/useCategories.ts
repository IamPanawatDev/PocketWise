"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type {
  CategoryResponse,
  CreateCategoryRequest,
  ReorderCategoriesRequest,
  UpdateCategoryRequest,
} from "@/types/category.types";

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: () => apiClient.get<CategoryResponse[]>("/api/v1/categories"),
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateCategoryRequest) =>
      apiClient.post<CategoryResponse>("/api/v1/categories", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: UpdateCategoryRequest }) =>
      apiClient.put<CategoryResponse>(`/api/v1/categories/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}

export function useReorderCategories() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ReorderCategoriesRequest) =>
      apiClient.put<unknown>("/api/v1/categories/reorder", body),
    onMutate: async (body: ReorderCategoriesRequest) => {
      await qc.cancelQueries({ queryKey: ["categories"] });
      const previous = qc.getQueryData<CategoryResponse[]>(["categories"]);
      if (previous) {
        const orderMap = new Map(body.items.map((i) => [i.categoryId, i.sortOrder]));
        const updated = [...previous].sort((a, b) => {
          if (a.isSystem !== b.isSystem) return a.isSystem ? -1 : 1;
          const sortA = orderMap.has(a.categoryId) ? orderMap.get(a.categoryId)! : a.sortOrder;
          const sortB = orderMap.has(b.categoryId) ? orderMap.get(b.categoryId)! : b.sortOrder;
          if (sortA !== sortB) return sortA - sortB;
          return a.categoryName.localeCompare(b.categoryName, "th");
        });
        qc.setQueryData(["categories"], updated);
      }
      return { previous };
    },
    onError: (_err, _variables, context) => {
      if (context?.previous) {
        qc.setQueryData(["categories"], context.previous);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete<unknown>(`/api/v1/categories/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}
