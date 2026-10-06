import "server-only";

import { and, asc, eq, gte, inArray, isNull, lte, type SQL } from "drizzle-orm";

import { db } from "@/db";
import { user } from "@/db/schema/auth";
import { installation } from "@/db/schema/installation";
import { project } from "@/db/schema/project";
import { serviceRequest } from "@/db/schema/service-request";
import { technicianWorkLog } from "@/db/schema/technician-work-log";
import { workHistory } from "@/db/schema/work-history";
import type { RecordType, UserRole } from "@/lib/constants";
import { formatRecordId } from "@/lib/format";

type Viewer = {
  role: UserRole | string;
  id: string;
};

/**
 * Returns formatted start and end dates for a given month and year (e.g., 2026, 9 -> 2026-09-01, 2026-09-30).
 */
export function getMonthDateRange(
  year: number,
  month: number,
): {
  startDate: string;
  endDate: string;
  daysInMonth: number;
} {
  const safeYear = Math.max(2000, Math.min(2100, year));
  const safeMonth = Math.max(1, Math.min(12, month));
  const pad = (n: number) => String(n).padStart(2, "0");
  const lastDay = new Date(safeYear, safeMonth, 0).getDate();

  return {
    startDate: `${safeYear}-${pad(safeMonth)}-01`,
    endDate: `${safeYear}-${pad(safeMonth)}-${pad(lastDay)}`,
    daysInMonth: lastDay,
  };
}

/**
 * Normalizes a work date from work history to YYYY-MM-DD string.
 */
function normalizeWorkDate(
  workDate?: string | Date | null,
  workDateTime?: Date | string | null,
): string {
  if (typeof workDate === "string" && workDate.trim().length > 0) {
    return workDate.trim().split("T")[0];
  }
  if (workDate instanceof Date && !Number.isNaN(workDate.getTime())) {
    const y = workDate.getFullYear();
    const m = String(workDate.getMonth() + 1).padStart(2, "0");
    const d = String(workDate.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  if (workDateTime) {
    const dt =
      workDateTime instanceof Date ? workDateTime : new Date(workDateTime);
    if (!Number.isNaN(dt.getTime())) {
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, "0");
      const d = String(dt.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
  }
  return "";
}

/**
 * Logs a work date entry for a single technician on a task.
 * De-duplicates on (technicianId, workType, referenceId, workDate).
 */
export async function logTechnicianWorkDate(params: {
  technicianId: string;
  workType: RecordType;
  referenceId: string;
  workDate?: string | Date;
  notes?: string | null;
  createdById?: string | null;
}): Promise<void> {
  const dateStr =
    params.workDate instanceof Date
      ? params.workDate.toISOString().split("T")[0]
      : typeof params.workDate === "string" && params.workDate.trim().length > 0
        ? params.workDate.trim().split("T")[0]
        : new Date().toISOString().split("T")[0];

  if (!params.technicianId || !params.referenceId || !dateStr) return;

  try {
    const validTech = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.id, params.technicianId))
      .limit(1);

    if (validTech.length === 0) {
      console.warn(
        `Skipping technician_work_log insert: technician ID ${params.technicianId} not found in user table.`,
      );
      return;
    }

    let validCreatorId: string | null = null;
    if (params.createdById) {
      const validCreator = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.id, params.createdById))
        .limit(1);
      if (validCreator.length > 0) {
        validCreatorId = validCreator[0].id;
      }
    }

    await db
      .insert(technicianWorkLog)
      .values({
        technicianId: validTech[0].id,
        workType: params.workType,
        referenceId: params.referenceId,
        workDate: dateStr,
        notes: params.notes ?? null,
        createdById: validCreatorId,
      })
      .onConflictDoNothing();
  } catch (error) {
    console.error("Failed to log technician work date:", error);
  }
}

/**
 * Logs work date entries for multiple technicians.
 */
