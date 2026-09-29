export type ProductType =
  | "Camera"
  | "NVR"
  | "DVR"
  | "Switch"
  | "SMPS"
  | "Biometric"
  | "Other";

export type AssetStatus =
  | "Received"
  | "Under Repair"
  | "Received From Vendor"
  | "Customer Returned"
  | "Ready For Customer Dispatch"
  | "Dispatched To Customer"
  | "Delivered"
  | "Closed"
  | "Available"
  | "Assigned"
  | "Installed"
  | "Under Service"
  | "Damaged"
  | "Retired";

export type AssetRepairStatus =
  | "NOT_REQUIRED"
  | "PENDING_VENDOR"
  | "SENT_TO_VENDOR"
  | "UNDER_REPAIR"
  | "REPAIRED"
  | "DEAD"
  | "NOT_REPAIRABLE"
  | "REPLACEMENT"
  | "NO_FAULT_FOUND"
  | "WAITING_FOR_PARTS"
  | "OTHER"
  | "REPAIR_COMPLETED"
  | "RETURN_TO_CUSTOMER"
  | "CUSTOMER_RECEIVED"
  | "REPAIR_NOT_COMPLETED"
  | "RECEIVED_FROM_VENDOR"
  | "REPAIR_REJECTED";

export interface AssetProduct {
  id?: string;
  productType: ProductType | string;
  otherProductType?: string;
  brandName: string;
  modelNumber: string;
  serialNumber: string;
  quantity: number;
  accessories?: string;
  description?: string;
  remarks?: string;
  status?: string;
  dispatchId?: string;
}

export interface ReceivedItemRow {
  id: string; // unique item row key: `${assetId}_${productId || productIndex}`
  assetId: string;
  assetSeq: number;
  trackId: string; // e.g. AST-1001 or REP-...
  customerName: string;
  customerNumber: string;
  location: string;
  createdAt: Date | string;
  assetStatus: string;
  // Product details
  productId: string;
  productType: string;
  otherProductType?: string;
  brandName: string;
  modelNumber: string;
  serialNumber: string;
  quantity: number;
  accessories?: string;
  description?: string;
  remarks?: string;
  itemStatus: string; // "Received" | "DISPATCHED_TO_VENDOR" | ...
  dispatchId?: string;
  rawAsset: AssetRow;
  productIndex: number;
}

export interface Asset {
  id: string;
  seq: number;
  name: string;
  customerName: string;
  customerNumber: string;
  location: string;
  status: AssetStatus | string;
  repairStatus: AssetRepairStatus | string;
  products: AssetProduct[];
  createdById?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  createdBy?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export interface AssetRow {
  id: string;
  seq: number;
  name: string;
  customerName: string;
  customerNumber: string;
  location: string;
  status: AssetStatus | string;
  repairStatus: AssetRepairStatus | string;
  productsCount: number;
  products: AssetProduct[];
  createdById?: string | null;
  createdByName?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface AssetStats {
  total: number;
  received: number;
  underRepair: number;
  sentToVendor?: number;
  receivedFromVendor: number;
  customerReturned: number;
  activeRepairMaterials?: number;
  readyForCustomerDispatch: number;
  dispatchedToCustomer: number;
  delivered: number;
  closed: number;
  // Legacy compatibility
  available?: number;
  assigned?: number;
  installed?: number;
  underService?: number;
  damaged?: number;
  retired?: number;
}

export interface CreateAssetInput {
  name: string;
  customerName: string;
  customerNumber: string;
  location: string;
  status?: AssetStatus | string;
  repairStatus?: AssetRepairStatus | string;
  products: AssetProduct[];
}

export interface UpdateAssetInput extends CreateAssetInput {
  id: string;
}

export interface AssetListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: AssetStatus | "ALL" | string;
  repairStatus?: AssetRepairStatus | "ALL" | string;
  sortBy?: "createdAt" | "name" | "customerName" | "updatedAt";
  sortOrder?: "asc" | "desc";
}

export interface AssetListResponse {
  data: AssetRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface AssetStatusHistoryRow {
  id: string;
  assetId: string;
  previousStatus: string | null;
  newStatus: string;
  previousRepairStatus: string | null;
  newRepairStatus: string | null;
  action: string;
  remarks: string;
  performedById: string | null;
  performedByName?: string | null;
  performedAt: Date | string;
  relatedVendorDispatchId: string | null;
  relatedCustomerDispatchId: string | null;
  metadata?: Record<string, unknown>;
  createdAt: Date | string;
}
