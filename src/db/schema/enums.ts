import { pgEnum } from "drizzle-orm/pg-core";

/** Only two roles exist; drives module visibility and field-level access. */
const userRoleEnum = pgEnum("user_role", ["ADMIN", "TECHNICIAN"]);

/** INACTIVE users are blocked from logging in. */
const userStatusEnum = pgEnum("user_status", ["ACTIVE", "INACTIVE"]);

/** Shared by service requests, installations and projects. CLOSED renders as "Completed" on the dashboard. */
const recordStatusEnum = pgEnum("record_status", [
  "OPEN",
  "IN_PROGRESS",
  "CLOSED",
  "REJECTED",
]);

const serviceCategoryEnum = pgEnum("service_category", [
  "CAMERA_NOT_WORKING",
  "DVR_NVR_ISSUE",
  "ONLINE_ISSUE",
  "NETWORK_ISSUE",
  "STORAGE_ISSUE",
  "POWER_ISSUE",
  "CABLE_WIRING",
  "GENERAL_SUPPORT",
]);

/** ASSIGNMENT: admin assigned a record. UPDATE: technician saved changes on one. */
const notificationTypeEnum = pgEnum("notification_type", [
  "ASSIGNMENT",
  "UPDATE",
]);

const recordTypeEnum = pgEnum("record_type", [
  "SERVICE",
  "INSTALLATION",
  "PROJECT",
]);

/** Cash transaction type: CASH_IN for income, CASH_OUT for expenses. */
const cashTransactionTypeEnum = pgEnum("cash_transaction_type", [
  "CASH_IN",
  "CASH_OUT",
]);

export {
  userRoleEnum,
  userStatusEnum,
  recordStatusEnum,
  serviceCategoryEnum,
  notificationTypeEnum,
  recordTypeEnum,
  cashTransactionTypeEnum,
};
