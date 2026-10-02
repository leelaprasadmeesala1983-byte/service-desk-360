"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { ZodError } from "zod";

import { db } from "@/db";
import { logMultipleTechniciansWorkDates } from "@/db/queries/technician-reports";
import {
  type CombinedWorkHistoryResult,
  getCombinedWorkHistory,
} from "@/db/queries/work-history";
import { user } from "@/db/schema/auth";
import { installation } from "@/db/schema/installation";
import { project } from "@/db/schema/project";
import { serviceRequest } from "@/db/schema/service-request";
import { workHistory } from "@/db/schema/work-history";
import type { RecordStatus, RecordType } from "@/lib/constants";
import { requireUser } from "@/lib/session";
import {
  createWorkHistorySchema,
  deleteWorkHistorySchema,
  editWorkHistorySchema,
} from "@/lib/validations/work-history";

import { type ActionResult, actionError, actionOk } from "./result";

function invalid(error: ZodError): ActionResult {
  return actionError(
    "Please correct the highlighted fields.",
    error.flatten().fieldErrors,
  );
}

/**
 * Creates a new day-wise work history entry for a ticket.
 */
export async function createWorkHistory(input: unknown): Promise<ActionResult> {
  const current = await requireUser();

  const parsed = createWorkHistorySchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const data = parsed.data;

  try {
    // 1. Validate parent record exists
    if (data.workType === "SERVICE") {
      const [sr] = await db
        .select({ id: serviceRequest.id })
        .from(serviceRequest)
        .where(eq(serviceRequest.id, data.referenceId))
        .limit(1);
      if (!sr) {
        return actionError("Selected service ticket could not be found.");
      }
    } else if (data.workType === "INSTALLATION") {
      const [ins] = await db
        .select({ id: installation.id })
        .from(installation)
        .where(eq(installation.id, data.referenceId))
        .limit(1);
      if (!ins) {
        return actionError("Selected installation ticket could not be found.");
      }
    } else if (data.workType === "PROJECT") {
      const [prj] = await db
        .select({ id: project.id })
        .from(project)
        .where(eq(project.id, data.referenceId))
        .limit(1);
      if (!prj) {
        return actionError("Selected project ticket could not be found.");
      }
    }

    // 2. Validate technician IDs against user table
    let validTechIds: string[] = [];
    if (data.technicianIds.length > 0) {
      const validTechs = await db
        .select({ id: user.id })
        .from(user)
        .where(
          and(inArray(user.id, data.technicianIds), eq(user.status, "ACTIVE")),
        );

      if (validTechs.length === 0) {
        return actionError(
          "Selected technician is no longer available. Please refresh the technician list and try again.",
        );
      }
      validTechIds = validTechs.map((t) => t.id);
    }

    // 3. Validate creator exists
    let validCreatorId: string | null = null;
    const [validCreator] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.id, current.id))
      .limit(1);
    if (validCreator) {
      validCreatorId = validCreator.id;
    }

    const workDateTime = data.workDateTime
      ? new Date(data.workDateTime)
      : new Date();

    const workDateStr =
      data.workDate ||
      (typeof data.workDateTime === "string" && data.workDateTime.includes("T")
        ? data.workDateTime.split("T")[0]
        : workDateTime.toISOString().split("T")[0]);

    const description = data.description?.trim() || "";

    const [row] = await db
      .insert(workHistory)
      .values({
        workType: data.workType,
        referenceId: data.referenceId,
        technicianIds: validTechIds,
        workDate: workDateStr,
        workDateTime,
        status: data.status || "IN_PROGRESS",
        description,
        attachments: data.attachments ?? [],
        createdById: validCreatorId,
      })
      .returning({ id: workHistory.id });

    // 4. Sync with technician work logs so monthly reports accurately reflect this date
    if (validTechIds.length > 0 && row) {
      await logMultipleTechniciansWorkDates({
        technicianIds: validTechIds,
        workType: data.workType,
        referenceId: data.referenceId,
        workDate: workDateStr,
        notes: description || null,
        createdById: validCreatorId,
      });
    }

    revalidatePath("/service-tickets/service-management");
    revalidatePath("/service-tickets/installation-management");
    revalidatePath("/service-tickets/project-management");
    revalidatePath("/service-tickets/technician-reports");
    revalidatePath("/", "layout");

    return actionOk();
  } catch (error) {
    console.error("Failed to create work history log:", error);
    const msg =
      error instanceof Error ? error.message : "Failed to record work log";
    return actionError(msg);
  }
}

