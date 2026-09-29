"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import type { NotificationItem } from "@/db/queries/notifications";
import { listNotifications } from "@/db/queries/notifications";
import { notification } from "@/db/schema/notification";
import { requireUser } from "@/lib/session";

import { type ActionResult, actionOk } from "./result";

async function fetchMyNotifications(): Promise<
  ActionResult<NotificationItem[]>
> {
  const current = await requireUser();
  return actionOk(await listNotifications(current.id));
}

async function markAllNotificationsRead(): Promise<ActionResult> {
  const current = await requireUser();

  await db
    .update(notification)
    .set({ read: true })
    .where(
      and(
        eq(notification.recipientId, current.id),
        eq(notification.read, false),
      ),
    );

  revalidatePath("/", "layout");
  return actionOk();
}

async function markNotificationRead(id: string): Promise<ActionResult> {
  const current = await requireUser();

  // Scoped to the recipient so one user cannot clear another's notifications.
  await db
    .update(notification)
    .set({ read: true })
    .where(
      and(eq(notification.id, id), eq(notification.recipientId, current.id)),
    );

  revalidatePath("/", "layout");
  return actionOk();
}

export { fetchMyNotifications, markAllNotificationsRead, markNotificationRead };
