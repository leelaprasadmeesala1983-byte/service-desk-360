import { relations } from "drizzle-orm";
import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const vendor = pgTable(
  "vendor",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    vendorName: text("vendor_name").notNull(),
    contactPerson: text("contact_person").notNull(),
    phoneNumber: text("phone_number").notNull(),
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
    index("vendor_name_idx").on(table.vendorName),
    index("vendor_contact_person_idx").on(table.contactPerson),
    index("vendor_phone_number_idx").on(table.phoneNumber),
    index("vendor_created_at_idx").on(table.createdAt),
  ],
);

export const vendorRelations = relations(vendor, ({ one }) => ({
  createdBy: one(user, {
    fields: [vendor.createdById],
    references: [user.id],
    relationName: "vendorCreator",
  }),
}));
