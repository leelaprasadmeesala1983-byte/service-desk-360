import { relations } from "drizzle-orm";
import {
  index,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { recordStatusEnum } from "./enums";

const installation = pgTable(
  "installation",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    // Numeric half of the display id (INS-1001); see formatRecordId.
    seq: serial("seq").notNull(),

    customerName: text("customer_name").notNull(),
    contactNumber: text("contact_number").notNull(),
    email: text("email"),
    address: text("address").notNull(),
    description: text("description").notNull(),
    status: recordStatusEnum("status").notNull().default("OPEN"),

    assignedTechnicianId: text("assigned_technician_id").references(
      () => user.id,
      { onDelete: "set null" },
    ),
    assignedTechnicianIds: text("assigned_technician_ids").array(),

    // Credentials for the account set up on site.
    accountUsername: text("account_username"),
    accountPassword: text("account_password"),
    accountMobile: text("account_mobile"),
    // Admin-entered reference, distinct from the generated display id.
    referenceNo: text("reference_no"),

    // Payment fields (Edit flow)
    paymentMode: text("payment_mode"),
    paymentStatus: text("payment_status"),
    amount: numeric("amount", { precision: 12, scale: 2 }),

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
    index("installation_status_idx").on(table.status),
    index("installation_technician_idx").on(table.assignedTechnicianId),
    index("installation_created_at_idx").on(table.createdAt),
    index("installation_status_created_idx").on(table.status, table.createdAt),
  ],
);

const installationRelations = relations(installation, ({ one }) => ({
  assignedTechnician: one(user, {
    fields: [installation.assignedTechnicianId],
    references: [user.id],
    relationName: "installationTechnician",
  }),
  createdBy: one(user, {
    fields: [installation.createdById],
    references: [user.id],
    relationName: "installationCreator",
  }),
}));

export { installation, installationRelations };
