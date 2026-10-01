"use server";

import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { ZodError } from "zod";

import { db } from "@/db";
import {
  getServiceRequest,
  listServiceRequests,
} from "@/db/queries/service-requests";
import {
  logMultipleTechniciansWorkDates,
  logTechnicianWorkDate,
} from "@/db/queries/technician-reports";
import { user } from "@/db/schema/auth";
import { serviceRequest } from "@/db/schema/service-request";
import { syncServiceRequestAmount } from "@/lib/actions/cash-transactions";
import { recordStatusChangeEvent } from "@/lib/actions/work-history";
import {
  RECORD_STATUS_LABELS,
  type RecordStatus,
  SERVICE_CATEGORY_LABELS,
} from "@/lib/constants";
import { buildExcelSpreadsheet, getExportFilename } from "@/lib/excel-export";
import { formatCurrency, formatDate, formatRecordId } from "@/lib/format";
import {
  diffRecord,
  notifyAdminsOfUpdate,
  notifyAssignment,
  notifyTechnicianOfEdit,
} from "@/lib/notifications";
import { requireUser } from "@/lib/session";
import {
  notifyTechnicianAssignment,
  notifyTicketCreated,
  notifyTicketOwnerAssignment,
} from "@/lib/whatsapp-service";
import {
  createServiceRequestSchema,
  deleteRecordSchema,
  editServiceRequestSchema,
  technicianServiceRequestSchema,
} from "@/lib/validations/service-ticket";

import { type ActionResult, actionError, actionOk } from "./result";

const PATH = "/service-tickets/service-management";

function invalid(error: ZodError): ActionResult {
  return actionError(
    "Please correct the highlighted fields.",
    error.flatten().fieldErrors,
  );
}

/** WhatsApp is best-effort: a failed message must never fail the ticket. */
async function sendWhatsAppSafely(
  phone: string | null | undefined,
  send: () => Promise<{ success: boolean; error?: string }>,
): Promise<void> {
  if (!phone?.trim()) return;
  try {
    const result = await send();
    if (!result.success) {
      console.warn(`WhatsApp to ${phone} not sent: ${result.error}`);
    }
  } catch (error) {
    console.error(`WhatsApp to ${phone} failed:`, error);
  }
}

async function createServiceRequest(input: unknown): Promise<ActionResult> {
  const current = await requireUser();
  if (current.role !== "ADMIN") return actionError("Admins only.");

  const parsed = createServiceRequestSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const data = parsed.data;

  // Technicians are assigned later, from the edit screen.
  const technicianIds: string[] = [];

  const [row] = await db
    .insert(serviceRequest)
    .values({
      customerName: data.customerName,
      phone: data.phone,
      email: data.email ?? null,
      category: data.category,
      address: data.address,
      issueTitle: data.issueTitle,
      description: data.description,
      status: data.status,
      assignedTechnicianId: technicianIds[0] ?? null,
      assignedTechnicianIds: technicianIds,
      createdById: current.id,
    })
    .returning({ id: serviceRequest.id, seq: serviceRequest.seq });

  if (row) {
    await sendWhatsAppSafely(data.phone, () =>
      notifyTicketCreated(
        data.phone,
        data.customerName,
        formatRecordId("SERVICE", row.seq),
      ),
    );
  }

  revalidatePath(PATH);
  revalidatePath("/", "layout");
  return actionOk();
}

