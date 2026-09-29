import { relations } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { asset } from "./asset";
import { user } from "./auth";
import { vendor } from "./vendor";

export interface DispatchItem {
  receivedMaterialId: string;
  receivedItemId: string;
  trackId: string;
  productId?: string;
  productName: string;
  serialNumber: string;
  brandName?: string;
  modelNumber?: string;
  quantity?: number;
  customerName?: string;
}

const sendToVendor = pgTable(
  "send_to_vendor",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    // Numeric half of the display id (STV-1001 / DSP-1001); see formatRecordId.
    seq: serial("seq").notNull(),

    // Linked Asset (Primary parent asset)
    assetId: uuid("asset_id").references(() => asset.id, {
      onDelete: "set null",
    }),

    // Dispatched items array
    items: jsonb("items").$type<DispatchItem[]>().notNull().default([]),

    // Vendor Link & Details
    vendorId: uuid("vendor_id").references(() => vendor.id, {
      onDelete: "set null",
    }),
    vendorName: text("vendor_name").notNull(),
    contactPerson: text("contact_person").notNull(),
    phoneNumber: text("phone_number").notNull(),
    address: text("address").notNull(),

    // Repair Details
    reasonForRepair: text("reason_for_repair").notNull(),
    remarks: text("remarks").default("").notNull(),
    repairStatus: text("repair_status").default("UNDER_REPAIR").notNull(),

    // Courier / Dispatch Details
    courierName: text("courier_name").notNull(),
    docketAwbNumber: text("docket_awb_number").notNull(),
    bookingDate: timestamp("booking_date").notNull(),
    numberOfPackages: integer("number_of_packages").default(1).notNull(),
    dispatchRemarks: text("dispatch_remarks").default("").notNull(),

    // Vendor Return Details
    vendorReturnDate: timestamp("vendor_return_date"),
    repairRemarks: text("repair_remarks"),
    returnDocketNumber: text("return_docket_number"),
    receivedById: text("received_by_id").references(() => user.id, {
      onDelete: "set null",
    }),

    // Customer Received Details
    customerReceivedAt: timestamp("customer_received_at"),

    // Dispatch Status: "SENT_TO_VENDOR" | "RECEIVED_FROM_VENDOR" | "CUSTOMER_RECEIVED"
    status: text("status").default("SENT_TO_VENDOR").notNull(),

    // Sequential Workflow Stage: "SENT_TO_VENDOR" | "REPAIR_STATUS" | "VENDOR_RECEIVED" | "CUSTOMER_RETURN"
    workflowStage: text("workflow_stage").default("SENT_TO_VENDOR").notNull(),

    createdById: text("created_by_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("send_to_vendor_asset_id_idx").on(table.assetId),
    index("send_to_vendor_vendor_id_idx").on(table.vendorId),
    index("send_to_vendor_status_idx").on(table.status),
    index("send_to_vendor_workflow_stage_idx").on(table.workflowStage),
    index("send_to_vendor_repair_status_idx").on(table.repairStatus),
    index("send_to_vendor_vendor_name_idx").on(table.vendorName),
    index("send_to_vendor_phone_number_idx").on(table.phoneNumber),
    index("send_to_vendor_docket_awb_idx").on(table.docketAwbNumber),
    index("send_to_vendor_courier_name_idx").on(table.courierName),
    index("send_to_vendor_booking_date_idx").on(table.bookingDate),
    index("send_to_vendor_created_at_idx").on(table.createdAt),
  ],
);

const sendToVendorRelations = relations(sendToVendor, ({ one }) => ({
  asset: one(asset, {
    fields: [sendToVendor.assetId],
    references: [asset.id],
    relationName: "sendToVendorAsset",
  }),
  vendor: one(vendor, {
    fields: [sendToVendor.vendorId],
    references: [vendor.id],
    relationName: "sendToVendorVendor",
  }),
  createdBy: one(user, {
    fields: [sendToVendor.createdById],
    references: [user.id],
    relationName: "sendToVendorCreator",
  }),
  receivedBy: one(user, {
    fields: [sendToVendor.receivedById],
    references: [user.id],
    relationName: "sendToVendorReceiver",
  }),
}));

export { sendToVendor, sendToVendorRelations };
