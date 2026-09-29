import type { DispatchItem } from "@/db/schema/send-to-vendor";

export type { DispatchItem };

export interface SendToVendor {
  id: string;
  seq: number;
  assetId?: string | null;
  assetSeq?: number | null;
  assetName?: string | null;
  customerName?: string | null;
  serialNumber?: string | null;
  items?: DispatchItem[];
  vendorId?: string | null;
  vendorName: string;
  contactPerson: string;
  phoneNumber: string;
  address: string;
  reasonForRepair: string;
  remarks: string;
  repairStatus: string;
  courierName: string;
  docketAwbNumber: string;
  bookingDate: Date | string;
  numberOfPackages: number;
  dispatchRemarks: string;
  vendorReturnDate?: Date | string | null;
  repairRemarks?: string | null;
  returnDocketNumber?: string | null;
  receivedById?: string | null;
  customerReceivedAt?: Date | string | null;
  status: string;
  workflowStage?:
    | "SENT_TO_VENDOR"
    | "REPAIR_STATUS"
    | "VENDOR_RECEIVED"
    | "CUSTOMER_RETURN"
    | string;
  createdById?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  createdBy?: {
    id: string;
    name: string;
    email: string;
  } | null;
  asset?: {
    id: string;
    seq: number;
    name: string;
    customerName: string;
    customerNumber: string;
    status: string;
    repairStatus: string;
    products?: Array<{
      serialNumber?: string;
      brandName?: string;
      modelNumber?: string;
      productType?: string;
    }>;
  } | null;
}

export interface SendToVendorRow {
  id: string;
  seq: number;
  assetId?: string | null;
  assetSeq?: number | null;
  assetName?: string | null;
  customerName?: string | null;
  serialNumber?: string | null;
  items?: DispatchItem[];
  vendorId?: string | null;
  vendorName: string;
  contactPerson: string;
  phoneNumber: string;
  address: string;
  reasonForRepair: string;
  remarks: string;
  repairStatus: string;
  courierName: string;
  docketAwbNumber: string;
  bookingDate: Date | string;
  numberOfPackages: number;
  dispatchRemarks: string;
  vendorReturnDate?: Date | string | null;
  repairRemarks?: string | null;
  returnDocketNumber?: string | null;
  receivedById?: string | null;
  customerReceivedAt?: Date | string | null;
  status: string;
  workflowStage?:
    | "SENT_TO_VENDOR"
    | "REPAIR_STATUS"
    | "VENDOR_RECEIVED"
    | "CUSTOMER_RETURN"
    | string;
  createdById?: string | null;
  createdByName?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  asset?: {
    id: string;
    seq: number;
    name: string;
    customerName: string;
    customerNumber: string;
    status: string;
    repairStatus: string;
    products?: Array<{
      serialNumber?: string;
      brandName?: string;
      modelNumber?: string;
      productType?: string;
    }>;
  } | null;
}

export interface CreateSendToVendorInput {
  assetId?: string | null;
  items?: DispatchItem[];
  vendorId?: string | null;
  vendorName: string;
  contactPerson: string;
  phoneNumber: string;
  address: string;
  reasonForRepair: string;
  remarks?: string;
  courierName: string;
  docketAwbNumber: string;
  bookingDate: Date | string;
  numberOfPackages: number;
  dispatchRemarks?: string;
}

export interface ReceiveFromVendorInput {
  sendToVendorId?: string;
  assetId?: string;
  vendorReturnDate: Date | string;
  repairStatus: "REPAIR_COMPLETED" | "REPAIR_REJECTED" | string;
  repairRemarks: string;
  returnDocketNumber?: string;
  additionalRemarks?: string;
}

export interface UpdateSendToVendorInput extends CreateSendToVendorInput {
  id: string;
}

export interface SendToVendorListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  repairStatus?: string;
  repairWorkflow?: boolean;
  workflowStage?:
    | "SENT_TO_VENDOR"
    | "REPAIR_STATUS"
    | "VENDOR_RECEIVED"
    | "CUSTOMER_RETURN"
    | string;
  sortBy?: "createdAt" | "vendorName" | "bookingDate" | "updatedAt";
  sortOrder?: "asc" | "desc";
}

export interface SendToVendorListResponse {
  data: SendToVendorRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface SendToVendorStats {
  total: number;
  underRepair: number;
  returned: number;
}
