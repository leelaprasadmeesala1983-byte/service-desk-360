import "server-only";

import { and, asc, eq, gte, inArray, lte, sql } from "drizzle-orm";

import { db } from "@/db";
import { user } from "@/db/schema/auth";
import { installation } from "@/db/schema/installation";
import { project } from "@/db/schema/project";
import { serviceRequest } from "@/db/schema/service-request";
import { technicianWorkLog } from "@/db/schema/technician-work-log";
import type { RecordType, UserRole } from "@/lib/constants";
import { formatRecordId } from "@/lib/format";

type Viewer = {
  role: UserRole;
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

  const start = new Date(Date.UTC(safeYear, safeMonth - 1, 1));
  const end = new Date(Date.UTC(safeYear, safeMonth, 0)); // last day of month

  const formatDateString = (d: Date) => d.toISOString().split("T")[0];

  return {
    startDate: formatDateString(start),
    endDate: formatDateString(end),
    daysInMonth: end.getUTCDate(),
  };
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
 * Ensures historical records with assigned technicians have corresponding
 * work log entries for their creation date and last update date.
 */
export async function syncHistoricalWorkLogs(): Promise<void> {
  try {
    // 1. Service Requests
    const serviceRows = await db
      .select({
        id: serviceRequest.id,
        techId: serviceRequest.assignedTechnicianId,
        techIds: serviceRequest.assignedTechnicianIds,
        createdAt: serviceRequest.createdAt,
        updatedAt: serviceRequest.updatedAt,
      })
      .from(serviceRequest);

    for (const row of serviceRows) {
      const ids =
        Array.isArray(row.techIds) && row.techIds.length > 0
          ? row.techIds
          : row.techId
            ? [row.techId]
            : [];

      if (ids.length > 0) {
        await logMultipleTechniciansWorkDates({
          technicianIds: ids,
          workType: "SERVICE",
          referenceId: row.id,
          workDate: row.createdAt,
        });

        if (
          row.updatedAt &&
          row.updatedAt.toISOString().split("T")[0] !==
            row.createdAt.toISOString().split("T")[0]
        ) {
          await logMultipleTechniciansWorkDates({
            technicianIds: ids,
            workType: "SERVICE",
            referenceId: row.id,
            workDate: row.updatedAt,
          });
        }
      }
    }

    // 2. Installations
    const installRows = await db
      .select({
        id: installation.id,
        techId: installation.assignedTechnicianId,
        techIds: installation.assignedTechnicianIds,
        createdAt: installation.createdAt,
        updatedAt: installation.updatedAt,
      })
      .from(installation);

    for (const row of installRows) {
      const ids =
        Array.isArray(row.techIds) && row.techIds.length > 0
          ? row.techIds
          : row.techId
            ? [row.techId]
            : [];

      if (ids.length > 0) {
        await logMultipleTechniciansWorkDates({
          technicianIds: ids,
          workType: "INSTALLATION",
          referenceId: row.id,
          workDate: row.createdAt,
        });

        if (
          row.updatedAt &&
          row.updatedAt.toISOString().split("T")[0] !==
            row.createdAt.toISOString().split("T")[0]
        ) {
          await logMultipleTechniciansWorkDates({
            technicianIds: ids,
            workType: "INSTALLATION",
            referenceId: row.id,
            workDate: row.updatedAt,
          });
        }
      }
    }

    // 3. Projects
    const projectRows = await db
      .select({
        id: project.id,
        techId: project.assignedTechnicianId,
        techIds: project.assignedTechnicianIds,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      })
      .from(project);

    for (const row of projectRows) {
      const ids =
        Array.isArray(row.techIds) && row.techIds.length > 0
          ? row.techIds
          : row.techId
            ? [row.techId]
            : [];

      if (ids.length > 0) {
        await logMultipleTechniciansWorkDates({
          technicianIds: ids,
          workType: "PROJECT",
          referenceId: row.id,
          workDate: row.createdAt,
        });

        if (
          row.updatedAt &&
          row.updatedAt.toISOString().split("T")[0] !==
            row.createdAt.toISOString().split("T")[0]
        ) {
          await logMultipleTechniciansWorkDates({
            technicianIds: ids,
            workType: "PROJECT",
            referenceId: row.id,
            workDate: row.updatedAt,
          });
        }
      }
    }
  } catch (err) {
    console.error("Failed to sync historical work logs:", err);
  }
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
 * Computes unique calendar dates per technician and aggregates across all work types.
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

  // Sync historical records if table is sparse
  await syncHistoricalWorkLogs();

  // Query all technicians
  const techConditions = [eq(user.role, "TECHNICIAN")];
  if (viewer.role === "TECHNICIAN") {
    techConditions.push(eq(user.id, viewer.id));
  } else if (technicianId && technicianId !== "ALL") {
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

  // Fetch work logs in this date range
  const workLogs = await db
    .select({
      technicianId: technicianWorkLog.technicianId,
      workType: technicianWorkLog.workType,
      workDate: technicianWorkLog.workDate,
      referenceId: technicianWorkLog.referenceId,
    })
    .from(technicianWorkLog)
    .where(
      and(
        inArray(technicianWorkLog.technicianId, techIds),
        gte(technicianWorkLog.workDate, startDate),
        lte(technicianWorkLog.workDate, endDate),
      ),
    );

  // Group work dates by technician
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

  for (const log of workLogs) {
    const entry = techMap.get(log.technicianId);
    if (!entry) continue;

    const dateStr =
      typeof log.workDate === "string" ? log.workDate : String(log.workDate);

    if (log.workType === "PROJECT") {
      entry.projectDates.add(dateStr);
      entry.allDates.add(dateStr);
    } else if (log.workType === "INSTALLATION") {
      entry.installationDates.add(dateStr);
      entry.allDates.add(dateStr);
    } else if (log.workType === "SERVICE") {
      entry.serviceDates.add(dateStr);
      entry.allDates.add(dateStr);
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
    .where(eq(user.id, technicianId));

  if (!tech) return null;

  const { startDate, endDate } = getMonthDateRange(year, month);

  // Fetch all logs for this technician in the month
  const logs = await db
    .select({
      workType: technicianWorkLog.workType,
      referenceId: technicianWorkLog.referenceId,
      workDate: technicianWorkLog.workDate,
    })
    .from(technicianWorkLog)
    .where(
      and(
        eq(technicianWorkLog.technicianId, technicianId),
        gte(technicianWorkLog.workDate, startDate),
        lte(technicianWorkLog.workDate, endDate),
      ),
    )
    .orderBy(asc(technicianWorkLog.workDate));

  // Collect reference IDs per work type
  const projectRefIds = new Set<string>();
  const installRefIds = new Set<string>();
  const serviceRefIds = new Set<string>();

  const projectDateMap = new Map<string, Set<string>>();
  const installDateMap = new Map<string, Set<string>>();
  const serviceDateMap = new Map<string, Set<string>>();

  const allMonthDates = new Set<string>();
  const projectMonthDates = new Set<string>();
  const installMonthDates = new Set<string>();
  const serviceMonthDates = new Set<string>();

  for (const log of logs) {
    const d =
      typeof log.workDate === "string" ? log.workDate : String(log.workDate);
    allMonthDates.add(d);

    if (log.workType === "PROJECT") {
      projectRefIds.add(log.referenceId);
      projectMonthDates.add(d);
      if (!projectDateMap.has(log.referenceId)) {
        projectDateMap.set(log.referenceId, new Set());
      }
      projectDateMap.get(log.referenceId)!.add(d);
    } else if (log.workType === "INSTALLATION") {
      installRefIds.add(log.referenceId);
      installMonthDates.add(d);
      if (!installDateMap.has(log.referenceId)) {
        installDateMap.set(log.referenceId, new Set());
      }
      installDateMap.get(log.referenceId)!.add(d);
    } else if (log.workType === "SERVICE") {
      serviceRefIds.add(log.referenceId);
      serviceMonthDates.add(d);
      if (!serviceDateMap.has(log.referenceId)) {
        serviceDateMap.set(log.referenceId, new Set());
      }
      serviceDateMap.get(log.referenceId)!.add(d);
    }
  }

  // Fetch Project details
  const projectsBreakdown: TaskWorkBreakdownItem[] = [];
  if (projectRefIds.size > 0) {
    const prjRows = await db
      .select({
        id: project.id,
        seq: project.seq,
        companyName: project.companyName,
        customerName: project.customerName,
        status: project.status,
      })
      .from(project)
      .where(inArray(project.id, Array.from(projectRefIds)));

    for (const prj of prjRows) {
      const dates = Array.from(projectDateMap.get(prj.id) || []).sort();
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

  // Fetch Installation details
  const installationsBreakdown: TaskWorkBreakdownItem[] = [];
  if (installRefIds.size > 0) {
    const insRows = await db
      .select({
        id: installation.id,
        seq: installation.seq,
        customerName: installation.customerName,
        description: installation.description,
        status: installation.status,
      })
      .from(installation)
      .where(inArray(installation.id, Array.from(installRefIds)));

    for (const ins of insRows) {
      const dates = Array.from(installDateMap.get(ins.id) || []).sort();
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

  // Fetch Service Request details
  const servicesBreakdown: TaskWorkBreakdownItem[] = [];
  if (serviceRefIds.size > 0) {
    const srvRows = await db
      .select({
        id: serviceRequest.id,
        seq: serviceRequest.seq,
        customerName: serviceRequest.customerName,
        issueTitle: serviceRequest.issueTitle,
        status: serviceRequest.status,
      })
      .from(serviceRequest)
      .where(inArray(serviceRequest.id, Array.from(serviceRefIds)));

    for (const srv of srvRows) {
      const dates = Array.from(serviceDateMap.get(srv.id) || []).sort();
      servicesBreakdown.push({
        recordId: formatRecordId("SERVICE", srv.seq),
        referenceId: srv.id,
        title: srv.issueTitle,
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
 */
export async function getRecordTechnicianWorkReport(params: {
  workType: RecordType;
  referenceId: string;
  viewer: Viewer;
}): Promise<RecordTechnicianWorkReport> {
  const { workType, referenceId } = params;

  const logs = await db
    .select({
      technicianId: technicianWorkLog.technicianId,
      workDate: technicianWorkLog.workDate,
      name: user.name,
      department: user.department,
    })
    .from(technicianWorkLog)
    .innerJoin(user, eq(technicianWorkLog.technicianId, user.id))
    .where(
      and(
        eq(technicianWorkLog.workType, workType),
        eq(technicianWorkLog.referenceId, referenceId),
      ),
    )
    .orderBy(asc(technicianWorkLog.workDate));

  const techMap = new Map<
    string,
    {
      name: string;
      department: string | null;
      dates: Set<string>;
    }
  >();

  const allDistinctDates = new Set<string>();

  for (const log of logs) {
    const d =
      typeof log.workDate === "string" ? log.workDate : String(log.workDate);
    allDistinctDates.add(d);

    if (!techMap.has(log.technicianId)) {
      techMap.set(log.technicianId, {
        name: log.name,
        department: log.department,
        dates: new Set(),
      });
    }
    techMap.get(log.technicianId)!.dates.add(d);
  }

  const technicians: RecordTechnicianWorkItem[] = [];
  let sumOfTechnicianDays = 0;

  for (const [id, data] of techMap.entries()) {
    const dates = Array.from(data.dates).sort();
    sumOfTechnicianDays += dates.length;
    technicians.push({
      technicianId: id,
      technicianName: data.name,
      department: data.department,
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
