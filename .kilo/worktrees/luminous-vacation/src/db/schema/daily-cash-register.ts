import {
  numeric,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

/**
 * Daily Cash Register: tracks daily cash position, opening balance,
 * cash in, cash out, closing balance, and day-close status.
 */
const dailyCashRegister = pgTable("daily_cash_register", {
  date: varchar("date", { length: 10 }).primaryKey(), // "YYYY-MM-DD"
  openingBalance: numeric("opening_balance", { precision: 12, scale: 2 })
    .notNull()
    .default("0"),
  totalCashIn: numeric("total_cash_in", { precision: 12, scale: 2 })
    .notNull()
    .default("0"),
  totalCashOut: numeric("total_cash_out", { precision: 12, scale: 2 })
    .notNull()
    .default("0"),
  closingBalance: numeric("closing_balance", { precision: 12, scale: 2 })
    .notNull()
    .default("0"),
  status: text("status").notNull().default("OPEN"), // "OPEN" | "CLOSED"
  closedAt: timestamp("closed_at"),
  closedById: text("closed_by_id"),
  closedByName: text("closed_by_name"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export { dailyCashRegister };
