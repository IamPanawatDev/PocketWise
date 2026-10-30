"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type {
  AdminImportJob,
  AdminOverview,
  AdminUserDetail,
  AdminUserListItem,
  AdminUserSession,
  Announcement,
  MaintenanceStatus,
  PagedResult,
  SecurityEventItem,
  SystemSettingItem,
  UserActiveAnnouncement,
} from "@/types/admin-operations.types";

export function useAdminOverviewQuery() {
  return useQuery({
    queryKey: ["admin", "overview"],
    queryFn: () => apiClient.get<AdminOverview>("/api/v1/admin/overview"),
    refetchInterval: 30_000,
  });
}

export interface UserFilters {
  q?: string;
  role?: string;
  isSuspended?: boolean;
  isEmailVerified?: boolean;
  page?: number;
  pageSize?: number;
}

export function useAdminUsersQuery(filters: UserFilters = {}) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.role) params.set("role", filters.role);
  if (filters.isSuspended !== undefined) params.set("isSuspended", String(filters.isSuspended));
  if (filters.isEmailVerified !== undefined) params.set("isEmailVerified", String(filters.isEmailVerified));
  if (filters.page) params.set("page", String(filters.page));
  if (filters.pageSize) params.set("pageSize", String(filters.pageSize));

  const qs = params.toString();
  return useQuery({
    queryKey: ["admin", "user-accounts", qs],
    queryFn: () => apiClient.get<PagedResult<AdminUserListItem>>(`/api/v1/admin/users${qs ? `?${qs}` : ""}`),
  });
}

export function useAdminUserDetailQuery(userId: number | null) {
  return useQuery({
    queryKey: ["admin", "user-detail", userId],
    queryFn: () => apiClient.get<AdminUserDetail>(`/api/v1/admin/users/${userId}`),
    enabled: userId !== null && userId > 0,
  });
}

export function useAdminUserSessionsQuery(userId: number | null) {
  return useQuery({
    queryKey: ["admin", "user-sessions", userId],
    queryFn: () => apiClient.get<AdminUserSession[]>(`/api/v1/admin/users/${userId}/sessions`),
    enabled: userId !== null && userId > 0,
  });
}

export function useSuspendUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, reason }: { userId: number; reason: string }) =>
      apiClient.post(`/api/v1/admin/users/${userId}/suspend`, { reason }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "user-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "user-detail", vars.userId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "overview"] });
    },
  });
}

export function useUnsuspendUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) =>
      apiClient.post(`/api/v1/admin/users/${userId}/unsuspend`),
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "user-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "user-detail", userId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "overview"] });
    },
  });
}

export function useResendVerificationMutation() {
  return useMutation({
    mutationFn: (userId: number) =>
      apiClient.post(`/api/v1/admin/users/${userId}/resend-verification`),
  });
}

export function useSendResetPasswordMutation() {
  return useMutation({
    mutationFn: (userId: number) =>
      apiClient.post<{ resetToken?: string }>(`/api/v1/admin/users/${userId}/reset-password`),
  });
}

export function useRevokeSessionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, tokenId }: { userId: number; tokenId: number }) =>
      apiClient.post(`/api/v1/admin/users/${userId}/sessions/${tokenId}/revoke`),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "user-sessions", vars.userId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "user-detail", vars.userId] });
    },
  });
}

export function useRevokeAllSessionsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) =>
      apiClient.post(`/api/v1/admin/users/${userId}/sessions/revoke-all`),
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "user-sessions", userId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "user-detail", userId] });
    },
  });
}

export interface SecurityEventFilters {
  eventType?: string;
  targetUserId?: number;
  actorUserId?: number;
  succeeded?: boolean;
  fromDate?: string;
  toDate?: string;
  q?: string;
  maskIp?: boolean;
  page?: number;
  pageSize?: number;
}

