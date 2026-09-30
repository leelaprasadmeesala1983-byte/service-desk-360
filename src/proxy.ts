import { getSessionCookie } from "better-auth/cookies";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Public routes that do not require an active user session.
 */
const PUBLIC_ROUTES = ["/login"];

/**
 * Static asset prefixes and Next.js internal paths that bypass auth checks.
 */
const STATIC_PATH_PREFIXES = [
  "/_next",
  "/api/auth",
  "/favicon.png",
  "/favicon.ico",
];

function isStaticOrInternal(pathname: string): boolean {
  if (STATIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return true;
  }
  return /\.[a-zA-Z0-9]+$/.test(pathname);
}

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Static and internal Next.js assets bypass proxy checks completely
  if (isStaticOrInternal(pathname)) {
    return NextResponse.next();
  }

  const isPublic = isPublicRoute(pathname);

  // 2. Optimistic cookie check at edge proxy.
  // Full session verification is authoritatively performed in server components/layouts.
  const hasSession = Boolean(getSessionCookie(request));

  // 3. Unauthenticated access to protected route -> redirect to /login
  if (!hasSession && !isPublic) {
    if (pathname === "/login") {
      return NextResponse.next();
    }
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("next", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // 4. Allowed requests proceed
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.png|favicon.ico|.*\\..*).*)",
  ],
};
