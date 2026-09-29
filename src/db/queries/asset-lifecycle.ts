import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { asset } from "@/db/schema/asset";
import { assetStatusHistory } from "@/db/schema/asset-status-history";
import { user } from "@/db/schema/auth";
import { customerDispatch } from "@/db/schema/customer-dispatch";
import { sendToVendor } from "@/db/schema/send-to-vendor";
import type { AssetStatusHistoryRow } from "@/types/assets";
import type {
  ConfirmDeliveryInput,
  CreateCustomerDispatchInput,
  CustomerReturnInput,
} from "@/types/customer-dispatch";
import type { ReceiveFromVendorInput } from "@/types/send-to-vendor";

/**
 * Valid transitions map for material statuses.
 */
const ALLOWED_STATUS_TRANSITIONS: Record<string, string[]> = {
  Received: [
    "Under Repair",
    "Sent to Vendor",
    "Received From Vendor",
    "Customer Returned",
    "Ready For Customer Dispatch",
    "Closed",
    "Available",
  ],
  "Under Repair": [
    "Received From Vendor",
    "Customer Returned",
    "Ready For Customer Dispatch",
  ],
  "Sent to Vendor": [
    "Received From Vendor",
    "Customer Returned",
    "Ready For Customer Dispatch",
    "Under Repair",
  ],
  "Received From Vendor": [
    "Customer Returned",
    "Ready For Customer Dispatch",
    "Under Repair",
  ],
  "Ready For Customer Dispatch": [
    "Customer Returned",
    "Dispatched To Customer",
    "Under Repair",
  ],
  "Dispatched To Customer": [
    "Delivered",
    "Customer Returned",
    "Ready For Customer Dispatch",
  ],
  Delivered: ["Customer Returned", "Closed"],
  "Customer Returned": ["Closed"],
  Closed: [],
  // Legacy support
  Available: [
    "Under Repair",
    "Ready For Customer Dispatch",
    "Assigned",
    "Installed",
    "Under Service",
    "Damaged",
    "Retired",
  ],
  Assigned: ["Under Repair", "Installed", "Available"],
  Installed: ["Under Repair", "Under Service", "Available"],
  "Under Service": ["Under Repair", "Available"],
  Damaged: ["Under Repair", "Retired"],
  Retired: [],
};

export class LifecycleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LifecycleError";
  }
}

/**
 * Validates if transition from previousStatus to newStatus is permissible.
 */
export function validateStatusTransition(
  previousStatus: string,
  newStatus: string,
): boolean {
  if (previousStatus === newStatus) return true;
  const allowed = ALLOWED_STATUS_TRANSITIONS[previousStatus] || [];
  return allowed.includes(newStatus);
}

/**
 * Transition material status atomically with history logging.
 */
export async function transitionAssetStatus({
  assetId,
  newStatus,
  newRepairStatus,
  action,
  remarks = "",
  performedById,
  relatedVendorDispatchId,
  relatedCustomerDispatchId,
  metadata = {},
}: {
  assetId: string;
  newStatus: string;
  newRepairStatus?: string;
  action: string;
  remarks?: string;
  performedById?: string;
  relatedVendorDispatchId?: string;
  relatedCustomerDispatchId?: string;
  metadata?: Record<string, unknown>;
}) {
  const [currentAsset] = await db
    .select({
      id: asset.id,
      status: asset.status,
      repairStatus: asset.repairStatus,
    })
    .from(asset)
    .where(eq(asset.id, assetId))
    .limit(1);

  if (!currentAsset) {
    throw new LifecycleError(`Asset with ID ${assetId} not found.`);
  }

  const previousStatus = currentAsset.status;
  const previousRepairStatus = currentAsset.repairStatus;

  // Validate state transition
  if (!validateStatusTransition(previousStatus, newStatus)) {
    throw new LifecycleError(
      `Cannot transition material status from "${previousStatus}" to "${newStatus}".`,
    );
  }

  const updatedRepairStatus = newRepairStatus || previousRepairStatus;

  // Run atomic transaction
  return await db.transaction(async (tx) => {
    // 1. Update Asset
    const [updated] = await tx
      .update(asset)
      .set({
        status: newStatus,
        repairStatus: updatedRepairStatus,
        updatedAt: new Date(),
      })
      .where(eq(asset.id, assetId))
      .returning();

    // 2. Insert Status History Audit
    const [historyEntry] = await tx
      .insert(assetStatusHistory)
      .values({
        assetId,
        previousStatus,
        newStatus,
        previousRepairStatus,
        newRepairStatus: updatedRepairStatus,
        action,
        remarks,
        performedById: performedById ?? null,
        performedAt: new Date(),
        relatedVendorDispatchId: relatedVendorDispatchId ?? null,
        relatedCustomerDispatchId: relatedCustomerDispatchId ?? null,
        metadata,
      })
      .returning();

    return { asset: updated, history: historyEntry };
  });
}