export async function logMultipleTechniciansWorkDates(params: {
  technicianIds: string[];
  workType: RecordType;
  referenceId: string;
  workDate?: string | Date;
  notes?: string | null;
  createdById?: string | null;
}): Promise<void> {
  if (
    !Array.isArray(params.technicianIds) ||
    params.technicianIds.length === 0
  ) {
    return;
  }

  for (const techId of params.technicianIds) {
    if (techId?.trim()) {
      await logTechnicianWorkDate({
        technicianId: techId.trim(),
        workType: params.workType,
        referenceId: params.referenceId,
        workDate: params.workDate,
        notes: params.notes,
        createdById: params.createdById,
      });
    }
  }
}

/**
 * Historical work logs are now sourced directly from actual work history entries.
 */
export async function syncHistoricalWorkLogs(_viewer?: Viewer): Promise<void> {
  // No-op: Actual work logs in work_history table are the single source of truth.
  return Promise.resolve();
}

export type TechnicianMonthlySummaryItem = {
  technicianId: string;
  technicianName: string;
  department: string | null;
  email: string;
  phone: string | null;
  status: string;
  projectDays: number;
  installationDays: number;
  serviceDays: number;
  totalWorkedDays: number;
};

export type TechnicianMonthlySummaryReport = {
  month: number;
  year: number;
  startDate: string;
  endDate: string;
  stats: {
    totalTechnicians: number;
    activeTechnicians: number;
    totalWorkedDays: number;
    projectWorkDays: number;
    installationWorkDays: number;
    serviceWorkDays: number;
  };
  technicians: TechnicianMonthlySummaryItem[];
};

/**
 * Report 1 — Monthly Technician Summary.
 * Computes unique calendar dates per technician based on actual work performed
 * and aggregates across all work types (Total Worked Days = COUNT(DISTINCT actualWorkDate)).
 */
