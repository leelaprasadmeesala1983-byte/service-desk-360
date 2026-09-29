export interface CustomerReportOption {
  id: string; // Customer identifier (e.g. customerName or customerNumber or assetId)
  customerName: string;
  customerNumber: string;
  location?: string;
  itemCount: number;
}

export interface CustomerReportSummary {
  customerName: string;
  customerNumber: string;
  email: string;
  address: string;
  totalMaterialsReceived: number;
  totalSentToVendor: number;
  currentlyUnderRepair: number;
  vendorReceived: number;
  returnedToCustomer: number;
  totalRepairCost: number;
}

export interface CustomerMaterialItem {
  id: string;
  sNo: number;
  trackId: string;
  customer: string;
  product: string;
  serialNumber: string;
  complaint: string;
  vendor: string;
  receivedDate: string | null;
  sentToVendorDate: string | null;
  vendorReceivedDate: string | null;
  returnedDate: string | null;
  repairStatus: string;
  repairCost: number;
  currentStatus: string;
  location?: string;
}

export interface CustomerReportData {
  summary: CustomerReportSummary;
  materials: CustomerMaterialItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface VendorReportOption {
  id: string;
  vendorName: string;
  contactPerson: string;
  phoneNumber: string;
  address: string;
  itemCount: number;
}

export interface VendorReportSummary {
  vendorName: string;
  contactPerson: string;
  phoneNumber: string;
  email: string;
  address: string;
  totalMaterials: number;
  sentToVendor: number;
  vendorReceived: number;
  underRepair: number;
  returnedToCustomer: number;
  totalRepairCost: number;
}

export interface VendorMaterialItem {
  id: string;
  sNo: number;
  trackId: string;
  customer: string;
  product: string;
  serialNumber: string;
  sentDate: string | null;
  vendorReceivedDate: string | null;
  repairStatus: string;
  customerReturnDate: string | null;
  repairCost: number;
  currentStatus: string;
}

export interface VendorReportData {
  summary: VendorReportSummary;
  materials: VendorMaterialItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ItemTimelineEvent {
  id: string;
  title: string;
  status: string;
  date: string;
  time: string;
  description: string;
  vendorOrPerson?: string;
  courier?: string;
  docketNumber?: string;
}

export interface ItemReportData {
  id: string;
  trackId: string;
  status: string;
  customer: string;
  customerMobile: string;
  customerEmail: string;
  customerAddress: string;
  product: string;
  category: string;
  serialNumber: string;
  complaint: string;
  receivedDate: string | null;
  vendor: string;
  repairStatus: string;
  currentStatus: string;
  timeline: ItemTimelineEvent[];
}
