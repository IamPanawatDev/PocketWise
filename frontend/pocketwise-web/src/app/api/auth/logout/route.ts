import { NextResponse } from "next/server";
import { clearAuthCookiesFrom } from "@/lib/server/auth-endpoints";
import {
  getAccessToken,
  getRefreshToken,
  clearAuthCookies,
} from "@/lib/server/auth";
import { authService } from "@/lib/server/modules/auth/auth.service";
import { verifyAccessToken } from "@/lib/server/auth/jwt";

export async function POST() {
  const token = await getAccessToken();
  const refreshToken = await getRefreshToken();
  let userId: number | null = null;

  if (token) {
    try {
      const claims = await verifyAccessToken(token);
      userId = Number(claims?.sub) || null;
    } catch {
      // token may be expired
    }
  }

  try {
    await authService.logout(userId, refreshToken);
  } catch {
    // ignore errors on logout
  }

  await clearAuthCookies();
  const res = NextResponse.json({ success: true });
  clearAuthCookiesFrom(res);
  return res;
}
