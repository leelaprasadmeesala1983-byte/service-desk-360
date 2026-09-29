export interface ModuleCounts {
  receivedMaterial: number;
  sendToVendor: number;
  repairStatus: number;
  vendorReceived: number;
  customerReturn: number;
  vendors: number;
}

export interface AssetDashboardSummary {
  moduleCounts?: ModuleCounts;
  kpis: {
    totalMaterials: number;
    receivedMaterials: number;
    underRepair: number;
    sentToVendor: number;
    receivedFromVendor: number;
    customerReturned: number;
    activeRepairMaterials: number;
    readyForCustomerDispatch: number;
    dispatchedToCustomer: number;
    delivered: number;
    closed: number;
  };
  repairStatusSummary: Array<{
    status: string;
    label: string;
    count: number;
    color: string;
  }>;
  materialsByVendor: Array<{
    vendorName: string;
    underRepairCount: number;
    totalCount: number;
  }>;
  vendorRepairAging: Array<{
    id: string;
    seq: number;
    assetId: string;
    assetSeq?: number;
    assetName: string;
    customerName: string;
    serialNumber?: string;
    vendorName: string;
    sentDate: Date | string;
    daysWithVendor: number;
    repairStatus: string;
    agingBucket: "0-3 Days" | "4-7 Days" | "8-15 Days" | "15+ Days";
  }>;
  readyForCustomerDispatch: Array<{
    id: string;
    seq: number;
    assetSeq?: number;
    trackId: string;
    assetName: string;
    customerName: string;
    customerNumber?: string;
    productName: string;
    serialNumber?: string;
    vendorName: string;
    vendorReceivedDate: Date | string;
    daysWaiting: number;
    waitingText: string;
    status: string;
    isReceived?: boolean;
  }>;
  recentActivity: Array<{
    id: string;
    assetId: string;
    assetSeq?: number;
    trackId: string;
    assetName: string;
    customerName?: string;
    action: string;
    actionLabel: string;
    description: string;
    previousStatus?: string;
    newStatus: string;
    performedByName: string;
    performedAt: Date | string;
    remarks?: string;
  }>;
}
