import "server-only";

import { and, eq, or, type SQL, sql } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

import type { RecordStatus, UserRole } from "@/lib/constants";
import { parseRecordIdSearch } from "@/lib/format";

/**
 * Every transactional record query runs through the authenticated viewer:
 * - ADMIN: strictly scoped to own transactional records (createdById === viewer.id).
 * - TECHNICIAN: restricted to assigned tickets/records or created records.
 */
type Viewer = { role: UserRole | string; id: string };

/**
 * Restricts queries by authenticated user ownership and role:
 * - Admin A sees only records created by Admin A.
 * - Admin B sees only records created by Admin B.
 * - Technician sees records assigned to them or created by them.
 */
function scopeRecordToViewer(
  columns: {
    createdById: PgColumn;
    assignedTechnicianId?: PgColumn;
    assignedTechnicianIds?: PgColumn;
  },
  viewer?: Viewer,
): SQL | undefined {
  if (!viewer) {
    return undefined;
  }

  if (viewer.role === "ADMIN") {
    return eq(columns.createdById, viewer.id);
  }

  // TECHNICIAN role
  const techConditions: SQL[] = [];
  if (columns.assignedTechnicianId) {
    techConditions.push(eq(columns.assignedTechnicianId, viewer.id));
  }
  if (columns.assignedTechnicianIds) {
    techConditions.push(
      sql`${viewer.id} = ANY(${columns.assignedTechnicianIds})`,
    );
  }
  techConditions.push(eq(columns.createdById, viewer.id));

  return techConditions.length === 1
    ? techConditions[0]
    : or(...techConditions);
}

/** Restricts an admin to their own created records. */
function scopeAdminOwnership(
  createdByIdColumn: PgColumn,
  viewer?: Viewer,
): SQL | undefined {
  if (!viewer) return undefined;
  return eq(createdByIdColumn, viewer.id);
}

/** Legacy helper: scopes technician to assignments, or admin to created records. */
function scopeToViewer(
  assignedTechnicianColumn: PgColumn,
  viewer?: Viewer,
  createdByIdColumn?: PgColumn,
): SQL | undefined {
  if (!viewer) return undefined;
  if (viewer.role === "ADMIN") {
    return createdByIdColumn ? eq(createdByIdColumn, viewer.id) : undefined;
  }
  return eq(assignedTechnicianColumn, viewer.id);
}

type ListParams = {
  viewer: Viewer;
  status?: RecordStatus | "ALL";
  search?: string;
};

/**
 * Builds the WHERE for a list query: viewer scope + optional status tab +
 * optional free-text search. `searchColumns` are matched with ILIKE; the
 * sequence column also matches a typed record id like "SRV-1004" or "1004".
 */
function buildListWhere(
  params: ListParams,
  columns: {
    createdById?: PgColumn;
    assignedTechnicianId: PgColumn;
    assignedTechnicianIds?: PgColumn;
    status: PgColumn;
    seq: PgColumn;
    search: PgColumn[];
  },
  ilikeFn: (column: PgColumn, value: string) => SQL,
  orFn: (...conditions: (SQL | undefined)[]) => SQL | undefined,
): SQL | undefined {
  const clauses: (SQL | undefined)[] = [];

  if (columns.createdById) {
    clauses.push(
      scopeRecordToViewer(
        {
          createdById: columns.createdById,
          assignedTechnicianId: columns.assignedTechnicianId,
          assignedTechnicianIds: columns.assignedTechnicianIds,
        },
        params.viewer,
      ),
    );
  } else {
    clauses.push(scopeToViewer(columns.assignedTechnicianId, params.viewer));
  }

  if (params.status && params.status !== "ALL") {
    clauses.push(eq(columns.status, params.status));
  }

  const term = params.search?.trim();
  if (term) {
    const like = `%${term}%`;
    const parts = columns.search.map((column) => ilikeFn(column, like));
    const seq = parseRecordIdSearch(term);
    if (seq !== null) parts.push(eq(columns.seq, seq));
    clauses.push(orFn(...parts));
  }

  const active = clauses.filter(Boolean) as SQL[];
  return active.length ? and(...active) : undefined;
}

export type { Viewer, ListParams };
export {
  scopeToViewer,
  scopeRecordToViewer,
  scopeAdminOwnership,
  buildListWhere,
};
