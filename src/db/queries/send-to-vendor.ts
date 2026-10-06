import { and, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { scopeAdminOwnership, type Viewer } from "@/db/queries/record-scope";
import { type AssetProduct, asset } from "@/db/schema/asset";
import { assetStatusHistory } from "@/db/schema/asset-status-history";
import { user } from "@/db/schema/auth";
import { type DispatchItem, sendToVendor } from "@/db/schema/send-to-vendor";
import { parseRecordIdSearch } from "@/lib/format";
import type {
  CreateSendToVendorInput,
  SendToVendor,
  SendToVendorListParams,
  SendToVendorListResponse,
  SendToVendorRow,
  SendToVendorStats,
} from "@/types/send-to-vendor";

export async function listSendToVendor(
  params: SendToVendorListParams = {},
  viewer?: Viewer,
): Promise<SendToVendorListResponse> {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.max(1, Math.min(100, params.limit ?? 10));
  const offset = (page - 1) * limit;

  const conditions = [];

  const scopeCondition = scopeAdminOwnership(sendToVendor.createdById, viewer);
  if (scopeCondition) {
    conditions.push(scopeCondition);
  }

  if (params.status && params.status !== "ALL") {
    conditions.push(eq(sendToVendor.status, params.status));
  }

  if (params.workflowStage) {
    conditions.push(eq(sendToVendor.workflowStage, params.workflowStage));
  } else if (params.repairWorkflow) {
    conditions.push(eq(sendToVendor.workflowStage, "REPAIR_STATUS"));
  } else if (params.repairStatus && params.repairStatus !== "ALL") {
    if (params.repairStatus === "DISPATCHED") {
      conditions.push(eq(sendToVendor.workflowStage, "SENT_TO_VENDOR"));
    } else if (
      params.repairStatus === "IN_REPAIR_WORKFLOW" ||
      params.repairStatus === "UNDER_REPAIR"
    ) {
      conditions.push(eq(sendToVendor.workflowStage, "REPAIR_STATUS"));
    } else if (
      params.repairStatus === "REPAIR_COMPLETED" ||
      params.repairStatus === "VENDOR_RECEIVED"
    ) {
      conditions.push(eq(sendToVendor.workflowStage, "VENDOR_RECEIVED"));
    } else if (params.repairStatus === "RETURN_TO_CUSTOMER") {
      conditions.push(eq(sendToVendor.workflowStage, "CUSTOMER_RETURN"));
    } else {
      conditions.push(eq(sendToVendor.repairStatus, params.repairStatus));
    }
  }

  if (params.search && params.search.trim().length > 0) {
    const rawSearch = params.search.trim();
    const searchTerm = `%${rawSearch}%`;
    const seq = parseRecordIdSearch(rawSearch);

    const searchConditions = [
      ilike(sendToVendor.vendorName, searchTerm),
      ilike(sendToVendor.contactPerson, searchTerm),
      ilike(sendToVendor.phoneNumber, searchTerm),
      ilike(sendToVendor.courierName, searchTerm),
      ilike(sendToVendor.docketAwbNumber, searchTerm),
      ilike(sendToVendor.reasonForRepair, searchTerm),
      ilike(sendToVendor.status, searchTerm),
      ilike(sendToVendor.repairStatus, searchTerm),
      ilike(asset.name, searchTerm),
      ilike(asset.customerName, searchTerm),
      ilike(asset.customerNumber, searchTerm),
      sql`send_to_vendor.items::text ILIKE ${searchTerm}`,
      sql`asset.products::text ILIKE ${searchTerm}`,
    ];

    if (seq !== null) {
      searchConditions.push(eq(sendToVendor.seq, seq));
      searchConditions.push(eq(asset.seq, seq));
    }

    conditions.push(or(...searchConditions));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [countResult, rows] = await Promise.all([
    db
      .select({ count: count() })
      .from(sendToVendor)
      .leftJoin(asset, eq(sendToVendor.assetId, asset.id))
      .where(whereClause),
    db
      .select({
        id: sendToVendor.id,
        seq: sendToVendor.seq,
        assetId: sendToVendor.assetId,
        items: sendToVendor.items,
        assetSeq: asset.seq,
        assetName: asset.name,
        customerName: asset.customerName,
        assetProducts: asset.products,
        vendorId: sendToVendor.vendorId,
        vendorName: sendToVendor.vendorName,
        contactPerson: sendToVendor.contactPerson,
        phoneNumber: sendToVendor.phoneNumber,
        address: sendToVendor.address,
        reasonForRepair: sendToVendor.reasonForRepair,
        remarks: sendToVendor.remarks,
        repairStatus: sendToVendor.repairStatus,
        courierName: sendToVendor.courierName,
        docketAwbNumber: sendToVendor.docketAwbNumber,
        bookingDate: sendToVendor.bookingDate,
        numberOfPackages: sendToVendor.numberOfPackages,
        dispatchRemarks: sendToVendor.dispatchRemarks,
        vendorReturnDate: sendToVendor.vendorReturnDate,
        repairRemarks: sendToVendor.repairRemarks,
        returnDocketNumber: sendToVendor.returnDocketNumber,
        receivedById: sendToVendor.receivedById,
        customerReceivedAt: sendToVendor.customerReceivedAt,
        status: sendToVendor.status,
        workflowStage: sendToVendor.workflowStage,
        createdById: sendToVendor.createdById,
        createdByName: user.name,
        createdAt: sendToVendor.createdAt,
        updatedAt: sendToVendor.updatedAt,
      })
      .from(sendToVendor)
      .leftJoin(user, eq(sendToVendor.createdById, user.id))
      .leftJoin(asset, eq(sendToVendor.assetId, asset.id))
      .where(whereClause)
      .orderBy(desc(sendToVendor.createdAt))
      .limit(limit)
      .offset(offset),
  ]);

  const total = countResult[0]?.count ?? 0;
  const totalPages = Math.ceil(total / limit) || 1;

  const data: SendToVendorRow[] = rows.map((row) => {
    const rawItems = Array.isArray(row.items) ? row.items : [];
    const fallbackProducts = (row.assetProducts as AssetProduct[]) || [];
    const items =
      rawItems.length > 0
        ? rawItems
        : fallbackProducts.map((p, idx) => ({
            receivedMaterialId: row.assetId || "",
            receivedItemId: p.id || `item-${idx}`,
            trackId: row.assetSeq
              ? parseRecordIdSearch(String(row.assetSeq)) !== null
                ? `AST-${row.assetSeq + 1000}`
                : `AST-${row.assetSeq}`
              : "—",
            productName: p.productType || "Product",
            serialNumber: p.serialNumber || "",
            brandName: p.brandName || "",
            modelNumber: p.modelNumber || "",
            quantity: p.quantity || 1,
          }));

    const serialNumber =
      items[0]?.serialNumber || fallbackProducts[0]?.serialNumber || undefined;

    return {
      id: row.id,
      seq: row.seq,
      assetId: row.assetId,
      items,
      assetSeq: row.assetSeq ?? undefined,
      assetName: row.assetName ?? undefined,
      customerName: row.customerName ?? undefined,
      serialNumber,
      vendorId: row.vendorId ?? undefined,
      vendorName: row.vendorName,
      contactPerson: row.contactPerson,
      phoneNumber: row.phoneNumber,
      address: row.address,
      reasonForRepair: row.reasonForRepair,
      remarks: row.remarks ?? "",
      repairStatus: row.repairStatus ?? "UNDER_REPAIR",
      courierName: row.courierName,
      docketAwbNumber: row.docketAwbNumber,
      bookingDate: row.bookingDate,
      numberOfPackages: row.numberOfPackages,
      noOfPackages: row.numberOfPackages,
      dispatchRemarks: row.dispatchRemarks ?? "",
      vendorReturnDate: row.vendorReturnDate ?? undefined,
      repairRemarks: row.repairRemarks ?? undefined,
      returnDocketNumber: row.returnDocketNumber ?? undefined,
      receivedById: row.receivedById ?? undefined,
      customerReceivedAt: row.customerReceivedAt ?? undefined,
      status: row.status ?? "SENT_TO_VENDOR",
      workflowStage: row.workflowStage ?? "SENT_TO_VENDOR",
      createdById: row.createdById,
      createdByName: row.createdByName ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  });

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}

export async function getSendToVendorById(
  id: string,
  viewer?: Viewer,
): Promise<SendToVendor | null> {
  const conditions = [eq(sendToVendor.id, id)];
  const scopeCondition = scopeAdminOwnership(sendToVendor.createdById, viewer);
  if (scopeCondition) {
    conditions.push(scopeCondition);
  }

  const [row] = await db
    .select({
      id: sendToVendor.id,
      seq: sendToVendor.seq,
      assetId: sendToVendor.assetId,
      items: sendToVendor.items,
      vendorId: sendToVendor.vendorId,
      vendorName: sendToVendor.vendorName,
      contactPerson: sendToVendor.contactPerson,
      phoneNumber: sendToVendor.phoneNumber,
      address: sendToVendor.address,
      reasonForRepair: sendToVendor.reasonForRepair,
      remarks: sendToVendor.remarks,
      repairStatus: sendToVendor.repairStatus,
      courierName: sendToVendor.courierName,
      docketAwbNumber: sendToVendor.docketAwbNumber,
      bookingDate: sendToVendor.bookingDate,
      numberOfPackages: sendToVendor.numberOfPackages,
      dispatchRemarks: sendToVendor.dispatchRemarks,
      vendorReturnDate: sendToVendor.vendorReturnDate,
      repairRemarks: sendToVendor.repairRemarks,
      returnDocketNumber: sendToVendor.returnDocketNumber,
      receivedById: sendToVendor.receivedById,
      customerReceivedAt: sendToVendor.customerReceivedAt,
      status: sendToVendor.status,
      createdById: sendToVendor.createdById,
      creatorId: user.id,
      creatorName: user.name,
      creatorEmail: user.email,
      createdAt: sendToVendor.createdAt,
      updatedAt: sendToVendor.updatedAt,
      assetIdDb: asset.id,
      assetSeq: asset.seq,
      assetName: asset.name,
      assetCustomerName: asset.customerName,
      assetCustomerNumber: asset.customerNumber,
      assetStatus: asset.status,
      assetRepairStatus: asset.repairStatus,
      assetProducts: asset.products,
    })
    .from(sendToVendor)
    .leftJoin(user, eq(sendToVendor.createdById, user.id))
    .leftJoin(asset, eq(sendToVendor.assetId, asset.id))
    .where(and(...conditions))
    .limit(1);

  if (!row) return null;

  const rawItems = Array.isArray(row.items) ? row.items : [];
  const fallbackProducts = (row.assetProducts as AssetProduct[]) || [];
  const items =
    rawItems.length > 0
      ? rawItems
      : fallbackProducts.map((p, idx) => ({
          receivedMaterialId: row.assetId || "",
          receivedItemId: p.id || `item-${idx}`,
          trackId: row.assetSeq ? `AST-${row.assetSeq + 1000}` : "—",
          productName: p.productType || "Product",
          serialNumber: p.serialNumber || "",
          brandName: p.brandName || "",
          modelNumber: p.modelNumber || "",
          quantity: p.quantity || 1,
        }));

  return {
    id: row.id,
    seq: row.seq,
    assetId: row.assetId,
    items,
    vendorId: row.vendorId,
    vendorName: row.vendorName,
    contactPerson: row.contactPerson,
    phoneNumber: row.phoneNumber,
    address: row.address,
    reasonForRepair: row.reasonForRepair,
    remarks: row.remarks ?? "",
    repairStatus: row.repairStatus ?? "UNDER_REPAIR",
    courierName: row.courierName,
    docketAwbNumber: row.docketAwbNumber,
    bookingDate: row.bookingDate,
    numberOfPackages: row.numberOfPackages,
    noOfPackages: row.numberOfPackages,
    dispatchRemarks: row.dispatchRemarks ?? "",
    vendorReturnDate: row.vendorReturnDate,
    repairRemarks: row.repairRemarks,
    returnDocketNumber: row.returnDocketNumber,
    receivedById: row.receivedById,
    customerReceivedAt: row.customerReceivedAt,
    status: row.status ?? "SENT_TO_VENDOR",
    createdById: row.createdById,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    createdBy: row.creatorId
      ? {
          id: row.creatorId,
          name: row.creatorName ?? "",
          email: row.creatorEmail ?? "",
        }
      : null,
    asset: row.assetIdDb
      ? {
          id: row.assetIdDb,
          seq: row.assetSeq ?? 0,
          name: row.assetName ?? "",
          customerName: row.assetCustomerName ?? "",
          customerNumber: row.assetCustomerNumber ?? "",
          status: row.assetStatus ?? "Received",
          repairStatus: row.assetRepairStatus ?? "NOT_REQUIRED",
          products: (row.assetProducts as AssetProduct[]) || [],
        }
      : null,
  };
}

export async function createSendToVendorRecord(
  input: CreateSendToVendorInput,
  createdById?: string,
): Promise<SendToVendor> {
  const bookingDate = new Date(input.bookingDate);
  const items = Array.isArray(input.items) ? input.items : [];
  const primaryAssetId = input.assetId || items[0]?.receivedMaterialId || null;

  return await db.transaction(async (tx) => {
    // Check for duplicate dispatches
    for (const item of items) {
      if (item.receivedMaterialId) {
        const [existing] = await tx
          .select()
          .from(asset)
          .where(eq(asset.id, item.receivedMaterialId))
          .limit(1);

        if (existing) {
          const prods = (existing.products as AssetProduct[]) || [];
          const match = prods.find(
            (p) =>
              p.id === item.receivedItemId ||
              (p.serialNumber &&
                p.serialNumber === item.serialNumber &&
                p.productType === item.productName),
          );

          if (
            match &&
            (match.dispatchId || match.status === "DISPATCHED_TO_VENDOR")
          ) {
            throw new Error(
              `Item "${match.productType}" (Serial: ${match.serialNumber || "N/A"}) from Track ID ${item.trackId} has already been dispatched.`,
            );
          }
        }
      }
    }

    // 1. Create Send To Vendor Record(s) - 1 record per individual product item
    let firstCreated: SendToVendor | null = null;

    if (items.length > 1) {
      for (const item of items) {
        const itemAssetId = item.receivedMaterialId || primaryAssetId;
        const [created] = await tx
          .insert(sendToVendor)
          .values({
            assetId: itemAssetId,
            items: [item],
            vendorId: input.vendorId || null,
            vendorName: input.vendorName.trim(),
            contactPerson: input.contactPerson.trim(),
            phoneNumber: input.phoneNumber.trim(),
            address: input.address.trim(),
            reasonForRepair: input.reasonForRepair.trim(),
            remarks: input.remarks ? input.remarks.trim() : "",
            repairStatus: "DISPATCHED",
            courierName: input.courierName.trim(),
            docketAwbNumber: input.docketAwbNumber.trim(),
            bookingDate,
            numberOfPackages: Math.max(
              1,
              Math.floor(input.noOfPackages ?? input.numberOfPackages ?? 1),
            ),
            dispatchRemarks: input.dispatchRemarks
              ? input.dispatchRemarks.trim()
              : "",
            status: "SENT_TO_VENDOR",
            createdById: createdById ?? null,
          })
          .returning();

        if (!firstCreated) firstCreated = created as SendToVendor;

        if (itemAssetId) {
          const [existingAsset] = await tx
            .select()
            .from(asset)
            .where(eq(asset.id, itemAssetId))
            .limit(1);

          if (existingAsset) {
            const existingProducts =
              (existingAsset.products as AssetProduct[]) || [];
            const updatedProducts = existingProducts.map((p) => {
              if (
                p.id === item.receivedItemId ||
                (p.serialNumber && p.serialNumber === item.serialNumber) ||
                (existingProducts.length === 1 && !p.id)
              ) {
                return {
                  ...p,
                  status: "DISPATCHED_TO_VENDOR",
                  dispatchId: created.id,
                };
              }
              return p;
            });

            await tx
              .update(asset)
              .set({
                status: "Under Repair",
                repairStatus: "UNDER_REPAIR",
                products: updatedProducts,
                updatedAt: new Date(),
              })
              .where(eq(asset.id, itemAssetId));

            await tx.insert(assetStatusHistory).values({
              assetId: itemAssetId,
              previousStatus: existingAsset.status,
              newStatus: "Under Repair",
              previousRepairStatus: existingAsset.repairStatus,
              newRepairStatus: "UNDER_REPAIR",
              action: "SENT_TO_VENDOR",
              remarks: `Dispatched to vendor ${input.vendorName.trim()} via ${input.courierName.trim()} (AWB: ${input.docketAwbNumber.trim()})`,
              performedById: createdById ?? null,
              performedAt: bookingDate,
              relatedVendorDispatchId: created.id,
              metadata: {
                vendorName: input.vendorName,
                courierName: input.courierName,
                docketAwbNumber: input.docketAwbNumber,
                reasonForRepair: input.reasonForRepair,
                trackId: item.trackId,
                productName: item.productName,
              },
            });
          }
        }
      }
    } else {
      const [created] = await tx
        .insert(sendToVendor)
        .values({
          assetId: primaryAssetId,
          items,
          vendorId: input.vendorId || null,
          vendorName: input.vendorName.trim(),
          contactPerson: input.contactPerson.trim(),
          phoneNumber: input.phoneNumber.trim(),
          address: input.address.trim(),
          reasonForRepair: input.reasonForRepair.trim(),
          remarks: input.remarks ? input.remarks.trim() : "",
          repairStatus: "DISPATCHED",
          courierName: input.courierName.trim(),
          docketAwbNumber: input.docketAwbNumber.trim(),
          bookingDate,
          numberOfPackages: Math.max(
            1,
            Math.floor(input.noOfPackages ?? input.numberOfPackages ?? 1),
          ),
          dispatchRemarks: input.dispatchRemarks
            ? input.dispatchRemarks.trim()
            : "",
          status: "SENT_TO_VENDOR",
          createdById: createdById ?? null,
        })
        .returning();

      firstCreated = created as SendToVendor;

      // 2. Update status of specific dispatched products & assets
      const assetIdSet = new Set<string>();
      if (primaryAssetId) assetIdSet.add(primaryAssetId);
      for (const item of items) {
        if (item.receivedMaterialId) assetIdSet.add(item.receivedMaterialId);
      }

      for (const astId of assetIdSet) {
        const [existingAsset] = await tx
          .select()
          .from(asset)
          .where(eq(asset.id, astId))
          .limit(1);

        if (existingAsset) {
          const existingProducts =
            (existingAsset.products as AssetProduct[]) || [];
          const updatedProducts = existingProducts.map((p) => {
            const matchingItem = items.find(
              (it) =>
                it.receivedMaterialId === astId &&
                (it.receivedItemId === p.id ||
                  (p.serialNumber && it.serialNumber === p.serialNumber)),
            );

            if (matchingItem || (!items.length && astId === primaryAssetId)) {
              return {
                ...p,
                status: "DISPATCHED_TO_VENDOR",
                dispatchId: created.id,
              };
            }
            return p;
          });

          await tx
            .update(asset)
            .set({
              status: "Under Repair",
              repairStatus: "UNDER_REPAIR",
              products: updatedProducts,
              updatedAt: new Date(),
            })
            .where(eq(asset.id, astId));

          await tx.insert(assetStatusHistory).values({
            assetId: astId,
            previousStatus: existingAsset.status,
            newStatus: "Under Repair",
            previousRepairStatus: existingAsset.repairStatus,
            newRepairStatus: "UNDER_REPAIR",
            action: "SENT_TO_VENDOR",
            remarks: `Dispatched to vendor ${input.vendorName.trim()} via ${input.courierName.trim()} (AWB: ${input.docketAwbNumber.trim()})`,
            performedById: createdById ?? null,
            performedAt: bookingDate,
            relatedVendorDispatchId: created.id,
            metadata: {
              vendorName: input.vendorName,
              courierName: input.courierName,
              docketAwbNumber: input.docketAwbNumber,
              reasonForRepair: input.reasonForRepair,
              itemsCount: items.length,
            },
          });
        }
      }
    }

    if (!firstCreated) {
      throw new Error("No send-to-vendor record created");
    }

    return firstCreated;
  });
}

export async function updateSendToVendorRecord(
  id: string,
  input: Partial<CreateSendToVendorInput>,
  viewer?: Viewer,
): Promise<SendToVendor | null> {
  if (viewer && viewer.role === "ADMIN") {
    const [existingCheck] = await db
      .select({ createdById: sendToVendor.createdById })
      .from(sendToVendor)
      .where(eq(sendToVendor.id, id))
      .limit(1);

    if (!existingCheck || existingCheck.createdById !== viewer.id) {
      return null;
    }
  }

  const valuesToUpdate: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (input.assetId !== undefined)
    valuesToUpdate.assetId = input.assetId || null;
  if (input.items !== undefined) valuesToUpdate.items = input.items;
  if (input.vendorId !== undefined)
    valuesToUpdate.vendorId = input.vendorId || null;
  if (input.vendorName !== undefined)
    valuesToUpdate.vendorName = input.vendorName.trim();
  if (input.contactPerson !== undefined)
    valuesToUpdate.contactPerson = input.contactPerson.trim();
  if (input.phoneNumber !== undefined)
    valuesToUpdate.phoneNumber = input.phoneNumber.trim();
  if (input.address !== undefined)
    valuesToUpdate.address = input.address.trim();
  if (input.reasonForRepair !== undefined)
    valuesToUpdate.reasonForRepair = input.reasonForRepair.trim();
  if (input.remarks !== undefined)
    valuesToUpdate.remarks = input.remarks.trim();
  if (input.courierName !== undefined)
    valuesToUpdate.courierName = input.courierName.trim();
  if (input.docketAwbNumber !== undefined)
    valuesToUpdate.docketAwbNumber = input.docketAwbNumber.trim();
  if (input.bookingDate !== undefined)
    valuesToUpdate.bookingDate = new Date(input.bookingDate);
  const rawPackages = input.noOfPackages ?? input.numberOfPackages;
  if (rawPackages !== undefined)
    valuesToUpdate.numberOfPackages = Math.max(1, Math.floor(rawPackages));
  if (input.dispatchRemarks !== undefined)
    valuesToUpdate.dispatchRemarks = input.dispatchRemarks.trim();

  const [updated] = await db
    .update(sendToVendor)
    .set(valuesToUpdate)
    .where(eq(sendToVendor.id, id))
    .returning();

  return (updated as SendToVendor) ?? null;
}

export async function updateSendToVendorStatus(
  id: string,
  repairStatus: string,
  userId?: string,
  targetWorkflowStage?: string,
  viewer?: Viewer,
): Promise<SendToVendor | null> {
  return await db.transaction(async (tx) => {
    const [existingDispatch] = await tx
      .select()
      .from(sendToVendor)
      .where(eq(sendToVendor.id, id))
      .limit(1);

    if (!existingDispatch) return null;

    if (
      viewer &&
      viewer.role === "ADMIN" &&
      existingDispatch.createdById !== viewer.id
    ) {
      return null;
    }

    let nextWorkflowStage: string;
    if (targetWorkflowStage) {
      nextWorkflowStage = targetWorkflowStage;
    } else if (existingDispatch.workflowStage === "SENT_TO_VENDOR") {
      nextWorkflowStage = "REPAIR_STATUS";
    } else if (existingDispatch.workflowStage === "REPAIR_STATUS") {
      nextWorkflowStage = "VENDOR_RECEIVED";
    } else if (
      existingDispatch.workflowStage === "VENDOR_RECEIVED" ||
      repairStatus === "RETURN_TO_CUSTOMER" ||
      repairStatus === "CUSTOMER_RECEIVED"
    ) {
      nextWorkflowStage = "CUSTOMER_RETURN";
    } else {
      nextWorkflowStage = "REPAIR_STATUS";
    }

    const isCustomerReceived = repairStatus === "CUSTOMER_RECEIVED";
    const isReturnToCustomer =
      nextWorkflowStage === "CUSTOMER_RETURN" ||
      repairStatus === "RETURN_TO_CUSTOMER" ||
      isCustomerReceived;
    const isCompleted =
      nextWorkflowStage === "VENDOR_RECEIVED" ||
      isReturnToCustomer ||
      repairStatus === "REPAIR_COMPLETED" ||
      repairStatus === "REPAIRED";
    const dispatchStatus = isCustomerReceived
      ? "CUSTOMER_RECEIVED"
      : isCompleted
        ? "RECEIVED_FROM_VENDOR"
        : "SENT_TO_VENDOR";
    const assetStatus = isCustomerReceived
      ? "Delivered"
      : isReturnToCustomer
        ? "Ready For Customer Dispatch"
        : isCompleted
          ? "Received From Vendor"
          : "Under Repair";

    const [updated] = await tx
      .update(sendToVendor)
      .set({
        repairStatus,
        status: dispatchStatus,
        workflowStage: nextWorkflowStage,
        customerReceivedAt: isCustomerReceived
          ? existingDispatch.customerReceivedAt || new Date()
          : existingDispatch.customerReceivedAt,
        vendorReturnDate: isCompleted
          ? existingDispatch.vendorReturnDate || new Date()
          : null,
        updatedAt: new Date(),
      })
      .where(eq(sendToVendor.id, id))
      .returning();

    // Collect affected asset IDs from items or assetId
    const dispatchItems = (existingDispatch.items as DispatchItem[]) || [];
    const assetIdSet = new Set<string>();
    if (existingDispatch.assetId) assetIdSet.add(existingDispatch.assetId);
    for (const it of dispatchItems) {
      if (it.receivedMaterialId) assetIdSet.add(it.receivedMaterialId);
    }

    for (const astId of assetIdSet) {
      const [currentAsset] = await tx
        .select()
        .from(asset)
        .where(eq(asset.id, astId))
        .limit(1);

      if (currentAsset) {
        const currentProducts = (currentAsset.products as AssetProduct[]) || [];
        const updatedProducts = currentProducts.map((p) => {
          const isItemInDispatch =
            p.dispatchId === id ||
            dispatchItems.some(
              (it) =>
                it.receivedMaterialId === astId &&
                (it.receivedItemId === p.id ||
                  (p.serialNumber && it.serialNumber === p.serialNumber)),
            );

          if (
            isItemInDispatch ||
            (!dispatchItems.length && astId === existingDispatch.assetId)
          ) {
            return {
              ...p,
              status: repairStatus,
            };
          }
          return p;
        });

        await tx
          .update(asset)
          .set({
            status: assetStatus,
            repairStatus,
            products: updatedProducts,
            updatedAt: new Date(),
          })
          .where(eq(asset.id, astId));

        await tx.insert(assetStatusHistory).values({
          assetId: astId,
          previousStatus: currentAsset.status,
          newStatus: assetStatus,
          previousRepairStatus: currentAsset.repairStatus,
          newRepairStatus: repairStatus,
          action: "REPAIR_STATUS_UPDATED",
          remarks: `Vendor repair status updated to ${repairStatus.replace(/_/g, " ")}`,
          performedById: userId ?? null,
          performedAt: new Date(),
          relatedVendorDispatchId: existingDispatch.id,
          metadata: { repairStatus },
        });
      }
    }

    return (updated as SendToVendor) ?? null;
  });
}

export async function deleteSendToVendorRecord(
  id: string,
  userId?: string,
  viewer?: Viewer,
): Promise<boolean> {
  return await db.transaction(async (tx) => {
    const [dispatch] = await tx
      .select()
      .from(sendToVendor)
      .where(eq(sendToVendor.id, id))
      .limit(1);

    if (!dispatch) return false;

    if (
      viewer &&
      viewer.role === "ADMIN" &&
      dispatch.createdById !== viewer.id
    ) {
      throw new Error("You do not have permission to delete this record.");
    }

    const dispatchItems = (dispatch.items as DispatchItem[]) || [];
    const assetIdSet = new Set<string>();

    if (dispatch.assetId) assetIdSet.add(dispatch.assetId);
    for (const it of dispatchItems) {
      if (it.receivedMaterialId) assetIdSet.add(it.receivedMaterialId);
    }

    for (const astId of assetIdSet) {
      const [currentAsset] = await tx
        .select()
        .from(asset)
        .where(eq(asset.id, astId))
        .limit(1);

      if (currentAsset) {
        const currentProducts = (currentAsset.products as AssetProduct[]) || [];
        const updatedProducts = currentProducts.map((p) => {
          const isItemInThisDispatch =
            p.dispatchId === id ||
            dispatchItems.some(
              (it) =>
                it.receivedMaterialId === astId &&
                (it.receivedItemId === p.id ||
                  (p.serialNumber && it.serialNumber === p.serialNumber)),
            ) ||
            (!dispatchItems.length && astId === dispatch.assetId);

          if (isItemInThisDispatch) {
            const { dispatchId: _dispId, ...rest } = p;
            return {
              ...rest,
              status: "Received",
              dispatchId: undefined,
            } as AssetProduct;
          }
          return p;
        });

        // Determine if any other products remain under repair/dispatched
        const hasOtherDispatched = updatedProducts.some(
          (p) =>
            p.dispatchId ||
            p.status === "DISPATCHED_TO_VENDOR" ||
            p.status === "Under Repair" ||
            p.status === "UNDER_REPAIR",
        );

        const newStatus = hasOtherDispatched ? "Under Repair" : "Received";
        const newRepairStatus = hasOtherDispatched
          ? "UNDER_REPAIR"
          : "NOT_REQUIRED";

        await tx
          .update(asset)
          .set({
            status: newStatus,
            repairStatus: newRepairStatus,
            products: updatedProducts,
            updatedAt: new Date(),
          })
          .where(eq(asset.id, astId));

        await tx.insert(assetStatusHistory).values({
          assetId: astId,
          previousStatus: currentAsset.status,
          newStatus,
          previousRepairStatus: currentAsset.repairStatus,
          newRepairStatus,
          action: "DISPATCH_DELETED",
          remarks: `Vendor dispatch (AWB: ${dispatch.docketAwbNumber || "N/A"}) deleted. Material returned to Available status.`,
          performedById: userId ?? null,
          performedAt: new Date(),
          metadata: {
            deletedDispatchId: id,
            docketAwbNumber: dispatch.docketAwbNumber,
            vendorName: dispatch.vendorName,
          },
        });
      }
    }

    const deleteResult = await tx
      .delete(sendToVendor)
      .where(eq(sendToVendor.id, id))
      .returning({ id: sendToVendor.id });

    return deleteResult.length > 0;
  });
}

export async function getSendToVendorStats(
  viewer?: Viewer,
): Promise<SendToVendorStats> {
  const scopeCondition = scopeAdminOwnership(sendToVendor.createdById, viewer);
  const whereClause = scopeCondition ? scopeCondition : undefined;

  const results = await db
    .select({
      status: sendToVendor.status,
      count: count(),
    })
    .from(sendToVendor)
    .where(whereClause)
    .groupBy(sendToVendor.status);

  let total = 0;
  let underRepair = 0;
  let returned = 0;

  for (const row of results) {
    const c = row.count;
    total += c;
    if (row.status === "SENT_TO_VENDOR") {
      underRepair += c;
    } else if (row.status === "RECEIVED_FROM_VENDOR") {
      returned += c;
    }
  }

  return {
    total,
    underRepair,
    returned,
  };
}
