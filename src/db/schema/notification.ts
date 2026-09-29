import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { notificationTypeEnum, recordTypeEnum } from "./enums";

/**
 * One row per assignment (admin -> technician) or per save (technician ->
 * admin). Delivered through the header bell only; there is no email/SMS leg.
 */
const notification = pgTable(
  "notification",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    recipientId: text("recipient_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    actorId: text("actor_id").references(() => user.id, {
      onDelete: "set null",
    }),

    type: notificationTypeEnum("type").notNull(),
    recordType: recordTypeEnum("record_type").notNull(),
    recordId: uuid("record_id").notNull(),
    // Display id captured at send time (e.g. SRV-1001) so the feed reads well.
    recordLabel: text("record_label").notNull(),

    title: text("title").notNull(),
    message: text("message").notNull(),

    read: boolean("read").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("notification_recipient_idx").on(table.recipientId, table.read),
    index("notification_created_at_idx").on(table.createdAt),
  ],
);

const notificationRelations = relations(notification, ({ one }) => ({
  recipient: one(user, {
    fields: [notification.recipientId],
    references: [user.id],
    relationName: "notificationRecipient",
  }),
  actor: one(user, {
    fields: [notification.actorId],
    references: [user.id],
    relationName: "notificationActor",
  }),
}));

export { notification, notificationRelations };
