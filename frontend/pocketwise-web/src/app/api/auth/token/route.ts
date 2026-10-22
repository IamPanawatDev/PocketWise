import { NextResponse } from "next/server";
import { clearAuthCookies, getAccessToken, getRefreshToken, setAuthCookies } from "@/lib/server/auth";
import { clearAuthCookiesFrom } from "@/lib/server/auth-endpoints";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5268";

export async function GET() {
  let token = await getAccessToken();

  if (!token) {
    const refreshToken = await getRefreshToken();
    if (refreshToken) {
      try {
        const refreshRes = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
          cache: "no-store",
        });

        if (refreshRes.ok) {
          const json = await refreshRes.json();
          if (json?.success && json?.data?.accessToken) {
            await setAuthCookies({
              accessToken: json.data.accessToken,
              accessTokenExpiresAt: json.data.accessTokenExpiresAt,
              refreshToken: json.data.refreshToken,
              refreshTokenExpiresAt: json.data.refreshTokenExpiresAt,
            });
            token = json.data.accessToken;
          }
        } else if (refreshRes.status === 400 || refreshRes.status === 401) {
          await clearAuthCookies();
          const res = NextResponse.json({ accessToken: null }, { status: 401 });
          clearAuthCookiesFrom(res);
          return res;
        }
      } catch {
        // ignore refresh error
      }
    }
  }

  return NextResponse.json({ accessToken: token });
}
