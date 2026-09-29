import "server-only";

import { and, eq, type SQL } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

import type { RecordStatus, UserRole } from "@/lib/constants";
import { parseRecordIdSearch } from "@/lib/format";

/**
 * Every Service Ticket list/detail/stat query runs through the same viewer:
 * an admin sees everything, a technician sees only records assigned to them
 * (spec §4.2–§4.4). This is enforced in the query, not by a UI toggle.
 */
type Viewer = { role: UserRole; id: string };

/** Restricts a technician to their own assignments; no-op for an admin. */
function scopeToViewer(
  assignedTechnicianColumn: PgColumn,
  viewer: Viewer,
): SQL | undefined {
  if (viewer.role === "ADMIN") return undefined;
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
    assignedTechnicianId: PgColumn;
    status: PgColumn;
    seq: PgColumn;
    search: PgColumn[];
  },
  ilikeFn: (column: PgColumn, value: string) => SQL,
  orFn: (...conditions: (SQL | undefined)[]) => SQL | undefined,
): SQL | undefined {
  const clauses: (SQL | undefined)[] = [
    scopeToViewer(columns.assignedTechnicianId, params.viewer),
  ];

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
export { scopeToViewer, buildListWhere };
