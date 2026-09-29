"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { db } from "@/db";
import { user } from "@/db/schema/auth";
import { auth } from "@/lib/auth";
import { requireUser } from "@/lib/session";
import { changePasswordSchema } from "@/lib/validations/auth";
import { updateProfileSchema } from "@/lib/validations/profile";

import { type ActionResult, actionError, actionOk } from "./result";

async function updateProfile(input: unknown): Promise<ActionResult> {
  const current = await requireUser();

  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) {
    return actionError(
      "Please correct the highlighted fields.",
      parsed.error.flatten().fieldErrors,
    );
  }

  const { firstName, lastName } = parsed.data;

  await db
    .update(user)
    .set({ firstName, lastName, name: `${firstName} ${lastName}`.trim() })
    .where(eq(user.id, current.id));

  revalidatePath("/", "layout");
  return actionOk();
}

async function changePassword(input: unknown): Promise<ActionResult> {
  await requireUser();

  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return actionError(
      "Please correct the highlighted fields.",
      parsed.error.flatten().fieldErrors,
    );
  }

  const { currentPassword, newPassword } = parsed.data;

  try {
    await auth.api.changePassword({
      body: { currentPassword, newPassword, revokeOtherSessions: false },
      headers: await headers(),
    });
  } catch {
    return actionError("Your current password is incorrect.", {
      currentPassword: ["Your current password is incorrect."],
    });
  }

  return actionOk();
}

export { updateProfile, changePassword };
