import "server-only";

import { and, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/db";
import { user } from "@/db/schema/auth";
import { project } from "@/db/schema/project";
import type { RecordStatus } from "@/lib/constants";
import { formatRecordId, parseRecordIdSearch } from "@/lib/format";

import type { Viewer } from "./record-scope";
import type { StatusCounts } from "./service-requests";

const technician = alias(user, "prj_technician");
const creator = alias(user, "prj_creator");

type ProjectRow = {
  id: string;
  seq: number;
  recordId: string;
  companyName: string;
  customerName: string;
  email: string;
  mobileNo: string;
  location: string;
  estimationNo: string;
  description: string;
  status: RecordStatus;
  assignedTechnicianId: string | null;
  assignedTechnicianIds: string[];
  technicianName: string | null;
  technicianNames?: string[];
  technicianDepartment: string | null;
  pdfUrl: string | null;
  pdfName: string | null;
  createdByName: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function mapRow(
  row: {
    project: typeof project.$inferSelect;
    technicianName: string | null;
    technicianDepartment: string | null;
    createdByName: string | null;
  },
  techMap?: Map<string, string>,
): ProjectRow {
  const record = row.project;
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
    recordId: formatRecordId("PROJECT", record.seq),
    companyName: record.companyName,
    customerName: record.customerName,
    email: record.email,
    mobileNo: record.mobileNo,
    location: record.location,
    estimationNo: record.estimationNo,
    description: record.description,
    status: record.status,
    assignedTechnicianId:
      assignedTechnicianIds[0] ?? record.assignedTechnicianId ?? null,
    assignedTechnicianIds,
    technicianName,
    technicianNames,
    technicianDepartment: row.technicianDepartment,
    pdfUrl: record.pdfUrl,
    pdfName: record.pdfName,
    createdByName: row.createdByName,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function scopeProjectToViewer(viewer: Viewer) {
  if (viewer.role === "ADMIN") return eq(project.createdById, viewer.id);
  return or(
    eq(project.assignedTechnicianId, viewer.id),
    sql`${viewer.id} = ANY(${project.assignedTechnicianIds})`,
    eq(project.createdById, viewer.id),
  );
}

type ListArgs = {
  viewer: Viewer;
  status?: RecordStatus | "ALL";
  search?: string;
};

async function listProjects(args: ListArgs): Promise<ProjectRow[]> {
  const scope = scopeProjectToViewer(args.viewer);
  const clauses = [];
  if (scope) clauses.push(scope);

  if (args.status && args.status !== "ALL") {
    clauses.push(eq(project.status, args.status));
  }

  const term = args.search?.trim();
  if (term) {
    const like = `%${term}%`;
    const searchParts = [
      ilike(project.companyName, like),
      ilike(project.customerName, like),
      ilike(project.estimationNo, like),
      ilike(project.email, like),
      ilike(project.mobileNo, like),
    ];
    const seq = parseRecordIdSearch(term);
    if (seq !== null) searchParts.push(eq(project.seq, seq));
    clauses.push(or(...searchParts));
  }

  const where = clauses.length ? and(...clauses) : undefined;

  const [rows, allTechs] = await Promise.all([
    db
      .select({
        project,
        technicianName: technician.name,
        technicianDepartment: technician.department,
        createdByName: creator.name,
      })
      .from(project)
      .leftJoin(technician, eq(technician.id, project.assignedTechnicianId))
      .leftJoin(creator, eq(creator.id, project.createdById))
      .where(where)
      .orderBy(desc(project.createdAt)),
    db
      .select({ id: user.id, name: user.name })
      .from(user)
      .where(eq(user.role, "TECHNICIAN")),
  ]);

  const techMap = new Map(allTechs.map((t) => [t.id, t.name]));

  return rows.map((row) => mapRow(row, techMap));
}

async function getProject(
  id: string,
  viewer: Viewer,
): Promise<ProjectRow | undefined> {
  const scope = scopeProjectToViewer(viewer);
  const [rows, allTechs] = await Promise.all([
    db
      .select({
        project,
        technicianName: technician.name,
        technicianDepartment: technician.department,
        createdByName: creator.name,
      })
      .from(project)
      .leftJoin(technician, eq(technician.id, project.assignedTechnicianId))
      .leftJoin(creator, eq(creator.id, project.createdById))
      .where(scope ? and(eq(project.id, id), scope) : eq(project.id, id))
      .limit(1),
    db
      .select({ id: user.id, name: user.name })
      .from(user)
      .where(eq(user.role, "TECHNICIAN")),
  ]);

  const techMap = new Map(allTechs.map((t) => [t.id, t.name]));

  return rows[0] ? mapRow(rows[0], techMap) : undefined;
}

async function getProjectStats(viewer: Viewer): Promise<StatusCounts> {
  const scope = scopeProjectToViewer(viewer);
  const rows = await db
    .select({ status: project.status, value: count() })
    .from(project)
    .where(scope)
    .groupBy(project.status);

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

export type { ProjectRow };
export { listProjects, getProject, getProjectStats, scopeProjectToViewer };
