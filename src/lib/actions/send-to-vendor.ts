"use server";

import { revalidatePath } from "next/cache";
import type { ZodError } from "zod";

import {
  createSendToVendorRecord,
  deleteSendToVendorRecord,
  getSendToVendorById,
  getSendToVendorStats,
  listSendToVendor,
  updateSendToVendorRecord,
  updateSendToVendorStatus,
} from "@/db/queries/send-to-vendor";
import { requireUser } from "@/lib/session";
import {
  deleteSendToVendorSchema,
  sendToVendorFormSchema,
} from "@/lib/validations/send-to-vendor";
import type {
  SendToVendor,
  SendToVendorListParams,
  SendToVendorListResponse,
  SendToVendorStats,
} from "@/types/send-to-vendor";

import { type ActionResult, actionError, actionOk } from "./result";

const PATH = "/asset-management";

function invalid(error: ZodError): ActionResult<never> {
  return actionError(
    "Please correct the highlighted fields.",
    error.flatten().fieldErrors,
  );
}

export async function createSendToVendor(
  input: unknown,
): Promise<ActionResult<SendToVendor>> {
  const current = await requireUser();
  if (current.role !== "ADMIN") return actionError("Admins only.");

  const parsed = sendToVendorFormSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const data = parsed.data;

  try {
    const created = await createSendToVendorRecord(
      {
        assetId: data.assetId || null,
        items: data.items || [],
        vendorId: data.vendorId || null,
        vendorName: data.vendorName,
        contactPerson: data.contactPerson,
        phoneNumber: data.phoneNumber,
        address: data.address,
        reasonForRepair: data.reasonForRepair,
        remarks: data.remarks || "",
        courierName: data.courierName,
        docketAwbNumber: data.docketAwbNumber,
        bookingDate: data.bookingDate,
        numberOfPackages: data.numberOfPackages,
        dispatchRemarks: data.dispatchRemarks || "",
      },
      current.id,
    );

    revalidatePath(PATH);
    return actionOk(created);
  } catch (error) {
    console.error("Failed to create Send to Vendor record:", error);
    return actionError(
      "Failed to create Send to Vendor record. Please try again.",
    );
  }
}

export async function updateSendToVendor(
  id: string,
  input: unknown,
): Promise<ActionResult<SendToVendor>> {
  const current = await requireUser();
  if (current.role !== "ADMIN" && (current.role as string) !== "SUPER_ADMIN")
    return actionError("Admins only.");

  if (!id) return actionError("Send to Vendor ID is required.");

  const parsed = sendToVendorFormSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const data = parsed.data;

  try {
    const updated = await updateSendToVendorRecord(
      id,
      {
        assetId: data.assetId || null,
        items: data.items,
        vendorId: data.vendorId || null,
        vendorName: data.vendorName,
        contactPerson: data.contactPerson,
        phoneNumber: data.phoneNumber,
        address: data.address,
        reasonForRepair: data.reasonForRepair,
        remarks: data.remarks || "",
        courierName: data.courierName,
        docketAwbNumber: data.docketAwbNumber,
        bookingDate: data.bookingDate,
        numberOfPackages: data.numberOfPackages,
        dispatchRemarks: data.dispatchRemarks || "",
      },
      { role: current.role, id: current.id },
    );

    if (!updated)
      return actionError(
        "Send to Vendor record not found or you do not have permission.",
      );

    revalidatePath(PATH);
    return actionOk(updated);
  } catch (error) {
    console.error("Failed to update Send to Vendor record:", error);
    return actionError(
      "Failed to update Send to Vendor record. Please try again.",
    );
  }
}

export async function updateVendorDispatchRepairStatus(
  id: string,
  repairStatus: string,
  targetWorkflowStage?: string,
): Promise<ActionResult<SendToVendor>> {
  const current = await requireUser();
  if (current.role !== "ADMIN" && (current.role as string) !== "SUPER_ADMIN")
    return actionError("Admins only.");

  if (!id) return actionError("Vendor Dispatch ID is required.");
  if (!repairStatus) return actionError("Repair Status is required.");

  try {
    const updated = await updateSendToVendorStatus(
      id,
      repairStatus,
      current.id,
      targetWorkflowStage,
      { role: current.role, id: current.id },
    );
    if (!updated)
      return actionError(
        "Vendor Dispatch record not found or you do not have permission.",
      );

    revalidatePath("/asset-management");
    revalidatePath("/asset-management/send-to-vendor");
    revalidatePath("/asset-management/repair-status");
    revalidatePath("/asset-management/vendor-received");
    revalidatePath("/asset-management/customer-return");
    revalidatePath("/asset-management/received-material");
    return actionOk(updated);
  } catch (error) {
    console.error("Failed to update dispatch status:", error);
    return actionError("Failed to update dispatch status. Please try again.");
  }
}

export async function deleteSendToVendor(
  input: unknown,
): Promise<ActionResult> {
  const current = await requireUser();
  if (current.role !== "ADMIN" && (current.role as string) !== "SUPER_ADMIN")
    return actionError("Admins only.");

  const parsed = deleteSendToVendorSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  try {
    const success = await deleteSendToVendorRecord(parsed.data.id, current.id, {
      role: current.role,
      id: current.id,
    });
    if (!success) {
      return actionError("Record not found or already deleted.");
    }

    revalidatePath("/asset-management");
    revalidatePath("/asset-management/received-material");
    revalidatePath("/asset-management/send-to-vendor");
    return actionOk();
  } catch (error) {
    console.error("Failed to delete Send to Vendor record:", error);
    return actionError(
      "Failed to delete Send to Vendor record. Please try again.",
    );
  }
}

export async function getSendToVendorDetails(
  id: string,
): Promise<ActionResult<SendToVendor>> {
  const current = await requireUser();

  try {
    const item = await getSendToVendorById(id, {
      role: current.role,
      id: current.id,
    });
    if (!item) return actionError("Send to Vendor record not found.");
    return actionOk(item);
  } catch (error) {
    console.error("Failed to get Send to Vendor details:", error);
    return actionError("Failed to retrieve Send to Vendor details.");
  }
}

export async function getSendToVendorList(
  params: SendToVendorListParams = {},
): Promise<ActionResult<SendToVendorListResponse>> {
  const current = await requireUser();

  try {
    const response = await listSendToVendor(params, {
      role: current.role,
      id: current.id,
    });
    return actionOk(response);
  } catch (error) {
    console.error("Failed to list Send to Vendor records:", error);
    return actionError("Failed to retrieve Send to Vendor list.");
  }
}

export async function getSendToVendorDashboardStats(): Promise<
  ActionResult<SendToVendorStats>
> {
  const current = await requireUser();

  try {
    const stats = await getSendToVendorStats({
      role: current.role,
      id: current.id,
    });
    return actionOk(stats);
  } catch (error) {
    console.error("Failed to get Send to Vendor stats:", error);
    return actionError("Failed to retrieve stats.");
  }
}
