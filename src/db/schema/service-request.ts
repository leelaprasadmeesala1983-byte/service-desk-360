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
import { recordStatusEnum, serviceCategoryEnum } from "./enums";

const serviceRequest = pgTable(
  "service_request",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    // Numeric half of the display id (SRV-1001); see formatRecordId.
    seq: serial("seq").notNull(),

    customerName: text("customer_name").notNull(),
    phone: text("phone").notNull(),
    email: text("email"),
    category: serviceCategoryEnum("category")
      .notNull()
      .default("GENERAL_SUPPORT"),
    otherCategory: text("other_category"),
    address: text("address").notNull(),
    issueTitle: text("issue_title"),
    description: text("description").notNull(),
    status: recordStatusEnum("status").notNull().default("OPEN"),

    assignedTechnicianId: text("assigned_technician_id").references(
      () => user.id,
      { onDelete: "set null" },
    ),
    assignedTechnicianIds: text("assigned_technician_ids").array(),

    // Edit-only fields, filled in by the technician as the work is carried out.
    amount: numeric("amount", { precision: 12, scale: 2 }),
    closedDescription: text("closed_description"),
    imageUrl: text("image_url"),

    createdById: text("created_by_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("service_request_status_idx").on(table.status),
    index("service_request_technician_idx").on(table.assignedTechnicianId),
    index("service_request_created_at_idx").on(table.createdAt),
    index("service_request_status_created_idx").on(
      table.status,
      table.createdAt,
    ),
  ],
);

const serviceRequestRelations = relations(serviceRequest, ({ one }) => ({
  assignedTechnician: one(user, {
    fields: [serviceRequest.assignedTechnicianId],
    references: [user.id],
    relationName: "serviceRequestTechnician",
  }),
  createdBy: one(user, {
    fields: [serviceRequest.createdById],
    references: [user.id],
    relationName: "serviceRequestCreator",
  }),
}));

export { serviceRequest, serviceRequestRelations };
