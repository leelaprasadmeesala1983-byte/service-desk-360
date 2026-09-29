type UserRole = "ADMIN" | "TECHNICIAN" | "SUPER_ADMIN";
type UserStatus = "ACTIVE" | "INACTIVE";
type RecordStatus = "OPEN" | "IN_PROGRESS" | "CLOSED" | "REJECTED";
type RecordType = "SERVICE" | "INSTALLATION" | "PROJECT";
type ServiceCategory =
  | "CAMERA_NOT_WORKING"
  | "DVR_NVR_ISSUE"
  | "ONLINE_ISSUE"
  | "NETWORK_ISSUE"
  | "STORAGE_ISSUE"
  | "POWER_ISSUE"
  | "CABLE_WIRING"
  | "GENERAL_SUPPORT";

const USER_ROLES: UserRole[] = ["ADMIN", "TECHNICIAN", "SUPER_ADMIN"];

const USER_ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Admin",
  TECHNICIAN: "Technician",
  SUPER_ADMIN: "Super Admin",
};

const USER_STATUSES: UserStatus[] = ["ACTIVE", "INACTIVE"];

const USER_STATUS_LABELS: Record<UserStatus, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
};

const RECORD_STATUSES: RecordStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "CLOSED",
  "REJECTED",
];

const RECORD_STATUS_LABELS: Record<RecordStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  CLOSED: "Closed",
  REJECTED: "Rejected",
};

/** The dashboard presents CLOSED as "Completed"; the stored value is unchanged. */
const DASHBOARD_STATUS_LABELS: Record<RecordStatus, string> = {
  ...RECORD_STATUS_LABELS,
  CLOSED: "Completed",
};

const SERVICE_CATEGORIES: ServiceCategory[] = [
  "CAMERA_NOT_WORKING",
  "DVR_NVR_ISSUE",
  "ONLINE_ISSUE",
  "NETWORK_ISSUE",
  "STORAGE_ISSUE",
  "POWER_ISSUE",
  "CABLE_WIRING",
  "GENERAL_SUPPORT",
];

const SERVICE_CATEGORY_LABELS: Record<ServiceCategory, string> = {
  CAMERA_NOT_WORKING: "Camera Not Working",
  DVR_NVR_ISSUE: "DVR/NVR Issue",
  ONLINE_ISSUE: "Online Issue",
  NETWORK_ISSUE: "Network Issue",
  STORAGE_ISSUE: "Storage Issue",
  POWER_ISSUE: "Power Issue",
  CABLE_WIRING: "Cable / Wiring",
  GENERAL_SUPPORT: "General Support",
};

/** Seeds the Department dropdown before any admin adds a custom one. */
const DEFAULT_DEPARTMENTS = [
  "Management",
  "Field Service",
  "Support",
  "Finance",
];

/** Sentinel option that switches the Department field to free-text entry. */
const CUSTOM_DEPARTMENT_VALUE = "__CUSTOM__";

const SESSION_IDLE_TIMEOUT_SECONDS = 5 * 60 * 60;

export type { UserRole, UserStatus, RecordStatus, RecordType, ServiceCategory };
export {
  USER_ROLES,
  USER_ROLE_LABELS,
  USER_STATUSES,
  USER_STATUS_LABELS,
  RECORD_STATUSES,
  RECORD_STATUS_LABELS,
  DASHBOARD_STATUS_LABELS,
  SERVICE_CATEGORIES,
  SERVICE_CATEGORY_LABELS,
  DEFAULT_DEPARTMENTS,
  CUSTOM_DEPARTMENT_VALUE,
  SESSION_IDLE_TIMEOUT_SECONDS,
};
