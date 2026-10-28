import { NextRequest, NextResponse } from "next/server";
import { callAuthEndpoint, setAuthCookiesFromData } from "@/lib/server/auth-endpoints";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const result = await callAuthEndpoint("/api/v1/auth/login", body);

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
