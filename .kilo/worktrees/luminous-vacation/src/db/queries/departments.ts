import "server-only";

import { asc } from "drizzle-orm";

import { db } from "@/db";
import { department } from "@/db/schema/department";

/** All selectable department names, alphabetical (spec §4.5.3). */
function listDepartmentNames(): Promise<string[]> {
  return db
    .select({ name: department.name })
    .from(department)
    .orderBy(asc(department.name))
    .then((rows) => rows.map((row) => row.name));
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