/**
 * Receive material back from vendor.
 */
export async function receiveMaterialFromVendor({
  assetId,
  sendToVendorId,
  input,
  userId,
}: {
  assetId?: string;
  sendToVendorId?: string;
  input: ReceiveFromVendorInput;
  userId?: string;
}) {
  // Find the dispatch record
  let dispatchRecord = null;
  if (sendToVendorId) {
    const [found] = await db
      .select()
      .from(sendToVendor)
      .where(eq(sendToVendor.id, sendToVendorId))
      .limit(1);
    dispatchRecord = found;
  } else if (assetId) {
    const [found] = await db
      .select()
      .from(sendToVendor)
      .where(eq(sendToVendor.assetId, assetId))
      .orderBy(desc(sendToVendor.createdAt))
      .limit(1);
    dispatchRecord = found;
  }

  const resolvedAssetId = assetId || dispatchRecord?.assetId;
  if (!resolvedAssetId) {
    throw new LifecycleError("No associated material found for vendor return.");
  }

  const [currentAsset] = await db
    .select()
    .from(asset)
    .where(eq(asset.id, resolvedAssetId))
    .limit(1);

  if (!currentAsset) {
    throw new LifecycleError("Material not found.");
  }

  const returnDate = new Date(input.vendorReturnDate);
  const repairStatus = input.repairStatus || "REPAIR_COMPLETED";
  const newMaterialStatus = "Received From Vendor";

  return await db.transaction(async (tx) => {
    // 1. Update Send To Vendor record if exists
    if (dispatchRecord) {
      await tx
        .update(sendToVendor)
        .set({
          status: "RECEIVED_FROM_VENDOR",
          repairStatus,
          vendorReturnDate: returnDate,
          repairRemarks: input.repairRemarks,
          returnDocketNumber: input.returnDocketNumber || null,
          receivedById: userId ?? null,
          updatedAt: new Date(),
        })
        .where(eq(sendToVendor.id, dispatchRecord.id));
    }

    // 2. Update Asset status to Received From Vendor
    const [updatedAsset] = await tx
      .update(asset)
      .set({
        status: newMaterialStatus,
        repairStatus,
        updatedAt: new Date(),
      })
      .where(eq(asset.id, resolvedAssetId))
      .returning();

    // 3. Insert History Record
    await tx.insert(assetStatusHistory).values({
      assetId: resolvedAssetId,
      previousStatus: currentAsset.status,
      newStatus: newMaterialStatus,
      previousRepairStatus: currentAsset.repairStatus,
      newRepairStatus: repairStatus,
      action: "RECEIVED_FROM_VENDOR",
      remarks: input.repairRemarks || "Material returned from vendor",
      performedById: userId ?? null,
      performedAt: returnDate,
      relatedVendorDispatchId: dispatchRecord?.id ?? null,
      metadata: {
        returnDocketNumber: input.returnDocketNumber,
        additionalRemarks: input.additionalRemarks,
      },
    });

    return updatedAsset;
  });
}

/**
 * Return repaired material back to original customer.
 */
