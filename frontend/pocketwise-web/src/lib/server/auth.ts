import { cookies } from "next/headers";

export const ACCESS_COOKIE = "pw_access";
export const REFRESH_COOKIE = "pw_refresh";

const isProd = process.env.NODE_ENV === "production";

function secondsUntil(iso: string): number {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.floor(ms / 1000));
}

export async function getAccessToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(ACCESS_COOKIE)?.value ?? null;
}

export async function getRefreshToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(REFRESH_COOKIE)?.value ?? null;
}

export interface AuthTokens {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
}

export async function setAuthCookies(auth: AuthTokens): Promise<void> {
  const store = await cookies();
  const base = {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax" as const,
    path: "/",
  };

  store.set(ACCESS_COOKIE, auth.accessToken, {
    ...base,
    maxAge: secondsUntil(auth.accessTokenExpiresAt),
  });
  store.set(REFRESH_COOKIE, auth.refreshToken, {
    ...base,
    maxAge: secondsUntil(auth.refreshTokenExpiresAt),
  });
}

export async function clearAuthCookies(): Promise<void> {
  const store = await cookies();
  store.set(ACCESS_COOKIE, "", { path: "/", maxAge: 0 });
  store.set(REFRESH_COOKIE, "", { path: "/", maxAge: 0 });
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
}
