"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { ZodError } from "zod";

import { db } from "@/db";
import {
  type InstallationRow,
  getInstallation,
  listInstallations,
} from "@/db/queries/installations";
import {
  logMultipleTechniciansWorkDates,
  logTechnicianWorkDate,
} from "@/db/queries/technician-reports";
import { user } from "@/db/schema/auth";
import { installation } from "@/db/schema/installation";
import { workHistory } from "@/db/schema/work-history";
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
import { getCurrentUser, requireUser } from "@/lib/session";
import {
  createInstallationSchema,
  deleteRecordSchema,
  editInstallationSchema,
  technicianInstallationSchema,
} from "@/lib/validations/service-ticket";
import {
  notifyTicketAssigned,
  notifyTicketCreated,
  sendWhatsAppSafely,
} from "@/lib/whatsapp-service";

import { type ActionResult, actionError, actionOk } from "./result";

const PATH = "/service-tickets/installation-management";

function invalid(error: ZodError): ActionResult {
  return actionError(
    "Please correct the highlighted fields.",
    error.flatten().fieldErrors,
  );
}

async function createInstallation(
  input: unknown,
): Promise<ActionResult<InstallationRow | undefined>> {
  const current = await requireUser();
  if (current.role !== "ADMIN") return actionError("Admins only.");

  const parsed = createInstallationSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const data = parsed.data;

  const technicianIds = data.assignedTechnicianIds ?? [];

  const [row] = await db
    .insert(installation)
    .values({
      customerName: data.customerName,
      contactNumber: data.contactNumber,
      email: data.email ?? null,
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
      createdAt: data.createdAt,
      updatedAt: data.createdAt,
    })
    .returning({ id: installation.id, seq: installation.seq });

  if (row) {
    const label = formatRecordId("INSTALLATION", row.seq);

    const createdDateObj =
      data.createdAt instanceof Date
        ? data.createdAt
        : new Date(data.createdAt ?? new Date());
    const createdDateStr = createdDateObj.toISOString().split("T")[0];

    await db.insert(workHistory).values({
      workType: "INSTALLATION",
      referenceId: row.id,
      technicianIds: technicianIds,
      workDate: createdDateStr,
      workDateTime: createdDateObj,
      status: data.status,
      description: data.description || "Installation request created.",
      attachments: [],
      createdById: current.id,
      createdAt: createdDateObj,
      updatedAt: createdDateObj,
      isInitial: true,
    });

    if (technicianIds.length > 0) {
      await logMultipleTechniciansWorkDates({
        technicianIds,
        workType: "INSTALLATION",
        referenceId: row.id,
        createdById: current.id,
      });

      for (const techId of technicianIds) {
        await notifyAssignment(
          { recordType: "INSTALLATION", recordId: row.id, recordLabel: label },
          {
            technicianId: techId,
            actorId: current.id,
            description: data.description,
          },
        );
      }

      const techs = await db
        .select({ name: user.name, phone: user.phone })
        .from(user)
        .where(inArray(user.id, technicianIds));

      await notifyTicketAssigned({
        ticketType: "INSTALLATION",
        ticketId: label,
        owner: { name: data.customerName, phone: data.contactNumber },
        address: data.address,
        details: data.description,
        technicians: techs,
      });
    }

    await sendWhatsAppSafely(data.contactNumber, () =>
      notifyTicketCreated(
        "INSTALLATION",
        data.contactNumber,
        data.customerName,
        label,
      ),
    );
  }

  revalidatePath(PATH);
  revalidatePath("/service-tickets/technician-reports");
  revalidatePath("/", "layout");
  const created = await getInstallation(row.id, {
    role: current.role,
    id: current.id,
  });
  return actionOk(created);
}

