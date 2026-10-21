import { NextRequest, NextResponse } from "next/server";

const AUTH_PAGES = ["/login", "/register", "/forgot-password", "/reset-password"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession =
    request.cookies.has("pw_access") || request.cookies.has("pw_refresh");

  const isAuthPage = AUTH_PAGES.some(
    (page) => pathname === page || pathname.startsWith(`${page}/`)
  );

  // If already authenticated and trying to access auth pages, redirect to home
  if (hasSession && isAuthPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // If not authenticated and trying to access protected routes, redirect to login
  if (!hasSession && !isAuthPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
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
    "/audit-logs/:path*",
    "/settings/:path*",
    "/admin/:path*",
  ],
};
