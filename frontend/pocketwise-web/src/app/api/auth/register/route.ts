import { NextRequest, NextResponse } from "next/server";
import { callAuthEndpoint, setAuthCookiesFromData } from "@/lib/server/auth-endpoints";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const origin = req.headers.get("origin") || req.nextUrl.origin;
  const result = await callAuthEndpoint("/api/v1/auth/register", body, origin);

  if (!result.ok || !result.data) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: result.status },
    );
  }

  const res = NextResponse.json({
    success: true,
    data: {
      user: result.data.user,
      refreshToken: result.data.refreshToken,
    },
  });
  setAuthCookiesFromData(res, result.data);
  return res;
}
