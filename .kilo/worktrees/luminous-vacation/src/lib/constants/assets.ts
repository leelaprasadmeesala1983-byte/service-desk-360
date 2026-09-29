import type {
  AssetProduct,
  AssetRepairStatus,
  AssetStats,
  AssetStatus,
  ProductType,
} from "@/types/assets";

export const PRODUCT_TYPES: ProductType[] = [
  "Camera",
  "NVR",
  "DVR",
  "Switch",
  "SMPS",
  "Biometric",
  "Other",
];

export const PRODUCT_TYPE_OPTIONS = PRODUCT_TYPES.map((type) => ({
  value: type,
  label: type,
}));

export const ASSET_STATUSES: AssetStatus[] = [
  "Received",
  "Under Repair",
  "Received From Vendor",
  "Ready For Customer Dispatch",
  "Dispatched To Customer",
  "Delivered",
  "Closed",
];

export const ASSET_STATUS_OPTIONS = ASSET_STATUSES.map((status) => ({
  value: status,
  label: status,
}));

export const ASSET_REPAIR_STATUSES: AssetRepairStatus[] = [
  "UNDER_REPAIR",
  "REPAIRED",
  "DEAD",
  "NOT_REPAIRABLE",
  "REPLACEMENT",
  "NO_FAULT_FOUND",
  "WAITING_FOR_PARTS",
  "OTHER",
  "NOT_REQUIRED",
  "PENDING_VENDOR",
  "SENT_TO_VENDOR",
  "REPAIR_COMPLETED",
  "RETURN_TO_CUSTOMER",
  "CUSTOMER_RECEIVED",
  "RECEIVED_FROM_VENDOR",
  "REPAIR_REJECTED",
];

export const ASSET_REPAIR_STATUS_OPTIONS = [
  { value: "UNDER_REPAIR", label: "Under Repair" },
  { value: "REPAIRED", label: "Repaired" },
  { value: "DEAD", label: "Dead" },
  { value: "NOT_REPAIRABLE", label: "Not Repairable" },
  { value: "REPLACEMENT", label: "Replacement" },
  { value: "NO_FAULT_FOUND", label: "No Fault Found" },
  { value: "WAITING_FOR_PARTS", label: "Waiting for Parts" },
  { value: "OTHER", label: "Other" },
];

export const COURIER_OPTIONS = [
  "DTDC",
  "Blue Dart",
  "Professional",
  "VRL",
  "India Post",
  "Speed Post",
  "Hand Delivery",
  "Other",
] as const;

export const ASSET_STATUS_TONE: Record<
  string,
  {
    badge: string;
    dot: string;
    statTone:
      | "default"
      | "open"
      | "progress"
      | "closed"
      | "rejected"
      | "primary"
      | "info"
      | "purple";
  }
> = {
  Received: {
    badge:
      "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50",
    dot: "bg-blue-500",
    statTone: "info",
  },
  "Under Repair": {
    badge:
      "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50",
    dot: "bg-amber-500",
    statTone: "progress",
  },
  "Sent to Vendor": {
    badge:
      "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50",
    dot: "bg-amber-500",
    statTone: "progress",
  },
  "Received From Vendor": {
    badge:
      "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-900/50",
    dot: "bg-purple-500",
    statTone: "purple",
  },
  "Customer Returned": {
    badge:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50",
    dot: "bg-emerald-500",
    statTone: "closed",
  },
  "Ready For Customer Dispatch": {
    badge:
      "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/50",
    dot: "bg-indigo-500",
    statTone: "primary",
  },
  "Dispatched To Customer": {
    badge:
      "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-900/50",
    dot: "bg-cyan-500",
    statTone: "info",
  },
  Delivered: {
    badge:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50",
    dot: "bg-emerald-500",
    statTone: "closed",
  },
  Closed: {
    badge:
      "bg-slate-100 text-slate-700 dark:bg-slate-800/80 dark:text-slate-300 border border-slate-200 dark:border-slate-700",
    dot: "bg-slate-400",
    statTone: "default",
  },
  // Legacy / extra tones
  Available: {
    badge:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50",
    dot: "bg-emerald-500",
    statTone: "closed",
  },
  Assigned: {
    badge:
      "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-900/50",
    dot: "bg-purple-500",
    statTone: "purple",
  },
  Installed: {
    badge:
      "bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200 dark:border-teal-900/50",
    dot: "bg-teal-500",
    statTone: "info",
  },
  "Under Service": {
    badge:
      "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50",
    dot: "bg-amber-500",
    statTone: "progress",
  },
  Damaged: {
    badge:
      "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50",
    dot: "bg-rose-500",
    statTone: "rejected",
  },
  Retired: {
    badge:
      "bg-slate-100 text-slate-700 dark:bg-slate-800/80 dark:text-slate-300 border border-slate-200 dark:border-slate-700",
    dot: "bg-slate-400",
    statTone: "default",
  },
};

