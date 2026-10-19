import { NextRequest, NextResponse } from "next/server";
import { callAuthEndpoint, setAuthCookiesFromData } from "@/lib/server/auth-endpoints";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const result = await callAuthEndpoint("/api/v1/auth/register", body);

  if (!result.ok || !result.data) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: result.status },
    );
  }

  const res = NextResponse.json({ success: true, data: result.data.user });
  setAuthCookiesFromData(res, result.data);
  return res;
}
