import { NextRequest, NextResponse } from "next/server";
import { clearAuthCookies, getAccessToken, getRefreshToken, setAuthCookies } from "@/lib/server/auth";
import {
  clearAuthCookiesFrom,
  refreshAuthTokens,
  setAuthCookiesFromData,
} from "@/lib/server/auth-endpoints";

export async function GET(req: NextRequest) {
  const forceRefresh = req.nextUrl.searchParams.get("refresh") === "true";
  let token = await getAccessToken();

  if (!token || forceRefresh) {
    const refreshToken = await getRefreshToken();
    if (refreshToken) {
      const newTokens = await refreshAuthTokens(refreshToken);
      if (newTokens?.accessToken) {
        token = newTokens.accessToken;
        await setAuthCookies(newTokens);
        const res = NextResponse.json({ accessToken: token });
        setAuthCookiesFromData(res, newTokens);
        return res;
      } else if (!token) {
        await clearAuthCookies();
        const res = NextResponse.json({ accessToken: null }, { status: 401 });
        clearAuthCookiesFrom(res);
        return res;
      }
    }
  }

  return NextResponse.json({ accessToken: token });
}
