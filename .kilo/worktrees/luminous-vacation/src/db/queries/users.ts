import "server-only";

import { and, asc, count, eq, ilike, isNull, or, type SQL } from "drizzle-orm";

import { db } from "@/db";
import { user } from "@/db/schema/auth";
import type { UserRole, UserStatus } from "@/lib/constants";

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
  createdAt: user.createdAt,
} as const;

function listUsers(filters: UserListFilters = {}): Promise<UserRow[]> {
  const clauses: (SQL | undefined)[] = [isNull(user.deletedAt)];

  if (filters.role && filters.role !== "ALL") {
    clauses.push(eq(user.role, filters.role));
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

function getUserById(id: string): Promise<UserRow | undefined> {
  return db
    .select(USER_COLUMNS)
    .from(user)
    .where(and(eq(user.id, id), isNull(user.deletedAt)))
    .then((rows) => rows[0]);
}

/** Active technicians only — the pool every Assign Technician dropdown draws from. */
function listAssignableTechnicians(): Promise<
  { id: string; name: string; department: string | null }[]
> {
  return db
    .select({
      id: user.id,
      name: user.name,
      department: user.department,
    })
    .from(user)
    .where(and(eq(user.role, "TECHNICIAN"), eq(user.status, "ACTIVE")))
    .orderBy(asc(user.name));
}

type UserStats = {
  total: number;
  active: number;
  inactive: number;
  admins: number;
  technicians: number;
};

async function getUserStats(): Promise<UserStats> {
  const rows = await db
    .select({ role: user.role, status: user.status, value: count() })
    .from(user)
    .where(isNull(user.deletedAt))
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

export type { UserRow, UserListFilters, UserStats };
export { listUsers, getUserById, listAssignableTechnicians, getUserStats };
