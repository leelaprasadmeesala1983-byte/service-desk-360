import "server-only";

import { asc } from "drizzle-orm";

import { db } from "@/db";
import { department } from "@/db/schema/department";
import { DEFAULT_DEPARTMENTS } from "@/lib/constants";

/**
 * All selectable department names, alphabetical (spec §4.5.3). The built-in
 * defaults are always included, so the dropdown is complete even on a
 * database that was never seeded.
 */
async function listDepartmentNames(): Promise<string[]> {
  const rows = await db
    .select({ name: department.name })
    .from(department)
    .orderBy(asc(department.name));

  const names = new Set<string>(DEFAULT_DEPARTMENTS);
  for (const row of rows) names.add(row.name);

  return [...names].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  );
}

/**
 * Inserts a department name if it is new, so an admin's "Custom" entry becomes
 * a standing option for everyone afterwards.
 */
async function ensureDepartment(name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) return;

  await db.insert(department).values({ name: trimmed }).onConflictDoNothing();
}

export { listDepartmentNames, ensureDepartment };
