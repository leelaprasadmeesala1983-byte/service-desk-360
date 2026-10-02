import "server-only";

import { and, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/db";
import { user } from "@/db/schema/auth";
import { serviceRequest } from "@/db/schema/service-request";
import type { RecordStatus, ServiceCategory } from "@/lib/constants";
import { formatRecordId, parseRecordIdSearch } from "@/lib/format";

import type { Viewer } from "./record-scope";

const technician = alias(user, "sr_technician");
const creator = alias(user, "sr_creator");

type ServiceRequestRow = {
  id: string;
  seq: number;
  recordId: string;
  customerName: string;
  phone: string;
  email: string | null;
  category: ServiceCategory;
  otherCategory?: string | null;
  address: string;
  issueTitle?: string | null;
  description: string;
  status: RecordStatus;
  assignedTechnicianId: string | null;
  assignedTechnicianIds: string[];
  technicianName: string | null;
  technicianNames?: string[];
  amount: string | null;
  closedDescription: string | null;
  imageUrl: string | null;
  createdByName: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function mapRow(
  row: {
    service: typeof serviceRequest.$inferSelect;
    technicianName: string | null;
    createdByName: string | null;
  },
  techMap?: Map<string, string>,
): ServiceRequestRow {
  const rawIds = row.service.assignedTechnicianIds;
  const assignedTechnicianIds =
    Array.isArray(rawIds) && rawIds.length > 0
      ? rawIds
      : row.service.assignedTechnicianId
        ? [row.service.assignedTechnicianId]
        : [];

  const technicianNames: string[] = [];
  if (techMap) {
    for (const id of assignedTechnicianIds) {
      const name = techMap.get(id);
      if (name) technicianNames.push(name);
    }
  }
  if (technicianNames.length === 0 && row.technicianName) {
    technicianNames.push(row.technicianName);
  }

  const technicianName =
    technicianNames.length > 0
      ? technicianNames.join(", ")
      : row.technicianName;

  return {
    id: row.service.id,
    seq: row.service.seq,
    recordId: formatRecordId("SERVICE", row.service.seq),
    customerName: row.service.customerName,
    phone: row.service.phone,
    email: row.service.email,
    category: row.service.category,
    otherCategory: row.service.otherCategory ?? null,
    address: row.service.address,
    issueTitle: row.service.issueTitle,
    description: row.service.description,
    status: row.service.status,
    assignedTechnicianId:
      assignedTechnicianIds[0] ?? row.service.assignedTechnicianId ?? null,
    assignedTechnicianIds,
    technicianName,
    technicianNames,
    amount: row.service.amount,
    closedDescription: row.service.closedDescription,
    imageUrl: row.service.imageUrl,
    createdByName: row.createdByName,
    createdAt: row.service.createdAt,
    updatedAt: row.service.updatedAt,
  };
}

function scopeServiceToViewer(viewer: Viewer) {
  if (viewer.role === "SUPER_ADMIN") return undefined;
  if (viewer.role === "ADMIN") return eq(serviceRequest.createdById, viewer.id);
  return or(
    eq(serviceRequest.assignedTechnicianId, viewer.id),
    sql`${viewer.id} = ANY(${serviceRequest.assignedTechnicianIds})`,
    eq(serviceRequest.createdById, viewer.id),
  );
}

type ListArgs = {
  viewer: Viewer;
  status?: RecordStatus | "ALL";
  search?: string;
};

async function listServiceRequests(
  args: ListArgs,
): Promise<ServiceRequestRow[]> {
  const scope = scopeServiceToViewer(args.viewer);
  const clauses = [];
  if (scope) clauses.push(scope);

  if (args.status && args.status !== "ALL") {
    clauses.push(eq(serviceRequest.status, args.status));
  }

  const term = args.search?.trim();
  if (term) {
    const like = `%${term}%`;
    const searchParts = [
      ilike(serviceRequest.customerName, like),
      ilike(serviceRequest.email, like),
      ilike(serviceRequest.phone, like),
    ];
    const seq = parseRecordIdSearch(term);
    if (seq !== null) searchParts.push(eq(serviceRequest.seq, seq));
    clauses.push(or(...searchParts));
  }

  const where = clauses.length ? and(...clauses) : undefined;

  const [rows, allTechs] = await Promise.all([
    db
      .select({
        service: serviceRequest,
        technicianName: technician.name,
        createdByName: creator.name,
      })
      .from(serviceRequest)
      .leftJoin(
        technician,
        eq(technician.id, serviceRequest.assignedTechnicianId),
      )
      .leftJoin(creator, eq(creator.id, serviceRequest.createdById))
      .where(where)
      .orderBy(desc(serviceRequest.createdAt)),
    db
      .select({ id: user.id, name: user.name })
      .from(user)
      .where(eq(user.role, "TECHNICIAN")),
  ]);

  const techMap = new Map(allTechs.map((t) => [t.id, t.name]));

  return rows.map((row) => mapRow(row, techMap));
}

async function getServiceRequest(
  id: string,
  viewer: Viewer,
): Promise<ServiceRequestRow | undefined> {
  const scope = scopeServiceToViewer(viewer);
  const [rows, allTechs] = await Promise.all([
    db
      .select({
        service: serviceRequest,
        technicianName: technician.name,
        createdByName: creator.name,
      })
      .from(serviceRequest)
      .leftJoin(
        technician,
        eq(technician.id, serviceRequest.assignedTechnicianId),
      )
      .leftJoin(creator, eq(creator.id, serviceRequest.createdById))
      .where(
        scope
          ? and(eq(serviceRequest.id, id), scope)
          : eq(serviceRequest.id, id),
      )
      .limit(1),
    db
      .select({ id: user.id, name: user.name })
      .from(user)
      .where(eq(user.role, "TECHNICIAN")),
  ]);

  const techMap = new Map(allTechs.map((t) => [t.id, t.name]));

  return rows[0] ? mapRow(rows[0], techMap) : undefined;
}

type StatusCounts = Record<RecordStatus | "ALL", number>;

async function getServiceRequestStats(viewer: Viewer): Promise<StatusCounts> {
  const scope = scopeServiceToViewer(viewer);
  const rows = await db
    .select({ status: serviceRequest.status, value: count() })
    .from(serviceRequest)
    .where(scope)
    .groupBy(serviceRequest.status);

  const counts: StatusCounts = {
    ALL: 0,
    OPEN: 0,
    IN_PROGRESS: 0,
    CLOSED: 0,
    REJECTED: 0,
  };
  for (const row of rows) {
    counts[row.status] = row.value;
    counts.ALL += row.value;
  }
  return counts;
}

export type { ServiceRequestRow, StatusCounts };
export {
  listServiceRequests,
  getServiceRequest,
  getServiceRequestStats,
  scopeServiceToViewer,
};
