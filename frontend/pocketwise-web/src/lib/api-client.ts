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
      const res = await fetch("/api/auth/token?refresh=true", {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) return false;
      const data = await res.json();
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

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> ?? {}),
  };
  if (!isFormData && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  let res = await fetch(path, {
    ...options,
    credentials: "include",
    headers,
    cache: "no-store",
  });

  // If 401 and not an auth route itself, try one token refresh and retry
  if (res.status === 401 && !path.startsWith("/api/auth/")) {
    const refreshed = await attemptClientRefresh();
    if (refreshed) {
      res = await fetch(path, {
        ...options,
        credentials: "include",
        headers,
        cache: "no-store",
      });
    }
  }

  let json: ApiResponse<T> | null = null;
  try {
    json = (await res.json()) as ApiResponse<T>;
  } catch {
    // non-JSON response (e.g. 204)
  }

  if (!res.ok) {
    if (
      res.status === 401 &&
      typeof window !== "undefined" &&
      !isRedirecting &&
      !window.location.pathname.startsWith("/login") &&
      !window.location.pathname.startsWith("/register") &&
      !window.location.pathname.startsWith("/forgot-password") &&
      !window.location.pathname.startsWith("/reset-password")
    ) {
      isRedirecting = true;
      window.location.href = `/login?from=${encodeURIComponent(window.location.pathname)}`;
    }

    const error = json?.error;
    throw new ApiError(
      error?.code ?? "INTERNAL_ERROR",
      error?.message ?? "เกิดข้อผิดพลาด",
      res.status,
      error?.details,
    );
  }

  if (json && json.success) {
    return json.data as T;
  }

  return json?.data as T;
}

export const apiClient = {
  get<T>(path: string) {
    return request<T>(path, { method: "GET" });
  },
  post<T>(path: string, body?: unknown) {
    const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
    return request<T>(path, {
      method: "POST",
      body: isFormData ? (body as FormData) : body !== undefined ? JSON.stringify(body) : undefined,
    });
  },
  put<T>(path: string, body?: unknown) {
    const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
    return request<T>(path, {
      method: "PUT",
      body: isFormData ? (body as FormData) : body !== undefined ? JSON.stringify(body) : undefined,
    });
  },
  delete<T>(path: string) {
    return request<T>(path, { method: "DELETE" });
  },
};
