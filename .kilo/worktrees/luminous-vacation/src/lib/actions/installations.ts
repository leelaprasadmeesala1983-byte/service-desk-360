"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { ZodError } from "zod";

import { db } from "@/db";
import { getInstallation, listInstallations } from "@/db/queries/installations";
import {
  logMultipleTechniciansWorkDates,
  logTechnicianWorkDate,
} from "@/db/queries/technician-reports";
import { installation } from "@/db/schema/installation";
import { syncServiceRequestAmount } from "@/lib/actions/cash-transactions";
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
  createInstallationSchema,
  deleteRecordSchema,
  editInstallationSchema,
  technicianInstallationSchema,
} from "@/lib/validations/service-ticket";

import { type ActionResult, actionError, actionOk } from "./result";

const PATH = "/service-tickets/installation-management";

function invalid(error: ZodError): ActionResult {
  return actionError(
    "Please correct the highlighted fields.",
    error.flatten().fieldErrors,
  );
}

async function createInstallation(input: unknown): Promise<ActionResult> {
  const current = await requireUser();
  if (current.role !== "ADMIN") return actionError("Admins only.");

  const parsed = createInstallationSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const data = parsed.data;

  const technicianIds = Array.isArray(data.assignedTechnicianIds)
    ? data.assignedTechnicianIds
    : data.assignedTechnicianId
      ? [data.assignedTechnicianId]
      : [];

  const [row] = await db
    .insert(installation)
    .values({
      customerName: data.customerName,
      contactNumber: data.contactNumber,
      email: data.email,
      address: data.address,
      description: data.description,
      status: data.status,
      assignedTechnicianId: technicianIds[0] ?? null,
      assignedTechnicianIds: technicianIds,
      accountUsername: data.accountUsername ?? null,
      accountPassword: data.accountPassword ?? null,
      accountMobile: data.accountMobile ?? null,
      referenceNo: data.referenceNo ?? null,
      createdById: current.id,
    })
    .returning({ id: installation.id, seq: installation.seq });

  if (technicianIds.length > 0 && row) {
    await logMultipleTechniciansWorkDates({
      technicianIds,
      workType: "INSTALLATION",
      referenceId: row.id,
      createdById: current.id,
    });

    for (const techId of technicianIds) {
      await notifyAssignment(
        {
          recordType: "INSTALLATION",
          recordId: row.id,
          recordLabel: formatRecordId("INSTALLATION", row.seq),
        },
        {
          technicianId: techId,
          actorId: current.id,
          description: data.description,
        },
      );
    }
  }

  revalidatePath(PATH);
  revalidatePath("/", "layout");
  return actionOk();
}

