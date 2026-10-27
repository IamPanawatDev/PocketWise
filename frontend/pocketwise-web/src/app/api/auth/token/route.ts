import { NextRequest, NextResponse } from "next/server";
import { clearAuthCookies, getAccessToken, getRefreshToken, setAuthCookies } from "@/lib/server/auth";
import {
  clearAuthCookiesFrom,
  refreshAuthTokens,
  setAuthCookiesFromData,
} from "@/lib/server/auth-endpoints";

function isJwtExpired(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return true;
    const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());
    if (typeof payload.exp !== "number") return false;
    return Date.now() >= payload.exp * 1000 - 30_000;
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const forceRefresh = req.nextUrl.searchParams.get("refresh") === "true";
  let token = await getAccessToken();

  if (!token || forceRefresh || isJwtExpired(token)) {
    const refreshToken = await getRefreshToken();
    if (refreshToken) {
      const newTokens = await refreshAuthTokens(refreshToken);
      if (newTokens?.accessToken) {
        token = newTokens.accessToken;
        await setAuthCookies(newTokens);
        const res = NextResponse.json({ accessToken: token });
        setAuthCookiesFromData(res, newTokens);
        return res;
      }
    }

    // If token was needed or refresh was explicitly forced and failed, clear auth and return 401
    await clearAuthCookies();
    const res = NextResponse.json({ accessToken: null }, { status: 401 });
    clearAuthCookiesFrom(res);
    return res;
  }

  return NextResponse.json({ accessToken: token });
}
