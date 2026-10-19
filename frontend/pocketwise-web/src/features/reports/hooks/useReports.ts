"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { ReportPeriod, ReportSummaryResponse, ReportTrendResponse } from "@/types/report.types";

function buildQuery(fromDate: string, toDate: string, categoryId?: number, tagId?: number) {
  const query = new URLSearchParams({ fromDate, toDate });
  if (categoryId) query.set("categoryId", String(categoryId));
  if (tagId) query.set("tagId", String(tagId));
  return query.toString();
}

export function useReportSummary(fromDate: string, toDate: string, categoryId?: number, tagId?: number) {
  const query = buildQuery(fromDate, toDate, categoryId, tagId);
  return useQuery({
    queryKey: ["reports", "summary", fromDate, toDate, categoryId, tagId],
    queryFn: () => apiClient.get<ReportSummaryResponse>(`/api/v1/reports/summary?${query}`),
    enabled: Boolean(fromDate && toDate),
  });
}

export function useReportTrends(
  fromDate: string,
  toDate: string,
  period: ReportPeriod,
  categoryId?: number,
  tagId?: number,
) {
  const query = new URLSearchParams({
    fromDate,
    toDate,
    period,
    ...(categoryId ? { categoryId: String(categoryId) } : {}),
    ...(tagId ? { tagId: String(tagId) } : {}),
  });
  return useQuery({
    queryKey: ["reports", "trends", fromDate, toDate, period, categoryId, tagId],
    queryFn: () => apiClient.get<ReportTrendResponse>(`/api/v1/reports/trends?${query.toString()}`),
    enabled: Boolean(fromDate && toDate),
  });
}
