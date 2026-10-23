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

function hasSessionCookie(request: NextRequest): boolean {
  if (Boolean(getSessionCookie(request))) {
    return true;
  }
  const knownCookies = [
    "better-auth.session_token",
    "__Secure-better-auth.session_token",
    "better-auth.session_data",
    "__Secure-better-auth.session_data",
    "better_auth.session_token",
    "session_token",
  ];
  if (knownCookies.some((name) => Boolean(request.cookies.get(name)?.value))) {
    return true;
  }

  // Inspect all cookies for better-auth session token variations
  return request.cookies.getAll().some((cookie) => {
    const name = cookie.name.toLowerCase();
    return (
      (name.includes("better-auth") ||
        name.includes("better_auth") ||
        name.includes("session")) &&
      (name.includes("token") || name.includes("data")) &&
      Boolean(cookie.value)
    );
  });
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
  const hasSession = hasSessionCookie(request);

  // 3. Unauthenticated access to protected route:
  // - If it's an API route, return 401 Unauthorized JSON (never redirect API to HTML /login)
  // - If it's a page route, redirect to /login preserving destination
  if (!hasSession && !isPublic) {
    if (pathname === "/login") {
      return NextResponse.next();
    }

    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("next", pathname);
    }
    // The redirect depends on the cookie; keep CDNs/ISP caches from replaying
    // it to signed-in users (that makes / -> /login -> / loop).
    const response = NextResponse.redirect(loginUrl);
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Vary", "Cookie");
    return response;
  }

  // 4. Allowed requests proceed
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.png|favicon.ico|.*\\..*).*)",
  ],
};