export async function getMonthlyTechnicianSummary(params: {
  month: number;
  year: number;
  technicianId?: string;
  workType?: string;
  viewer: Viewer;
}): Promise<TechnicianMonthlySummaryReport> {
  const { month, year, technicianId, workType, viewer } = params;
  const { startDate, endDate } = getMonthDateRange(year, month);

  // Query only authorized active non-deleted technicians
  const techConditions: SQL[] = [
    eq(user.role, "TECHNICIAN"),
    isNull(user.deletedAt),
  ];

  if (viewer.role === "ADMIN") {
    techConditions.push(eq(user.createdById, viewer.id));
  } else if (viewer.role === "TECHNICIAN") {
    techConditions.push(eq(user.id, viewer.id));
  }

  if (technicianId && technicianId !== "ALL") {
    techConditions.push(eq(user.id, technicianId));
  }

  const techniciansList = await db
    .select({
      id: user.id,
      name: user.name,
      department: user.department,
      email: user.email,
      phone: user.phone,
      status: user.status,
    })
    .from(user)
    .where(and(...techConditions))
    .orderBy(asc(user.name));

  const techIds = techniciansList.map((t) => t.id);

  if (techIds.length === 0) {
    return {
      month,
      year,
      startDate,
      endDate,
      stats: {
        totalTechnicians: 0,
        activeTechnicians: 0,
        totalWorkedDays: 0,
        projectWorkDays: 0,
        installationWorkDays: 0,
        serviceWorkDays: 0,
      },
      technicians: [],
    };
  }

  // Fetch valid parent record IDs to exclude deleted records and orphaned work logs
  const isScopedAdmin = viewer.role === "ADMIN";
  const srvWhere: SQL[] = [];
  const insWhere: SQL[] = [];
  const prjWhere: SQL[] = [];

  if (isScopedAdmin) {
    srvWhere.push(eq(serviceRequest.createdById, viewer.id));
    insWhere.push(eq(installation.createdById, viewer.id));
    prjWhere.push(eq(project.createdById, viewer.id));
  }

  const [validServices, validInstallations, validProjects, workHistoryRows] =
    await Promise.all([
      db
        .select({ id: serviceRequest.id })
        .from(serviceRequest)
        .where(srvWhere.length > 0 ? and(...srvWhere) : undefined),
      db
        .select({ id: installation.id })
        .from(installation)
        .where(insWhere.length > 0 ? and(...insWhere) : undefined),
      db
        .select({ id: project.id })
        .from(project)
        .where(prjWhere.length > 0 ? and(...prjWhere) : undefined),
      db
        .select({
          workType: workHistory.workType,
          referenceId: workHistory.referenceId,
          technicianIds: workHistory.technicianIds,
          workDate: workHistory.workDate,
          workDateTime: workHistory.workDateTime,
          status: workHistory.status,
        })
        .from(workHistory)
        .where(
          and(
            eq(workHistory.isInitial, false),
            inArray(workHistory.status, ["IN_PROGRESS", "CLOSED"]),
            gte(workHistory.workDate, startDate),
            lte(workHistory.workDate, endDate),
          ),
        ),
    ]);

  const validServiceIds = new Set(validServices.map((r) => r.id));
  const validInstallationIds = new Set(validInstallations.map((r) => r.id));
  const validProjectIds = new Set(validProjects.map((r) => r.id));

  // Group distinct actual work dates per technician
  const techMap = new Map<
    string,
    {
      projectDates: Set<string>;
      installationDates: Set<string>;
      serviceDates: Set<string>;
      allDates: Set<string>;
    }
  >();

  for (const t of techniciansList) {
    techMap.set(t.id, {
      projectDates: new Set<string>(),
      installationDates: new Set<string>(),
      serviceDates: new Set<string>(),
      allDates: new Set<string>(),
    });
  }

  for (const row of workHistoryRows) {
    // Validate parent existence to ensure deleted records / orphaned work logs do not contribute
    if (row.workType === "SERVICE" && !validServiceIds.has(row.referenceId)) {
      continue;
    }
    if (
      row.workType === "INSTALLATION" &&
      !validInstallationIds.has(row.referenceId)
    ) {
      continue;
    }
    if (row.workType === "PROJECT" && !validProjectIds.has(row.referenceId)) {
      continue;
    }

    const assignedTechs = Array.isArray(row.technicianIds)
      ? row.technicianIds
      : [];
    if (assignedTechs.length === 0) continue;

    const dateStr = normalizeWorkDate(row.workDate, row.workDateTime);
    if (!dateStr || dateStr < startDate || dateStr > endDate) continue;

    for (const tId of assignedTechs) {
      const entry = techMap.get(tId);
      if (!entry) continue;

      // Union of all unique calendar dates on which the technician performed work
      entry.allDates.add(dateStr);

      if (row.workType === "PROJECT") {
        entry.projectDates.add(dateStr);
      } else if (row.workType === "INSTALLATION") {
        entry.installationDates.add(dateStr);
      } else if (row.workType === "SERVICE") {
        entry.serviceDates.add(dateStr);
      }
    }
  }

  let totalProjectDays = 0;
  let totalInstallationDays = 0;
  let totalServiceDays = 0;
  let totalWorkedDaysSum = 0;

  const results: TechnicianMonthlySummaryItem[] = [];

  for (const t of techniciansList) {
    const entry = techMap.get(t.id)!;
    const projectDays = entry.projectDates.size;
    const installationDays = entry.installationDates.size;
    const serviceDays = entry.serviceDates.size;
    const totalWorkedDays = entry.allDates.size;

    totalProjectDays += projectDays;
    totalInstallationDays += installationDays;
    totalServiceDays += serviceDays;
    totalWorkedDaysSum += totalWorkedDays;

    // Apply workType filter if user selected specific work type
    if (workType && workType !== "ALL") {
      if (workType === "PROJECT" && projectDays === 0) continue;
      if (workType === "INSTALLATION" && installationDays === 0) continue;
      if (workType === "SERVICE" && serviceDays === 0) continue;
    }

    results.push({
      technicianId: t.id,
      technicianName: t.name,
      department: t.department,
      email: t.email,
      phone: t.phone,
      status: t.status,
      projectDays,
      installationDays,
      serviceDays,
      totalWorkedDays,
    });
  }

  return {
    month,
    year,
    startDate,
    endDate,
    stats: {
      totalTechnicians: techniciansList.length,
      activeTechnicians: techniciansList.filter((t) => t.status === "ACTIVE")
        .length,
      totalWorkedDays: totalWorkedDaysSum,
      projectWorkDays: totalProjectDays,
      installationWorkDays: totalInstallationDays,
      serviceWorkDays: totalServiceDays,
    },
    technicians: results,
  };
}