async function updateInstallation(input: unknown): Promise<ActionResult> {
  const current = await requireUser();

  const existing =
    typeof input === "object" && input !== null && "id" in input
      ? await getInstallation(String((input as { id: unknown }).id), {
          role: current.role,
          id: current.id,
        })
      : undefined;
  if (!existing) return actionError("That installation no longer exists.");

  const label = formatRecordId("INSTALLATION", existing.seq);

  if (current.role === "ADMIN") {
    const parsed = editInstallationSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const data = parsed.data;

    const technicianIds = Array.isArray(data.assignedTechnicianIds)
      ? data.assignedTechnicianIds
      : data.assignedTechnicianId
        ? [data.assignedTechnicianId]
        : [];

    const paymentMode = data.paymentMode || null;
    const paymentStatus =
      paymentMode === "ONLINE"
        ? data.paymentStatus || "PAID"
        : paymentMode === "CASH"
          ? "PAID"
          : null;
    const amount = paymentMode === "CASH" ? data.amount || null : null;

    const updateValues: Record<string, unknown> = {
      customerName: data.customerName,
      contactNumber: data.contactNumber,
      email: data.email,
      address: data.address,
      description: data.description,
      status: data.status,
      assignedTechnicianId: technicianIds[0] ?? null,
      assignedTechnicianIds: technicianIds,
      accountUsername: data.accountUsername ?? null,
      accountMobile: data.accountMobile ?? null,
      referenceNo: data.referenceNo ?? null,
      paymentMode,
      paymentStatus,
      amount,
    };

    // Write-only password logic:
    // If a non-empty password is submitted, update it.
    // If empty/null/omitted, omit accountPassword from updateValues to preserve the existing password.
    if (data.accountPassword && data.accountPassword.trim().length > 0) {
      updateValues.accountPassword = data.accountPassword.trim();
    }

    await db
      .update(installation)
      .set(updateValues)
      .where(eq(installation.id, data.id));

    // Synchronize Quick Cash for Cash payments or reverse/remove if switched away from Cash
    if (paymentMode === "CASH" && amount && Number(amount) > 0) {
      await syncServiceRequestAmount(
        data.id,
        "INSTALLATION",
        amount,
        `Installation Payment - ${label} - ${data.customerName}`,
        data.customerName,
        technicianIds[0] ?? null,
        current.id,
        label,
      );
    } else {
      // Reverses/deletes any existing synced cash transaction for this installation
      await syncServiceRequestAmount(
        data.id,
        "INSTALLATION",
        null,
        "",
        null,
        null,
        current.id,
        label,
      );
    }

    if (existing.status !== "CLOSED" && data.status === "CLOSED") {
      await recordStatusChangeEvent({
        workType: "INSTALLATION",
        referenceId: data.id,
        previousStatus: existing.status,
        newStatus: data.status,
        actorId: current.id,
      });
    }

    const prevIds = new Set(
      existing.assignedTechnicianIds?.length
        ? existing.assignedTechnicianIds
        : existing.assignedTechnicianId
          ? [existing.assignedTechnicianId]
          : [],
    );

    const newTechs = technicianIds.filter((id) => !prevIds.has(id));
    if (newTechs.length > 0) {
      await logMultipleTechniciansWorkDates({
        technicianIds: newTechs,
        workType: "INSTALLATION",
        referenceId: data.id,
        createdById: current.id,
      });
    }

    for (const techId of newTechs) {
      await notifyAssignment(
        { recordType: "INSTALLATION", recordId: data.id, recordLabel: label },
        {
          technicianId: techId,
          actorId: current.id,
          description: data.description,
        },
      );
    }

    const keptTechs = technicianIds.filter((id) => prevIds.has(id));
    if (keptTechs.length > 0) {
      // Blank password means "keep existing", so only diff it when a new one was actually entered.
      const next: Record<string, unknown> = {
        customerName: data.customerName,
        contactNumber: data.contactNumber,
        email: data.email,
        address: data.address,
        description: data.description,
        status: data.status,
        accountUsername: data.accountUsername,
        accountMobile: data.accountMobile,
        referenceNo: data.referenceNo,
        paymentMode,
        paymentStatus,
        amount,
      };
      if (data.accountPassword && data.accountPassword.trim().length > 0) {
        next.accountPassword = "NEW_PASSWORD_ENTERED";
      }

      const changes = diffRecord(existing, next, [
        { key: "customerName", label: "Customer name" },
        { key: "contactNumber", label: "Contact number" },
        { key: "email", label: "Email" },
        { key: "address", label: "Address", opaque: true },
        { key: "description", label: "Description", opaque: true },
        {
          key: "status",
          label: "Status",
          format: (v) =>
            RECORD_STATUS_LABELS[v as keyof typeof RECORD_STATUS_LABELS] ?? "—",
        },
        { key: "accountUsername", label: "Account username" },
        { key: "accountMobile", label: "Account mobile" },
        { key: "referenceNo", label: "Reference ID" },
        { key: "paymentMode", label: "Payment mode" },
        { key: "paymentStatus", label: "Payment status" },
        { key: "amount", label: "Amount" },
        { key: "accountPassword", label: "Account password", opaque: true },
      ]);
      if (changes.length > 0) {
        for (const techId of keptTechs) {
          await notifyTechnicianOfEdit(
            {
              recordType: "INSTALLATION",
              recordId: data.id,
              recordLabel: label,
            },
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
    revalidatePath("/quick-cash");
    revalidatePath("/", "layout");
    return actionOk();
  }

  // Technician: own record, whitelisted fields only (§4.3).
  const isAssigned =
    existing.assignedTechnicianIds?.includes(current.id) ||
    existing.assignedTechnicianId === current.id;
  if (!isAssigned) {
    return actionError("This installation is not assigned to you.");
  }

  const parsed = technicianInstallationSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const data = parsed.data;

  const paymentMode = data.paymentMode || null;
  const paymentStatus =
    paymentMode === "ONLINE"
      ? data.paymentStatus || "PAID"
      : paymentMode === "CASH"
        ? "PAID"
        : null;
  const amount = paymentMode === "CASH" ? data.amount || null : null;

  const updateValues: Record<string, unknown> = {
    status: data.status,
    description: data.description,
    accountUsername: data.accountUsername ?? null,
    accountMobile: data.accountMobile ?? null,
    paymentMode,
    paymentStatus,
    amount,
  };

  if (data.accountPassword && data.accountPassword.trim().length > 0) {
    updateValues.accountPassword = data.accountPassword.trim();
  }

  await db
    .update(installation)
    .set(updateValues)
    .where(eq(installation.id, data.id));

  // Synchronize Quick Cash for Cash payments or reverse if switched away from Cash
  if (paymentMode === "CASH" && amount && Number(amount) > 0) {
    await syncServiceRequestAmount(
      data.id,
      "INSTALLATION",
      amount,
      `Installation Payment - ${label} - ${existing.customerName}`,
      existing.customerName,
      current.id,
      current.id,
      label,
    );
  } else {
    await syncServiceRequestAmount(
      data.id,
      "INSTALLATION",
      null,
      "",
      null,
      null,
      current.id,
      label,
    );
  }

  if (existing.status !== "CLOSED" && data.status === "CLOSED") {
    await recordStatusChangeEvent({
      workType: "INSTALLATION",
      referenceId: data.id,
      previousStatus: existing.status,
      newStatus: data.status,
      actorId: current.id,
    });
  }

  // Auto-log work date for technician
  await logTechnicianWorkDate({
    technicianId: current.id,
    workType: "INSTALLATION",
    referenceId: data.id,
    createdById: current.id,
  });

  const next: Record<string, unknown> = {
    status: data.status,
    description: data.description,
    accountUsername: data.accountUsername,
    accountMobile: data.accountMobile,
  };
  if (data.accountPassword && data.accountPassword.trim().length > 0) {
    next.accountPassword = "NEW_PASSWORD_ENTERED";
  }

  const changes = diffRecord(existing, next, [
    {
      key: "status",
      label: "Status",
      format: (v) =>
        RECORD_STATUS_LABELS[v as keyof typeof RECORD_STATUS_LABELS] ?? "—",
    },
    { key: "description", label: "Description", opaque: true },
    { key: "accountUsername", label: "Account username" },
    { key: "accountMobile", label: "Account mobile" },
    { key: "accountPassword", label: "Account password", opaque: true },
  ]);

  await notifyAdminsOfUpdate(
    { recordType: "INSTALLATION", recordId: data.id, recordLabel: label },
    {
      actorId: current.id,
      actorName: current.name,
      summary:
        changes.length > 0
          ? changes.join("; ")
          : "Saved the installation with no field changes",
    },
  );

  revalidatePath(PATH);
  revalidatePath("/", "layout");
  return actionOk();
}

async function deleteInstallation(input: unknown): Promise<ActionResult> {
  const current = await requireUser();
  if (current.role !== "ADMIN") return actionError("Admins only.");

  const parsed = deleteRecordSchema.safeParse(input);
  if (!parsed.success) return actionError("Invalid request.");

  await db.delete(installation).where(eq(installation.id, parsed.data.id));
  revalidatePath(PATH);
  revalidatePath("/", "layout");
  return actionOk();
}

async function exportInstallationsExcel(params: {
  status?: RecordStatus | "ALL";
  search?: string;
}): Promise<ActionResult<{ data: string; filename: string }>> {
  try {
    const current = await requireUser();
    const viewer = { role: current.role, id: current.id };

    const records = await listInstallations({
      viewer,
      status:
        params.status && params.status !== "ALL" ? params.status : undefined,
      search: params.search,
    });

    const headers = [
      "S.No",
      "Installation ID",
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
      r.contactNumber || "—",
      r.email || "—",
      r.technicianDepartment || "Installation",
      r.address || "—",
      formatDate(r.createdAt),
      formatDate(r.updatedAt),
    ]);

    const filename = getExportFilename(
      "installation-management",
      params.status,
    );
    const data = buildExcelSpreadsheet({
      sheetName: "Installations",
      headers,
      rows,
    });

    return actionOk({ data, filename });
  } catch (error) {
    console.error("exportInstallationsExcel error:", error);
    return actionError("Failed to export installations to Excel.");
  }
}

export {
  createInstallation,
  updateInstallation,
  deleteInstallation,
  exportInstallationsExcel,
};
