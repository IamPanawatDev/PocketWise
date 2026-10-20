import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const hasSession =
    request.cookies.has("pw_access") || request.cookies.has("pw_refresh");

  if (!hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/transactions/:path*",
    "/budgets/:path*",
    "/credit-cards/:path*",
    "/recurring-transactions/:path*",
    "/categorization/:path*",
    "/reports/:path*",
    "/categories/:path*",
    "/tags/:path*",
    "/bank-accounts/:path*",
    "/transfers/:path*",
    "/imports/:path*",
  ],
};
