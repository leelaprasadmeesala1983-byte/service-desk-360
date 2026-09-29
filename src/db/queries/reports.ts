import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { scopeAdminOwnership, type Viewer } from "@/db/queries/record-scope";
import { type AssetProduct, asset } from "@/db/schema/asset";
import { assetStatusHistory } from "@/db/schema/asset-status-history";
import { customerDispatch } from "@/db/schema/customer-dispatch";
import { sendToVendor } from "@/db/schema/send-to-vendor";
import { vendor } from "@/db/schema/vendor";
import {
  formatDate,
  formatDateTime,
  formatRecordId,
  parseRecordIdSearch,
} from "@/lib/format";
import type {
  CustomerMaterialItem,
  CustomerReportData,
  CustomerReportOption,
  CustomerReportSummary,
  ItemReportData,
  ItemTimelineEvent,
  VendorMaterialItem,
  VendorReportData,
  VendorReportOption,
  VendorReportSummary,
} from "@/types/reports";

/**
 * 1. Customer Report Queries
 */
export async function getCustomerReportOptions(
  search?: string,
  viewer?: Viewer,
): Promise<CustomerReportOption[]> {
  const assetScope = scopeAdminOwnership(asset.createdById, viewer);
  const allAssets = await db
    .select({
      id: asset.id,
      customerName: asset.customerName,
      customerNumber: asset.customerNumber,
      location: asset.location,
      products: asset.products,
    })
    .from(asset)
    .where(assetScope ? assetScope : undefined)
    .orderBy(asset.customerName);

  // Group by customerName (case-insensitive) + customerNumber
  const customerMap = new Map<
    string,
    {
      id: string;
      customerName: string;
      customerNumber: string;
      location: string;
      itemCount: number;
    }
  >();

  for (const row of allAssets) {
    const key = `${row.customerName.trim().toLowerCase()}_${row.customerNumber.trim()}`;
    const products = Array.isArray(row.products) ? row.products : [];
    const count = products.length > 0 ? products.length : 1;

    const existing = customerMap.get(key);
    if (!existing) {
      customerMap.set(key, {
        id: row.id,
        customerName: row.customerName.trim(),
        customerNumber: row.customerNumber.trim(),
        location: row.location?.trim() || "",
        itemCount: count,
      });
    } else {
      existing.itemCount += count;
    }
  }

  let options = Array.from(customerMap.values());

  if (search && search.trim().length > 0) {
    const s = search.trim().toLowerCase();
    options = options.filter(
      (c) =>
        c.customerName.toLowerCase().includes(s) ||
        c.customerNumber.includes(s) ||
        c.location.toLowerCase().includes(s),
    );
  }

  return options;
}

