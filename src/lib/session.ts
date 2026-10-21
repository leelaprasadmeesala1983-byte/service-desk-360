import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { auth } from "@/lib/auth";
import type { UserRole, UserStatus } from "@/lib/constants";
import { isTransientDbError, withDbRetry } from "@/lib/db-resilience";

type CurrentUser = {
  id: string;
  name: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  department: string | null;
  role: UserRole;
  status: UserStatus;
};

/** Deduped per request so several server components can call it freely. */
const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  try {
    const reqHeaders = await headers();
    const session = await withDbRetry(
      () => auth.api.getSession({ headers: reqHeaders }),
      { retries: 3, delayMs: 200, operationName: "auth.api.getSession" },
    );
    if (!session?.user) return null;

    const user = session.user as typeof session.user & {
      firstName?: string | null;
      lastName?: string | null;
      phone?: string | null;
      department?: string | null;
      role?: string | null;
      status?: string | null;
    };

    // A session outliving a deactivation must not keep working.
    if (user.status === "INACTIVE") return null;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
      phone: user.phone ?? null,
      department: user.department ?? null,
      role: user.role === "ADMIN" ? "ADMIN" : "TECHNICIAN",
      status: "ACTIVE",
    };
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "digest" in error &&
      (error as { digest?: string }).digest === "DYNAMIC_SERVER_USAGE"
    ) {
      throw error;
    }

    // Do NOT treat transient DB connectivity issues as unauthenticated.
    // Re-throwing lets the page retry or render the error boundary without wiping user state.
    if (isTransientDbError(error)) {
      console.warn(
        "Transient DB error during user session retrieval; re-throwing to prevent false logout:",
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }

    console.error("Failed to retrieve user session:", error);
    return null;
  }
});

async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    let redirectUrl = "/login";
    try {
      const reqHeaders = await headers();
      const currentPath =
        reqHeaders.get("x-invoke-path") ||
        reqHeaders.get("next-url") ||
        reqHeaders.get("x-url");
      if (
        currentPath &&
        currentPath !== "/" &&
        !currentPath.startsWith("/login")
      ) {
        redirectUrl = `/login?next=${encodeURIComponent(currentPath)}`;
      }
    } catch {
      // Fallback to default /login if headers inspection fails
    }
    redirect(redirectUrl);
  }
  return user;
}

async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    redirect("/service-tickets");
  }
  return user;
}

export type { CurrentUser };
export { getCurrentUser, requireUser, requireAdmin };
