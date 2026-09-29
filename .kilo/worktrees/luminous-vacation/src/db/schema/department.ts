import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Selectable departments for the Add/Edit User forms. A "Custom" entry typed by
 * an admin is inserted here so it becomes a standing option for everyone after.
 */
const department = pgTable("department", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export { department };
