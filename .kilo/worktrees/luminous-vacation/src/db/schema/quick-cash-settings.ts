import { numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Quick Cash settings: stores configuration like opening balance
 */
const quickCashSettings = pgTable("quick_cash_settings", {
  key: text("key").primaryKey(), // e.g., "opening_balance"
  value: numeric("value", { precision: 12, scale: 2 }), // The balance value
  description: text("description"), // What this setting is for
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: text("updated_by"), // Admin who updated it
});

export { quickCashSettings };
