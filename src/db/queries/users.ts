import "server-only";

import { and, asc, count, eq, ilike, isNull, or, type SQL } from "drizzle-orm";

import { db } from "@/db";
import { user } from "@/db/schema/auth";
import type { UserRole, UserStatus } from "@/lib/constants";

type Viewer = {
  role: UserRole | string;
  id: string;
};

type UserRow = {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  department: string | null;
  status: UserStatus;
  createdById?: string | null;
  createdAt: Date;
};

type UserListFilters = {
  role?: UserRole | "ALL";
  status?: UserStatus | "ALL";
  search?: string;
};

const USER_COLUMNS = {
  id: user.id,
  firstName: user.firstName,
  lastName: user.lastName,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  department: user.department,
  status: user.status,
  createdById: user.createdById,
  createdAt: user.createdAt,
} as const;

function buildUserScopeCondition(viewer?: Viewer): SQL | undefined {
  if (!viewer || (viewer.role as string) === "SUPER_ADMIN") {
    return undefined;
  }

  if (viewer.role === "ADMIN") {
    return or(eq(user.createdById, viewer.id), eq(user.id, viewer.id));
  }

  // TECHNICIAN can only see self
  return eq(user.id, viewer.id);
}

function listUsers(
  filters: UserListFilters = {},
  viewer?: Viewer,
): Promise<UserRow[]> {
  const clauses: (SQL | undefined)[] = [isNull(user.deletedAt)];

  const scopeCondition = buildUserScopeCondition(viewer);
  if (scopeCondition) {
    clauses.push(scopeCondition);
  }

  if (filters.role && filters.role !== "ALL") {
    if (filters.role === "ADMIN" || filters.role === "TECHNICIAN") {
      clauses.push(eq(user.role, filters.role));
    }
  }
  if (filters.status && filters.status !== "ALL") {
    clauses.push(eq(user.status, filters.status));
  }
  if (filters.search?.trim()) {
    const term = `%${filters.search.trim()}%`;
    clauses.push(
      or(
        ilike(user.email, term),
        ilike(user.name, term),
        ilike(user.phone, term),
      ),
    );
  }

  return db
    .select(USER_COLUMNS)
    .from(user)
    .where(and(...clauses))
    .orderBy(asc(user.createdAt));
}

function getUserById(
  id: string,
  viewer?: Viewer,
): Promise<UserRow | undefined> {
  const clauses: (SQL | undefined)[] = [
    eq(user.id, id),
    isNull(user.deletedAt),
  ];

  const scopeCondition = buildUserScopeCondition(viewer);
  if (scopeCondition) {
    clauses.push(scopeCondition);
  }

  return db
    .select(USER_COLUMNS)
    .from(user)
    .where(and(...clauses))
    .then((rows) => rows[0]);
}

/** Active technicians scoped to current viewer/admin pool. */
function listAssignableTechnicians(
  viewer?: Viewer,
): Promise<{ id: string; name: string; department: string | null }[]> {
  const clauses: (SQL | undefined)[] = [
    eq(user.role, "TECHNICIAN"),
    eq(user.status, "ACTIVE"),
    isNull(user.deletedAt),
  ];

  if (
    viewer &&
    (viewer.role as string) !== "SUPER_ADMIN" &&
    viewer.role === "ADMIN"
  ) {
    clauses.push(eq(user.createdById, viewer.id));
  } else if (viewer && viewer.role === "TECHNICIAN") {
    clauses.push(eq(user.id, viewer.id));
  }

  return db
    .select({
      id: user.id,
      name: user.name,
      department: user.department,
    })
    .from(user)
    .where(and(...clauses))
    .orderBy(asc(user.name));
}

type UserStats = {
  total: number;
  active: number;
  inactive: number;
  admins: number;
  technicians: number;
};

async function getUserStats(viewer?: Viewer): Promise<UserStats> {
  const clauses: (SQL | undefined)[] = [isNull(user.deletedAt)];

  const scopeCondition = buildUserScopeCondition(viewer);
  if (scopeCondition) {
    clauses.push(scopeCondition);
  }

  const rows = await db
    .select({ role: user.role, status: user.status, value: count() })
    .from(user)
    .where(and(...clauses))
    .groupBy(user.role, user.status);

  const stats: UserStats = {
    total: 0,
    active: 0,
    inactive: 0,
    admins: 0,
    technicians: 0,
  };

  for (const row of rows) {
    stats.total += row.value;
    if (row.status === "ACTIVE") stats.active += row.value;
    else stats.inactive += row.value;
    if (row.role === "ADMIN") stats.admins += row.value;
    else stats.technicians += row.value;
  }

  return stats;
}

export type { UserRow, UserListFilters, UserStats, Viewer };
export { listUsers, getUserById, listAssignableTechnicians, getUserStats };
