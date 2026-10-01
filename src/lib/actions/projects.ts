"use server";

import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { ZodError } from "zod";

import { db } from "@/db";
import {
  getProject,
  listProjects,
  type ProjectRow,
} from "@/db/queries/projects";
import {
  logMultipleTechniciansWorkDates,
  logTechnicianWorkDate,
} from "@/db/queries/technician-reports";
import { user } from "@/db/schema/auth";
import { project } from "@/db/schema/project";
import { recordStatusChangeEvent } from "@/lib/actions/work-history";
import { RECORD_STATUS_LABELS, type RecordStatus } from "@/lib/constants";
import { buildExcelSpreadsheet, getExportFilename } from "@/lib/excel-export";
import { formatDate, formatRecordId } from "@/lib/format";
import {
  diffRecord,
  notifyAdminsOfUpdate,
  notifyAssignment,
  notifyTechnicianOfEdit,
} from "@/lib/notifications";
import { requireUser } from "@/lib/session";
import {
  createProjectSchema,
  deleteRecordSchema,
  editProjectSchema,
  technicianProjectSchema,
} from "@/lib/validations/service-ticket";
import {
  notifyTicketAssigned,
  notifyTicketCreated,
  sendWhatsAppSafely,
} from "@/lib/whatsapp-service";

import { type ActionResult, actionError, actionOk } from "./result";

const PATH = "/service-tickets/project-management";

function invalid(error: ZodError): ActionResult<never> {
  return actionError(
    "Please correct the highlighted fields.",
    error.flatten().fieldErrors,
  );
}

async function createProject(
  input: unknown,
): Promise<ActionResult<ProjectRow | undefined>> {
  const current = await requireUser();
  if (current.role !== "ADMIN") return actionError("Admins only.");

  const parsed = createProjectSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const data = parsed.data;

  // Technicians are assigned later, from the edit screen.
  const technicianIds: string[] = [];

  const [row] = await db
    .insert(project)
    .values({
      companyName: data.companyName,
      customerName: data.customerName,
      email: data.email,
      mobileNo: data.mobileNo,
      location: data.location,
      estimationNo: data.estimationNo,
      description: data.description,
      status: data.status,
      assignedTechnicianId: technicianIds[0] ?? null,
      assignedTechnicianIds: technicianIds,
      pdfUrl: data.pdfUrl,
      pdfName: data.pdfName,
      createdById: current.id,
    })
    .returning({ id: project.id, seq: project.seq });

  if (row) {
    await sendWhatsAppSafely(data.mobileNo, () =>
      notifyTicketCreated(
        "PROJECT",
        data.mobileNo,
        data.customerName,
        formatRecordId("PROJECT", row.seq),
      ),
    );
  }

  revalidatePath(PATH);
  revalidatePath("/", "layout");
  const created = row
    ? await getProject(row.id, { role: current.role, id: current.id })
    : undefined;
  return actionOk(created);
}

