import { getSessionCookie } from "better-auth/cookies";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/** Reachable without a session; everything else redirects to the login page. */
const PUBLIC_ROUTES = ["/login"];

/** Public routes that a signed-in user has no reason to see. */
const SIGNED_OUT_ONLY_ROUTES = ["/login"];

function matchesRoute(pathname: string, routes: string[]) {
  return routes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = matchesRoute(pathname, PUBLIC_ROUTES);

  // Cookie presence only — an optimistic gate. Pages still resolve the real
  // session server-side, which is what actually enforces access.
  const hasSession = Boolean(getSessionCookie(request));

  if (!hasSession && !isPublic) {
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (hasSession && matchesRoute(pathname, SIGNED_OUT_ONLY_ROUTES)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.png|.*\\.).*)"],
};
