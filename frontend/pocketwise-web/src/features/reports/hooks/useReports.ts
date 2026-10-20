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

export async function exportReportFile({
  fromDate,
  toDate,
  format = "csv",
  type = "full",
  categoryId,
  tagId,
}: {
  fromDate: string;
  toDate: string;
  format?: "csv" | "json";
  type?: "full" | "transactions";
  categoryId?: number;
  tagId?: number;
}): Promise<void> {
  const query = new URLSearchParams({
    fromDate,
    toDate,
    format,
    type,
    ...(categoryId ? { categoryId: String(categoryId) } : {}),
    ...(tagId ? { tagId: String(tagId) } : {}),
  });

  const response = await fetch(`/api/v1/reports/export?${query.toString()}`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    let errorMsg = "ส่งออกรายงานไม่สำเร็จ";
    try {
      const err = await response.json();
      if (err.error?.message) errorMsg = err.error.message;
    } catch {
      // fallback
    }
    throw new Error(errorMsg);
  }

  const blob = await response.blob();
  const disposition = response.headers.get("content-disposition");
  let filename = `pocketwise-report-${fromDate.slice(0, 10)}.${format}`;
  if (disposition && disposition.includes("filename=")) {
    const match = disposition.match(/filename="?([^";]+)"?/);
    if (match && match[1]) {
      filename = match[1];
    }
  }

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
