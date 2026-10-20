"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { AuditLogFilter, AuditLogResponse } from "@/types/audit-log.types";
import type { PagedResult } from "@/types/api.types";

function buildAuditLogQuery(filter: AuditLogFilter, page = 1, pageSize = 20): string {
  const params = new URLSearchParams();
  if (filter.action && filter.action !== "all") params.set("action", filter.action);
  if (filter.entityType && filter.entityType !== "all") params.set("entityType", filter.entityType);
  if (filter.entityId) params.set("entityId", filter.entityId);
  if (filter.fromDate) params.set("fromDate", filter.fromDate);
  if (filter.toDate) params.set("toDate", filter.toDate);
  if (filter.q) params.set("q", filter.q);
  if (filter.userId !== undefined) params.set("userId", String(filter.userId));
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  return `/api/v1/audit-logs?${params.toString()}`;
}

export function useAuditLogs(filter: AuditLogFilter, page = 1, pageSize = 20) {
  const url = buildAuditLogQuery(filter, page, pageSize);
  return useQuery({
    queryKey: ["audit-logs", filter, page, pageSize],
    queryFn: () => apiClient.get<PagedResult<AuditLogResponse>>(url),
  });
}

export function useAuditLogDetail(id: number | null) {
  return useQuery({
    queryKey: ["audit-log", id],
    queryFn: () => apiClient.get<AuditLogResponse>(`/api/v1/audit-logs/${id}`),
    enabled: id !== null && id > 0,
  });
}

export function useAuditEntityTypes() {
  return useQuery({
    queryKey: ["audit-logs", "entity-types"],
    queryFn: () => apiClient.get<string[]>("/api/v1/audit-logs/entity-types"),
  });
}