/**
 * Updates an existing work history entry.
 */
export async function updateWorkHistory(input: unknown): Promise<ActionResult> {
  const current = await requireUser();

  const parsed = editWorkHistorySchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const data = parsed.data;

  try {
    const existing = await db
      .select()
      .from(workHistory)
      .where(eq(workHistory.id, data.id))
      .limit(1);

    if (!existing || existing.length === 0) {
      return actionError("Work history entry not found.");
    }

    const prev = existing[0];

    // Authorization check: Admins can edit their own logs; Technicians can edit logs they created or are assigned to
    if (
      current.role === "ADMIN" &&
      prev.createdById &&
      prev.createdById !== current.id
    ) {
      return actionError(
        "You are not authorized to edit this work history entry.",
      );
    }
    if (
      current.role === "TECHNICIAN" &&
      prev.createdById !== current.id &&
      !prev.technicianIds?.includes(current.id)
    ) {
      return actionError(
        "You are not authorized to edit this work history entry.",
      );
    }

    // Technicians already on this entry stay even if since deactivated or
    // deleted; only newly added ones must be active.
    const alreadyOnEntry = new Set(prev.technicianIds ?? []);
    let validTechIds: string[] = [];
    if (data.technicianIds.length > 0) {
      const activeTechs = await db
        .select({ id: user.id })
        .from(user)
        .where(
          and(inArray(user.id, data.technicianIds), eq(user.status, "ACTIVE")),
        );
      const activeIds = new Set(activeTechs.map((t) => t.id));

      validTechIds = data.technicianIds.filter(
        (id) => alreadyOnEntry.has(id) || activeIds.has(id),
      );

      if (validTechIds.length === 0) {
        return actionError(
          "Selected technician is no longer available. Please refresh the technician list and try again.",
        );
      }
    }

    const workDateTime = data.workDateTime
      ? new Date(data.workDateTime)
      : new Date();

    await db
      .update(workHistory)
      .set({
        technicianIds: validTechIds,
        workDate: data.workDate,
        workDateTime,
        status: data.status,
        description: data.description,
        attachments: data.attachments ?? [],
        updatedAt: new Date(),
      })
      .where(eq(workHistory.id, data.id));

    // Sync technician reporting
    if (validTechIds.length > 0) {
      await logMultipleTechniciansWorkDates({
        technicianIds: validTechIds,
        workType: prev.workType,
        referenceId: prev.referenceId,
        workDate: data.workDate,
        notes: data.description,
        createdById: current.id,
      });
    }

    revalidatePath("/service-tickets/service-management");
    revalidatePath("/service-tickets/installation-management");
    revalidatePath("/service-tickets/project-management");
    revalidatePath("/service-tickets/technician-reports");
    revalidatePath("/", "layout");

    return actionOk();
  } catch (error) {
    console.error("Failed to update work history entry:", error);
    const msg =
      error instanceof Error ? error.message : "Failed to update work log";
    return actionError(msg);
  }
}

/**
 * Deletes a work history entry without affecting the parent service request.
 */
