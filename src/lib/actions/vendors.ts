"use server";

import { revalidatePath } from "next/cache";
import type { ZodError } from "zod";

import {
  createVendorRecord,
  deleteVendorRecord,
  getAllVendors,
  getVendorById,
  listVendors,
  updateVendorRecord,
} from "@/db/queries/vendors";
import { requireUser } from "@/lib/session";
import {
  deleteVendorSchema,
  vendorFormSchema,
} from "@/lib/validations/vendors";
import type {
  Vendor,
  VendorListParams,
  VendorListResponse,
  VendorRow,
} from "@/types/vendors";

import { type ActionResult, actionError, actionOk } from "./result";

const PATH = "/asset-management/vendors";

function invalid(error: ZodError): ActionResult<never> {
  return actionError(
    "Please correct the highlighted fields.",
    error.flatten().fieldErrors,
  );
}

export async function createVendor(
  input: unknown,
): Promise<ActionResult<Vendor>> {
  const current = await requireUser();
  if (current.role !== "ADMIN" && current.role !== "SUPER_ADMIN")
    return actionError("Admins only.");

  const parsed = vendorFormSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const data = parsed.data;

  try {
    const created = await createVendorRecord(data, current.id);
    revalidatePath(PATH);
    revalidatePath("/asset-management/send-to-vendor");
    revalidatePath("/asset-management/received-material");
    return actionOk(created);
  } catch (error) {
    console.error("Failed to create vendor:", error);
    return actionError("Failed to create vendor. Please try again.");
  }
}

export async function updateVendor(
  id: string,
  input: unknown,
): Promise<ActionResult<Vendor>> {
  const current = await requireUser();
  if (current.role !== "ADMIN" && current.role !== "SUPER_ADMIN")
    return actionError("Admins only.");

  if (!id) return actionError("Vendor ID is required.");

  const parsed = vendorFormSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const data = parsed.data;

  try {
    const viewer = { role: current.role, id: current.id };
    const updated = await updateVendorRecord(id, data, viewer);
    if (!updated) return actionError("Vendor not found or access denied.");

    revalidatePath(PATH);
    revalidatePath("/asset-management/send-to-vendor");
    revalidatePath("/asset-management/received-material");
    return actionOk(updated);
  } catch (error) {
    console.error("Failed to update vendor:", error);
    return actionError("Failed to update vendor. Please try again.");
  }
}

export async function deleteVendor(input: unknown): Promise<ActionResult> {
  const current = await requireUser();
  if (current.role !== "ADMIN" && current.role !== "SUPER_ADMIN")
    return actionError("Admins only.");

  const parsed = deleteVendorSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  try {
    const viewer = { role: current.role, id: current.id };
    const success = await deleteVendorRecord(parsed.data.id, viewer);
    if (!success) return actionError("Vendor not found or already deleted.");

    revalidatePath(PATH);
    revalidatePath("/asset-management/send-to-vendor");
    revalidatePath("/asset-management/received-material");
    return actionOk();
  } catch (error) {
    console.error("Failed to delete vendor:", error);
    return actionError("Failed to delete vendor. Please try again.");
  }
}

export async function getVendorDetails(
  id: string,
): Promise<ActionResult<Vendor>> {
  const current = await requireUser();

  try {
    const viewer = { role: current.role, id: current.id };
    const item = await getVendorById(id, viewer);
    if (!item) return actionError("Vendor not found.");
    return actionOk(item);
  } catch (error) {
    console.error("Failed to get vendor details:", error);
    return actionError("Failed to retrieve vendor details.");
  }
}

export async function getVendors(
  params: VendorListParams = {},
): Promise<ActionResult<VendorListResponse>> {
  const current = await requireUser();

  try {
    const viewer = { role: current.role, id: current.id };
    const response = await listVendors(params, viewer);
    return actionOk(response);
  } catch (error) {
    console.error("Failed to list vendors:", error);
    return actionError("Failed to retrieve vendors list.");
  }
}

export async function getActiveVendors(): Promise<ActionResult<VendorRow[]>> {
  const current = await requireUser();

  try {
    const viewer = { role: current.role, id: current.id };
    const list = await getAllVendors(viewer);
    return actionOk(list);
  } catch (error) {
    console.error("Failed to fetch active vendors:", error);
    return actionError("Failed to fetch vendors.");
  }
}
