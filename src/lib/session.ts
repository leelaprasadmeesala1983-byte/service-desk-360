import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { auth } from "@/lib/auth";
import type { UserRole, UserStatus } from "@/lib/constants";

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
  const session = await auth.api.getSession({ headers: await headers() });
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
    role:
      user.role === "SUPER_ADMIN"
        ? "SUPER_ADMIN"
        : user.role === "ADMIN"
          ? "ADMIN"
          : "TECHNICIAN",
    status: "ACTIVE",
  };
});

async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
    redirect("/service-tickets");
  }
  return user;
}

export type { CurrentUser };
export { getCurrentUser, requireUser, requireAdmin };