export const REPAIR_STATUS_TONE: Record<
  string,
  {
    badge: string;
    dot: string;
    label: string;
  }
> = {
  UNDER_REPAIR: {
    badge:
      "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200",
    dot: "bg-amber-500",
    label: "Under Repair",
  },
  REPAIRED: {
    badge:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200",
    dot: "bg-emerald-500",
    label: "Repaired",
  },
  DEAD: {
    badge:
      "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200",
    dot: "bg-rose-500",
    label: "Dead",
  },
  NOT_REPAIRABLE: {
    badge:
      "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200",
    dot: "bg-red-500",
    label: "Not Repairable",
  },
  REPLACEMENT: {
    badge:
      "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200",
    dot: "bg-indigo-500",
    label: "Replacement",
  },
  NO_FAULT_FOUND: {
    badge:
      "bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200",
    dot: "bg-teal-500",
    label: "No Fault Found",
  },
  WAITING_FOR_PARTS: {
    badge:
      "bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200",
    dot: "bg-sky-500",
    label: "Waiting for Parts",
  },
  OTHER: {
    badge:
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200",
    dot: "bg-slate-400",
    label: "Other",
  },
  NOT_REQUIRED: {
    badge:
      "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200",
    dot: "bg-slate-400",
    label: "Not Required",
  },
  PENDING_VENDOR: {
    badge:
      "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200",
    dot: "bg-blue-500",
    label: "Pending Vendor",
  },
  SENT_TO_VENDOR: {
    badge:
      "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200",
    dot: "bg-blue-500",
    label: "Sent to Vendor",
  },
  DISPATCHED: {
    badge:
      "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200",
    dot: "bg-blue-500",
    label: "Sent to Vendor",
  },
  REPAIR_COMPLETED: {
    badge:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200",
    dot: "bg-emerald-500",
    label: "Repair Completed",
  },
  RETURN_TO_CUSTOMER: {
    badge:
      "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200",
    dot: "bg-purple-500",
    label: "Return to Customer",
  },
  CUSTOMER_RECEIVED: {
    badge:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200",
    dot: "bg-emerald-500",
    label: "Customer Received",
  },
  REPAIR_NOT_COMPLETED: {
    badge:
      "bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border border-orange-200",
    dot: "bg-orange-500",
    label: "Repair Not Completed",
  },
  RECEIVED_FROM_VENDOR: {
    badge:
      "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200",
    dot: "bg-purple-500",
    label: "Received from Vendor",
  },
  REPAIR_REJECTED: {
    badge:
      "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200",
    dot: "bg-rose-500",
    label: "Repair Rejected",
  },
};

export const DEFAULT_ASSET_PRODUCT: AssetProduct = {
  productType: "Camera",
  otherProductType: "",
  brandName: "",
  modelNumber: "",
  serialNumber: "",
  quantity: 1,
  accessories: "",
  description: "",
  remarks: "",
};

export const DEFAULT_ASSET_STATS: AssetStats = {
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
