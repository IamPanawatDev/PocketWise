import { NextResponse } from "next/server";
import { clearAuthCookiesFrom } from "@/lib/server/auth-endpoints";

export async function POST() {
  const res = NextResponse.json({ success: true });
  clearAuthCookiesFrom(res);
  return res;
}
