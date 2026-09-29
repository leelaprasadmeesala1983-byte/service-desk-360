import { relations } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

export interface AssetProduct {
  id?: string;
  productType: string;
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

const asset = pgTable(
  "asset",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    // Numeric half of the display id (AST-1001); see formatRecordId.
    seq: serial("seq").notNull(),

    name: text("name").notNull(),
    customerName: text("customer_name").notNull(),
    customerNumber: text("customer_number").notNull(),
    location: text("location").notNull(),
    status: text("status").notNull().default("Received"),
    repairStatus: text("repair_status").notNull().default("NOT_REQUIRED"),

    products: jsonb("products").$type<AssetProduct[]>().notNull().default([]),

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
    index("asset_status_idx").on(table.status),
    index("asset_repair_status_idx").on(table.repairStatus),
    index("asset_customer_name_idx").on(table.customerName),
    index("asset_customer_number_idx").on(table.customerNumber),
    index("asset_created_at_idx").on(table.createdAt),
    index("asset_status_created_idx").on(table.status, table.createdAt),
  ],
);

const assetRelations = relations(asset, ({ one }) => ({
  createdBy: one(user, {
    fields: [asset.createdById],
    references: [user.id],
    relationName: "assetCreator",
  }),
}));

export { asset, assetRelations };
