import { relations } from "drizzle-orm";
import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

export const customer = pgTable(
  "customer",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    customerName: text("customer_name").notNull(),
    mobileNumber: text("mobile_number").notNull(),
    email: text("email"),
    address: text("address").notNull(),
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
    uniqueIndex("customer_mobile_number_idx").on(table.mobileNumber),
    index("customer_name_idx").on(table.customerName),
    index("customer_email_idx").on(table.email),
    index("customer_created_at_idx").on(table.createdAt),
  ],
);

export const customerRelations = relations(customer, ({ one }) => ({
  createdBy: one(user, {
    fields: [customer.createdById],
    references: [user.id],
    relationName: "customerCreator",
  }),
}));

export type Customer = typeof customer.$inferSelect;
export type NewCustomer = typeof customer.$inferInsert;
