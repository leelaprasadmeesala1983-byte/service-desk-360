import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { cashTransactionTypeEnum } from "./enums";

/**
 * Cash transactions: admin manual entries (Cash In/Out) and auto-synced amounts
 * from service requests. Tracks opening/closing balances and daily flows.
 */
const cashTransaction = pgTable(
  "cash_transaction",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    // Numeric seq for display ids (CSH-1001); see formatRecordId.
    seq: serial("seq").notNull(),

    type: cashTransactionTypeEnum("type").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    description: text("description").notNull(),

    // Null for manual admin entries; set to service_request id when synced from amount field.
    sourceRecordId: uuid("source_record_id"),
    sourceRecordType: text("source_record_type"), // "SERVICE", "INSTALLATION", "PROJECT"
    sourceRecordLabel: text("source_record_label"), // Formatted label like "SRV-1004" for display

    // Display fields for the transaction list
    customerName: text("customer_name"), // Customer name from service ticket or admin name
    isAdminEntry: boolean("is_admin_entry").default(false), // true if admin added manually

    // Technician assigned to the source record (if synced). Notified on updates.
    assignedTechnicianId: text("assigned_technician_id").references(
      () => user.id,
      { onDelete: "set null" },
    ),

    // Admin who created/updated this transaction. Nullable for system-generated entries.
    // No foreign key constraint to allow flexibility with sync operations.
    createdById: text("created_by_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("cash_transaction_type_idx").on(table.type),
    index("cash_transaction_source_idx").on(
      table.sourceRecordId,
      table.sourceRecordType,
    ),
    index("cash_transaction_created_at_idx").on(table.createdAt),
  ],
);

const cashTransactionRelations = relations(cashTransaction, ({ one }) => ({
  creator: one(user, {
    fields: [cashTransaction.createdById],
    references: [user.id],
    relationName: "cashTransactionCreator",
  }),
  technician: one(user, {
    fields: [cashTransaction.assignedTechnicianId],
    references: [user.id],
    relationName: "cashTransactionTechnician",
  }),
}));

export { cashTransaction, cashTransactionRelations };
