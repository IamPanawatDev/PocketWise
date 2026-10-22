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

export interface AuthEndpointResult {
  ok: boolean;
  status: number;
  data: {
    accessToken: string;
    accessTokenExpiresAt: string;
    refreshToken: string;
    refreshTokenExpiresAt: string;
    user: unknown;
  } | null;
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

export function setAuthCookiesFromData(
  res: NextResponse,
  data: NonNullable<AuthEndpointResult["data"]>,
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