export function useAdminSecurityEventsQuery(filters: SecurityEventFilters = {}) {
  const params = new URLSearchParams();
  if (filters.eventType) params.set("eventType", filters.eventType);
  if (filters.targetUserId) params.set("targetUserId", String(filters.targetUserId));
  if (filters.actorUserId) params.set("actorUserId", String(filters.actorUserId));
  if (filters.succeeded !== undefined) params.set("succeeded", String(filters.succeeded));
  if (filters.fromDate) params.set("fromDate", filters.fromDate);
  if (filters.toDate) params.set("toDate", filters.toDate);
  if (filters.q) params.set("q", filters.q);
  if (filters.maskIp) params.set("maskIp", "true");
  if (filters.page) params.set("page", String(filters.page));
  if (filters.pageSize) params.set("pageSize", String(filters.pageSize));

  const qs = params.toString();
  return useQuery({
    queryKey: ["admin", "security-events", qs],
    queryFn: () => apiClient.get<PagedResult<SecurityEventItem>>(`/api/v1/admin/security-events${qs ? `?${qs}` : ""}`),
  });
}

export interface ImportFilters {
  status?: string;
  jobType?: string;
  userId?: number;
  q?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}

export function useAdminImportsQuery(filters: ImportFilters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.jobType) params.set("jobType", filters.jobType);
  if (filters.userId) params.set("userId", String(filters.userId));
  if (filters.q) params.set("q", filters.q);
  if (filters.fromDate) params.set("fromDate", filters.fromDate);
  if (filters.toDate) params.set("toDate", filters.toDate);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.pageSize) params.set("pageSize", String(filters.pageSize));

  const qs = params.toString();
  return useQuery({
    queryKey: ["admin", "imports", qs],
    queryFn: () => apiClient.get<PagedResult<AdminImportJob>>(`/api/v1/admin/imports${qs ? `?${qs}` : ""}`),
  });
}

export function useRetryImportJobMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (jobId: number) =>
      apiClient.post(`/api/v1/admin/imports/${jobId}/retry`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "imports"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "overview"] });
    },
  });
}

export function useCancelImportJobMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (jobId: number) =>
      apiClient.post(`/api/v1/admin/imports/${jobId}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "imports"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "overview"] });
    },
  });
}

export function useAdminAnnouncementsQuery() {
  return useQuery({
    queryKey: ["admin", "announcements"],
    queryFn: () => apiClient.get<Announcement[]>("/api/v1/admin/announcements"),
  });
}

export function useCreateAnnouncementMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Announcement>) =>
      apiClient.post<Announcement>("/api/v1/admin/announcements", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "announcements"] });
      queryClient.invalidateQueries({ queryKey: ["announcements", "active"] });
    },
  });
}

export function useUpdateAnnouncementMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: Partial<Announcement> }) =>
      apiClient.put<Announcement>(`/api/v1/admin/announcements/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "announcements"] });
      queryClient.invalidateQueries({ queryKey: ["announcements", "active"] });
    },
  });
}

export function useDeleteAnnouncementMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.delete(`/api/v1/admin/announcements/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "announcements"] });
      queryClient.invalidateQueries({ queryKey: ["announcements", "active"] });
    },
  });
}

export function useAdminSettingsQuery() {
  return useQuery({
    queryKey: ["admin", "settings"],
    queryFn: () => apiClient.get<SystemSettingItem[]>("/api/v1/admin/settings"),
  });
}

export function useUpdateSettingMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      apiClient.put<SystemSettingItem>(`/api/v1/admin/settings/${encodeURIComponent(key)}`, { value }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
    },
  });
}

export function useMaintenanceStatusQuery() {
  return useQuery({
    queryKey: ["admin", "maintenance"],
    queryFn: () => apiClient.get<MaintenanceStatus>("/api/v1/admin/maintenance"),
  });
}

export function useUpdateMaintenanceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<MaintenanceStatus>) =>
      apiClient.put<MaintenanceStatus>("/api/v1/admin/maintenance", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "maintenance"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "overview"] });
    },
  });
}

export function useActiveAnnouncementsQuery() {
  return useQuery({
    queryKey: ["announcements", "active"],
    queryFn: () => apiClient.get<UserActiveAnnouncement[]>("/api/v1/announcements/active"),
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
}
