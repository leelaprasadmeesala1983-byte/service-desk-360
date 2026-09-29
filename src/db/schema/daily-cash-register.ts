import { relations } from "drizzle-orm";
import {
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

/**
 * Daily Cash Register: tracks daily cash position, opening balance,
 * cash in, cash out, closing balance, and day-close status per user/admin.
 */
const dailyCashRegister = pgTable(
  "daily_cash_register",
  {
    date: varchar("date", { length: 10 }).notNull(), // "YYYY-MM-DD"
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
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
  },
  (table) => [
    uniqueIndex("daily_cash_register_user_date_idx").on(
      table.userId,
      table.date,
    ),
    index("daily_cash_register_user_idx").on(table.userId),
    index("daily_cash_register_date_idx").on(table.date),
  ],
);

const dailyCashRegisterRelations = relations(dailyCashRegister, ({ one }) => ({
  user: one(user, {
    fields: [dailyCashRegister.userId],
    references: [user.id],
    relationName: "dailyCashRegisterUser",
  }),
}));

export { dailyCashRegister, dailyCashRegisterRelations };