export type TaskWorkBreakdownItem = {
  recordId: string;
  referenceId: string;
  title: string;
  customerName: string;
  status: string;
  firstWorkDate: string;
  lastWorkDate: string;
  workedDays: number;
  dates: string[];
};

export type TechnicianDetailedReport = {
  technician: {
    id: string;
    name: string;
    department: string | null;
    email: string;
    phone: string | null;
    role: string;
    status: string;
  };
  month: number;
  year: number;
  startDate: string;
  endDate: string;
  summary: {
    totalWorkedDays: number;
    projectDays: number;
    installationDays: number;
    serviceDays: number;
  };
  projects: TaskWorkBreakdownItem[];
  installations: TaskWorkBreakdownItem[];
  services: TaskWorkBreakdownItem[];
};

/**
 * Report 2 — Technician Individual Detailed Report.
 * Returns breakdown of Projects, Installations, and Services worked on during that month.
 * Counts unique actual work dates per task and across the month.
 */
export async function getTechnicianDetailedReport(params: {
  technicianId: string;
  month: number;
  year: number;
  viewer: Viewer;
}): Promise<TechnicianDetailedReport | null> {
  const { technicianId, month, year, viewer } = params;

  // RBAC: technician can only view their own detailed report
  if (viewer.role === "TECHNICIAN" && viewer.id !== technicianId) {
    return null;
  }

  const techConditions: SQL[] = [
    eq(user.id, technicianId),
    eq(user.role, "TECHNICIAN"),
    isNull(user.deletedAt),
  ];

  if (viewer.role === "ADMIN") {
    techConditions.push(eq(user.createdById, viewer.id));
  }

  const [tech] = await db
    .select({
      id: user.id,
      name: user.name,
      department: user.department,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
    })
    .from(user)
    .where(and(...techConditions));

  if (!tech) return null;

  const { startDate, endDate } = getMonthDateRange(year, month);

  // Fetch actual work history records for the month (excluding creation snapshots)
  const workHistoryRows = await db
    .select({
      workType: workHistory.workType,
      referenceId: workHistory.referenceId,
      technicianIds: workHistory.technicianIds,
      workDate: workHistory.workDate,
      workDateTime: workHistory.workDateTime,
      status: workHistory.status,
    })
    .from(workHistory)
    .where(
      and(
        eq(workHistory.isInitial, false),
        inArray(workHistory.status, ["IN_PROGRESS", "CLOSED"]),
        gte(workHistory.workDate, startDate),
        lte(workHistory.workDate, endDate),
      ),
    )
    .orderBy(asc(workHistory.workDate), asc(workHistory.workDateTime));

  // Collect reference IDs and distinct dates per work type for this technician
  const projectRefIds = new Set<string>();
  const installRefIds = new Set<string>();
  const serviceRefIds = new Set<string>();

  const projectDateMap = new Map<string, Set<string>>();
  const installDateMap = new Map<string, Set<string>>();
  const serviceDateMap = new Map<string, Set<string>>();

  for (const row of workHistoryRows) {
    const assignedTechs = Array.isArray(row.technicianIds)
      ? row.technicianIds
      : [];
    if (!assignedTechs.includes(technicianId)) continue;

    const dateStr = normalizeWorkDate(row.workDate, row.workDateTime);
    if (!dateStr || dateStr < startDate || dateStr > endDate) continue;

    if (row.workType === "PROJECT") {
      projectRefIds.add(row.referenceId);
      if (!projectDateMap.has(row.referenceId)) {
        projectDateMap.set(row.referenceId, new Set());
      }
      projectDateMap.get(row.referenceId)?.add(dateStr);
    } else if (row.workType === "INSTALLATION") {
      installRefIds.add(row.referenceId);
      if (!installDateMap.has(row.referenceId)) {
        installDateMap.set(row.referenceId, new Set());
      }
      installDateMap.get(row.referenceId)?.add(dateStr);
    } else if (row.workType === "SERVICE") {
      serviceRefIds.add(row.referenceId);
      if (!serviceDateMap.has(row.referenceId)) {
        serviceDateMap.set(row.referenceId, new Set());
      }
      serviceDateMap.get(row.referenceId)?.add(dateStr);
    }
  }

  const isScopedAdmin = viewer.role === "ADMIN";
  const allMonthDates = new Set<string>();
  const projectMonthDates = new Set<string>();
  const installMonthDates = new Set<string>();
  const serviceMonthDates = new Set<string>();

  // Fetch Project details (only valid, non-deleted projects)
  const projectsBreakdown: TaskWorkBreakdownItem[] = [];
  if (projectRefIds.size > 0) {
    const prjWhere: SQL[] = [inArray(project.id, Array.from(projectRefIds))];
    if (isScopedAdmin) {
      prjWhere.push(eq(project.createdById, viewer.id));
    }

    const prjRows = await db
      .select({
        id: project.id,
        seq: project.seq,
        companyName: project.companyName,
        customerName: project.customerName,
        status: project.status,
      })
      .from(project)
      .where(and(...prjWhere));

    for (const prj of prjRows) {
      const dateSet = projectDateMap.get(prj.id) || new Set();
      const dates = Array.from(dateSet).sort();
      for (const d of dates) {
        projectMonthDates.add(d);
        allMonthDates.add(d);
      }
      projectsBreakdown.push({
        recordId: formatRecordId("PROJECT", prj.seq),
        referenceId: prj.id,
        title: prj.companyName,
        customerName: prj.customerName,
        status: prj.status,
        firstWorkDate: dates[0] || "—",
        lastWorkDate: dates[dates.length - 1] || "—",
        workedDays: dates.length,
        dates,
      });
    }
  }

  // Fetch Installation details (only valid, non-deleted installations)
  const installationsBreakdown: TaskWorkBreakdownItem[] = [];
  if (installRefIds.size > 0) {
    const insWhere: SQL[] = [
      inArray(installation.id, Array.from(installRefIds)),
    ];
    if (isScopedAdmin) {
      insWhere.push(eq(installation.createdById, viewer.id));
    }

    const insRows = await db
      .select({
        id: installation.id,
        seq: installation.seq,
        customerName: installation.customerName,
        description: installation.description,
        status: installation.status,
      })
      .from(installation)
      .where(and(...insWhere));

    for (const ins of insRows) {
      const dateSet = installDateMap.get(ins.id) || new Set();
      const dates = Array.from(dateSet).sort();
      for (const d of dates) {
        installMonthDates.add(d);
        allMonthDates.add(d);
      }
      installationsBreakdown.push({
        recordId: formatRecordId("INSTALLATION", ins.seq),
        referenceId: ins.id,
        title: ins.description,
        customerName: ins.customerName,
        status: ins.status,
        firstWorkDate: dates[0] || "—",
        lastWorkDate: dates[dates.length - 1] || "—",
        workedDays: dates.length,
        dates,
      });
    }
  }

  // Fetch Service Request details (only valid, non-deleted service requests)
  const servicesBreakdown: TaskWorkBreakdownItem[] = [];
  if (serviceRefIds.size > 0) {
    const srvWhere: SQL[] = [
      inArray(serviceRequest.id, Array.from(serviceRefIds)),
    ];
    if (isScopedAdmin) {
      srvWhere.push(eq(serviceRequest.createdById, viewer.id));
    }

    const srvRows = await db
      .select({
        id: serviceRequest.id,
        seq: serviceRequest.seq,
        customerName: serviceRequest.customerName,
        issueTitle: serviceRequest.issueTitle,
        status: serviceRequest.status,
      })
      .from(serviceRequest)
      .where(and(...srvWhere));

    for (const srv of srvRows) {
      const dateSet = serviceDateMap.get(srv.id) || new Set();
      const dates = Array.from(dateSet).sort();
      for (const d of dates) {
        serviceMonthDates.add(d);
        allMonthDates.add(d);
      }
      servicesBreakdown.push({
        recordId: formatRecordId("SERVICE", srv.seq),
        referenceId: srv.id,
        title: srv.issueTitle || "Service Request",
        customerName: srv.customerName,
        status: srv.status,
        firstWorkDate: dates[0] || "—",
        lastWorkDate: dates[dates.length - 1] || "—",
        workedDays: dates.length,
        dates,
      });
    }
  }

  return {
    technician: {
      id: tech.id,
      name: tech.name,
      department: tech.department,
      email: tech.email,
      phone: tech.phone,
      role: tech.role,
      status: tech.status,
    },
    month,
    year,
    startDate,
    endDate,
    summary: {
      totalWorkedDays: allMonthDates.size,
      projectDays: projectMonthDates.size,
      installationDays: installMonthDates.size,
      serviceDays: serviceMonthDates.size,
    },
    projects: projectsBreakdown,
    installations: installationsBreakdown,
    services: servicesBreakdown,
  };
}