export async function getCustomerReport(
  customerKey: string,
  params: { page?: number; limit?: number; search?: string } = {},
  viewer?: Viewer,
): Promise<CustomerReportData | null> {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.max(1, Math.min(10000, params.limit ?? 10));
  const assetScope = scopeAdminOwnership(asset.createdById, viewer);

  // Look for customer by ID or Name
  let customerAssets = await db
    .select()
    .from(asset)
    .where(and(eq(asset.id, customerKey), assetScope ? assetScope : undefined));

  let targetCustomerName = "";
  let targetCustomerNumber = "";
  let targetLocation = "";

  if (customerAssets.length > 0) {
    targetCustomerName = customerAssets[0].customerName;
    targetCustomerNumber = customerAssets[0].customerNumber;
    targetLocation = customerAssets[0].location;

    // Fetch all assets with the same customer name or number
    customerAssets = await db
      .select()
      .from(asset)
      .where(
        and(
          or(
            ilike(asset.customerName, targetCustomerName),
            eq(asset.customerNumber, targetCustomerNumber),
          ),
          assetScope ? assetScope : undefined,
        ),
      )
      .orderBy(desc(asset.createdAt));
  } else {
    // Treat customerKey as a name or phone
    customerAssets = await db
      .select()
      .from(asset)
      .where(
        and(
          or(
            ilike(asset.customerName, customerKey),
            eq(asset.customerNumber, customerKey),
          ),
          assetScope ? assetScope : undefined,
        ),
      )
      .orderBy(desc(asset.createdAt));

    if (customerAssets.length > 0) {
      targetCustomerName = customerAssets[0].customerName;
      targetCustomerNumber = customerAssets[0].customerNumber;
      targetLocation = customerAssets[0].location;
    } else {
      return null;
    }
  }

  const assetIds = customerAssets.map((a) => a.id);

  // Fetch associated vendor dispatches
  const dispatches =
    assetIds.length > 0
      ? await db
          .select()
          .from(sendToVendor)
          .where(sql`${sendToVendor.assetId} IN ${assetIds}`)
      : [];

  const dispatchMap = new Map<string, (typeof dispatches)[0]>();
  for (const d of dispatches) {
    if (d.assetId) {
      dispatchMap.set(d.assetId, d);
    }
  }

  // Fetch status histories for repair charges
  const histories =
    assetIds.length > 0
      ? await db
          .select()
          .from(assetStatusHistory)
          .where(sql`${assetStatusHistory.assetId} IN ${assetIds}`)
          .orderBy(desc(assetStatusHistory.performedAt))
      : [];

  const chargesMap = new Map<string, number>();
  for (const h of histories) {
    if (h.metadata && typeof h.metadata === "object") {
      const meta = h.metadata as Record<string, unknown>;
      const charge = Number(
        meta.serviceCharges || meta.repairCost || meta.cost || 0,
      );
      if (charge > 0 && !chargesMap.has(h.assetId)) {
        chargesMap.set(h.assetId, charge);
      }
    }
  }

  // Flatten items for this customer
  const allItems: CustomerMaterialItem[] = [];
  let sNoCounter = 1;

  let totalMaterialsReceived = 0;
  let totalSentToVendor = 0;
  let currentlyUnderRepair = 0;
  let vendorReceived = 0;
  let returnedToCustomer = 0;
  let totalRepairCost = 0;

  for (const a of customerAssets) {
    const products = (a.products as AssetProduct[]) || [];
    const dispatch = dispatchMap.get(a.id);
    const cost = chargesMap.get(a.id) || 0;
    totalRepairCost += cost;

    const prods =
      products.length > 0
        ? products
        : [
            {
              productType: a.name || "Material",
              brandName: "",
              modelNumber: "",
              serialNumber: "—",
              quantity: 1,
              description: "",
            },
          ];

    for (const p of prods) {
      totalMaterialsReceived += 1;

      // Status metrics
      const currentSt = a.status || "Received";
      const repSt = a.repairStatus || dispatch?.repairStatus || "NOT_REQUIRED";

      const isUnderRepair =
        currentSt === "Under Repair" ||
        currentSt === "Sent to Vendor" ||
        repSt === "UNDER_REPAIR" ||
        repSt === "SENT_TO_VENDOR";

      const isVendorRecv =
        currentSt === "Received From Vendor" ||
        dispatch?.status === "RECEIVED_FROM_VENDOR" ||
        repSt === "REPAIR_COMPLETED";

      const isReturned =
        currentSt === "Customer Returned" ||
        currentSt === "Dispatched To Customer" ||
        currentSt === "Delivered" ||
        currentSt === "Closed";

      if (dispatch || currentSt !== "Received") {
        totalSentToVendor += 1;
      }

      if (isUnderRepair) {
        currentlyUnderRepair += 1;
      } else if (isVendorRecv) {
        vendorReceived += 1;
      } else if (isReturned) {
        returnedToCustomer += 1;
      }

      const productDetails = [p.brandName, p.modelNumber, p.productType]
        .filter(Boolean)
        .join(" - ");

      allItems.push({
        id: `${a.id}_${p.id || sNoCounter}`,
        sNo: sNoCounter++,
        trackId: formatRecordId("ASSET", a.seq),
        customer: a.customerName,
        product: productDetails || p.productType || a.name,
        serialNumber: p.serialNumber || "—",
        complaint:
          p.description ||
          p.remarks ||
          dispatch?.reasonForRepair ||
          "Service & Repair",
        vendor: dispatch?.vendorName || "—",
        receivedDate: a.createdAt ? a.createdAt.toISOString() : null,
        sentToVendorDate: dispatch?.bookingDate
          ? dispatch.bookingDate.toISOString()
          : null,
        vendorReceivedDate: dispatch?.vendorReturnDate
          ? dispatch.vendorReturnDate.toISOString()
          : null,
        returnedDate: dispatch?.customerReceivedAt
          ? dispatch.customerReceivedAt.toISOString()
          : isReturned && a.updatedAt
            ? a.updatedAt.toISOString()
            : null,
        repairStatus: repSt,
        repairCost: cost,
        currentStatus: currentSt,
        location: a.location || "—",
      });
    }
  }

  // Filter if search query is provided
  let filteredItems = allItems;
  if (params.search && params.search.trim().length > 0) {
    const s = params.search.trim().toLowerCase();
    filteredItems = allItems.filter(
      (item) =>
        item.trackId.toLowerCase().includes(s) ||
        item.product.toLowerCase().includes(s) ||
        item.serialNumber.toLowerCase().includes(s) ||
        item.complaint.toLowerCase().includes(s) ||
        item.vendor.toLowerCase().includes(s) ||
        item.currentStatus.toLowerCase().includes(s) ||
        item.repairStatus.toLowerCase().includes(s),
    );
  }

  // Re-index S.No for filtered results
  filteredItems = filteredItems.map((item, idx) => ({
    ...item,
    sNo: idx + 1,
  }));

  const total = filteredItems.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const offset = (page - 1) * limit;
  const paginatedMaterials = filteredItems.slice(offset, offset + limit);

  const summary: CustomerReportSummary = {
    customerName: targetCustomerName,
    customerNumber: targetCustomerNumber,
    email: "—",
    address: targetLocation || "—",
    totalMaterialsReceived,
    totalSentToVendor,
    currentlyUnderRepair,
    vendorReceived,
    returnedToCustomer,
    totalRepairCost,
  };

  return {
    summary,
    materials: paginatedMaterials,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}

/**
 * 2. Vendor Report Queries
 */
export async function getVendorReportOptions(
  search?: string,
  viewer?: Viewer,
): Promise<VendorReportOption[]> {
  const stvScope = scopeAdminOwnership(sendToVendor.createdById, viewer);
  const allVendors = await db
    .select({
      id: vendor.id,
      vendorName: vendor.vendorName,
      contactPerson: vendor.contactPerson,
      phoneNumber: vendor.phoneNumber,
      address: vendor.address,
    })
    .from(vendor)
    .orderBy(vendor.vendorName);

  // Also count items from sendToVendor
  const dispatches = await db
    .select({
      vendorId: sendToVendor.vendorId,
      vendorName: sendToVendor.vendorName,
      contactPerson: sendToVendor.contactPerson,
      phoneNumber: sendToVendor.phoneNumber,
      address: sendToVendor.address,
      items: sendToVendor.items,
    })
    .from(sendToVendor)
    .where(stvScope ? stvScope : undefined);

  const vendorMap = new Map<
    string,
    {
      id: string;
      vendorName: string;
      contactPerson: string;
      phoneNumber: string;
      address: string;
      itemCount: number;
    }
  >();

  // Initialize with official vendors
  for (const v of allVendors) {
    vendorMap.set(v.id, {
      id: v.id,
      vendorName: v.vendorName,
      contactPerson: v.contactPerson,
      phoneNumber: v.phoneNumber,
      address: v.address,
      itemCount: 0,
    });
  }

  // Aggregate item counts from dispatches
  for (const d of dispatches) {
    const rawItems = Array.isArray(d.items) ? d.items : [];
    const count = rawItems.length > 0 ? rawItems.length : 1;

    const existingVendor = d.vendorId ? vendorMap.get(d.vendorId) : undefined;
    if (existingVendor) {
      existingVendor.itemCount += count;
    } else {
      // Find by name
      const nameKey = d.vendorName.trim().toLowerCase();
      let matched = false;
      for (const v of vendorMap.values()) {
        if (v.vendorName.trim().toLowerCase() === nameKey) {
          v.itemCount += count;
          matched = true;
          break;
        }
      }
      if (!matched) {
        const tempId = `vendor_${nameKey.replace(/\s+/g, "_")}`;
        vendorMap.set(tempId, {
          id: tempId,
          vendorName: d.vendorName.trim(),
          contactPerson: d.contactPerson || "—",
          phoneNumber: d.phoneNumber || "—",
          address: d.address || "—",
          itemCount: count,
        });
      }
    }
  }

  let options = Array.from(vendorMap.values());

  if (search && search.trim().length > 0) {
    const s = search.trim().toLowerCase();
    options = options.filter(
      (v) =>
        v.vendorName.toLowerCase().includes(s) ||
        v.contactPerson.toLowerCase().includes(s) ||
        v.phoneNumber.includes(s) ||
        v.address.toLowerCase().includes(s),
    );
  }

  return options;
}

export async function getVendorReport(
  vendorIdOrName: string,
  params: { page?: number; limit?: number; search?: string } = {},
  viewer?: Viewer,
): Promise<VendorReportData | null> {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.max(1, Math.min(10000, params.limit ?? 10));
  const stvScope = scopeAdminOwnership(sendToVendor.createdById, viewer);

  let targetVendor: {
    id: string;
    vendorName: string;
    contactPerson: string;
    phoneNumber: string;
    address: string;
  } | null = null;

  // Try finding in vendor table by UUID
  if (vendorIdOrName.length === 36 && vendorIdOrName.includes("-")) {
    const [found] = await db
      .select()
      .from(vendor)
      .where(eq(vendor.id, vendorIdOrName))
      .limit(1);
    if (found) {
      targetVendor = found;
    }
  }

  // Find all dispatches matching vendor ID or name
  const vendorMatchCondition = targetVendor
    ? or(
        eq(sendToVendor.vendorId, targetVendor.id),
        ilike(sendToVendor.vendorName, targetVendor.vendorName),
      )
    : or(
        ilike(sendToVendor.vendorName, vendorIdOrName),
        ilike(
          sendToVendor.vendorName,
          `%${vendorIdOrName.replace(/^vendor_/, "").replace(/_/g, " ")}%`,
        ),
      );

  const dispatches = await db
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
      vendorReturnDate: sendToVendor.vendorReturnDate,
      repairRemarks: sendToVendor.repairRemarks,
      returnDocketNumber: sendToVendor.returnDocketNumber,
      customerReceivedAt: sendToVendor.customerReceivedAt,
      status: sendToVendor.status,
      workflowStage: sendToVendor.workflowStage,
      createdAt: sendToVendor.createdAt,
      assetName: asset.name,
      assetSeq: asset.seq,
      assetCustomerName: asset.customerName,
      assetProducts: asset.products,
      assetStatus: asset.status,
      assetRepairStatus: asset.repairStatus,
    })
    .from(sendToVendor)
    .leftJoin(asset, eq(sendToVendor.assetId, asset.id))
    .where(and(vendorMatchCondition, stvScope ? stvScope : undefined))
    .orderBy(desc(sendToVendor.createdAt));

  if (!targetVendor) {
    if (dispatches.length > 0) {
      targetVendor = {
        id: dispatches[0].vendorId || vendorIdOrName,
        vendorName: dispatches[0].vendorName,
        contactPerson: dispatches[0].contactPerson,
        phoneNumber: dispatches[0].phoneNumber,
        address: dispatches[0].address,
      };
    } else {
      // Try searching vendor table by name
      const [foundByName] = await db
        .select()
        .from(vendor)
        .where(ilike(vendor.vendorName, `%${vendorIdOrName}%`))
        .limit(1);
      if (foundByName) {
        targetVendor = foundByName;
      } else {
        return null;
      }
    }
  }

  // Fetch histories for repair costs
  const assetIds = dispatches.map((d) => d.assetId).filter(Boolean) as string[];

  const histories =
    assetIds.length > 0
      ? await db
          .select()
          .from(assetStatusHistory)
          .where(sql`${assetStatusHistory.assetId} IN ${assetIds}`)
          .orderBy(desc(assetStatusHistory.performedAt))
      : [];

  const chargesMap = new Map<string, number>();
  for (const h of histories) {
    if (h.metadata && typeof h.metadata === "object") {
      const meta = h.metadata as Record<string, unknown>;
      const charge = Number(
        meta.serviceCharges || meta.repairCost || meta.cost || 0,
      );
      if (charge > 0 && !chargesMap.has(h.assetId)) {
        chargesMap.set(h.assetId, charge);
      }
    }
  }

  const allItems: VendorMaterialItem[] = [];
  let sNoCounter = 1;

  let totalMaterials = 0;
  let sentToVendorCount = 0;
  let vendorReceivedCount = 0;
  let underRepairCount = 0;
  let returnedToCustomerCount = 0;
  let totalRepairCost = 0;

  for (const d of dispatches) {
    const rawItems = Array.isArray(d.items) ? d.items : [];
    const fallbackProducts = (d.assetProducts as AssetProduct[]) || [];

    const cost = (d.assetId && chargesMap.get(d.assetId)) || 0;
    totalRepairCost += cost;

    const itemsToProcess =
      rawItems.length > 0
        ? rawItems
        : fallbackProducts.map((p, idx) => ({
            receivedMaterialId: d.assetId || "",
            receivedItemId: p.id || `item-${idx}`,
            trackId: d.assetSeq
              ? formatRecordId("ASSET", d.assetSeq)
              : `AST-${d.seq + 1000}`,
            productName: p.productType || d.assetName || "Product",
            serialNumber: p.serialNumber || "—",
            brandName: p.brandName,
            modelNumber: p.modelNumber,
            customerName: d.assetCustomerName,
          }));

    if (itemsToProcess.length === 0) {
      itemsToProcess.push({
        receivedMaterialId: d.assetId || "",
        receivedItemId: d.id,
        trackId: d.assetSeq
          ? formatRecordId("ASSET", d.assetSeq)
          : `DSP-${d.seq + 1000}`,
        productName: d.assetName || "Product",
        serialNumber: "—",
        brandName: "",
        modelNumber: "",
        customerName: d.assetCustomerName || "Customer",
      });
    }

    for (const item of itemsToProcess) {
      totalMaterials += 1;

      const currentStatus =
        d.status === "CUSTOMER_RECEIVED" ||
        d.assetStatus === "Customer Returned"
          ? "Returned to Customer"
          : d.status === "RECEIVED_FROM_VENDOR" ||
              d.assetStatus === "Received From Vendor"
            ? "Vendor Received"
            : d.repairStatus === "UNDER_REPAIR"
              ? "Under Repair"
              : "Sent to Vendor";

      if (currentStatus === "Sent to Vendor") {
        sentToVendorCount += 1;
      } else if (currentStatus === "Under Repair") {
        underRepairCount += 1;
      } else if (currentStatus === "Vendor Received") {
        vendorReceivedCount += 1;
      } else if (currentStatus === "Returned to Customer") {
        returnedToCustomerCount += 1;
      }

      const productDisplay = [
        item.brandName,
        item.modelNumber,
        item.productName,
      ]
        .filter(Boolean)
        .join(" - ");

      allItems.push({
        id: `${d.id}_${item.receivedItemId || sNoCounter}`,
        sNo: sNoCounter++,
        trackId:
          item.trackId ||
          (d.assetSeq
            ? formatRecordId("ASSET", d.assetSeq)
            : `AST-${d.seq + 1000}`),
        customer: item.customerName || d.assetCustomerName || "—",
        product: productDisplay || item.productName,
        serialNumber: item.serialNumber || "—",
        sentDate: d.bookingDate ? d.bookingDate.toISOString() : null,
        vendorReceivedDate: d.vendorReturnDate
          ? d.vendorReturnDate.toISOString()
          : null,
        repairStatus: d.repairStatus || "UNDER_REPAIR",
        customerReturnDate: d.customerReceivedAt
          ? d.customerReceivedAt.toISOString()
          : null,
        repairCost: cost,
        currentStatus,
      });
    }
  }

  // Filter if search query is provided
  let filteredItems = allItems;
  if (params.search && params.search.trim().length > 0) {
    const s = params.search.trim().toLowerCase();
    filteredItems = allItems.filter(
      (item) =>
        item.trackId.toLowerCase().includes(s) ||
        item.customer.toLowerCase().includes(s) ||
        item.product.toLowerCase().includes(s) ||
        item.serialNumber.toLowerCase().includes(s) ||
        item.repairStatus.toLowerCase().includes(s) ||
        item.currentStatus.toLowerCase().includes(s),
    );
  }

  filteredItems = filteredItems.map((item, idx) => ({
    ...item,
    sNo: idx + 1,
  }));

  const total = filteredItems.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const offset = (page - 1) * limit;
  const paginatedMaterials = filteredItems.slice(offset, offset + limit);

  const summary: VendorReportSummary = {
    vendorName: targetVendor.vendorName,
    contactPerson: targetVendor.contactPerson,
    phoneNumber: targetVendor.phoneNumber,
    email: "—",
    address: targetVendor.address,
    totalMaterials,
    sentToVendor: sentToVendorCount,
    vendorReceived: vendorReceivedCount,
    underRepair: underRepairCount,
    returnedToCustomer: returnedToCustomerCount,
    totalRepairCost,
  };

  return {
    summary,
    materials: paginatedMaterials,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}