async function updateInstallation(
  input: unknown,
): Promise<ActionResult<InstallationRow | undefined>> {
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
      email: data.email ?? null,
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
      updatedAt: data.updatedAt,
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

    // Synchronize current status with existing Log Request(s) / work history records for this installation
    await db
      .update(workHistory)
      .set({ status: data.status })
      .where(
        and(
          eq(workHistory.workType, "INSTALLATION"),
          eq(workHistory.referenceId, data.id),
        ),
      );

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

    if (newTechs.length > 0) {
      const techs = await db
        .select({ name: user.name, phone: user.phone })
        .from(user)
        .where(inArray(user.id, newTechs));

      await notifyTicketAssigned({
        ticketType: "INSTALLATION",
        ticketId: label,
        owner: { name: data.customerName, phone: data.contactNumber },
        address: data.address,
        details: data.description,
        technicians: techs,
      });
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
    revalidatePath("/service-tickets/technician-reports");
    revalidatePath("/", "layout");
    const updated = await getInstallation(data.id, {
      role: current.role,
      id: current.id,
    });
    return actionOk(updated);
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
    updatedAt: data.updatedAt,
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

  // Synchronize current status with existing Log Request(s) / work history records for this installation
  await db
    .update(workHistory)
    .set({ status: data.status })
    .where(
      and(
        eq(workHistory.workType, "INSTALLATION"),
        eq(workHistory.referenceId, data.id),
      ),
    );

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
  revalidatePath("/service-tickets/technician-reports");
  revalidatePath("/", "layout");
  const updated = await getInstallation(data.id, {
    role: current.role,
    id: current.id,
  });
  return actionOk(updated);
}

async function deleteInstallation(input: unknown): Promise<ActionResult> {
  const current = await requireUser();
  if (current.role !== "ADMIN") return actionError("Admins only.");

  const parsed = deleteRecordSchema.safeParse(input);
  if (!parsed.success) return actionError("Invalid request.");

  const existing = await getInstallation(parsed.data.id, {
    role: current.role,
    id: current.id,
  });
  if (!existing)
    return actionError("Installation not found or you do not have permission.");

  await db.delete(installation).where(eq(installation.id, parsed.data.id));
  revalidatePath(PATH);
  revalidatePath("/service-tickets/technician-reports");
  revalidatePath("/quick-cash");
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

async function updateInstallationDetails(
  input: unknown,
): Promise<ActionResult<InstallationRow | undefined>> {
  try {
    const current = await getCurrentUser();
    if (!current) return actionError("Unauthorized. Please log in.");

    const id =
      typeof input === "object" && input !== null && "id" in input
        ? String((input as { id: unknown }).id)
        : undefined;
    if (!id) return actionError("Installation ID is required.");

    const [existing] = await db
      .select()
      .from(installation)
      .where(eq(installation.id, id))
      .limit(1);
    if (!existing) return actionError("That installation no longer exists.");

    if (current.role === "TECHNICIAN") {
      const isAssigned =
        existing.assignedTechnicianIds?.includes(current.id) ||
        existing.assignedTechnicianId === current.id ||
        existing.createdById === current.id;
      if (!isAssigned) {
        return actionError("This installation is not assigned to you.");
      }
    }

    const raw = input as Record<string, unknown>;
    const accountUsername =
      typeof raw.accountUsername === "string" &&
      raw.accountUsername.trim().length > 0
        ? raw.accountUsername.trim()
        : null;
    const accountPassword =
      typeof raw.accountPassword === "string" &&
      raw.accountPassword.trim().length > 0
        ? raw.accountPassword.trim()
        : undefined;
    const accountMobile =
      typeof raw.accountMobile === "string" &&
      raw.accountMobile.trim().length > 0
        ? raw.accountMobile.trim()
        : null;
    const referenceNo =
      typeof raw.referenceNo === "string" && raw.referenceNo.trim().length > 0
        ? raw.referenceNo.trim()
        : null;

    if (accountMobile) {
      if (!/^[0-9]{10}$/.test(accountMobile)) {
        return actionError("Please enter a valid 10-digit mobile number");
      }
    }

    const paymentMode =
      raw.paymentMode === "ONLINE" || raw.paymentMode === "CASH"
        ? (raw.paymentMode as "ONLINE" | "CASH")
        : null;

    const paymentStatus =
      paymentMode === "ONLINE"
        ? raw.paymentStatus === "PENDING"
          ? "PENDING"
          : "PAID"
        : paymentMode === "CASH"
          ? "PAID"
          : null;

    let amount: string | null = null;
    if (paymentMode === "CASH") {
      const rawAmt = String(raw.amount ?? "").trim();
      if (!rawAmt || Number.isNaN(Number(rawAmt)) || Number(rawAmt) <= 0) {
        return actionError("Please enter a valid cash amount");
      }
      amount = rawAmt;
    }

    const updateValues: Record<string, unknown> = {
      accountUsername,
      accountMobile,
      referenceNo,
      paymentMode,
      paymentStatus,
      amount,
      updatedAt: new Date(),
    };

    if (accountPassword) {
      updateValues.accountPassword = accountPassword;
    }

    await db
      .update(installation)
      .set(updateValues)
      .where(eq(installation.id, id));

    const label = formatRecordId("INSTALLATION", existing.seq);
    const technicianIds =
      existing.assignedTechnicianIds?.length
        ? existing.assignedTechnicianIds
        : existing.assignedTechnicianId
          ? [existing.assignedTechnicianId]
          : [];

    if (paymentMode === "CASH" && amount && Number(amount) > 0) {
      await syncServiceRequestAmount(
        id,
        "INSTALLATION",
        amount,
        `Installation Payment - ${label} - ${existing.customerName}`,
        existing.customerName,
        technicianIds[0] ?? null,
        current.id,
        label,
      );
    } else {
      await syncServiceRequestAmount(
        id,
        "INSTALLATION",
        null,
        "",
        null,
        null,
        current.id,
        label,
      );
    }

    revalidatePath(PATH);
    revalidatePath("/quick-cash");
    revalidatePath("/service-tickets/technician-reports");
    revalidatePath("/", "layout");

    const updated = await getInstallation(id, {
      role: current.role,
      id: current.id,
    });
    return actionOk(updated);
  } catch (error) {
    console.error("updateInstallationDetails error:", error);
    const msg =
      error instanceof Error
        ? error.message
        : "Failed to update installation details";
    return actionError(msg);
  }
}

export {
  createInstallation,
  updateInstallation,
  updateInstallationDetails,
  deleteInstallation,
  exportInstallationsExcel,
};