export type RecordTechnicianWorkItem = {
  technicianId: string;
  technicianName: string;
  department: string | null;
  workedDays: number;
  firstWorkDate: string;
  lastWorkDate: string;
  dates: string[];
};

export type RecordTechnicianWorkReport = {
  recordType: RecordType;
  referenceId: string;
  totalTechnicians: number;
  totalWorkDays: number;
  technicians: RecordTechnicianWorkItem[];
};

/**
 * Reports 3, 4, 5 — Record-Level Technician Work Report.
 * Shows which technician(s) worked on a specific Project, Installation, or Service.
 * Counts unique actual work dates per technician on that record.
 */
export async function getRecordTechnicianWorkReport(params: {
  workType: RecordType;
  referenceId: string;
  viewer: Viewer;
}): Promise<RecordTechnicianWorkReport> {
  const { workType, referenceId, viewer } = params;

  // Validate parent record authorization
  let authorized = true;
  if (workType === "SERVICE") {
    const [sr] = await db
      .select({
        id: serviceRequest.id,
        createdById: serviceRequest.createdById,
        assignedTechnicianId: serviceRequest.assignedTechnicianId,
        assignedTechnicianIds: serviceRequest.assignedTechnicianIds,
      })
      .from(serviceRequest)
      .where(eq(serviceRequest.id, referenceId));
    if (!sr) authorized = false;
    else if (viewer.role === "ADMIN" && sr.createdById !== viewer.id) {
      authorized = false;
    } else if (viewer.role === "TECHNICIAN") {
      const techIds =
        Array.isArray(sr.assignedTechnicianIds) &&
        sr.assignedTechnicianIds.length > 0
          ? sr.assignedTechnicianIds
          : sr.assignedTechnicianId
            ? [sr.assignedTechnicianId]
            : [];
      if (!techIds.includes(viewer.id) && sr.createdById !== viewer.id) {
        authorized = false;
      }
    }
  } else if (workType === "INSTALLATION") {
    const [ins] = await db
      .select({
        id: installation.id,
        createdById: installation.createdById,
        assignedTechnicianId: installation.assignedTechnicianId,
        assignedTechnicianIds: installation.assignedTechnicianIds,
      })
      .from(installation)
      .where(eq(installation.id, referenceId));
    if (!ins) authorized = false;
    else if (viewer.role === "ADMIN" && ins.createdById !== viewer.id) {
      authorized = false;
    } else if (viewer.role === "TECHNICIAN") {
      const techIds =
        Array.isArray(ins.assignedTechnicianIds) &&
        ins.assignedTechnicianIds.length > 0
          ? ins.assignedTechnicianIds
          : ins.assignedTechnicianId
            ? [ins.assignedTechnicianId]
            : [];
      if (!techIds.includes(viewer.id) && ins.createdById !== viewer.id) {
        authorized = false;
      }
    }
  } else if (workType === "PROJECT") {
    const [prj] = await db
      .select({
        id: project.id,
        createdById: project.createdById,
        assignedTechnicianId: project.assignedTechnicianId,
        assignedTechnicianIds: project.assignedTechnicianIds,
      })
      .from(project)
      .where(eq(project.id, referenceId));
    if (!prj) authorized = false;
    else if (viewer.role === "ADMIN" && prj.createdById !== viewer.id) {
      authorized = false;
    } else if (viewer.role === "TECHNICIAN") {
      const techIds =
        Array.isArray(prj.assignedTechnicianIds) &&
        prj.assignedTechnicianIds.length > 0
          ? prj.assignedTechnicianIds
          : prj.assignedTechnicianId
            ? [prj.assignedTechnicianId]
            : [];
      if (!techIds.includes(viewer.id) && prj.createdById !== viewer.id) {
        authorized = false;
      }
    }
  }

  if (!authorized) {
    return {
      recordType: workType,
      referenceId,
      totalTechnicians: 0,
      totalWorkDays: 0,
      technicians: [],
    };
  }

  const rows = await db
    .select({
      technicianIds: workHistory.technicianIds,
      workDate: workHistory.workDate,
      workDateTime: workHistory.workDateTime,
      status: workHistory.status,
    })
    .from(workHistory)
    .where(
      and(
        eq(workHistory.isInitial, false),
        inArray(workHistory.status, ["IN_PROGRESS", "CLOSED"]),
        eq(workHistory.workType, workType),
        eq(workHistory.referenceId, referenceId),
      ),
    )
    .orderBy(asc(workHistory.workDate), asc(workHistory.workDateTime));

  const techDateMap = new Map<string, Set<string>>();
  const allUserIds = new Set<string>();

  for (const row of rows) {
    const assignedTechs = Array.isArray(row.technicianIds)
      ? row.technicianIds
      : [];
    if (assignedTechs.length === 0) continue;

    const dateStr = normalizeWorkDate(row.workDate, row.workDateTime);
    if (!dateStr) continue;

    for (const tId of assignedTechs) {
      allUserIds.add(tId);
      if (!techDateMap.has(tId)) {
        techDateMap.set(tId, new Set());
      }
      techDateMap.get(tId)?.add(dateStr);
    }
  }

  const users =
    allUserIds.size > 0
      ? await db
          .select({
            id: user.id,
            name: user.name,
            department: user.department,
          })
          .from(user)
          .where(inArray(user.id, Array.from(allUserIds)))
      : [];

  const userMap = new Map(users.map((u) => [u.id, u]));

  const technicians: RecordTechnicianWorkItem[] = [];
  let sumOfTechnicianDays = 0;

  for (const [id, dateSet] of techDateMap.entries()) {
    const u = userMap.get(id);
    const dates = Array.from(dateSet).sort();
    sumOfTechnicianDays += dates.length;
    technicians.push({
      technicianId: id,
      technicianName: u?.name || "Technician",
      department: u?.department || null,
      workedDays: dates.length,
      firstWorkDate: dates[0] || "—",
      lastWorkDate: dates[dates.length - 1] || "—",
      dates,
    });
  }

  return {
    recordType: workType,
    referenceId,
    totalTechnicians: technicians.length,
    totalWorkDays: sumOfTechnicianDays,
    technicians,
  };
}
