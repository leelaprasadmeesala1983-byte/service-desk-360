import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { asset } from "@/db/schema/asset";
import { assetStatusHistory } from "@/db/schema/asset-status-history";
import { user } from "@/db/schema/auth";
import { sendToVendor } from "@/db/schema/send-to-vendor";
import { parseRecordIdSearch } from "@/lib/format";
import type {
  Asset,
  AssetListParams,
  AssetListResponse,
  AssetProduct,
  AssetRow,
  AssetStats,
  CreateAssetInput,
} from "@/types/assets";

export async function listAssets(
  params: AssetListParams = {},
): Promise<AssetListResponse> {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.max(1, Math.min(100, params.limit ?? 10));
  const offset = (page - 1) * limit;

  const conditions = [];

  // Filter by status if not "ALL" and specified
  if (params.status && params.status !== "ALL") {
    // Map legacy / tab aliases
    if (params.status === "received") {
      conditions.push(eq(asset.status, "Received"));
    } else {
      conditions.push(eq(asset.status, params.status));
    }
  }

  // Filter by repairStatus if specified
  if (params.repairStatus && params.repairStatus !== "ALL") {
    conditions.push(eq(asset.repairStatus, params.repairStatus));
  }

  // Search filter across Asset Name, Customer Name, Customer Number, Location,
  // JSONB products (Serial, Brand, Model, Type), and numeric Seq ID
  if (params.search && params.search.trim().length > 0) {
    const rawSearch = params.search.trim();
    const searchTerm = `%${rawSearch}%`;
    const seq = parseRecordIdSearch(rawSearch);

    const searchConditions = [
      ilike(asset.name, searchTerm),
      ilike(asset.customerName, searchTerm),
      ilike(asset.customerNumber, searchTerm),
      ilike(asset.location, searchTerm),
      sql`${asset.products}::text ILIKE ${searchTerm}`,
    ];

    if (seq !== null) {
      searchConditions.push(eq(asset.seq, seq));
    }

    conditions.push(or(...searchConditions));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Query count and rows in parallel
  const [countResult, rows] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(asset)
      .where(whereClause),
    db
      .select({
        id: asset.id,
        seq: asset.seq,
        name: asset.name,
        customerName: asset.customerName,
        customerNumber: asset.customerNumber,
        location: asset.location,
        status: asset.status,
        repairStatus: asset.repairStatus,
        products: asset.products,
        createdById: asset.createdById,
        createdByName: user.name,
        createdAt: asset.createdAt,
        updatedAt: asset.updatedAt,
      })
      .from(asset)
      .leftJoin(user, eq(asset.createdById, user.id))
      .where(whereClause)
      .orderBy(desc(asset.createdAt))
      .limit(limit)
      .offset(offset),
  ]);

  const total = countResult[0]?.count ?? 0;
  const totalPages = Math.ceil(total / limit) || 1;

  const data: AssetRow[] = rows.map((row) => ({
    id: row.id,
    seq: row.seq,
    name: row.name,
    customerName: row.customerName,
    customerNumber: row.customerNumber,
    location: row.location,
    status: row.status,
    repairStatus: row.repairStatus || "NOT_REQUIRED",
    productsCount: Array.isArray(row.products) ? row.products.length : 0,
    products: Array.isArray(row.products) ? row.products : [],
    createdById: row.createdById,
    createdByName: row.createdByName ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));

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

export async function getAssetById(id: string): Promise<Asset | null> {
  const [row] = await db
    .select({
      id: asset.id,
      seq: asset.seq,
      name: asset.name,
      customerName: asset.customerName,
      customerNumber: asset.customerNumber,
      location: asset.location,
      status: asset.status,
      repairStatus: asset.repairStatus,
      products: asset.products,
      createdById: asset.createdById,
      creatorId: user.id,
      creatorName: user.name,
      creatorEmail: user.email,
      createdAt: asset.createdAt,
      updatedAt: asset.updatedAt,
    })
    .from(asset)
    .leftJoin(user, eq(asset.createdById, user.id))
    .where(eq(asset.id, id))
    .limit(1);

  if (!row) return null;

  return {
    id: row.id,
    seq: row.seq,
    name: row.name,
    customerName: row.customerName,
    customerNumber: row.customerNumber,
    location: row.location,
    status: row.status,
    repairStatus: row.repairStatus || "NOT_REQUIRED",
    products: Array.isArray(row.products) ? row.products : [],
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
  };
}

export async function getAssetStats(): Promise<AssetStats> {
  const results = await db
    .select({
      status: asset.status,
      count: sql<number>`count(*)::int`,
    })
    .from(asset)
    .groupBy(asset.status);

  const stats: AssetStats = {
    total: 0,
    received: 0,
    underRepair: 0,
    receivedFromVendor: 0,
    customerReturned: 0,
    activeRepairMaterials: 0,
    readyForCustomerDispatch: 0,
    dispatchedToCustomer: 0,
    delivered: 0,
    closed: 0,
  };

  for (const row of results) {
    const count = row.count;
    stats.total += count;

    switch (row.status) {
      case "Received":
        stats.received += count;
        break;
      case "Under Repair":
      case "Sent to Vendor":
        stats.underRepair += count;
        stats.activeRepairMaterials =
          (stats.activeRepairMaterials || 0) + count;
        break;
      case "Received From Vendor":
        stats.receivedFromVendor += count;
        break;
      case "Customer Returned":
        stats.customerReturned += count;
        break;
      case "Ready For Customer Dispatch":
        stats.readyForCustomerDispatch += count;
        break;
      case "Dispatched To Customer":
        stats.dispatchedToCustomer += count;
        break;
      case "Delivered":
        stats.delivered += count;
        break;
      case "Closed":
        stats.closed += count;
        break;
      default:
        if (row.status?.toLowerCase() === "received") {
          stats.received += count;
        } else if (
          row.status?.toLowerCase() === "under repair" ||
          row.status?.toLowerCase() === "sent to vendor"
        ) {
          stats.underRepair += count;
          stats.activeRepairMaterials =
            (stats.activeRepairMaterials || 0) + count;
        } else if (row.status?.toLowerCase() === "customer returned") {
          stats.customerReturned += count;
        } else if (row.status?.toLowerCase() === "delivered") {
          stats.delivered += count;
        } else if (row.status?.toLowerCase() === "closed") {
          stats.closed += count;
        }
        break;
    }
  }

  return stats;
}

export async function createAssetRecord(
  input: CreateAssetInput,
  createdById?: string,
): Promise<Asset> {
  const products = input.products || [];
  if (products.length === 0) {
    throw new Error("At least one product is required.");
  }

  return await db.transaction(async (tx) => {
    let firstCreated: Asset | null = null;

    for (const p of products) {
      const productId = p.id || crypto.randomUUID();
      const productObj: AssetProduct = {
        ...p,
        id: productId,
        status: p.status || "Received",
      };

      const assetName = `${input.customerName.trim()} - ${p.productType}`;

      const [created] = await tx
        .insert(asset)
        .values({
          name: assetName,
          customerName: input.customerName.trim(),
          customerNumber: input.customerNumber.trim(),
          location: input.location.trim(),
          status: input.status || "Received",
          repairStatus: input.repairStatus || "NOT_REQUIRED",
          products: [productObj],
          createdById: createdById ?? null,
        })
        .returning();

      // Log initial audit event
      await tx.insert(assetStatusHistory).values({
        assetId: created.id,
        previousStatus: null,
        newStatus: created.status,
        previousRepairStatus: null,
        newRepairStatus: created.repairStatus,
        action: "RECEIVED",
        remarks: `Material (${p.productType}) received from customer`,
        performedById: createdById ?? null,
        performedAt: new Date(),
      });

      if (!firstCreated) {
        firstCreated = created as Asset;
      }
    }

    return firstCreated!;
  });
}

export async function updateAssetRecord(
  id: string,
  input: Partial<CreateAssetInput> & {
    targetProductId?: string;
  },
  createdById?: string,
): Promise<Asset | null> {
  return await db.transaction(async (tx) => {
    const valuesToUpdate: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (input.name !== undefined) valuesToUpdate.name = input.name.trim();
    if (input.customerName !== undefined)
      valuesToUpdate.customerName = input.customerName.trim();
    if (input.customerNumber !== undefined)
      valuesToUpdate.customerNumber = input.customerNumber.trim();
    if (input.location !== undefined)
      valuesToUpdate.location = input.location.trim();
    if (input.status !== undefined) valuesToUpdate.status = input.status;
    if (input.repairStatus !== undefined)
      valuesToUpdate.repairStatus = input.repairStatus;

    if (input.products !== undefined) {
      if (input.targetProductId) {
        const [existing] = await tx
          .select({
            id: asset.id,
            products: asset.products,
            customerName: asset.customerName,
            customerNumber: asset.customerNumber,
            location: asset.location,
            status: asset.status,
            repairStatus: asset.repairStatus,
          })
          .from(asset)
          .where(eq(asset.id, id))
          .limit(1);

        const existingProducts = (existing?.products as AssetProduct[]) || [];
        const updatedIncoming = (input.products || []).map((p) => ({
          ...p,
          id: p.id || crypto.randomUUID(),
          status: p.status || "Received",
        }));

        const targetProductUpdated = updatedIncoming.find(
          (p) => p.id === input.targetProductId,
        );
        const newProductsAdded = updatedIncoming.filter(
          (p) =>
            p.id !== input.targetProductId &&
            !existingProducts.some((ep) => ep.id === p.id),
        );

        // Update target product in this asset
        const updatedTarget = targetProductUpdated || updatedIncoming[0];
        if (updatedTarget) {
          valuesToUpdate.products = [updatedTarget];
          valuesToUpdate.name = `${(input.customerName || existing?.customerName || "").trim()} - ${updatedTarget.productType}`;
        }

        // For any new products added during edit, insert them as new independent records with their own unique seq!
        for (const newProd of newProductsAdded) {
          const newAssetName = `${(input.customerName || existing?.customerName || "").trim()} - ${newProd.productType}`;
          const [newAsset] = await tx
            .insert(asset)
            .values({
              name: newAssetName,
              customerName: (
                input.customerName ||
                existing?.customerName ||
                ""
              ).trim(),
              customerNumber: (
                input.customerNumber ||
                existing?.customerNumber ||
                ""
              ).trim(),
              location: (input.location || existing?.location || "").trim(),
              status: input.status || existing?.status || "Received",
              repairStatus:
                input.repairStatus || existing?.repairStatus || "NOT_REQUIRED",
              products: [newProd],
              createdById: createdById ?? null,
            })
            .returning();

          await tx.insert(assetStatusHistory).values({
            assetId: newAsset.id,
            previousStatus: null,
            newStatus: newAsset.status,
            previousRepairStatus: null,
            newRepairStatus: newAsset.repairStatus,
            action: "RECEIVED",
            remarks: `Material (${newProd.productType}) added to customer`,
            performedById: createdById ?? null,
            performedAt: new Date(),
          });
        }
      } else {
        valuesToUpdate.products = (input.products || []).map((p) => ({
          ...p,
          id: p.id || crypto.randomUUID(),
          status: p.status || "Received",
        }));
      }
    }

    const [updated] = await tx
      .update(asset)
      .set(valuesToUpdate)
      .where(eq(asset.id, id))
      .returning();

    return (updated as Asset) ?? null;
  });
}

export async function deleteAssetProductRecord(
  assetId: string,
  productId: string,
): Promise<boolean> {
  const [target] = await db
    .select({
      id: asset.id,
      status: asset.status,
      repairStatus: asset.repairStatus,
      products: asset.products,
    })
    .from(asset)
    .where(eq(asset.id, assetId))
    .limit(1);

  if (!target) return false;

  const currentProducts = (target.products as AssetProduct[]) || [];
  const targetProduct = currentProducts.find((p) => p.id === productId);

  if (!targetProduct && currentProducts.length > 0) {
    return false;
  }

  // Check if specific product is dispatched
  if (targetProduct?.dispatchId) {
    throw new Error(
      "Cannot delete product with associated vendor dispatch records.",
    );
  }

  const remainingProducts = currentProducts.filter((p) => p.id !== productId);

  // If this was the only product in the asset, delete the entire asset record
  if (remainingProducts.length === 0) {
    return await deleteAssetRecord(assetId);
  }

  // Otherwise, update the asset with the remaining products
  const [updated] = await db
    .update(asset)
    .set({
      products: remainingProducts,
      updatedAt: new Date(),
    })
    .where(eq(asset.id, assetId))
    .returning({ id: asset.id });

  return Boolean(updated);
}

export async function deleteAssetRecord(id: string): Promise<boolean> {
  const [target] = await db
    .select({
      id: asset.id,
      status: asset.status,
      repairStatus: asset.repairStatus,
    })
    .from(asset)
    .where(eq(asset.id, id))
    .limit(1);

  if (!target) return false;

  const blockedStatuses = [
    "Under Repair",
    "Sent to Vendor",
    "Received From Vendor",
    "Customer Returned",
    "Closed",
  ];
  if (blockedStatuses.includes(target.status)) {
    throw new Error(
      `Cannot delete material in "${target.status}" status. Only initial Received materials without active workflows can be deleted.`,
    );
  }

  // Check if any active vendor dispatches exist
  const vendorDispatches = await db
    .select({ id: sendToVendor.id })
    .from(sendToVendor)
    .where(eq(sendToVendor.assetId, id))
    .limit(1);

  if (vendorDispatches.length > 0) {
    throw new Error(
      "Cannot delete material with associated vendor dispatch records.",
    );
  }

  const result = await db
    .delete(asset)
    .where(eq(asset.id, id))
    .returning({ id: asset.id });
  return result.length > 0;
}