export async function deleteWorkHistory(input: unknown): Promise<ActionResult> {
  const current = await requireUser();

  const parsed = deleteWorkHistorySchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  try {
    const existing = await db
      .select({ id: workHistory.id, createdById: workHistory.createdById })
      .from(workHistory)
      .where(eq(workHistory.id, parsed.data.id))
      .limit(1);

    if (!existing || existing.length === 0) {
      return actionError("Work history entry not found.");
    }

    if (existing[0].createdById && existing[0].createdById !== current.id) {
      return actionError(
        "You are not authorized to delete this work history entry.",
      );
    }

    await db.delete(workHistory).where(eq(workHistory.id, parsed.data.id));

    revalidatePath("/service-tickets/service-management");
    revalidatePath("/service-tickets/installation-management");
    revalidatePath("/service-tickets/project-management");
    revalidatePath("/service-tickets/technician-reports");
    revalidatePath("/", "layout");

    return actionOk();
  } catch (error) {
    console.error("Failed to delete work history entry:", error);
    const msg =
      error instanceof Error ? error.message : "Failed to delete work log";
    return actionError(msg);
  }
}

/**
 * Automatically creates the initial work history entry when a new
 * Service Request, Installation, or Project is created.
 */
export async function createInitialWorkHistory(params: {
  workType: RecordType;
  referenceId: string;
  technicianIds: string[];
  workDate?: string;
  workDateTime?: Date;
  status: RecordStatus;
  description: string;
  createdById: string | null;
}): Promise<void> {
  try {
    const todayStr = params.workDate ?? new Date().toISOString().split("T")[0];
    const now = params.workDateTime ?? new Date();

    // Verify creator exists if provided
    let validCreatorId: string | null = null;
    if (params.createdById) {
      const [u] = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.id, params.createdById))
        .limit(1);
      if (u) validCreatorId = u.id;
    }

    // Verify technicians exist if provided
    let validTechIds: string[] = [];
    if (params.technicianIds.length > 0) {
      const validTechs = await db
        .select({ id: user.id })
        .from(user)
        .where(inArray(user.id, params.technicianIds));
      validTechIds = validTechs.map((t) => t.id);
    }

    await db.insert(workHistory).values({
      workType: params.workType,
      referenceId: params.referenceId,
      technicianIds: validTechIds,
      workDate: todayStr,
      workDateTime: now,
      status: params.status,
      description: params.description,
      attachments: [],
      createdById: validCreatorId,
    });
  } catch (error) {
    console.error("Failed to create initial work history entry:", error);
  }
}

/**
 * Records a status change event (e.g. transitioning to CLOSED) in the work history timeline.
 * Does NOT create a technician work log, preserving technician report accuracy.
 */
export async function recordStatusChangeEvent(params: {
  workType: RecordType;
  referenceId: string;
  previousStatus: RecordStatus | string;
  newStatus: RecordStatus | string;
  actorId: string | null;
  timestamp?: Date;
}): Promise<void> {
  // Only record if transitioning from non-CLOSED to CLOSED
  if (params.previousStatus !== "CLOSED" && params.newStatus === "CLOSED") {
    try {
      const now = params.timestamp ?? new Date();
      const todayStr = now.toISOString().split("T")[0];

      // Check if creator exists
      let validCreatorId: string | null = null;
      if (params.actorId) {
        const [u] = await db
          .select({ id: user.id })
          .from(user)
          .where(eq(user.id, params.actorId))
          .limit(1);
        if (u) validCreatorId = u.id;
      }

      await db.insert(workHistory).values({
        workType: params.workType,
        referenceId: params.referenceId,
        technicianIds: [],
        workDate: todayStr,
        workDateTime: now,
        status: "CLOSED",
        description: "Status changed to Closed",
        attachments: [],
        createdById: validCreatorId,
      });
    } catch (error) {
      console.error("Failed to record status change event:", error);
    }
  }
}

/**
 * Server action to fetch the complete combined work history (initial request + work logs)
 * alongside parent ticket details for client views.
 */
export async function fetchWorkHistoryByRecord(params: {
  workType: RecordType;
  referenceId: string;
}): Promise<ActionResult<CombinedWorkHistoryResult>> {
  try {
    const result = await getCombinedWorkHistory(params);
    return actionOk(result);
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "Failed to load work history";
    return actionError(msg);
  }
}
