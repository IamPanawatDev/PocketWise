"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type {
  AssignUserRolesRequest,
  CreateRoleRequest,
  PermissionResponse,
  RoleDetailResponse,
  RoleResponse,
  UpdateRolePermissionsRequest,
  UpdateRoleRequest,
  UserWithRolesResponse,
} from "@/types/admin.types";

export function useAdminRoles() {
  return useQuery({
    queryKey: ["admin", "roles"],
    queryFn: () => apiClient.get<RoleResponse[]>("/api/v1/admin/roles"),
  });
}

export function useAdminPermissions() {
  return useQuery({
    queryKey: ["admin", "permissions"],
    queryFn: () => apiClient.get<PermissionResponse[]>("/api/v1/admin/permissions"),
  });
}

export function useAdminRoleDetail(roleId: number | null) {
  return useQuery({
    queryKey: ["admin", "roles", roleId],
    queryFn: () => apiClient.get<RoleDetailResponse>(`/api/v1/admin/roles/${roleId}`),
    enabled: roleId !== null && roleId > 0,
  });
}

export function useAdminUsers() {
  return useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => apiClient.get<UserWithRolesResponse[]>("/api/v1/admin/users"),
  });
}

export function useCreateRoleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateRoleRequest) =>
      apiClient.post<RoleDetailResponse>("/api/v1/admin/roles", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "roles"] });
    },
  });
}

export function useUpdateRoleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: UpdateRoleRequest }) =>
      apiClient.put<RoleDetailResponse>(`/api/v1/admin/roles/${id}`, body),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "roles"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "roles", vars.id] });
    },
  });
}

export function useDeleteRoleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (roleId: number) =>
      apiClient.delete<void>(`/api/v1/admin/roles/${roleId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "roles"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
}

export function useUpdateRolePermissionsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: UpdateRolePermissionsRequest }) =>
      apiClient.put<RoleDetailResponse>(`/api/v1/admin/roles/${id}/permissions`, body),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "roles"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "roles", vars.id] });
    },
  });
}

export function useAssignUserRolesMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, body }: { userId: number; body: AssignUserRolesRequest }) =>
      apiClient.put<UserWithRolesResponse>(`/api/v1/admin/users/${userId}/roles`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "roles"] });
    },
  });
}
