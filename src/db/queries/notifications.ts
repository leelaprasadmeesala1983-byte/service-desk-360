import { and, count, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { notification } from "@/db/schema/notification";

type NotificationItem = typeof notification.$inferSelect;

const NOTIFICATION_FEED_LIMIT = 20;

function listNotifications(
  recipientId: string,
  limit = NOTIFICATION_FEED_LIMIT,
): Promise<NotificationItem[]> {
  return db
    .select()
    .from(notification)
    .where(eq(notification.recipientId, recipientId))
    .orderBy(desc(notification.createdAt))
    .limit(limit);
}

async function countUnreadNotifications(recipientId: string): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(notification)
    .where(
      and(
        eq(notification.recipientId, recipientId),
        eq(notification.read, false),
      ),
    );

  return row?.value ?? 0;
}

export type { NotificationItem };
export { listNotifications, countUnreadNotifications, NOTIFICATION_FEED_LIMIT };
