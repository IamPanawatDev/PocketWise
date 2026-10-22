import { NextRequest, NextResponse } from "next/server";

const AUTH_PAGES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
];

const PUBLIC_PAGES = [
  ...AUTH_PAGES,
  "/privacy-policy",
  "/terms",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const access = request.cookies.get("pw_access")?.value;
  const refresh = request.cookies.get("pw_refresh")?.value;
  const hasSession = Boolean((access && access.trim()) || (refresh && refresh.trim()));

  const isAuthPage = AUTH_PAGES.some(
    (page) => pathname === page || pathname.startsWith(`${page}/`)
  );
  const isPublicPage = PUBLIC_PAGES.some(
    (page) => pathname === page || pathname.startsWith(`${page}/`)
  );

  // If trying to access auth pages:
  if (isAuthPage) {
    // If request has ?from=..., the user was sent to the auth page due to session expiry or logout.
    // Allow access to login without redirecting back to /transactions, and clear any leftover cookies.
    if (request.nextUrl.searchParams.has("from")) {
      const response = NextResponse.next();
      response.cookies.delete("pw_access");
      response.cookies.delete("pw_refresh");
      return response;
    }

    // If user has an active session (and not redirected with ?from), redirect to /transactions
    if (hasSession) {
      return NextResponse.redirect(new URL("/transactions", request.url));
    }

    return NextResponse.next();
  }

  // If not authenticated and trying to access protected routes, redirect to login
  if (!hasSession && !isPublicPage) {
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("from", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
