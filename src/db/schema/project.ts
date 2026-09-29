import { relations } from "drizzle-orm";
import {
  index,
  pgTable,
  serial,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { recordStatusEnum } from "./enums";

const project = pgTable(
  "project",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    // Numeric half of the display id (PRJ-1001); see formatRecordId.
    seq: serial("seq").notNull(),

    companyName: text("company_name").notNull(),
    customerName: text("customer_name").notNull(),
    email: text("email").notNull(),
    mobileNo: text("mobile_no").notNull(),
    location: text("location").notNull(),
    estimationNo: text("estimation_no").notNull(),
    description: text("description").notNull(),
    status: recordStatusEnum("status").notNull().default("OPEN"),

    assignedTechnicianId: text("assigned_technician_id").references(
      () => user.id,
      { onDelete: "set null" },
    ),
    assignedTechnicianIds: text("assigned_technician_ids").array(),

    pdfUrl: text("pdf_url"),
    pdfName: text("pdf_name"),

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
    index("project_status_idx").on(table.status),
    index("project_technician_idx").on(table.assignedTechnicianId),
    index("project_created_at_idx").on(table.createdAt),
    index("project_status_created_idx").on(table.status, table.createdAt),
  ],
);

const projectRelations = relations(project, ({ one }) => ({
  assignedTechnician: one(user, {
    fields: [project.assignedTechnicianId],
    references: [user.id],
    relationName: "projectTechnician",
  }),
  createdBy: one(user, {
    fields: [project.createdById],
    references: [user.id],
    relationName: "projectCreator",
  }),
}));

export { project, projectRelations };
