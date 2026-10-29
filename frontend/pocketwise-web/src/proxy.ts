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
    // If request has ?from=..., allow viewing the login/auth page without an immediate redirect loop
    if (request.nextUrl.searchParams.has("from")) {
      return NextResponse.next();
    }

    // If user has an active session (and not visiting with ?from), redirect to /transactions
    if (hasSession) {
      return NextResponse.redirect(new URL("/transactions", request.url));
    }

    return NextResponse.next();
  }

  // If not authenticated and trying to access protected routes, redirect to login
  // Note: Allow "/" to reach dashboard redirect / client hydration so iOS PWA can run silent restore
  if (!hasSession && !isPublicPage && pathname !== "/") {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
