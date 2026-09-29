import { count, desc, eq, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { type AssetProduct, asset } from "@/db/schema/asset";
import { assetStatusHistory } from "@/db/schema/asset-status-history";
import { user } from "@/db/schema/auth";
import { type DispatchItem, sendToVendor } from "@/db/schema/send-to-vendor";
import { vendor } from "@/db/schema/vendor";
import { formatRecordId } from "@/lib/format";
import type {
  AssetDashboardSummary,
  ModuleCounts,
} from "@/types/asset-dashboard";

export async function getModuleCounts(): Promise<ModuleCounts> {
  const [assetRows, stvStageCounts, vendorCountRes] = await Promise.all([
    db.select({ products: asset.products }).from(asset),
    db
      .select({
        workflowStage: sendToVendor.workflowStage,
        count: count(),
      })
      .from(sendToVendor)
      .groupBy(sendToVendor.workflowStage),
    db.select({ count: count() }).from(vendor),
  ]);

  const receivedMaterialCount = assetRows.reduce((sum, a) => {
    const prods =
      Array.isArray(a.products) && a.products.length > 0
        ? a.products.length
        : 1;
    return sum + prods;
  }, 0);

  let sendToVendorCount = 0;
  let repairStatusCount = 0;
  let vendorReceivedCount = 0;
  let customerReturnCount = 0;

  for (const row of stvStageCounts) {
    if (row.workflowStage === "SENT_TO_VENDOR") {
      sendToVendorCount = row.count;
    } else if (row.workflowStage === "REPAIR_STATUS") {
      repairStatusCount = row.count;
    } else if (row.workflowStage === "VENDOR_RECEIVED") {
      vendorReceivedCount = row.count;
    } else if (row.workflowStage === "CUSTOMER_RETURN") {
      customerReturnCount = row.count;
    }
  }

  return {
    receivedMaterial: receivedMaterialCount,
    sendToVendor: sendToVendorCount,
    repairStatus: repairStatusCount,
    vendorReceived: vendorReceivedCount,
    customerReturn: customerReturnCount,
    vendors: vendorCountRes[0]?.count ?? 0,
  };
}

function formatActionLabel(action: string): string {
  const upper = (action || "").toUpperCase().trim();
  switch (upper) {
    case "RECEIVED":
    case "CREATE":
    case "MATERIAL_RECEIVED":
      return "MATERIAL RECEIVED";
    case "UPDATE":
    case "MATERIAL_UPDATED":
      return "MATERIAL UPDATED";
    case "SENT_TO_VENDOR":
      return "SENT TO VENDOR";
    case "DISPATCH_CREATED":
      return "DISPATCH CREATED";
    case "DISPATCH_UPDATED":
      return "DISPATCH UPDATED";
    case "DISPATCH_DELETED":
      return "DISPATCH DELETED";
    case "REPAIR_STATUS_UPDATED":
      return "REPAIR STATUS UPDATED";
    case "VENDOR_RECEIVED":
      return "VENDOR RECEIVED";
    case "CUSTOMER_RETURN":
    case "CUSTOMER_RETURN_CREATED":
      return "CUSTOMER RETURN CREATED";
    case "CUSTOMER_RETURN_UPDATED":
      return "CUSTOMER RETURN UPDATED";
    case "MATERIAL_RETURNED":
    case "DELIVERED":
      return "MATERIAL RETURNED";
    case "MATERIAL_DELETED":
    case "DELETE":
      return "MATERIAL DELETED";
    default:
      return upper.replace(/_/g, " ");
  }
}

function formatActivityDescription(
  action: string,
  remarks?: string | null,
  newRepairStatus?: string | null,
  newStatus?: string | null,
  metadata?: Record<string, unknown> | null,
): string {
  if (remarks && remarks.trim().length > 0) {
    return remarks.trim();
  }

  const upper = (action || "").toUpperCase().trim();
  if (upper === "REPAIR_STATUS_UPDATED" && newRepairStatus) {
    return `Vendor repair status updated to ${newRepairStatus.replace(/_/g, " ").toUpperCase()}`;
  }

  if (upper === "SENT_TO_VENDOR" || upper === "DISPATCH_CREATED") {
    const vendor = (metadata?.vendorName as string) || "vendor";
    return `Material dispatched to ${vendor}`;
  }

  if (upper === "VENDOR_RECEIVED") {
    return "Material received back from vendor";
  }

  if (upper === "MATERIAL_RETURNED" || upper === "DELIVERED") {
    return "Material returned to customer";
  }

  if (upper === "RECEIVED" || upper === "MATERIAL_RECEIVED") {
    return "Material received and registered";
  }

  return `${upper.replace(/_/g, " ")}: ${newStatus || "Updated"}`;
}

export async function getAssetDashboardData(): Promise<AssetDashboardSummary> {
  const [
    statusCounts,
    repairCounts,
    vendorAgg,
    activeVendorDispatches,
    readyAssets,
    recentHistory,
    moduleCounts,
  ] = await Promise.all([
    // 1. Asset status counts
    db
      .select({
        status: asset.status,
        count: sql<number>`count(*)::int`,
      })
      .from(asset)
      .groupBy(asset.status),

    // 2. Repair status counts (only active records in Repair Status workflow)
    db
      .select({
        repairStatus: sendToVendor.repairStatus,
        count: sql<number>`count(*)::int`,
      })
      .from(sendToVendor)
      .where(eq(sendToVendor.workflowStage, "REPAIR_STATUS"))
      .groupBy(sendToVendor.repairStatus)
      .having(sql`count(*) > 0`),

    // 3. Materials by vendor (only vendors with current Send to Vendor dispatches)
    db
      .select({
        vendorName: sendToVendor.vendorName,
        underRepairCount: sql<number>`count(CASE WHEN ${sendToVendor.repairStatus} IN ('UNDER_REPAIR', 'DISPATCHED', 'IN_REPAIR_WORKFLOW') OR ${sendToVendor.status} = 'SENT_TO_VENDOR' THEN 1 END)::int`,
        totalCount: sql<number>`count(*)::int`,
      })
      .from(sendToVendor)
      .where(
        or(
          eq(sendToVendor.workflowStage, "SENT_TO_VENDOR"),
          eq(sendToVendor.status, "SENT_TO_VENDOR"),
        ),
      )
      .groupBy(sendToVendor.vendorName)
      .having(sql`count(*) > 0`)
      .orderBy(desc(sql`count(*)`))
      .limit(6),

    // 4. Active vendor repairs for Aging analysis
    db
      .select({
        id: sendToVendor.id,
        seq: sendToVendor.seq,
        assetId: sendToVendor.assetId,
        assetSeq: asset.seq,
        assetName: asset.name,
        customerName: asset.customerName,
        assetProducts: asset.products,
        vendorName: sendToVendor.vendorName,
        sentDate: sendToVendor.bookingDate,
        repairStatus: sendToVendor.repairStatus,
      })
      .from(sendToVendor)
      .leftJoin(asset, eq(sendToVendor.assetId, asset.id))
      .where(eq(sendToVendor.status, "SENT_TO_VENDOR"))
      .orderBy(sendToVendor.bookingDate)
      .limit(10),

    // 5. Customer return queue (same records as Customer Return module)
    db
      .select({
        id: sendToVendor.id,
        seq: sendToVendor.seq,
        assetId: sendToVendor.assetId,
        assetSeq: asset.seq,
        assetName: asset.name,
        customerName: asset.customerName,
        customerNumber: asset.customerNumber,
        assetProducts: asset.products,
        items: sendToVendor.items,
        vendorName: sendToVendor.vendorName,
        vendorReturnDate: sendToVendor.vendorReturnDate,
        customerReceivedAt: sendToVendor.customerReceivedAt,
        updatedAt: sendToVendor.updatedAt,
        createdAt: sendToVendor.createdAt,
        status: sendToVendor.status,
        repairStatus: sendToVendor.repairStatus,
      })
      .from(sendToVendor)
      .leftJoin(asset, eq(sendToVendor.assetId, asset.id))
      .where(
        or(
          eq(sendToVendor.workflowStage, "CUSTOMER_RETURN"),
          eq(sendToVendor.repairStatus, "RETURN_TO_CUSTOMER"),
          eq(sendToVendor.repairStatus, "CUSTOMER_RECEIVED"),
          eq(asset.status, "Ready For Customer Dispatch"),
        ),
      )
      .orderBy(desc(sendToVendor.updatedAt))
      .limit(5),

    // 6. Recent material activity history
    db
      .select({
        id: assetStatusHistory.id,
        assetId: assetStatusHistory.assetId,
        assetSeq: asset.seq,
        assetName: asset.name,
        customerName: asset.customerName,
        action: assetStatusHistory.action,
        previousStatus: assetStatusHistory.previousStatus,
        newStatus: assetStatusHistory.newStatus,
        previousRepairStatus: assetStatusHistory.previousRepairStatus,
        newRepairStatus: assetStatusHistory.newRepairStatus,
        performedByName: user.name,
        performedAt: assetStatusHistory.performedAt,
        remarks: assetStatusHistory.remarks,
        metadata: assetStatusHistory.metadata,
      })
      .from(assetStatusHistory)
      .leftJoin(asset, eq(assetStatusHistory.assetId, asset.id))
      .leftJoin(user, eq(assetStatusHistory.performedById, user.id))
      .orderBy(desc(assetStatusHistory.performedAt))
      .limit(6),

    // 7. Dynamic module counts
    getModuleCounts(),
  ]);

  // Aggregate KPI metrics
  const kpis = {
    totalMaterials: 0,
    receivedMaterials: 0,
    underRepair: 0,
    sentToVendor: 0,
    receivedFromVendor: 0,
    customerReturned: 0,
    activeRepairMaterials: 0,
    readyForCustomerDispatch: 0,
    dispatchedToCustomer: 0,
    delivered: 0,
    closed: 0,
  };

  for (const row of statusCounts) {
    const c = row.count;
    kpis.totalMaterials += c;

    switch (row.status) {
      case "Received":
        kpis.receivedMaterials += c;
        break;
      case "Under Repair":
      case "Sent to Vendor":
        kpis.underRepair += c;
        kpis.sentToVendor += c;
        kpis.activeRepairMaterials += c;
        break;
      case "Received From Vendor":
        kpis.receivedFromVendor += c;
        break;
      case "Customer Returned":
        kpis.customerReturned += c;
        break;
      case "Ready For Customer Dispatch":
        kpis.readyForCustomerDispatch += c;
        break;
      case "Dispatched To Customer":
        kpis.dispatchedToCustomer += c;
        break;
      case "Delivered":
        kpis.delivered += c;
        break;
      case "Closed":
        kpis.closed += c;
        break;
      default:
        if (row.status?.toLowerCase() === "received") {
          kpis.receivedMaterials += c;
        } else if (
          row.status?.toLowerCase() === "under repair" ||
          row.status?.toLowerCase() === "sent to vendor"
        ) {
          kpis.underRepair += c;
          kpis.sentToVendor += c;
          kpis.activeRepairMaterials += c;
        } else if (row.status?.toLowerCase() === "customer returned") {
          kpis.customerReturned += c;
        }
        break;
    }
  }

  // Repair status breakdown
  const repairLabels: Record<string, { label: string; color: string }> = {
    NOT_REQUIRED: { label: "Not Required", color: "#94a3b8" },
    PENDING_VENDOR: { label: "Pending Vendor", color: "#3b82f6" },
    SENT_TO_VENDOR: { label: "Sent to Vendor", color: "#f59e0b" },
    DISPATCHED: { label: "Dispatched", color: "#f59e0b" },
    UNDER_REPAIR: { label: "Under Repair", color: "#ea580c" },
    IN_REPAIR_WORKFLOW: { label: "Under Repair", color: "#ea580c" },
    REPAIR_IN_PROGRESS: { label: "Repair In Progress", color: "#f59e0b" },
    REPAIR_COMPLETED: { label: "Repair Completed", color: "#10b981" },
    REPAIRED: { label: "Repaired", color: "#10b981" },
    REPAIR_NOT_COMPLETED: { label: "Repair Not Completed", color: "#f97316" },
    RECEIVED_FROM_VENDOR: { label: "Received from Vendor", color: "#8b5cf6" },
    CUSTOMER_RECEIVED: { label: "Customer Received", color: "#3b82f6" },
    RETURN_TO_CUSTOMER: { label: "Return to Customer", color: "#10b981" },
    REPAIR_REJECTED: { label: "Repair Rejected", color: "#ef4444" },
  };

  const repairStatusSummary = repairCounts
    .filter((row) => row.count > 0 && row.repairStatus)
    .map((row) => ({
      status: row.repairStatus,
      label:
        repairLabels[row.repairStatus]?.label ||
        row.repairStatus.replace(/_/g, " "),
      count: row.count,
      color: repairLabels[row.repairStatus]?.color || "#6b7280",
    }));

  // Vendor Aging Calculations
  const now = new Date();
  const vendorRepairAging = activeVendorDispatches.map((row) => {
    const sentDate = new Date(row.sentDate);
    const diffTime = Math.abs(now.getTime() - sentDate.getTime());
    const daysWithVendor = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    let agingBucket: "0-3 Days" | "4-7 Days" | "8-15 Days" | "15+ Days" =
      "0-3 Days";
    if (daysWithVendor >= 15) agingBucket = "15+ Days";
    else if (daysWithVendor >= 8) agingBucket = "8-15 Days";
    else if (daysWithVendor >= 4) agingBucket = "4-7 Days";

    const products = (row.assetProducts as AssetProduct[]) || [];
    const serialNumber = products[0]?.serialNumber || undefined;

    return {
      id: row.id,
      seq: row.seq,
      assetId: row.assetId || "",
      assetSeq: row.assetSeq ?? undefined,
      assetName: row.assetName || "Unlinked Asset",
      customerName: row.customerName || "N/A",
      serialNumber,
      vendorName: row.vendorName,
      sentDate: row.sentDate,
      daysWithVendor,
      repairStatus: row.repairStatus || "UNDER_REPAIR",
      agingBucket,
    };
  });

  // Customer return queue mapping
  const readyForCustomerDispatch = readyAssets.map((row) => {
    const rawDate =
      row.customerReceivedAt ||
      row.vendorReturnDate ||
      row.updatedAt ||
      row.createdAt;
    const returnDate = rawDate ? new Date(rawDate) : now;
    const diffTime = Math.max(0, now.getTime() - returnDate.getTime());
    const daysWaiting = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const waitingText = daysWaiting === 1 ? "1 Day" : `${daysWaiting} Days`;

    const rawItems = Array.isArray(row.items)
      ? (row.items as DispatchItem[])
      : [];
    const products = (row.assetProducts as AssetProduct[]) || [];
    const productName =
      rawItems[0]?.productName ||
      products[0]?.productType ||
      row.assetName ||
      "Material";
    const serialNumber =
      rawItems[0]?.serialNumber || products[0]?.serialNumber || undefined;

    const trackId =
      rawItems[0]?.trackId ||
      (row.assetSeq ? formatRecordId("ASSET", row.assetSeq) : undefined) ||
      (row.seq ? formatRecordId("STV", row.seq) : `DSP-${row.seq}`);

    const isReceived =
      row.repairStatus === "CUSTOMER_RECEIVED" ||
      row.status === "CUSTOMER_RECEIVED";

    const status = isReceived
      ? "Customer Received"
      : row.repairStatus === "RETURN_TO_CUSTOMER"
        ? "Return to Customer"
        : "Ready for Return";

    return {
      id: row.id,
      seq: row.seq,
      assetSeq: row.assetSeq ?? undefined,
      trackId,
      assetName: row.assetName || "Material",
      customerName: row.customerName || "Customer",
      customerNumber: row.customerNumber || undefined,
      productName,
      serialNumber,
      vendorName: row.vendorName || "Vendor",
      vendorReceivedDate: returnDate,
      daysWaiting,
      waitingText,
      status,
      isReceived,
    };
  });

  // Recent activity stream
  const recentActivity = recentHistory.map((row) => {
    const trackId = row.assetSeq
      ? formatRecordId("ASSET", row.assetSeq)
      : `AST-${row.id.slice(0, 4)}`;

    const actionLabel = formatActionLabel(row.action);
    const description = formatActivityDescription(
      row.action,
      row.remarks,
      row.newRepairStatus,
      row.newStatus,
      row.metadata as Record<string, unknown> | null,
    );

    return {
      id: row.id,
      assetId: row.assetId,
      assetSeq: row.assetSeq ?? undefined,
      trackId,
      assetName: row.assetName || "Material Asset",
      customerName: row.customerName ?? undefined,
      action: row.action,
      actionLabel,
      description,
      previousStatus: row.previousStatus ?? undefined,
      newStatus: row.newStatus,
      performedByName: row.performedByName || "System",
      performedAt: row.performedAt,
      remarks: row.remarks || undefined,
    };
  });

  return {
    moduleCounts,
    kpis,
    repairStatusSummary,
    materialsByVendor: vendorAgg.map((v) => ({
      vendorName: v.vendorName,
      underRepairCount: v.underRepairCount,
      totalCount: v.totalCount,
    })),
    vendorRepairAging,
    readyForCustomerDispatch,
    recentActivity,
  };
}
