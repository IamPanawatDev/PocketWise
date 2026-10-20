import { NextResponse } from "next/server";
import { clearAuthCookiesFrom } from "@/lib/server/auth-endpoints";
import { getAccessToken } from "@/lib/server/auth";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5268";

export async function POST() {
  const token = await getAccessToken();
  if (token) {
    try {
      await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });
    } catch {
      // ignore network errors on logout
    }
  }

  const res = NextResponse.json({ success: true });
  clearAuthCookiesFrom(res);
  return res;
}
