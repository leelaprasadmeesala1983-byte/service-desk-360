import { relations } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { asset } from "./asset";
import { user } from "./auth";
import { customerDispatch } from "./customer-dispatch";
import { sendToVendor } from "./send-to-vendor";

const assetStatusHistory = pgTable(
  "asset_status_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    assetId: uuid("asset_id")
      .references(() => asset.id, { onDelete: "cascade" })
      .notNull(),

    previousStatus: text("previous_status"),
    newStatus: text("new_status").notNull(),
    previousRepairStatus: text("previous_repair_status"),
    newRepairStatus: text("new_repair_status"),

    action: text("action").notNull(),
    remarks: text("remarks").default("").notNull(),

    performedById: text("performed_by_id").references(() => user.id, {
      onDelete: "set null",
    }),
    performedAt: timestamp("performed_at").defaultNow().notNull(),

    relatedVendorDispatchId: uuid("related_vendor_dispatch_id").references(
      () => sendToVendor.id,
      { onDelete: "set null" },
    ),
    relatedCustomerDispatchId: uuid("related_customer_dispatch_id").references(
      () => customerDispatch.id,
      { onDelete: "set null" },
    ),

    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("asset_status_history_asset_id_idx").on(table.assetId),
    index("asset_status_history_action_idx").on(table.action),
    index("asset_status_history_performed_at_idx").on(table.performedAt),
    index("asset_status_history_new_status_idx").on(table.newStatus),
  ],
);

const assetStatusHistoryRelations = relations(
  assetStatusHistory,
  ({ one }) => ({
    asset: one(asset, {
      fields: [assetStatusHistory.assetId],
      references: [asset.id],
      relationName: "assetHistoryAsset",
    }),
    performedBy: one(user, {
      fields: [assetStatusHistory.performedById],
      references: [user.id],
      relationName: "assetHistoryActor",
    }),
    vendorDispatch: one(sendToVendor, {
      fields: [assetStatusHistory.relatedVendorDispatchId],
      references: [sendToVendor.id],
      relationName: "assetHistoryVendorDispatch",
    }),
    customerDispatch: one(customerDispatch, {
      fields: [assetStatusHistory.relatedCustomerDispatchId],
      references: [customerDispatch.id],
      relationName: "assetHistoryCustomerDispatch",
    }),
  }),
);

export { assetStatusHistory, assetStatusHistoryRelations };
