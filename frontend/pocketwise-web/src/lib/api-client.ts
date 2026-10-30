// Client-side API client. Calls same-origin Next.js BFF routes
// (which hold the httpOnly cookie tokens), not the backend directly.

import type { ApiResponse } from "@/types/api.types";

export class ApiError extends Error {
  code: string;
  status: number;
  details?: { field: string; message: string }[];

  constructor(
    code: string,
    message: string,
    status: number,
    details?: { field: string; message: string }[],
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

let isRedirecting = false;
let clientRefreshPromise: Promise<boolean> | null = null;

async function attemptClientRefresh(): Promise<boolean> {
  if (clientRefreshPromise) return clientRefreshPromise;

  clientRefreshPromise = (async () => {
    try {
      const fallback = typeof window !== "undefined" ? localStorage.getItem("pw_fallback_refresh") : null;
      const res = await fetch("/api/auth/token?refresh=true", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({ refreshToken: fallback ?? undefined }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (data?.refreshToken && typeof window !== "undefined") {
        try {
          localStorage.setItem("pw_fallback_refresh", data.refreshToken);
        } catch {}
      }
      return Boolean(data?.accessToken);
    } catch {
      return false;
    } finally {
      setTimeout(() => {
        clientRefreshPromise = null;
      }, 3000);
    }
  })();

  return clientRefreshPromise;
}

export interface ApiRequestOptions extends RequestInit {
  timeoutMs?: number;
}

async function request<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> ?? {}),
  };
  if (!isFormData && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  // Generous timeout for Render free tier (120s for file uploads, 60s for normal API calls)
  const defaultTimeout = isFormData ? 120_000 : 60_000;
  const timeoutMs = options.timeoutMs ?? defaultTimeout;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(path, {
      ...options,
      credentials: "include",
      headers,
      cache: "no-store",
      signal: options.signal ?? controller.signal,
    });
  } catch (err: unknown) {
    clearTimeout(timer);
    const isAbort = err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError");
    if (isAbort) {
      throw new ApiError(
        "TIMEOUT",
        "การเชื่อมต่อหมดเวลา (เซิร์ฟเวอร์อาจใช้เวลาเริ่มทำงาน) กรุณาลองใหม่อีกครั้ง",
        408,
      );
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }

  // If 401 and not an auth route itself, try one token refresh and retry
  if (res.status === 401 && !path.startsWith("/api/auth/")) {
    const refreshed = await attemptClientRefresh();
    if (refreshed) {
      const retryController = new AbortController();
      const retryTimer = setTimeout(() => retryController.abort(), timeoutMs);
      try {
        res = await fetch(path, {
          ...options,
          credentials: "include",
          headers,
          cache: "no-store",
          signal: options.signal ?? retryController.signal,
        });
      } finally {
        clearTimeout(retryTimer);
      }
    }
  }

  let json: ApiResponse<T> | null = null;
  try {
    json = (await res.json()) as ApiResponse<T>;
  } catch {
    // non-JSON response (e.g. 204 No Content)
  }

  if (!res.ok) {
    if (
      res.status === 401 &&
      typeof window !== "undefined" &&
      !isRedirecting &&
      !window.location.pathname.startsWith("/login") &&
      !window.location.pathname.startsWith("/register") &&
      !window.location.pathname.startsWith("/forgot-password") &&
      !window.location.pathname.startsWith("/reset-password") &&
      !window.location.pathname.startsWith("/terms") &&
      !window.location.pathname.startsWith("/privacy-policy") &&
      !window.location.pathname.startsWith("/verify-email")
    ) {
      isRedirecting = true;
      window.location.href = `/login?from=${encodeURIComponent(window.location.pathname)}`;
    }

    const error = json?.error;
    throw new ApiError(
      error?.code ?? "INTERNAL_ERROR",
      error?.message ?? "เกิดข้อผิดพลาดในการดำเนินการ",
      res.status,
      error?.details,
    );
  }

  if (json && json.success) {
    return json.data as T;
  }

  return (json?.data ?? (undefined as unknown)) as T;
}

export const apiClient = {
  get<T>(path: string, options?: ApiRequestOptions) {
    return request<T>(path, { ...options, method: "GET" });
  },
  post<T>(path: string, body?: unknown, options?: ApiRequestOptions) {
    const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
    return request<T>(path, {
      ...options,
      method: "POST",
      body: isFormData ? (body as FormData) : body !== undefined ? JSON.stringify(body) : undefined,
    });
  },
  put<T>(path: string, body?: unknown, options?: ApiRequestOptions) {
    const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
    return request<T>(path, {
      ...options,
      method: "PUT",
      body: isFormData ? (body as FormData) : body !== undefined ? JSON.stringify(body) : undefined,
    });
  },
  delete<T>(path: string, options?: ApiRequestOptions) {
    return request<T>(path, { ...options, method: "DELETE" });
  },
};
