"use server";

import {
  getMonthlyTechnicianSummary,
  getRecordTechnicianWorkReport,
  getTechnicianDetailedReport,
  logTechnicianWorkDate,
  type RecordTechnicianWorkReport,
  type TechnicianDetailedReport,
  type TechnicianMonthlySummaryReport,
} from "@/db/queries/technician-reports";
import type { RecordType } from "@/lib/constants";
import { requireUser } from "@/lib/session";
import { type ActionResult, actionError, actionOk } from "./result";

export async function fetchMonthlyTechnicianSummary(params: {
  month: number;
  year: number;
  technicianId?: string;
  workType?: string;
}): Promise<ActionResult<TechnicianMonthlySummaryReport>> {
  try {
    const user = await requireUser();
    const report = await getMonthlyTechnicianSummary({
      ...params,
      viewer: { role: user.role, id: user.id },
    });
    return actionOk(report);
  } catch (error) {
    console.error("fetchMonthlyTechnicianSummary error:", error);
    return actionError("Failed to fetch monthly technician summary report.");
  }
}

export async function fetchTechnicianDetailedReport(params: {
  technicianId: string;
  month: number;
  year: number;
}): Promise<ActionResult<TechnicianDetailedReport>> {
  try {
    const user = await requireUser();
    const report = await getTechnicianDetailedReport({
      ...params,
      viewer: { role: user.role, id: user.id },
    });

    if (!report) {
      return actionError("Technician report not found or unauthorized.");
    }

    return actionOk(report);
  } catch (error) {
    console.error("fetchTechnicianDetailedReport error:", error);
    return actionError("Failed to fetch detailed technician report.");
  }
}

export async function fetchRecordTechnicianWorkReport(params: {
  workType: RecordType;
  referenceId: string;
}): Promise<ActionResult<RecordTechnicianWorkReport>> {
  try {
    const user = await requireUser();
    const report = await getRecordTechnicianWorkReport({
      ...params,
      viewer: { role: user.role, id: user.id },
    });
    return actionOk(report);
  } catch (error) {
    console.error("fetchRecordTechnicianWorkReport error:", error);
    return actionError("Failed to fetch record technician work report.");
  }
}

export async function logExtraTechnicianWorkDate(params: {
  technicianId: string;
  workType: RecordType;
  referenceId: string;
  workDate: string;
  notes?: string;
}): Promise<ActionResult<void>> {
  try {
    const user = await requireUser();
    if (user.role !== "ADMIN" && user.id !== params.technicianId) {
      return actionError("You can only log work dates for yourself.");
    }

    await logTechnicianWorkDate({
      technicianId: params.technicianId,
      workType: params.workType,
      referenceId: params.referenceId,
      workDate: params.workDate,
      notes: params.notes,
      createdById: user.id,
    });

    return actionOk();
  } catch (error) {
    console.error("logExtraTechnicianWorkDate error:", error);
    return actionError("Failed to log work date.");
  }
}
