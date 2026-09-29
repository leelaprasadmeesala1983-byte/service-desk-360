import { relations, sql } from "drizzle-orm";
import {
  date,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { recordStatusEnum, recordTypeEnum } from "./enums";

/**
 * Stores day-by-day work history and request logs for Service Requests,
 * Installations, and Projects.
 */
const workHistory = pgTable(
  "work_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workType: recordTypeEnum("work_type").notNull().default("SERVICE"),
    referenceId: uuid("reference_id").notNull(),
    technicianIds: text("technician_ids")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    workDate: date("work_date").notNull(),
    workDateTime: timestamp("work_date_time").defaultNow().notNull(),
    status: recordStatusEnum("status").notNull().default("IN_PROGRESS"),
    description: text("description").notNull(),
    attachments: text("attachments").array(),
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
    index("work_history_ref_idx").on(table.workType, table.referenceId),
    index("work_history_date_idx").on(table.workDate),
    index("work_history_created_at_idx").on(table.createdAt),
    index("work_history_status_idx").on(table.status),
  ],
);

const workHistoryRelations = relations(workHistory, ({ one }) => ({
  createdBy: one(user, {
    fields: [workHistory.createdById],
    references: [user.id],
    relationName: "workHistoryCreator",
  }),
}));

export { workHistory, workHistoryRelations };
