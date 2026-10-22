import { NextResponse } from "next/server";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5268";

const ACCESS_COOKIE = "pw_access";
const REFRESH_COOKIE = "pw_refresh";
const isProd = process.env.NODE_ENV === "production";

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
): Promise<AuthEndpointResult> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
  });
  res.cookies.set(REFRESH_COOKIE, data.refreshToken, {
    ...base,
    maxAge: secondsUntil(data.refreshTokenExpiresAt),
  });
}

export function clearAuthCookiesFrom(res: NextResponse): void {
  res.cookies.set(ACCESS_COOKIE, "", { path: "/", maxAge: 0 });
  res.cookies.set(REFRESH_COOKIE, "", { path: "/", maxAge: 0 });
  res.cookies.delete(ACCESS_COOKIE);
  res.cookies.delete(REFRESH_COOKIE);
}
