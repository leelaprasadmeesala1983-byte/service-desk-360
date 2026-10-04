"use server";

import { and, count, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { ensureDepartment } from "@/db/queries/departments";
import { user } from "@/db/schema/auth";
import { auth } from "@/lib/auth";
import { requireAdmin } from "@/lib/session";
import {
  addUserSchema,
  adminUpdatePasswordSchema,
  deleteUserSchema,
  editUserSchema,
  setUserStatusSchema,
} from "@/lib/validations/user";
import { notifyUserCreation, sendWhatsAppSafely } from "@/lib/whatsapp-service";

import { type ActionResult, actionError, actionOk } from "./result";

const USERS_PATH = "/service-tickets/users";

function fullName(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`.trim();
}

/**
 * Creating a user here provisions a real credential login (spec §4.5.1): the
 * email + password become sign-in credentials, and the role drives which
 * Home modules they see.
 */
async function createUser(input: unknown): Promise<ActionResult> {
  const admin = await requireAdmin();

  const parsed = addUserSchema.safeParse(input);
  if (!parsed.success) {
    return actionError(
      "Please correct the highlighted fields.",
      parsed.error.flatten().fieldErrors,
    );
  }

  const data = parsed.data;
  const email = data.email.toLowerCase();

  const clash = await db.query.user.findFirst({
    where: (row, { or: orFn }) =>
      orFn(eq(row.email, email), eq(row.phone, data.phone)),
    columns: { email: true, phone: true },
  });
  if (clash) {
    return actionError("That email or phone number is already in use.", {
      ...(clash.email === email
        ? { email: ["This email is already registered."] }
        : {}),
      ...(clash.phone === data.phone
        ? { phone: ["This phone number is already registered."] }
        : {}),
    });
  }

  await ensureDepartment(data.department);

  const id = crypto.randomUUID();
  await db.insert(user).values({
    id,
    name: fullName(data.firstName, data.lastName),
    email,
    emailVerified: true,
    firstName: data.firstName,
    lastName: data.lastName,
    phone: data.phone,
    role: data.role,
    department: data.department,
    status: data.status,
    createdById: admin.id,
  });

  const ctx = await auth.$context;
  await ctx.internalAdapter.createAccount({
    userId: id,
    providerId: "credential",
    accountId: id,
    password: await ctx.password.hash(data.password),
  });

  await sendWhatsAppSafely(data.phone, () =>
    notifyUserCreation(
      data.phone,
      fullName(data.firstName, data.lastName),
      email,
      data.password,
      process.env.APP_URL ?? "",
    ),
  );

  revalidatePath(USERS_PATH);
  return actionOk();
}

async function updateUser(input: unknown): Promise<ActionResult> {
  const admin = await requireAdmin();

  const parsed = editUserSchema.safeParse(input);
  if (!parsed.success) {
    return actionError(
      "Please correct the highlighted fields.",
      parsed.error.flatten().fieldErrors,
    );
  }

  const data = parsed.data;

  const target = await db.query.user.findFirst({
    where: eq(user.id, data.id),
    columns: { id: true, role: true, phone: true, createdById: true },
  });
  if (!target) return actionError("That user no longer exists.");

  // Ownership / authorization check
  if (target.id !== admin.id && target.createdById !== admin.id) {
    return actionError("You are not authorized to update this user.");
  }

  if (data.phone !== target.phone) {
    const phoneClash = await db.query.user.findFirst({
      where: and(eq(user.phone, data.phone), ne(user.id, data.id)),
      columns: { id: true },
    });
    if (phoneClash) {
      return actionError("That phone number is already in use.", {
        phone: ["This phone number is already registered."],
      });
    }
  }

  // The role is fixed at creation; any submitted role is ignored.
  if (target.role === "ADMIN" && data.status === "INACTIVE") {
    const otherAdmins = await countActiveAdmins(data.id);
    if (otherAdmins === 0) {
      return actionError("At least one active admin must remain.");
    }
  }
  if (data.id === admin.id && data.status === "INACTIVE") {
    return actionError("You cannot deactivate your own account.");
  }

  await ensureDepartment(data.department);

  await db
    .update(user)
    .set({
      firstName: data.firstName,
      lastName: data.lastName,
      name: fullName(data.firstName, data.lastName),
      phone: data.phone,
      department: data.department,
      status: data.status,
    })
    .where(eq(user.id, data.id));

  // A deactivated user is signed out everywhere at once.
  if (data.status === "INACTIVE") {
    const ctx = await auth.$context;
    await ctx.internalAdapter.deleteUserSessions(data.id);
  }

  revalidatePath(USERS_PATH);
  revalidatePath("/", "layout");
  return actionOk();
}

async function setUserStatus(input: unknown): Promise<ActionResult> {
  const admin = await requireAdmin();

  const parsed = setUserStatusSchema.safeParse(input);
  if (!parsed.success) return actionError("Invalid request.");

  const { id, status } = parsed.data;
  if (id === admin.id && status === "INACTIVE") {
    return actionError("You cannot deactivate your own account.");
  }

  const target = await db.query.user.findFirst({
    where: eq(user.id, id),
    columns: { role: true, createdById: true },
  });
  if (!target) return actionError("That user no longer exists.");

  // Ownership / authorization check
  if (id !== admin.id && target.createdById !== admin.id) {
    return actionError("You are not authorized to change this user's status.");
  }

  if (
    target.role === "ADMIN" &&
    status === "INACTIVE" &&
    (await countActiveAdmins(id)) === 0
  ) {
    return actionError("At least one active admin must remain.");
  }

  await db.update(user).set({ status }).where(eq(user.id, id));

  if (status === "INACTIVE") {
    const ctx = await auth.$context;
    await ctx.internalAdapter.deleteUserSessions(id);
  }

  revalidatePath(USERS_PATH);
  return actionOk();
}

async function deleteUser(input: unknown): Promise<ActionResult> {
  const admin = await requireAdmin();

  const parsed = deleteUserSchema.safeParse(input);
  if (!parsed.success) return actionError("Invalid request.");

  const { id } = parsed.data;
  if (id === admin.id) {
    return actionError("You cannot delete your own account.");
  }

  const target = await db.query.user.findFirst({
    where: eq(user.id, id),
    columns: { role: true, createdById: true },
  });
  if (!target) return actionOk();

  // Ownership / authorization check
  if (target.createdById !== admin.id) {
    return actionError("You are not authorized to delete this user.");
  }

  if (target.role === "ADMIN" && (await countActiveAdmins(id)) === 0) {
    return actionError("At least one active admin must remain.");
  }

  // Soft delete so work logs, work history and assignments keep resolving this
  // user's name. Email/phone are released so they can be reused.
  await db
    .update(user)
    .set({
      deletedAt: new Date(),
      status: "INACTIVE",
      email: `deleted-${id}@deleted.invalid`,
      phone: null,
    })
    .where(eq(user.id, id));

  const ctx = await auth.$context;
  await ctx.internalAdapter.deleteUserSessions(id);

  revalidatePath(USERS_PATH);
  return actionOk();
}

async function adminUpdateUserPassword(input: unknown): Promise<ActionResult> {
  const admin = await requireAdmin();

  const parsed = adminUpdatePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return actionError(
      "Please correct the highlighted fields.",
      parsed.error.flatten().fieldErrors,
    );
  }

  const { id, password } = parsed.data;

  const target = await db.query.user.findFirst({
    where: eq(user.id, id),
    columns: { id: true, createdById: true },
  });
  if (!target) return actionError("That user no longer exists.");

  // Ownership / authorization check
  if (target.id !== admin.id && target.createdById !== admin.id) {
    return actionError(
      "You are not authorized to update this user's password.",
    );
  }

  const ctx = await auth.$context;
  const hashedPassword = await ctx.password.hash(password);

  await ctx.internalAdapter.updatePassword(id, hashedPassword);
  await ctx.internalAdapter.deleteUserSessions(id);

  return actionOk();
}

/** Active admins other than `exceptId`. */
async function countActiveAdmins(exceptId: string): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(user)
    .where(
      and(
        eq(user.role, "ADMIN"),
        eq(user.status, "ACTIVE"),
        ne(user.id, exceptId),
      ),
    );
  return row?.value ?? 0;
}

export {
  createUser,
  updateUser,
  setUserStatus,
  deleteUser,
  adminUpdateUserPassword,
};