/**
 * 3. Item Report Queries & Dynamic Journey Timeline
 */
export async function getItemReport(
  trackIdOrQuery: string,
  viewer?: Viewer,
): Promise<ItemReportData | null> {
  const rawQuery = trackIdOrQuery.trim();
  if (!rawQuery) return null;

  const seq = parseRecordIdSearch(rawQuery);
  const isUuid = rawQuery.length === 36 && rawQuery.includes("-");
  const assetScope = scopeAdminOwnership(asset.createdById, viewer);
  const stvScope = scopeAdminOwnership(sendToVendor.createdById, viewer);

  // Search in asset table
  const assetConditions = [
    sql`${asset.products}::text ILIKE ${`%${rawQuery}%`}`,
    ilike(asset.customerName, `%${rawQuery}%`),
  ];

  if (seq !== null) {
    assetConditions.push(eq(asset.seq, seq));
  }
  if (isUuid) {
    assetConditions.push(eq(asset.id, rawQuery));
  }

  const [foundAsset] = await db
    .select()
    .from(asset)
    .where(and(or(...assetConditions), assetScope ? assetScope : undefined))
    .limit(1);

  if (!foundAsset) {
    // Try searching send_to_vendor table
    const dispatchConditions = [
      ilike(sendToVendor.docketAwbNumber, `%${rawQuery}%`),
      sql`send_to_vendor.items::text ILIKE ${`%${rawQuery}%`}`,
    ];
    if (seq !== null) {
      dispatchConditions.push(eq(sendToVendor.seq, seq));
    }

    const [foundDispatch] = await db
      .select()
      .from(sendToVendor)
      .where(and(or(...dispatchConditions), stvScope ? stvScope : undefined))
      .limit(1);

    if (foundDispatch?.assetId) {
      return getItemReport(foundDispatch.assetId, viewer);
    }

    return null;
  }

  // Found asset! Now gather related data:
  const products = (foundAsset.products as AssetProduct[]) || [];
  let targetedProduct = products[0];

  // If search matches a specific product's serial, select that product
  if (products.length > 1) {
    const matchedProd = products.find(
      (p) =>
        p.serialNumber?.toLowerCase().includes(rawQuery.toLowerCase()) ||
        p.brandName?.toLowerCase().includes(rawQuery.toLowerCase()) ||
        p.modelNumber?.toLowerCase().includes(rawQuery.toLowerCase()),
    );
    if (matchedProd) targetedProduct = matchedProd;
  }

  // Get vendor dispatches
  const dispatches = await db
    .select()
    .from(sendToVendor)
    .where(
      and(
        eq(sendToVendor.assetId, foundAsset.id),
        stvScope ? stvScope : undefined,
      ),
    )
    .orderBy(desc(sendToVendor.createdAt));

  const primaryDispatch = dispatches[0];

  // Get customer dispatches
  const customerDispatches = await db
    .select()
    .from(customerDispatch)
    .where(eq(customerDispatch.assetId, foundAsset.id))
    .orderBy(desc(customerDispatch.createdAt));

  const primaryCustomerDispatch = customerDispatches[0];

  // Get chronological status histories
  const histories = await db
    .select()
    .from(assetStatusHistory)
    .where(eq(assetStatusHistory.assetId, foundAsset.id))
    .orderBy(assetStatusHistory.performedAt);

  // Construct Dynamic Journey Timeline
  const timeline: ItemTimelineEvent[] = [];

  // 1. Initial Receipt Event
  timeline.push({
    id: `tl_received_${foundAsset.id}`,
    title: "Received from Customer",
    status: "Received",
    date: formatDate(foundAsset.createdAt),
    time: formatDateTime(foundAsset.createdAt).split(",")[1]?.trim() || "",
    description: `Received from Customer: ${foundAsset.customerName}`,
    vendorOrPerson: foundAsset.customerName,
    courier: "Direct Handover",
  });

  // 2. Add history events or synthesis from dispatches
  if (primaryDispatch) {
    timeline.push({
      id: `tl_sent_${primaryDispatch.id}`,
      title: "Sent to Vendor",
      status: "Sent to Vendor",
      date: formatDate(
        primaryDispatch.bookingDate || primaryDispatch.createdAt,
      ),
      time:
        formatDateTime(primaryDispatch.bookingDate || primaryDispatch.createdAt)
          .split(",")[1]
          ?.trim() || "",
      description: `Dispatched to ${primaryDispatch.vendorName} via ${primaryDispatch.courierName || "Courier"}`,
      vendorOrPerson: primaryDispatch.vendorName,
      courier: primaryDispatch.courierName,
      docketNumber: primaryDispatch.docketAwbNumber,
    });

    if (
      primaryDispatch.status === "RECEIVED_FROM_VENDOR" ||
      primaryDispatch.status === "CUSTOMER_RECEIVED" ||
      primaryDispatch.vendorReturnDate ||
      foundAsset.status === "Received From Vendor" ||
      foundAsset.status === "Customer Returned" ||
      foundAsset.status === "Delivered"
    ) {
      // Received by vendor event
      timeline.push({
        id: `tl_vendor_rec_${primaryDispatch.id}`,
        title: "Received by Vendor",
        status: "Received by Vendor",
        date: formatDate(
          primaryDispatch.bookingDate || primaryDispatch.createdAt,
        ),
        time:
          formatDateTime(
            primaryDispatch.bookingDate || primaryDispatch.createdAt,
          )
            .split(",")[1]
            ?.trim() || "",
        description: `Material received & inspected at ${primaryDispatch.vendorName} service facility.`,
        vendorOrPerson: primaryDispatch.vendorName,
      });

      // Under Repair event
      timeline.push({
        id: `tl_under_repair_${primaryDispatch.id}`,
        title: "Under Repair",
        status: "Under Repair",
        date: formatDate(
          primaryDispatch.bookingDate || primaryDispatch.createdAt,
        ),
        time:
          formatDateTime(
            primaryDispatch.bookingDate || primaryDispatch.createdAt,
          )
            .split(",")[1]
            ?.trim() || "",
        description: `Repair work initiated. Issue: ${primaryDispatch.reasonForRepair || targetedProduct?.description || "Hardware fault"}`,
        vendorOrPerson: primaryDispatch.vendorName,
      });

      // Repair Completed / Returned from Vendor event
      const vReturnDate =
        primaryDispatch.vendorReturnDate || primaryDispatch.updatedAt;
      timeline.push({
        id: `tl_completed_${primaryDispatch.id}`,
        title: "Repair Completed & Received from Vendor",
        status: "Repair Completed",
        date: formatDate(vReturnDate),
        time: formatDateTime(vReturnDate).split(",")[1]?.trim() || "",
        description: `Material repaired and returned by ${primaryDispatch.vendorName}. Remarks: ${primaryDispatch.repairRemarks || "Repair verified successfully."}`,
        vendorOrPerson: primaryDispatch.vendorName,
        courier: "Vendor Return",
        docketNumber: primaryDispatch.returnDocketNumber || undefined,
      });
    }
  }

  // 3. Customer Return / Dispatch Event
  if (
    foundAsset.status === "Customer Returned" ||
    foundAsset.status === "Dispatched To Customer" ||
    foundAsset.status === "Delivered" ||
    foundAsset.status === "Closed" ||
    primaryCustomerDispatch
  ) {
    const returnHist = histories.find(
      (h) =>
        h.action === "CUSTOMER_RETURNED" ||
        h.action === "DELIVERED" ||
        h.newStatus === "Customer Returned",
    );
    const meta = (returnHist?.metadata as Record<string, unknown>) || {};
    const handedTo =
      (meta.handedOverTo as string) ||
      primaryCustomerDispatch?.customerName ||
      foundAsset.customerName;
    const phone =
      (meta.phone as string) ||
      primaryCustomerDispatch?.customerContact ||
      foundAsset.customerNumber;
    const returnDate =
      returnHist?.performedAt ||
      primaryCustomerDispatch?.dispatchDate ||
      foundAsset.updatedAt;

    timeline.push({
      id: `tl_customer_return_${foundAsset.id}`,
      title: "Returned to Customer",
      status: "Returned to Customer",
      date: formatDate(returnDate),
      time: formatDateTime(returnDate).split(",")[1]?.trim() || "",
      description: `Material handed over to ${handedTo} (Phone: ${phone}).`,
      vendorOrPerson: handedTo,
      courier: primaryCustomerDispatch?.courierName || "Direct Handover",
      docketNumber: primaryCustomerDispatch?.docketAwbNumber || undefined,
    });
  }

  const productTitle = targetedProduct
    ? [
        targetedProduct.brandName,
        targetedProduct.modelNumber,
        targetedProduct.productType,
      ]
        .filter(Boolean)
        .join(" - ")
    : foundAsset.name;

  return {
    id: foundAsset.id,
    trackId: formatRecordId("ASSET", foundAsset.seq),
    status: foundAsset.status,
    customer: foundAsset.customerName,
    customerMobile: foundAsset.customerNumber,
    customerEmail: "—",
    customerAddress: foundAsset.location || "—",
    product: productTitle || "Material",
    category: targetedProduct?.productType || "Hardware",
    serialNumber: targetedProduct?.serialNumber || "—",
    complaint:
      targetedProduct?.description ||
      targetedProduct?.remarks ||
      primaryDispatch?.reasonForRepair ||
      "Repair & Service",
    receivedDate: foundAsset.createdAt
      ? foundAsset.createdAt.toISOString()
      : null,
    vendor: primaryDispatch?.vendorName || "—",
    repairStatus:
      foundAsset.repairStatus ||
      primaryDispatch?.repairStatus ||
      "NOT_REQUIRED",
    currentStatus: foundAsset.status,
    timeline,
  };
}