export async function customerReturnMaterial({
  assetId,
  input,
  userId,
}: {
  assetId: string;
  input: CustomerReturnInput;
  userId?: string;
}) {
  const [currentAsset] = await db
    .select()
    .from(asset)
    .where(eq(asset.id, assetId))
    .limit(1);

  if (!currentAsset) {
    throw new LifecycleError("Material not found.");
  }

  if (
    currentAsset.status === "Under Repair" ||
    currentAsset.status === "Sent to Vendor"
  ) {
    throw new LifecycleError(
      "Cannot return material to customer while it is under vendor repair.",
    );
  }

  const returnDate = new Date(input.returnDate);
  const newStatus = "Customer Returned";

  return await db.transaction(async (tx) => {
    // 1. Update Asset Status
    const [updatedAsset] = await tx
      .update(asset)
      .set({
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(asset.id, assetId))
      .returning();

    // 2. Insert Customer Dispatch record for handover documentation
    const [createdDispatch] = await tx
      .insert(customerDispatch)
      .values({
        assetId,
        customerName: currentAsset.customerName,
        customerContact: input.phone || currentAsset.customerNumber,
        customerAddress: currentAsset.location || "N/A",
        courierName: "Hand Delivery",
        docketAwbNumber: "N/A",
        dispatchDate: returnDate,
        numberOfPackages: 1,
        dispatchRemarks: input.remarks || "",
        status: "CUSTOMER_RETURNED",
        deliveryRemarks: `Handed over to ${input.handedOverTo}`,
        deliveredAt: returnDate,
        dispatchedById: userId ?? null,
      })
      .returning();

    // 3. Log History
    await tx.insert(assetStatusHistory).values({
      assetId,
      previousStatus: currentAsset.status,
      newStatus,
      previousRepairStatus: currentAsset.repairStatus,
      newRepairStatus: currentAsset.repairStatus,
      action: "CUSTOMER_RETURNED",
      remarks:
        `Handed over to ${input.handedOverTo} (Phone: ${input.phone}). Service Charges: ₹${input.serviceCharges ?? 0}. ${input.remarks || ""}`.trim(),
      performedById: userId ?? null,
      performedAt: returnDate,
      relatedCustomerDispatchId: createdDispatch?.id ?? null,
      metadata: {
        handedOverTo: input.handedOverTo,
        phone: input.phone,
        serviceCharges: input.serviceCharges ?? 0,
        remarks: input.remarks,
        returnDate: input.returnDate,
      },
    });

    return { asset: updatedAsset, dispatch: createdDispatch };
  });
}

/**
 * Update vendor repair status for a material.
 */
export async function updateAssetRepairStatus({
  assetId,
  repairStatus,
  remarks,
  userId,
}: {
  assetId: string;
  repairStatus: string;
  remarks?: string;
  userId?: string;
}) {
  const [currentAsset] = await db
    .select()
    .from(asset)
    .where(eq(asset.id, assetId))
    .limit(1);

  if (!currentAsset) {
    throw new LifecycleError("Material not found.");
  }

  return await db.transaction(async (tx) => {
    // 1. Update Asset repair status
    const [updatedAsset] = await tx
      .update(asset)
      .set({
        repairStatus,
        updatedAt: new Date(),
      })
      .where(eq(asset.id, assetId))
      .returning();

    // 2. Update active vendor dispatch record if any
    await tx
      .update(sendToVendor)
      .set({
        repairStatus,
        repairRemarks: remarks || undefined,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(sendToVendor.assetId, assetId),
          eq(sendToVendor.status, "SENT_TO_VENDOR"),
        ),
      );

    // 3. Log History
    await tx.insert(assetStatusHistory).values({
      assetId,
      previousStatus: currentAsset.status,
      newStatus: currentAsset.status,
      previousRepairStatus: currentAsset.repairStatus,
      newRepairStatus: repairStatus,
      action: "REPAIR_STATUS_UPDATED",
      remarks:
        remarks ||
        `Repair status changed to ${repairStatus.replace(/_/g, " ")}`,
      performedById: userId ?? null,
      performedAt: new Date(),
      metadata: { repairStatus, remarks },
    });

    return updatedAsset;
  });
}

/**
 * Dispatch material to customer.
 */
export async function dispatchMaterialToCustomer({
  input,
  userId,
}: {
  input: CreateCustomerDispatchInput;
  userId?: string;
}) {
  const [currentAsset] = await db
    .select()
    .from(asset)
    .where(eq(asset.id, input.assetId))
    .limit(1);

  if (!currentAsset) {
    throw new LifecycleError("Material not found.");
  }

  if (
    currentAsset.status === "Under Repair" ||
    currentAsset.status === "Sent to Vendor"
  ) {
    throw new LifecycleError(
      "Cannot dispatch material to customer while it is under vendor repair.",
    );
  }

  const dispatchDate = new Date(input.dispatchDate);
  const newStatus = "Dispatched To Customer";

  return await db.transaction(async (tx) => {
    // 1. Create Customer Dispatch Record
    const [createdDispatch] = await tx
      .insert(customerDispatch)
      .values({
        assetId: input.assetId,
        customerName: input.customerName.trim(),
        customerContact: input.customerContact.trim(),
        customerAddress: input.customerAddress.trim(),
        courierName: input.courierName.trim(),
        docketAwbNumber: input.docketAwbNumber.trim(),
        dispatchDate,
        numberOfPackages: input.numberOfPackages ?? 1,
        dispatchRemarks: input.dispatchRemarks?.trim() || "",
        status: "DISPATCHED_TO_CUSTOMER",
        dispatchedById: userId ?? null,
      })
      .returning();

    // 2. Update Asset Status
    const [updatedAsset] = await tx
      .update(asset)
      .set({
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(asset.id, input.assetId))
      .returning();

    // 3. Log History
    await tx.insert(assetStatusHistory).values({
      assetId: input.assetId,
      previousStatus: currentAsset.status,
      newStatus,
      previousRepairStatus: currentAsset.repairStatus,
      newRepairStatus: currentAsset.repairStatus,
      action: "DISPATCHED_TO_CUSTOMER",
      remarks: `Dispatched to ${input.customerName} via ${input.courierName} (AWB: ${input.docketAwbNumber})`,
      performedById: userId ?? null,
      performedAt: dispatchDate,
      relatedCustomerDispatchId: createdDispatch.id,
      metadata: {
        courierName: input.courierName,
        docketAwbNumber: input.docketAwbNumber,
        packages: input.numberOfPackages,
      },
    });

    return { asset: updatedAsset, dispatch: createdDispatch };
  });
}

/**
 * Confirm customer delivery.
 */
export async function confirmCustomerDelivery({
  assetId,
  input,
  userId,
}: {
  assetId: string;
  input: ConfirmDeliveryInput;
  userId?: string;
}) {
  const [currentAsset] = await db
    .select()
    .from(asset)
    .where(eq(asset.id, assetId))
    .limit(1);

  if (!currentAsset) {
    throw new LifecycleError("Material not found.");
  }

  const deliveryDate = input.deliveredAt
    ? new Date(input.deliveredAt)
    : new Date();
  const newStatus = "Delivered";

  return await db.transaction(async (tx) => {
    // 1. Update customer dispatch if exists
    await tx
      .update(customerDispatch)
      .set({
        status: "DELIVERED",
        deliveredAt: deliveryDate,
        deliveryRemarks:
          input.deliveryRemarks?.trim() || "Delivered to customer",
        updatedAt: new Date(),
      })
      .where(eq(customerDispatch.assetId, assetId));

    // 2. Update Asset Status
    const [updatedAsset] = await tx
      .update(asset)
      .set({
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(asset.id, assetId))
      .returning();

    // 3. Log History
    await tx.insert(assetStatusHistory).values({
      assetId,
      previousStatus: currentAsset.status,
      newStatus,
      previousRepairStatus: currentAsset.repairStatus,
      newRepairStatus: currentAsset.repairStatus,
      action: "DELIVERED",
      remarks:
        input.deliveryRemarks?.trim() ||
        "Material delivered to customer successfully",
      performedById: userId ?? null,
      performedAt: deliveryDate,
    });

    return updatedAsset;
  });
}

/**
 * Close completed material lifecycle.
 */
export async function closeMaterialLifecycle({
  assetId,
  userId,
  remarks = "Material lifecycle completed and closed",
}: {
  assetId: string;
  userId?: string;
  remarks?: string;
}) {
  return await transitionAssetStatus({
    assetId,
    newStatus: "Closed",
    action: "CLOSED",
    remarks,
    performedById: userId,
  });
}

/**
 * Get chronological lifecycle audit history for an asset.
 */
export async function getAssetLifecycleHistory(
  assetId: string,
): Promise<AssetStatusHistoryRow[]> {
  const rows = await db
    .select({
      id: assetStatusHistory.id,
      assetId: assetStatusHistory.assetId,
      previousStatus: assetStatusHistory.previousStatus,
      newStatus: assetStatusHistory.newStatus,
      previousRepairStatus: assetStatusHistory.previousRepairStatus,
      newRepairStatus: assetStatusHistory.newRepairStatus,
      action: assetStatusHistory.action,
      remarks: assetStatusHistory.remarks,
      performedById: assetStatusHistory.performedById,
      performedByName: user.name,
      performedAt: assetStatusHistory.performedAt,
      relatedVendorDispatchId: assetStatusHistory.relatedVendorDispatchId,
      relatedCustomerDispatchId: assetStatusHistory.relatedCustomerDispatchId,
      metadata: assetStatusHistory.metadata,
      createdAt: assetStatusHistory.createdAt,
    })
    .from(assetStatusHistory)
    .leftJoin(user, eq(assetStatusHistory.performedById, user.id))
    .where(eq(assetStatusHistory.assetId, assetId))
    .orderBy(desc(assetStatusHistory.performedAt));

  return rows.map((r) => ({
    id: r.id,
    assetId: r.assetId,
    previousStatus: r.previousStatus,
    newStatus: r.newStatus,
    previousRepairStatus: r.previousRepairStatus,
    newRepairStatus: r.newRepairStatus,
    action: r.action,
    remarks: r.remarks,
    performedById: r.performedById,
    performedByName: r.performedByName ?? undefined,
    performedAt: r.performedAt,
    relatedVendorDispatchId: r.relatedVendorDispatchId,
    relatedCustomerDispatchId: r.relatedCustomerDispatchId,
    metadata: (r.metadata as Record<string, unknown>) || undefined,
    createdAt: r.createdAt,
  }));
}
