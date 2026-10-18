import { and, count, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { notification } from "@/db/schema/notification";
import { withDbRetry } from "@/lib/db-resilience";

type NotificationItem = typeof notification.$inferSelect;

const NOTIFICATION_FEED_LIMIT = 20;

async function listNotifications(
  recipientId: string,
  limit = NOTIFICATION_FEED_LIMIT,
): Promise<NotificationItem[]> {
  try {
    return await withDbRetry(
      () =>
        db
          .select()
          .from(notification)
          .where(eq(notification.recipientId, recipientId))
          .orderBy(desc(notification.createdAt))
          .limit(limit),
      { retries: 2, delayMs: 150, operationName: "listNotifications" },
    );
  } catch (error) {
    console.error("Failed to load notifications:", error);
    return [];
  }
}

async function countUnreadNotifications(recipientId: string): Promise<number> {
  try {
    return await withDbRetry(
      async () => {
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
      },
      { retries: 2, delayMs: 150, operationName: "countUnreadNotifications" },
    );
  } catch (error) {
    console.error("Failed to count unread notifications:", error);
    return 0;
  }
}

export type { NotificationItem };
export { listNotifications, countUnreadNotifications, NOTIFICATION_FEED_LIMIT };