async function updateServiceRequest(input: unknown): Promise<ActionResult> {
  const current = await requireUser();

  const existing =
    typeof input === "object" && input !== null && "id" in input
      ? await getServiceRequest(String((input as { id: unknown }).id), {
          role: current.role,
          id: current.id,
        })
      : undefined;
  if (!existing) return actionError("That request no longer exists.");

  const label = formatRecordId("SERVICE", existing.seq);

  if (current.role === "ADMIN") {
    const parsed = editServiceRequestSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const data = parsed.data;

    const technicianIds = data.assignedTechnicianIds;

    await db
      .update(serviceRequest)
      .set({
        customerName: data.customerName,
        phone: data.phone,
        email: data.email ?? null,
        category: data.category,
        address: data.address,
        issueTitle: data.issueTitle,
        description: data.description,
        status: data.status,
        assignedTechnicianId: technicianIds[0] ?? null,
        assignedTechnicianIds: technicianIds,
        amount: data.amount,
        closedDescription: data.closedDescription,
        imageUrl: data.imageUrl,
      })
      .where(eq(serviceRequest.id, data.id));

    if (existing.status !== "CLOSED" && data.status === "CLOSED") {
      await recordStatusChangeEvent({
        workType: "SERVICE",
        referenceId: data.id,
        previousStatus: existing.status,
        newStatus: data.status,
        actorId: current.id,
      });
    }

    // Always sync so Quick Cash also picks up customer/technician changes;
    // the sync only re-dates the entry when the amount itself changed.
    await syncServiceRequestAmount(
      data.id,
      "SERVICE",
      data.amount ?? null,
      `Service ${label}: ${data.issueTitle}`,
      data.customerName,
      technicianIds[0] ?? null,
      current.id,
      label,
    );

    const prevIds = new Set(existing.assignedTechnicianIds || []);
    const newTechs = technicianIds.filter((id) => !prevIds.has(id));
    if (newTechs.length > 0) {
      await logMultipleTechniciansWorkDates({
        technicianIds: newTechs,
        workType: "SERVICE",
        referenceId: data.id,
        createdById: current.id,
      });
    }

    for (const techId of newTechs) {
      await notifyAssignment(
        { recordType: "SERVICE", recordId: data.id, recordLabel: label },
        {
          technicianId: techId,
          actorId: current.id,
          description: `${data.issueTitle} — ${data.description}`,
        },
      );
    }

    if (newTechs.length > 0) {
      const techs = await db
        .select({ id: user.id, name: user.name, phone: user.phone })
        .from(user)
        .where(inArray(user.id, newTechs));

      await sendWhatsAppSafely(data.phone, () =>
        notifyTicketOwnerAssignment(
          data.phone,
          data.customerName,
          label,
          techs.map((t) => t.name),
        ),
      );

      for (const tech of techs) {
        if (!tech.phone) continue;
        await sendWhatsAppSafely(tech.phone, () =>
          notifyTechnicianAssignment(
            tech.phone as string,
            tech.name,
            label,
            "SERVICE",
            data.customerName,
            `${data.issueTitle} — ${data.description}`,
          ),
        );
      }
    }

    const keptTechs = technicianIds.filter((id) => prevIds.has(id));
    if (keptTechs.length > 0) {
      const changes = diffRecord(existing, data, [
        { key: "customerName", label: "Customer name" },
        { key: "phone", label: "Phone" },
        { key: "email", label: "Email" },
        {
          key: "category",
          label: "Category",
          format: (v) =>
            SERVICE_CATEGORY_LABELS[
              v as keyof typeof SERVICE_CATEGORY_LABELS
            ] ?? "—",
        },
        { key: "address", label: "Address", opaque: true },
        { key: "issueTitle", label: "Issue title" },
        { key: "description", label: "Description", opaque: true },
        {
          key: "amount",
          label: "Amount",
          format: (v) => formatCurrency(v as string | null),
        },
        { key: "closedDescription", label: "Closure notes", opaque: true },
        { key: "imageUrl", label: "Attached image", opaque: true },
      ]);
      if (changes.length > 0) {
        for (const techId of keptTechs) {
          await notifyTechnicianOfEdit(
            { recordType: "SERVICE", recordId: data.id, recordLabel: label },
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
    return actionOk();
  }

  // Technician: only their own record, only the whitelisted fields (§4.2).
  const isAssigned =
    existing.assignedTechnicianIds?.includes(current.id) ||
    existing.assignedTechnicianId === current.id;
  if (!isAssigned) {
    return actionError("This request is not assigned to you.");
  }

  const parsed = technicianServiceRequestSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const data = parsed.data;

  await db
    .update(serviceRequest)
    .set({
      status: data.status,
      amount: data.amount,
      closedDescription: data.closedDescription,
      imageUrl: data.imageUrl,
    })
    .where(eq(serviceRequest.id, data.id));

  if (existing.status !== "CLOSED" && data.status === "CLOSED") {
    await recordStatusChangeEvent({
      workType: "SERVICE",
      referenceId: data.id,
      previousStatus: existing.status,
      newStatus: data.status,
      actorId: current.id,
    });
  }

  // Auto-log work date for technician
  await logTechnicianWorkDate({
    technicianId: current.id,
    workType: "SERVICE",
    referenceId: data.id,
    createdById: current.id,
  });

  // Sync amount to Quick Cash: creates/updates/deletes based on new amount value
  try {
    await syncServiceRequestAmount(
      data.id,
      "SERVICE",
      data.amount ?? null,
      `Service ${label}: ${existing.issueTitle}`,
      existing.customerName,
      existing.assignedTechnicianId ?? null,
      current.id,
      label,
    );
  } catch (error) {
    console.error("Failed to sync amount to Quick Cash:", error);
    // Don't fail the service request update, but log the error
  }

  const changes = diffRecord(existing, data, [
    {
      key: "status",
      label: "Status",
      format: (v) =>
        RECORD_STATUS_LABELS[v as keyof typeof RECORD_STATUS_LABELS] ?? "—",
    },
    {
      key: "amount",
      label: "Amount",
      format: (v) => formatCurrency(v as string | null),
    },
    { key: "closedDescription", label: "Closure notes", opaque: true },
    { key: "imageUrl", label: "Attached image", opaque: true },
  ]);

  await notifyAdminsOfUpdate(
    { recordType: "SERVICE", recordId: data.id, recordLabel: label },
    {
      actorId: current.id,
      actorName: current.name,
      summary:
        changes.length > 0
          ? changes.join("; ")
          : "Saved the request with no field changes",
    },
  );

  revalidatePath(PATH);
  revalidatePath("/", "layout");
  return actionOk();
}

async function deleteServiceRequest(input: unknown): Promise<ActionResult> {
  const current = await requireUser();
  if (current.role !== "ADMIN" && (current.role as string) !== "SUPER_ADMIN")
    return actionError("Admins only.");

  const parsed = deleteRecordSchema.safeParse(input);
  if (!parsed.success) return actionError("Invalid request.");

  const existing = await getServiceRequest(parsed.data.id, {
    role: current.role,
    id: current.id,
  });
  if (!existing)
    return actionError("Request not found or you do not have permission.");

  await db.delete(serviceRequest).where(eq(serviceRequest.id, parsed.data.id));
  revalidatePath(PATH);
  revalidatePath("/", "layout");
  return actionOk();
}

async function exportServiceRequestsExcel(params: {
  status?: RecordStatus | "ALL";
  search?: string;
}): Promise<ActionResult<{ data: string; filename: string }>> {
  try {
    const current = await requireUser();
    const viewer = { role: current.role, id: current.id };

    const records = await listServiceRequests({
      viewer,
      status:
        params.status && params.status !== "ALL" ? params.status : undefined,
      search: params.search,
    });

    const headers = [
      "S.No",
      "Service ID",
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
      r.customerName,
      r.phone || "—",
      r.email || "—",
      SERVICE_CATEGORY_LABELS[r.category] || r.category || "—",
      r.address || "—",
      formatDate(r.createdAt),
      formatDate(r.updatedAt),
    ]);

    const filename = getExportFilename("service-management", params.status);
    const data = buildExcelSpreadsheet({
      sheetName: "Service Requests",
      headers,
      rows,
    });

    return actionOk({ data, filename });
  } catch (error) {
    console.error("exportServiceRequestsExcel error:", error);
    return actionError("Failed to export service requests to Excel.");
  }
}

export {
  createServiceRequest,
  updateServiceRequest,
  deleteServiceRequest,
  exportServiceRequestsExcel,
};
