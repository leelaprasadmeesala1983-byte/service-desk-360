import { relations } from "drizzle-orm";
import {
  date,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { recordTypeEnum } from "./enums";

/**
 * Stores actual calendar work dates per technician and task reference.
 * Prevents artificial duration inflation (weekends, idle days).
 */
const technicianWorkLog = pgTable(
  "technician_work_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    technicianId: text("technician_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    workType: recordTypeEnum("work_type").notNull(),
    referenceId: uuid("reference_id").notNull(),
    workDate: date("work_date").notNull(),
    notes: text("notes"),
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
    uniqueIndex("tech_work_log_unique_idx").on(
      table.technicianId,
      table.workType,
      table.referenceId,
      table.workDate,
    ),
    index("tech_work_log_tech_date_idx").on(table.technicianId, table.workDate),
    index("tech_work_log_ref_idx").on(table.workType, table.referenceId),
    index("tech_work_log_date_idx").on(table.workDate),
  ],
);

const technicianWorkLogRelations = relations(technicianWorkLog, ({ one }) => ({
  technician: one(user, {
    fields: [technicianWorkLog.technicianId],
    references: [user.id],
    relationName: "technicianWorkLogUser",
  }),
  createdBy: one(user, {
    fields: [technicianWorkLog.createdById],
    references: [user.id],
    relationName: "technicianWorkLogCreator",
  }),
}));

export { technicianWorkLog, technicianWorkLogRelations };
