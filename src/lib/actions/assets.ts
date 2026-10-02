"use server";

import { revalidatePath } from "next/cache";
import type { ZodError } from "zod";

import {
  createAssetRecord,
  deleteAssetProductRecord,
  deleteAssetRecord,
  getAssetById,
  getAssetStats,
  listAssets,
  updateAssetRecord,
} from "@/db/queries/assets";
import { requireUser } from "@/lib/session";
import { assetFormSchema, deleteAssetSchema } from "@/lib/validations/assets";
import type {
  Asset,
  AssetListParams,
  AssetListResponse,
  AssetStats,
} from "@/types/assets";

import { type ActionResult, actionError, actionOk } from "./result";

const PATH = "/asset-management";

function invalid(error: ZodError): ActionResult<never> {
  return actionError(
    "Please correct the highlighted fields.",
    error.flatten().fieldErrors,
  );
}

export async function createAsset(
  input: unknown,
): Promise<ActionResult<Asset>> {
  const current = await requireUser();
  if (current.role !== "ADMIN") return actionError("Admins only.");

  const parsed = assetFormSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const data = parsed.data;

  try {
    const assetName =
      data.name && data.name.trim().length > 0
        ? data.name.trim()
        : `${data.customerName.trim()} Asset`;

    const created = await createAssetRecord(
      {
        name: assetName,
        customerName: data.customerName,
        customerNumber: data.customerNumber,
        location: data.location,
        status: data.status,
        products: data.products,
      },
      current.id,
    );

    revalidatePath(PATH);
    return actionOk(created);
  } catch (error) {
    console.error("Failed to create asset:", error);
    return actionError("Failed to create asset. Please try again.");
  }
}

export async function updateAsset(
  id: string,
  input: unknown,
  targetProductId?: string,
): Promise<ActionResult<Asset>> {
  const current = await requireUser();
  if (current.role !== "ADMIN")
    return actionError("Admins only.");

  if (!id) return actionError("Asset ID is required.");

  const parsed = assetFormSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const data = parsed.data;

  try {
    const updated = await updateAssetRecord(
      id,
      {
        name:
          data.name && data.name.trim().length > 0
            ? data.name.trim()
            : undefined,
        customerName: data.customerName,
        customerNumber: data.customerNumber,
        location: data.location,
        status: data.status,
        products: data.products,
        targetProductId,
      },
      current.id,
      { role: current.role, id: current.id },
    );

    if (!updated)
      return actionError("Asset not found or you do not have permission.");

    revalidatePath(PATH);
    return actionOk(updated);
  } catch (error) {
    console.error("Failed to update asset:", error);
    return actionError("Failed to update asset. Please try again.");
  }
}

export async function deleteAsset(input: unknown): Promise<ActionResult> {
  const current = await requireUser();
  if (current.role !== "ADMIN")
    return actionError("Admins only.");

  const parsed = deleteAssetSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  try {
    const viewer = { role: current.role, id: current.id };
    const success = parsed.data.productId
      ? await deleteAssetProductRecord(
          parsed.data.id,
          parsed.data.productId,
          viewer,
        )
      : await deleteAssetRecord(parsed.data.id, viewer);

    if (!success)
      return actionError("Asset or product not found or already deleted.");

    revalidatePath(PATH);
    return actionOk();
  } catch (error) {
    console.error("Failed to delete asset:", error);
    const msg =
      error instanceof Error
        ? error.message
        : "Failed to delete asset. Please try again.";
    return actionError(msg);
  }
}

export async function getAssetDetails(
  id: string,
): Promise<ActionResult<Asset>> {
  const current = await requireUser();

  try {
    const item = await getAssetById(id, { role: current.role, id: current.id });
    if (!item) return actionError("Asset not found.");
    return actionOk(item);
  } catch (error) {
    console.error("Failed to get asset details:", error);
    return actionError("Failed to retrieve asset details.");
  }
}

export async function getAssets(
  params: AssetListParams = {},
): Promise<ActionResult<AssetListResponse>> {
  const current = await requireUser();

  try {
    const response = await listAssets(params, {
      role: current.role,
      id: current.id,
    });
    return actionOk(response);
  } catch (error) {
    console.error("Failed to list assets:", error);
    return actionError("Failed to retrieve assets list.");
  }
}

export async function getDashboardStats(): Promise<ActionResult<AssetStats>> {
  const current = await requireUser();

  try {
    const stats = await getAssetStats({ role: current.role, id: current.id });
    return actionOk(stats);
  } catch (error) {
    console.error("Failed to get asset stats:", error);
    return actionError("Failed to retrieve asset stats.");
  }
}
