import { NextResponse } from "next/server";
import { serverConfig } from "./config";
import { authService } from "./modules/auth/auth.service";
import { AppError } from "./api-error";

const API_BASE_URL = serverConfig.migration.fallbackApiBaseUrl;
const ACCESS_COOKIE = serverConfig.cookies.accessCookieName;
const REFRESH_COOKIE = serverConfig.cookies.refreshCookieName;
const isProd = serverConfig.isProd;

function secondsUntil(iso: string): number {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.floor(ms / 1000));
}

export interface AuthTokens {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
}

export interface AuthEndpointResult {
  ok: boolean;
  status: number;
  data: (AuthTokens & { user: unknown }) | null;
  error: unknown;
}

export async function callAuthEndpoint(
  path: string,
  body: unknown,
  originUrl?: string,
  clientInfo?: { userAgent?: string; ip?: string },
): Promise<AuthEndpointResult> {
  // Use in-process Next.js AuthService first
  try {
    if (path.includes("/auth/login")) {
      const b = (body || {}) as { email?: string; password?: string };
      if (!b?.email || !b?.password) {
        return {
          ok: false,
          status: 400,
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: "กรุณากรอกอีเมลและรหัสผ่าน",
          },
        };
      }
      const result = await authService.login(
        b.email,
        b.password,
        clientInfo?.ip,
        clientInfo?.userAgent,
      );
      return {
        ok: true,
        status: 200,
        data: {
          accessToken: result.accessToken,
          accessTokenExpiresAt: result.accessTokenExpiresAt.toISOString(),
          refreshToken: result.refreshToken,
          refreshTokenExpiresAt: result.refreshTokenExpiresAt.toISOString(),
          user: result.user,
        },
        error: null,
      };
    }

    if (path.includes("/auth/register")) {
      const b = (body || {}) as {
        displayName?: string;
        email?: string;
        password?: string;
      };
      if (!b?.displayName || !b?.email || !b?.password) {
        return {
          ok: false,
          status: 400,
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: "กรุณากรอกข้อมูลให้ครบถ้วน",
          },
        };
      }
      const result = await authService.register(
        b.displayName,
        b.email,
        b.password,
        clientInfo?.ip,
        clientInfo?.userAgent,
      );
      return {
        ok: true,
        status: 200,
        data: {
          accessToken: result.accessToken,
          accessTokenExpiresAt: result.accessTokenExpiresAt.toISOString(),
          refreshToken: result.refreshToken,
          refreshTokenExpiresAt: result.refreshTokenExpiresAt.toISOString(),
          user: result.user,
        },
        error: null,
      };
    }
  } catch (err: unknown) {
    if (err instanceof AppError) {
      return {
        ok: false,
        status: err.statusCode,
        data: null,
        error: { code: err.code, message: err.message },
      };
    }
    console.error("[callAuthEndpoint] internal error:", err);
    return {
      ok: false,
      status: 500,
      data: null,
      error: {
        code: "INTERNAL_ERROR",
        message: "เกิดข้อผิดพลาดในการประมวลผล",
      },
    };
  }

  // Fallback to fetch if not handled above
  const origin =
    originUrl ||
    (isProd ? "https://pocket-wise.vercel.app" : "http://localhost:3000");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Origin: origin,
  };
  if (clientInfo?.userAgent) {
    headers["User-Agent"] = clientInfo.userAgent;
  }
  if (clientInfo?.ip) {
    headers["X-Forwarded-For"] = clientInfo.ip;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const json = (await res.json()) as {
    success?: boolean;
    data?: AuthEndpointResult["data"];
    error?: unknown;
  };

  return {
    ok: res.status >= 200 && res.status < 300 && json.success === true,
    status: res.status,
    data: json.data ?? null,
    error: json.error ?? null,
  };
}

const inFlightRefreshes = new Map<string, Promise<AuthTokens | null>>();

export async function refreshAuthTokens(
  refreshToken: string,
): Promise<AuthTokens | null> {
  const existing = inFlightRefreshes.get(refreshToken);
  if (existing) {
    return existing;
  }

  const promise = (async () => {
    try {
      const result = await authService.refresh(refreshToken);
      return {
        accessToken: result.accessToken,
        accessTokenExpiresAt: result.accessTokenExpiresAt.toISOString(),
        refreshToken: result.refreshToken,
        refreshTokenExpiresAt: result.refreshTokenExpiresAt.toISOString(),
      };
    } catch (err) {
      console.warn("[refreshAuthTokens] Failed via local authService:", err);
      // Optional fallback to fetch if local fails
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
          cache: "no-store",
        });

        if (!res.ok) return null;

        const json = (await res.json()) as {
          success?: boolean;
          data?: AuthTokens;
        };

        if (!json.success || !json.data) return null;
        return json.data;
      } catch {
        return null;
      }
    } finally {
      // Keep cached for 5 seconds to gracefully deduplicate concurrent bursts of requests
      setTimeout(() => {
        inFlightRefreshes.delete(refreshToken);
      }, 5000);
    }
  })();

  inFlightRefreshes.set(refreshToken, promise);
  return promise;
}

export function setAuthCookiesFromData(
  res: NextResponse,
  data: AuthTokens,
): void {
  const base = {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax" as const,
    path: "/",
  };

  res.cookies.set(ACCESS_COOKIE, data.accessToken, {
    ...base,
    maxAge: secondsUntil(data.accessTokenExpiresAt),
    expires: new Date(data.accessTokenExpiresAt),
  });
  res.cookies.set(REFRESH_COOKIE, data.refreshToken, {
    ...base,
    maxAge: secondsUntil(data.refreshTokenExpiresAt),
    expires: new Date(data.refreshTokenExpiresAt),
  });
}

export function clearAuthCookiesFrom(res: NextResponse): void {
  res.cookies.set(ACCESS_COOKIE, "", { path: "/", maxAge: 0 });
  res.cookies.set(REFRESH_COOKIE, "", { path: "/", maxAge: 0 });
  res.cookies.delete(ACCESS_COOKIE);
  res.cookies.delete(REFRESH_COOKIE);
}
