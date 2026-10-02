import "server-only";

import { and, count, desc, eq, gte, inArray, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { user } from "@/db/schema/auth";
import { installation } from "@/db/schema/installation";
import { project } from "@/db/schema/project";
import { serviceRequest } from "@/db/schema/service-request";
import type { RecordStatus } from "@/lib/constants";
import { formatRecordId, type RecordKind } from "@/lib/format";
import { PENDING_STATUSES } from "@/lib/service-ticket";
import {
  type InstallationRow,
  scopeInstallationToViewer,
} from "./installations";
import { type ProjectRow, scopeProjectToViewer } from "./projects";
import type { Viewer } from "./record-scope";
import {
  type ServiceRequestRow,
  scopeServiceToViewer,
} from "./service-requests";

type DashboardStats = {
  totalServices: number;
  totalInstallations: number;
  totalProjects: number;
  totalUsers: number;
  totalTechnicians: number;
};

type MonthlyActivityPoint = {
  label: string;
  services: number;
  installations: number;
  projects: number;
};

type ActivityItem = {
  key: string;
  kind: RecordKind;
  recordId: string;
  recordUuid: string;
  headline: string;
  at: Date;
};

type PendingEventRow = {
  id: string;
  kind: RecordKind;
  recordId: string;
  customerName: string;
  technicianName: string | null;
  status: RecordStatus;
  createdAt: Date;
  serviceRecord?: ServiceRequestRow;
  installationRecord?: InstallationRow;
  projectRecord?: ProjectRow;
};

type PendingEvents = {
  openCount: number;
  inProgressCount: number;
  rows: PendingEventRow[];
};

type DashboardData = {
  stats: DashboardStats;
  monthlyActivity: MonthlyActivityPoint[];
  recentActivities: ActivityItem[];
  pendingEvents: PendingEvents;
};

async function tableCount(
  table: typeof serviceRequest | typeof installation | typeof project,
  scope: ReturnType<typeof scopeServiceToViewer>,
): Promise<number> {
  const [row] = await db.select({ value: count() }).from(table).where(scope);
  return row?.value ?? 0;
}

function lastSixMonths(): { key: string; label: string }[] {
  const months: { key: string; label: string }[] = [];
  const now = new Date();
  for (let offset = 5; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    months.push({
      key: `${date.getFullYear()}-${date.getMonth()}`,
      label: date.toLocaleString("en-IN", { month: "short" }),
    });
  }
  return months;
}

function bucketByMonth(dates: Date[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const date of dates) {
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

async function getDashboardData(viewer: Viewer): Promise<DashboardData> {
  const serviceScope = scopeServiceToViewer(viewer);
  const installScope = scopeInstallationToViewer(viewer);
  const projectScope = scopeProjectToViewer(viewer);

  // Monthly activity — filter to the 6-month window at the database level.
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  // Pending events aliases & where clauses
  const srTechnician = alias(user, "dash_sr_technician");
  const srCreator = alias(user, "dash_sr_creator");
  const insTechnician = alias(user, "dash_ins_technician");
  const insCreator = alias(user, "dash_ins_creator");
  const prjTechnician = alias(user, "dash_prj_technician");
  const prjCreator = alias(user, "dash_prj_creator");

  const pendingServiceWhere = serviceScope
    ? and(serviceScope, inArray(serviceRequest.status, PENDING_STATUSES))
    : inArray(serviceRequest.status, PENDING_STATUSES);
  const pendingInstallWhere = installScope
    ? and(installScope, inArray(installation.status, PENDING_STATUSES))
    : inArray(installation.status, PENDING_STATUSES);
  const pendingProjectWhere = projectScope
    ? and(projectScope, inArray(project.status, PENDING_STATUSES))
    : inArray(project.status, PENDING_STATUSES);

  // Run all independent queries simultaneously in a single parallel batch
  const [
    totalServices,
    totalInstallations,
    totalProjects,
    totalUsers,
    totalTechnicians,
    serviceDates,
    installDates,
    projectDates,
    recentServices,
    recentInstalls,
    recentProjects,
    pendingServices,
    pendingInstalls,
    pendingProjects,
  ] = await Promise.all([
    tableCount(serviceRequest, serviceScope),
    tableCount(installation, installScope),
    tableCount(project, projectScope),
    db
      .select({ value: count() })
      .from(user)
      .where(isNull(user.deletedAt))
      .then((r) => r[0]?.value ?? 0),
    db
      .select({ value: count() })
      .from(user)
      .where(and(eq(user.role, "TECHNICIAN"), isNull(user.deletedAt)))
      .then((r) => r[0]?.value ?? 0),
    db
      .select({ createdAt: serviceRequest.createdAt })
      .from(serviceRequest)
      .where(
        serviceScope
          ? and(serviceScope, gte(serviceRequest.createdAt, sixMonthsAgo))
          : gte(serviceRequest.createdAt, sixMonthsAgo),
      ),
    db
      .select({ createdAt: installation.createdAt })
      .from(installation)
      .where(
        installScope
          ? and(installScope, gte(installation.createdAt, sixMonthsAgo))
          : gte(installation.createdAt, sixMonthsAgo),
      ),
    db
      .select({ createdAt: project.createdAt })
      .from(project)
      .where(
        projectScope
          ? and(projectScope, gte(project.createdAt, sixMonthsAgo))
          : gte(project.createdAt, sixMonthsAgo),
      ),
    db
      .select({
        id: serviceRequest.id,
        seq: serviceRequest.seq,
        who: serviceRequest.customerName,
        status: serviceRequest.status,
        createdAt: serviceRequest.createdAt,
        updatedAt: serviceRequest.updatedAt,
      })
      .from(serviceRequest)
      .where(serviceScope)
      .orderBy(desc(serviceRequest.createdAt))
      .limit(6),
    db
      .select({
        id: installation.id,
        seq: installation.seq,
        who: installation.customerName,
        status: installation.status,
        createdAt: installation.createdAt,
        updatedAt: installation.updatedAt,
      })
      .from(installation)
      .where(installScope)
      .orderBy(desc(installation.createdAt))
      .limit(6),
    db
      .select({
        id: project.id,
        seq: project.seq,
        who: project.companyName,
        status: project.status,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      })
      .from(project)
      .where(projectScope)
      .orderBy(desc(project.createdAt))
      .limit(6),
    db
      .select({
        service: serviceRequest,
        technicianName: srTechnician.name,
        createdByName: srCreator.name,
      })
      .from(serviceRequest)
      .leftJoin(
        srTechnician,
        eq(srTechnician.id, serviceRequest.assignedTechnicianId),
      )
      .leftJoin(srCreator, eq(srCreator.id, serviceRequest.createdById))
      .where(pendingServiceWhere)
      .orderBy(desc(serviceRequest.createdAt))
      .limit(10),
    db
      .select({
        installation,
        technicianName: insTechnician.name,
        technicianDepartment: insTechnician.department,
        createdByName: insCreator.name,
      })
      .from(installation)
      .leftJoin(
        insTechnician,
        eq(insTechnician.id, installation.assignedTechnicianId),
      )
      .leftJoin(insCreator, eq(insCreator.id, installation.createdById))
      .where(pendingInstallWhere)
      .orderBy(desc(installation.createdAt))
      .limit(10),
    db
      .select({
        project,
        technicianName: prjTechnician.name,
        technicianDepartment: prjTechnician.department,
        createdByName: prjCreator.name,
      })
      .from(project)
      .leftJoin(
        prjTechnician,
        eq(prjTechnician.id, project.assignedTechnicianId),
      )
      .leftJoin(prjCreator, eq(prjCreator.id, project.createdById))
      .where(pendingProjectWhere)
      .orderBy(desc(project.createdAt))
      .limit(10),
  ]);

  const serviceBuckets = bucketByMonth(serviceDates.map((r) => r.createdAt));
  const installBuckets = bucketByMonth(installDates.map((r) => r.createdAt));
  const projectBuckets = bucketByMonth(projectDates.map((r) => r.createdAt));

  const monthlyActivity = lastSixMonths().map((month) => ({
    label: month.label,
    services: serviceBuckets.get(month.key) ?? 0,
    installations: installBuckets.get(month.key) ?? 0,
    projects: projectBuckets.get(month.key) ?? 0,
  }));

  const activityFrom = (
    kind: RecordKind,
    rows: {
      id: string;
      seq: number;
      who: string;
      status: RecordStatus;
      createdAt: Date;
      updatedAt: Date;
    }[],
    verb: string,
  ): ActivityItem[] =>
    rows.map((row) => {
      const recordId = formatRecordId(kind, row.seq);
      const touched = row.updatedAt.getTime() - row.createdAt.getTime() > 1000;
      return {
        key: `${kind}-${row.id}`,
        kind,
        recordId,
        recordUuid: row.id,
        headline:
          touched && row.status === "CLOSED"
            ? `${recordId} completed for ${row.who}`
            : touched
              ? `${recordId} updated · ${row.who}`
              : `${verb} ${recordId} for ${row.who}`,
        at: touched ? row.updatedAt : row.createdAt,
      };
    });

  const recentActivities = [
    ...activityFrom("SERVICE", recentServices, "New service request"),
    ...activityFrom("INSTALLATION", recentInstalls, "New installation"),
    ...activityFrom("PROJECT", recentProjects, "New project"),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 8);

  const allPending: PendingEventRow[] = [
    ...pendingServices.map((row) => {
      const s = row.service;
      const rawIds = s.assignedTechnicianIds;
      const assignedTechnicianIds =
        Array.isArray(rawIds) && rawIds.length > 0
          ? rawIds
          : s.assignedTechnicianId
            ? [s.assignedTechnicianId]
            : [];
      const serviceRecord: ServiceRequestRow = {
        id: s.id,
        seq: s.seq,
        recordId: formatRecordId("SERVICE", s.seq),
        customerName: s.customerName,
        phone: s.phone,
        email: s.email,
        category: s.category,
        address: s.address,
        issueTitle: s.issueTitle,
        description: s.description,
        status: s.status,
        assignedTechnicianId:
          assignedTechnicianIds[0] ?? s.assignedTechnicianId,
        assignedTechnicianIds,
        technicianName: row.technicianName,
        technicianNames: row.technicianName ? [row.technicianName] : [],
        amount: s.amount,
        closedDescription: s.closedDescription,
        imageUrl: s.imageUrl,
        createdByName: row.createdByName,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      };
      return {
        id: s.id,
        kind: "SERVICE" as RecordKind,
        recordId: formatRecordId("SERVICE", s.seq),
        customerName: s.customerName,
        technicianName: row.technicianName,
        status: s.status,
        createdAt: s.createdAt,
        serviceRecord,
      };
    }),
    ...pendingInstalls.map((row) => {
      const ins = row.installation;
      const rawIds = ins.assignedTechnicianIds;
      const assignedTechnicianIds =
        Array.isArray(rawIds) && rawIds.length > 0
          ? rawIds
          : ins.assignedTechnicianId
            ? [ins.assignedTechnicianId]
            : [];
      const installationRecord: InstallationRow = {
        id: ins.id,
        seq: ins.seq,
        recordId: formatRecordId("INSTALLATION", ins.seq),
        customerName: ins.customerName,
        contactNumber: ins.contactNumber,
        email: ins.email,
        address: ins.address,
        description: ins.description,
        status: ins.status,
        assignedTechnicianId:
          assignedTechnicianIds[0] ?? ins.assignedTechnicianId,
        assignedTechnicianIds,
        technicianName: row.technicianName,
        technicianNames: row.technicianName ? [row.technicianName] : [],
        technicianDepartment: row.technicianDepartment,
        accountUsername: ins.accountUsername,
        hasAccountPassword: Boolean(ins.accountPassword),
        accountMobile: ins.accountMobile,
        referenceNo: ins.referenceNo,
        paymentMode: (ins.paymentMode as "ONLINE" | "CASH" | null) ?? null,
        paymentStatus: (ins.paymentStatus as "PAID" | "PENDING" | null) ?? null,
        amount: ins.amount ?? null,
        createdByName: row.createdByName,
        createdAt: ins.createdAt,
        updatedAt: ins.updatedAt,
      };
      return {
        id: ins.id,
        kind: "INSTALLATION" as RecordKind,
        recordId: formatRecordId("INSTALLATION", ins.seq),
        customerName: ins.customerName,
        technicianName: row.technicianName,
        status: ins.status,
        createdAt: ins.createdAt,
        installationRecord,
      };
    }),
    ...pendingProjects.map((row) => {
      const p = row.project;
      const assignedTechnicianIds =
        Array.isArray(p.assignedTechnicianIds) &&
        p.assignedTechnicianIds.length > 0
          ? p.assignedTechnicianIds
          : p.assignedTechnicianId
            ? [p.assignedTechnicianId]
            : [];
      const projectRecord: ProjectRow = {
        id: p.id,
        seq: p.seq,
        recordId: formatRecordId("PROJECT", p.seq),
        companyName: p.companyName,
        customerName: p.customerName,
        email: p.email,
        mobileNo: p.mobileNo,
        location: p.location,
        estimationNo: p.estimationNo,
        description: p.description,
        status: p.status,
        assignedTechnicianId:
          assignedTechnicianIds[0] ?? p.assignedTechnicianId,
        assignedTechnicianIds,
        technicianName: row.technicianName,
        technicianNames: row.technicianName ? [row.technicianName] : [],
        technicianDepartment: row.technicianDepartment,
        createdByName: row.createdByName,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      };
      return {
        id: p.id,
        kind: "PROJECT" as RecordKind,
        recordId: formatRecordId("PROJECT", p.seq),
        customerName: p.customerName || p.companyName,
        technicianName: row.technicianName,
        status: p.status,
        createdAt: p.createdAt,
        projectRecord,
      };
    }),
  ];

  // Prioritize: 1. Today, 2. Tomorrow, 3. Nearest upcoming, 4. Most recent past records
  const currentDate = new Date();
  const todayStart = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    currentDate.getDate(),
  ).getTime();
  const todayEnd = todayStart + 24 * 60 * 60 * 1000 - 1;
  const tomorrowStart = todayStart + 24 * 60 * 60 * 1000;
  const tomorrowEnd = tomorrowStart + 24 * 60 * 60 * 1000 - 1;

  allPending.sort((a, b) => {
    const timeA = a.createdAt.getTime();
    const timeB = b.createdAt.getTime();

    const getRank = (time: number) => {
      if (time >= todayStart && time <= todayEnd) return 1; // Today
      if (time >= tomorrowStart && time <= tomorrowEnd) return 2; // Tomorrow
      if (time > tomorrowEnd) return 3; // Future upcoming
      return 4; // Recent past
    };

    const rankA = getRank(timeA);
    const rankB = getRank(timeB);

    if (rankA !== rankB) {
      return rankA - rankB;
    }

    // Within same rank:
    // For today and recent past, newest first (-time)
    // For tomorrow and future, earliest first (+time)
    if (rankA === 1 || rankA === 4) {
      return timeB - timeA;
    }
    return timeA - timeB;
  });

  const topPending = allPending.slice(0, 5);

  const pendingEvents: PendingEvents = {
    openCount: allPending.filter((row) => row.status === "OPEN").length,
    inProgressCount: allPending.filter((row) => row.status === "IN_PROGRESS")
      .length,
    rows: topPending,
  };

  return {
    stats: {
      totalServices,
      totalInstallations,
      totalProjects,
      totalUsers,
      totalTechnicians,
    },
    monthlyActivity,
    recentActivities,
    pendingEvents,
  };
}

export type {
  DashboardData,
  DashboardStats,
  MonthlyActivityPoint,
  ActivityItem,
  PendingEvents,
  PendingEventRow,
};
export { getDashboardData };
