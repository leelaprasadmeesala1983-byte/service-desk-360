import { relations } from "drizzle-orm";
import {
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { asset } from "./asset";
import { user } from "./auth";

const customerDispatch = pgTable(
  "customer_dispatch",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    seq: serial("seq").notNull(),

    assetId: uuid("asset_id")
      .references(() => asset.id, { onDelete: "cascade" })
      .notNull(),

    // Customer & Destination Details
    customerName: text("customer_name").notNull(),
    customerContact: text("customer_contact").notNull(),
    customerAddress: text("customer_address").notNull(),

    // Courier Details
    courierName: text("courier_name").notNull(),
    docketAwbNumber: text("docket_awb_number").notNull(),
    dispatchDate: timestamp("dispatch_date").notNull(),
    numberOfPackages: integer("number_of_packages").default(1).notNull(),
    dispatchRemarks: text("dispatch_remarks").default("").notNull(),

    // Delivery & Closure Tracking
    status: text("status").default("DISPATCHED_TO_CUSTOMER").notNull(),
    deliveryRemarks: text("delivery_remarks"),
    deliveredAt: timestamp("delivered_at"),

    dispatchedById: text("dispatched_by_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("customer_dispatch_asset_id_idx").on(table.assetId),
    index("customer_dispatch_status_idx").on(table.status),
    index("customer_dispatch_customer_name_idx").on(table.customerName),
    index("customer_dispatch_docket_awb_idx").on(table.docketAwbNumber),
    index("customer_dispatch_dispatch_date_idx").on(table.dispatchDate),
    index("customer_dispatch_created_at_idx").on(table.createdAt),
  ],
);

const customerDispatchRelations = relations(customerDispatch, ({ one }) => ({
  asset: one(asset, {
    fields: [customerDispatch.assetId],
    references: [asset.id],
    relationName: "customerDispatchAsset",
  }),
  dispatchedBy: one(user, {
    fields: [customerDispatch.dispatchedById],
    references: [user.id],
    relationName: "customerDispatchedBy",
  }),
}));

export { customerDispatch, customerDispatchRelations };