async function updateProject(
  input: unknown,
): Promise<ActionResult<ProjectRow | undefined>> {
  const current = await requireUser();

  const existing =
    typeof input === "object" && input !== null && "id" in input
      ? await getProject(String((input as { id: unknown }).id), {
          role: current.role,
          id: current.id,
        })
      : undefined;
  if (!existing) return actionError("That project no longer exists.");

  const label = formatRecordId("PROJECT", existing.seq);

  if (current.role === "ADMIN") {
    const parsed = editProjectSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const data = parsed.data;

    const technicianIds = Array.isArray(data.assignedTechnicianIds)
      ? data.assignedTechnicianIds
      : data.assignedTechnicianId
        ? [data.assignedTechnicianId]
        : [];

    await db
      .update(project)
      .set({
        companyName: data.companyName,
        customerName: data.customerName,
        email: data.email,
        mobileNo: data.mobileNo,
        location: data.location,
        estimationNo: data.estimationNo,
        description: data.description,
        status: data.status,
        assignedTechnicianId: technicianIds[0] ?? null,
        assignedTechnicianIds: technicianIds,
        pdfUrl: data.pdfUrl,
        pdfName: data.pdfName,
      })
      .where(eq(project.id, data.id));

    if (existing.status !== "CLOSED" && data.status === "CLOSED") {
      await recordStatusChangeEvent({
        workType: "PROJECT",
        referenceId: data.id,
        previousStatus: existing.status,
        newStatus: data.status,
        actorId: current.id,
      });
    }

    const existingTechIds = existing.assignedTechnicianIds?.length
      ? existing.assignedTechnicianIds
      : existing.assignedTechnicianId
        ? [existing.assignedTechnicianId]
        : [];

    const prevIds = new Set(existingTechIds);
    const newIds = technicianIds.filter((id) => !prevIds.has(id));
    if (newIds.length > 0) {
      await logMultipleTechniciansWorkDates({
        technicianIds: newIds,
        workType: "PROJECT",
        referenceId: data.id,
        createdById: current.id,
      });
    }

    for (const techId of newIds) {
      await notifyAssignment(
        { recordType: "PROJECT", recordId: data.id, recordLabel: label },
        {
          technicianId: techId,
          actorId: current.id,
          description: `${data.companyName}: ${data.description}`,
        },
      );
    }

    if (newIds.length > 0) {
      const techs = await db
        .select({ name: user.name, phone: user.phone })
        .from(user)
        .where(inArray(user.id, newIds));

      await notifyTicketAssigned({
        ticketType: "PROJECT",
        ticketId: label,
        owner: { name: data.customerName, phone: data.mobileNo },
        address: data.location,
        details: data.description,
        company: data.companyName,
        technicians: techs,
      });
    }

    const remainingTechIds = technicianIds.filter((id) => prevIds.has(id));
    if (remainingTechIds.length > 0) {
      const changes = diffRecord(existing, data, [
        { key: "companyName", label: "Company name" },
        { key: "customerName", label: "Customer name" },
        { key: "email", label: "Email" },
        { key: "mobileNo", label: "Mobile number" },
        { key: "location", label: "Location" },
        { key: "estimationNo", label: "Estimation number" },
        { key: "description", label: "Description", opaque: true },
        {
          key: "status",
          label: "Status",
          format: (v) =>
            RECORD_STATUS_LABELS[v as keyof typeof RECORD_STATUS_LABELS] ?? "—",
        },
        { key: "pdfUrl", label: "PDF document", opaque: true },
        { key: "pdfName", label: "PDF name" },
      ]);
      if (changes.length > 0) {
        for (const techId of remainingTechIds) {
          await notifyTechnicianOfEdit(
            { recordType: "PROJECT", recordId: data.id, recordLabel: label },
            {
              technicianId: techId,
              actorId: current.id,
              actorName: current.name,
              summary: changes.join("; "),
            },
          );
        }
      }
    }

    revalidatePath(PATH);
    revalidatePath("/", "layout");
    const updated = await getProject(data.id, {
      role: current.role,
      id: current.id,
    });
    return actionOk(updated);
  }

  // Technician: own record, status only (§4.4).
  const isAssigned =
    existing.assignedTechnicianIds?.includes(current.id) ||
    existing.assignedTechnicianId === current.id;
  if (!isAssigned) {
    return actionError("This project is not assigned to you.");
  }

  const parsed = technicianProjectSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const data = parsed.data;

  await db
    .update(project)
    .set({ status: data.status })
    .where(eq(project.id, data.id));

  if (existing.status !== "CLOSED" && data.status === "CLOSED") {
    await recordStatusChangeEvent({
      workType: "PROJECT",
      referenceId: data.id,
      previousStatus: existing.status,
      newStatus: data.status,
      actorId: current.id,
    });
  }

  // Auto-log work date for technician
  await logTechnicianWorkDate({
    technicianId: current.id,
    workType: "PROJECT",
    referenceId: data.id,
    createdById: current.id,
  });

  const statusLabel =
    RECORD_STATUS_LABELS[data.status as keyof typeof RECORD_STATUS_LABELS];

  await notifyAdminsOfUpdate(
    { recordType: "PROJECT", recordId: data.id, recordLabel: label },
    {
      actorId: current.id,
      actorName: current.name,
      summary:
        data.status !== existing.status
          ? `Status: ${RECORD_STATUS_LABELS[existing.status as keyof typeof RECORD_STATUS_LABELS]} → ${statusLabel}`
          : `Saved with status ${statusLabel}`,
    },
  );

  revalidatePath(PATH);
  revalidatePath("/", "layout");
  const updated = await getProject(data.id, {
    role: current.role,
    id: current.id,
  });
  return actionOk(updated);
}

async function deleteProject(input: unknown): Promise<ActionResult> {
  const current = await requireUser();
  if (current.role !== "ADMIN" && (current.role as string) !== "SUPER_ADMIN")
    return actionError("Admins only.");

  const parsed = deleteRecordSchema.safeParse(input);
  if (!parsed.success) return actionError("Invalid request.");

  const existing = await getProject(parsed.data.id, {
    role: current.role,
    id: current.id,
  });
  if (!existing)
    return actionError("Project not found or you do not have permission.");

  await db.delete(project).where(eq(project.id, parsed.data.id));
  revalidatePath(PATH);
  revalidatePath("/", "layout");
  return actionOk();
}

async function exportProjectsExcel(params: {
  status?: RecordStatus | "ALL";
  search?: string;
}): Promise<ActionResult<{ data: string; filename: string }>> {
  try {
    const current = await requireUser();
    const viewer = { role: current.role, id: current.id };

    const records = await listProjects({
      viewer,
      status:
        params.status && params.status !== "ALL" ? params.status : undefined,
      search: params.search,
    });

    const headers = [
      "S.No",
      "Project ID",
      "Customer Name",
      "Mobile Number",
      "Email",
      "Category",
      "Address",
      "Created Date",
      "Updated Date",
    ];

    const rows = records.map((r, index) => [
      index + 1,
      r.recordId,
      r.customerName || r.companyName,
      r.mobileNo || "—",
      r.email || "—",
      r.technicianDepartment || "Project",
      r.location || "—",
      formatDate(r.createdAt),
      formatDate(r.updatedAt),
    ]);

    const filename = getExportFilename("project-management", params.status);
    const data = buildExcelSpreadsheet({
      sheetName: "Projects",
      headers,
      rows,
    });

    return actionOk({ data, filename });
  } catch (error) {
    console.error("exportProjectsExcel error:", error);
    return actionError("Failed to export projects to Excel.");
  }
}

export { createProject, updateProject, deleteProject, exportProjectsExcel };
