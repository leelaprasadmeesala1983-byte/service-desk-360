import "server-only";

import { and, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/db";
import { user } from "@/db/schema/auth";
import { installation } from "@/db/schema/installation";
import type { RecordStatus } from "@/lib/constants";
import { formatRecordId, parseRecordIdSearch } from "@/lib/format";

import type { Viewer } from "./record-scope";
import type { StatusCounts } from "./service-requests";

const technician = alias(user, "ins_technician");
const creator = alias(user, "ins_creator");

type InstallationRow = {
  id: string;
  seq: number;
  recordId: string;
  customerName: string;
  contactNumber: string;
  email: string | null;
  address: string;
  description: string;
  status: RecordStatus;
  assignedTechnicianId: string | null;
  assignedTechnicianIds: string[];
  technicianName: string | null;
  technicianNames?: string[];
  technicianDepartment: string | null;
  accountUsername: string | null;
  accountPassword?: string | null;
  hasAccountPassword: boolean;
  accountMobile: string | null;
  referenceNo: string | null;
  paymentMode: "ONLINE" | "CASH" | null;
  paymentStatus: "PAID" | "PENDING" | null;
  amount: string | null;
  createdByName: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function mapRow(
  row: {
    installation: typeof installation.$inferSelect;
    technicianName: string | null;
    technicianDepartment: string | null;
    createdByName: string | null;
  },
  techMap?: Map<string, string>,
): InstallationRow {
  const record = row.installation;
  const rawIds = record.assignedTechnicianIds;
  const assignedTechnicianIds =
    Array.isArray(rawIds) && rawIds.length > 0
      ? rawIds
      : record.assignedTechnicianId
        ? [record.assignedTechnicianId]
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
    id: record.id,
    seq: record.seq,
    recordId: formatRecordId("INSTALLATION", record.seq),
    customerName: record.customerName,
    contactNumber: record.contactNumber,
    email: record.email,
    address: record.address,
    description: record.description,
    status: record.status,
    assignedTechnicianId:
      assignedTechnicianIds[0] ?? record.assignedTechnicianId ?? null,
    assignedTechnicianIds,
    technicianName,
    technicianNames,
    technicianDepartment: row.technicianDepartment,
    accountUsername: record.accountUsername,
    accountPassword: record.accountPassword,
    hasAccountPassword: Boolean(record.accountPassword),
    accountMobile: record.accountMobile,
    referenceNo: record.referenceNo,
    paymentMode: (record.paymentMode as "ONLINE" | "CASH" | null) ?? null,
    paymentStatus: (record.paymentStatus as "PAID" | "PENDING" | null) ?? null,
    amount: record.amount ?? null,
    createdByName: row.createdByName,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function scopeInstallationToViewer(viewer: Viewer) {
  if (viewer.role === "SUPER_ADMIN") return undefined;
  if (viewer.role === "ADMIN") return eq(installation.createdById, viewer.id);
  return or(
    eq(installation.assignedTechnicianId, viewer.id),
    sql`${viewer.id} = ANY(${installation.assignedTechnicianIds})`,
    eq(installation.createdById, viewer.id),
  );
}

type ListArgs = {
  viewer: Viewer;
  status?: RecordStatus | "ALL";
  search?: string;
};

async function listInstallations(args: ListArgs): Promise<InstallationRow[]> {
  const scope = scopeInstallationToViewer(args.viewer);
  const clauses = [];
  if (scope) clauses.push(scope);

  if (args.status && args.status !== "ALL") {
    clauses.push(eq(installation.status, args.status));
  }

  const term = args.search?.trim();
  if (term) {
    const like = `%${term}%`;
    const searchParts = [
      ilike(installation.customerName, like),
      ilike(installation.email, like),
      ilike(installation.contactNumber, like),
      ilike(installation.referenceNo, like),
    ];
    const seq = parseRecordIdSearch(term);
    if (seq !== null) searchParts.push(eq(installation.seq, seq));
    clauses.push(or(...searchParts));
  }

  const where = clauses.length ? and(...clauses) : undefined;

  const [rows, allTechs] = await Promise.all([
    db
      .select({
        installation,
        technicianName: technician.name,
        technicianDepartment: technician.department,
        createdByName: creator.name,
      })
      .from(installation)
      .leftJoin(
        technician,
        eq(technician.id, installation.assignedTechnicianId),
      )
      .leftJoin(creator, eq(creator.id, installation.createdById))
      .where(where)
      .orderBy(desc(installation.createdAt)),
    db
      .select({ id: user.id, name: user.name })
      .from(user)
      .where(eq(user.role, "TECHNICIAN")),
  ]);

  const techMap = new Map(allTechs.map((t) => [t.id, t.name]));

  return rows.map((row) => mapRow(row, techMap));
}

async function getInstallation(
  id: string,
  viewer: Viewer,
): Promise<InstallationRow | undefined> {
  const scope = scopeInstallationToViewer(viewer);
  const [rows, allTechs] = await Promise.all([
    db
      .select({
        installation,
        technicianName: technician.name,
        technicianDepartment: technician.department,
        createdByName: creator.name,
      })
      .from(installation)
      .leftJoin(
        technician,
        eq(technician.id, installation.assignedTechnicianId),
      )
      .leftJoin(creator, eq(creator.id, installation.createdById))
      .where(
        scope ? and(eq(installation.id, id), scope) : eq(installation.id, id),
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

async function getInstallationStats(viewer: Viewer): Promise<StatusCounts> {
  const scope = scopeInstallationToViewer(viewer);
  const rows = await db
    .select({ status: installation.status, value: count() })
    .from(installation)
    .where(scope)
    .groupBy(installation.status);

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

export type { InstallationRow };
export {
  listInstallations,
  getInstallation,
  getInstallationStats,
  scopeInstallationToViewer,
};
